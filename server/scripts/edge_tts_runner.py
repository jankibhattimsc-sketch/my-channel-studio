import asyncio, json, sys, os, aiohttp, io
import soundfile as sf
import numpy as np
import scipy.signal as signal
import edge_tts
from edge_tts.communicate import (
    WSS_URL, DRM, SEC_MS_GEC_VERSION, WSS_HEADERS, _SSL_CTX,
    connect_id, date_to_string, ssml_headers_plus_data, get_headers_and_data
)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def apply_human_broadcast_mastering_pcm(data, sr):
    """
    Pure High-Fidelity Broadcast Speech Mastering:
    - Subtle 40Hz highpass filter to eliminate sub-audible mic rumble.
    - True-peak normalization to 0.94 (-0.6 dBFS) for broadcast standard YouTube clarity.
    """
    try:
        if len(data) == 0:
            return data

        if data.ndim > 1:
            data = np.mean(data, axis=1)

        # Gentle sub-rumble cleanup (below 40Hz)
        b_hp, a_hp = signal.butter(1, 40.0 / (sr / 2.0), btype='high')
        audio = signal.lfilter(b_hp, a_hp, data)

        # Clean peak normalization to 0.94
        max_peak = np.max(np.abs(audio))
        if max_peak > 0:
            audio = (audio / max_peak) * 0.94
        return audio
    except Exception as e:
        print(f"[Mastering Notice]: {e}")
        return data

async def fetch_high_bitrate_audio(text, voice, rate_str="+2%", locale="gu-IN", pitch=None, volume=None):
    """
    Direct WebSocket connection requesting studio 96kbps MP3 with dynamic actor prosody.
    """
    short_voice = voice.split("-")[-1] if "-" in voice else voice
    if "Neural" not in short_voice:
        short_voice += "Neural"

    full_voice_name = f"Microsoft Server Speech Text to Speech Voice ({locale}, {short_voice})"
    
    prosody_attrs = f"rate='{rate_str}'"
    if pitch and pitch not in ("+0Hz", "+0st", "0Hz"):
        prosody_attrs += f" pitch='{pitch}'"
    if volume and volume not in ("+0%", "0%"):
        prosody_attrs += f" volume='{volume}'"

    ssml = (
        f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{locale}'>"
        f"<voice name='{full_voice_name}'>"
        f"<prosody {prosody_attrs}>"
        f"{text}"
        f"</prosody>"
        f"</voice></speak>"
    )

    audio_chunks = []
    async with aiohttp.ClientSession(trust_env=True) as session:
        url = f"{WSS_URL}&ConnectionId={connect_id()}&Sec-MS-GEC={DRM.generate_sec_ms_gec()}&Sec-MS-GEC-Version={SEC_MS_GEC_VERSION}"
        async with session.ws_connect(
            url,
            compress=15,
            headers=DRM.headers_with_muid(WSS_HEADERS),
            ssl=_SSL_CTX
        ) as ws:
            cfg = '{"context":{"synthesis":{"audio":{"outputFormat":"audio-24khz-96kbitrate-mono-mp3"}}}}'
            await ws.send_str(f"X-Timestamp:{date_to_string()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{cfg}\r\n")
            await ws.send_str(ssml_headers_plus_data(connect_id(), date_to_string(), ssml))

            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.BINARY and len(msg.data) > 2:
                    hlen = int.from_bytes(msg.data[:2], "big")
                    params, data = get_headers_and_data(msg.data, hlen)
                    if params.get(b"Path") == b"audio":
                        audio_chunks.append(data)
                elif msg.type == aiohttp.WSMsgType.TEXT:
                    if b"turn.end" in msg.data.encode("utf-8"):
                        break

    return b"".join(audio_chunks)

def trim_silence(audio, sr, threshold_factor=0.012, min_keep_ms=30):
    """
    Trims dead digital silence from start and end, leaving a natural room tone cushion.
    """
    if len(audio) == 0:
        return audio
    max_amp = np.max(np.abs(audio))
    if max_amp == 0:
        return audio
    thresh = max_amp * threshold_factor
    non_silent = np.where(np.abs(audio) > thresh)[0]
    if len(non_silent) == 0:
        return audio
    pad_samples = int(sr * (min_keep_ms / 1000.0))
    start_idx = max(0, non_silent[0] - pad_samples)
    end_idx = min(len(audio), non_silent[-1] + pad_samples)
    return audio[start_idx:end_idx]

async def synthesize_single_thought_unit(unit, voice, locale, semaphore, global_pitch=None):
    """
    Synthesizes one cohesive thought unit with tailored dynamic tempo, pitch & volume.
    """
    async with semaphore:
        text = unit.get("text", "").strip()
        if not text:
            return None, 0
        rate = unit.get("rate", "+10%")
        pitch = unit.get("pitch") or global_pitch or ("+4Hz" if "Dhwani" in voice else "+0Hz")
        volume = unit.get("volume", "+0%")
        pause_ms = unit.get("pauseAfterMs", unit.get("pause_after_ms", unit.get("pauseMs", 200)))

        raw_bytes = await fetch_high_bitrate_audio(text, voice, rate_str=rate, locale=locale, pitch=pitch, volume=volume)

        if not raw_bytes or len(raw_bytes) == 0:
            buf = bytearray()
            try:
                c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume)
                async for msg in c.stream():
                    if msg["type"] == "audio":
                        buf.extend(msg["data"])
                raw_bytes = bytes(buf)
            except Exception as e:
                print(f"[Communicate Fallback Warning]: {e}")
                raw_bytes = None

        return raw_bytes, pause_ms

async def synthesize_script_aware(units, voice, locale, output_path, global_pitch=None):
    """
    Synthesizes thought-unit script-aware audio with natural human flow,
    connected phrasing, zero clicks, and authentic actor breath pacing.
    """
    semaphore = asyncio.Semaphore(5)
    tasks = [
        synthesize_single_thought_unit(u, voice, locale, semaphore, global_pitch)
        for u in units
    ]
    results = await asyncio.gather(*tasks)

    # When single unit, write directly with mastering
    if len(results) == 1 and results[0][0] and len(results[0][0]) > 0:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        data, sr = sf.read(io.BytesIO(results[0][0]))
        mastered = apply_human_broadcast_mastering_pcm(data, sr)
        sf.write(output_path, mastered, sr)
        return True

    pcm_segments = []
    sample_rate = 24000

    for idx, (raw_bytes, pause_ms) in enumerate(results):
        if not raw_bytes or len(raw_bytes) == 0:
            continue
        try:
            data, sr = sf.read(io.BytesIO(raw_bytes))
            sample_rate = sr
            if data.ndim > 1:
                data = np.mean(data, axis=1)

            # Trim dead silence from boundaries
            trimmed = trim_silence(data, sr, threshold_factor=0.012, min_keep_ms=30)

            # Apply subtle 12ms cosine crossfade at head and tail to eliminate any clicks
            fade_len = min(int(sr * 0.012), len(trimmed) // 4)
            if fade_len > 0:
                fade_in = np.sin(np.linspace(0, np.pi / 2, fade_len)) ** 2
                trimmed[:fade_len] *= fade_in
                fade_out = np.cos(np.linspace(0, np.pi / 2, fade_len)) ** 2
                trimmed[-fade_len:] *= fade_out

            pcm_segments.append(trimmed)

            # Natural actor breath transition (160ms - 320ms) between thought units
            if idx < len(results) - 1 and pause_ms > 0:
                safe_pause_ms = min(360, max(140, int(pause_ms)))
                pause_samples = np.zeros(int(sr * (safe_pause_ms / 1000.0)), dtype=data.dtype)
                pcm_segments.append(pause_samples)
        except Exception as err:
            print(f"[Unit Decode Notice]: {err}")

    if not pcm_segments:
        raise Exception("Failed to generate any audio segments")

    full_audio = np.concatenate(pcm_segments)
    mastered = apply_human_broadcast_mastering_pcm(full_audio, sample_rate)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, mastered, sample_rate)
    return True

async def main():
    if len(sys.argv) < 2:
        print("Usage: python edge_tts_runner.py <config.json>")
        sys.exit(1)

    config_path = sys.argv[1]
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    voice = config.get("voice", "gu-IN-DhwaniNeural")
    output_path = config["output_path"]
    thought_units = config.get("thought_units", config.get("thoughtUnits", []))
    sentences = config.get("sentences", [])

    # PRIORITIZE thought_units for cohesive human presenter flow
    speech_units = thought_units if (thought_units and len(thought_units) > 0) else sentences

    full_text = config.get("full_text", "").strip()
    rate = config.get("rate", "+10%")
    pitch = config.get("pitch", "+4Hz" if "Dhwani" in voice else "+0Hz")
    locale = config.get("locale", "gu-IN")

    # 1. Primary Strategy: Script-aware cohesive thought-unit synthesis with dynamic actor prosody
    if speech_units and len(speech_units) > 0:
        try:
            success = await synthesize_script_aware(speech_units, voice, locale, output_path, global_pitch=pitch)
            if success and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                print(f"SUCCESS:{os.path.getsize(output_path)}")
                return
        except Exception as e:
            print(f"[ScriptAware Notice]: {e}, falling back to single pass...")

    # 2. Secondary Strategy: Seamless Single-Pass Direct Neural Stream
    if full_text:
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            c = edge_tts.Communicate(full_text, voice, rate=rate, pitch=pitch)
            await c.save(output_path)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                print(f"SUCCESS:{os.path.getsize(output_path)}")
                return
        except Exception as err:
            print(f"[Direct Neural Stream Notice]: {err}")

    raise Exception("No audio generated from TTS engine")

if __name__ == "__main__":
    asyncio.run(main())
