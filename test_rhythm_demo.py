import asyncio, time, io, os, sys
import soundfile as sf
import numpy as np
import scipy.signal as signal
from edge_tts.communicate import (
    WSS_URL, DRM, SEC_MS_GEC_VERSION, WSS_HEADERS, _SSL_CTX,
    connect_id, date_to_string, ssml_headers_plus_data, get_headers_and_data
)
import aiohttp

sys.stdout.reconfigure(encoding='utf-8')

async def fetch_high_bitrate_audio(text, voice, rate_str="+2%", locale="gu-IN", pitch=None):
    short_voice = voice.split("-")[-1] if "-" in voice else voice
    if "Neural" not in short_voice:
        short_voice += "Neural"
    full_voice_name = f"Microsoft Server Speech Text to Speech Voice ({locale}, {short_voice})"
    
    prosody_attrs = f"rate='{rate_str}'"
    if pitch and pitch != "+0Hz" and pitch != "+0st" and pitch != "0Hz":
        prosody_attrs += f" pitch='{pitch}'"

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
        async with session.ws_connect(url, compress=15, headers=DRM.headers_with_muid(WSS_HEADERS), ssl=_SSL_CTX) as ws:
            cfg = '{"context":{"synthesis":{"audio":{"outputFormat":"audio-24khz-96kbitrate-mono-mp3"}}}}'
            await ws.send_str(f"X-Timestamp:{date_to_string()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{cfg}\r\n")
            await ws.send_str(ssml_headers_plus_data(connect_id(), date_to_string(), ssml))
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.BINARY and len(msg.data) > 2:
                    hlen = int.from_bytes(msg.data[:2], 'big')
                    params, data = get_headers_and_data(msg.data, hlen)
                    if params.get(b"Path") == b"audio":
                        audio_chunks.append(data)
                elif msg.type == aiohttp.WSMsgType.TEXT:
                    if "turn.end" in msg.data:
                        break
    return b"".join(audio_chunks)

async def test_rhythm():
    voice = "gu-IN-DhwaniNeural"
    locale = "gu-IN"

    # Thought group 1: Hook and official announcement (alert, confident, flowing)
    g1 = "નમસ્તે ઉમેદવાર મિત્રો! ગુજરાત ગૌણ સેવા પસંદગી મંડળ એટલે કે જીએસએસએસબી દ્વારા ક્લાર્ક અને હેડ ક્લાર્કની નવી ભરતી બે હજાર છવ્વીસ માટે સત્તાવાર જાહેરાત પ્રસિદ્ધ કરવામાં આવી છે, જેમાં કુલ ખાલી જગ્યાઓની સંખ્યા ત્રણ હજાર પાંચસો પચાસ છે."
    
    # Thought group 2: Eligibility and age limit (clear, informative, natural pauses at commas)
    g2 = "માન્ય યુનિવર્સિટીમાંથી કોઈપણ પ્રવાહમાં સ્નાતક થયેલા ઉમેદવારો આ ભરતી માટે લાયક ગણાશે, અને વય મર્યાદા વીસ થી પાંત્રીસ વર્ષ રાખવામાં આવી છે."
    
    # Thought group 3: Important deadlines and action (focused, urgent)
    g3 = "ઓજસ પોર્ટલ પર ઓનલાઇન ફોર્મ ભરવાની છેલ્લી તારીખ ત્રીસ એપ્રિલ બે હજાર ચોવીસ રહેશે. સમયસર તમારી અરજી સબમિટ કરી લેવી જેથી છેલ્લી ઘડીએ સર્વરની સમસ્યા ના નડે."

    groups = [
        {"text": g1, "rate": "+2%", "pitch": "+2Hz", "pause_ms": 180},
        {"text": g2, "rate": "-2%", "pitch": "-1Hz", "pause_ms": 180},
        {"text": g3, "rate": "-1%", "pitch": "+1Hz", "pause_ms": 0}
    ]

    t0 = time.time()
    pcm_parts = []
    sr_main = 24000
    for g in groups:
        raw_b = await fetch_high_bitrate_audio(g["text"], voice, rate_str=g["rate"], locale=locale, pitch=g["pitch"])
        d, sr = sf.read(io.BytesIO(raw_b))
        sr_main = sr
        if d.ndim > 1:
            d = np.mean(d, axis=1)
        pcm_parts.append(d)
        if g["pause_ms"] > 0:
            pcm_parts.append(np.zeros(int(sr * (g["pause_ms"] / 1000.0)), dtype=d.dtype))

    out_file = "c:/Users/curio/StudioProjects/my channel idea/public/audio/test_perfect_rhythm.mp3"
    full = np.concatenate(pcm_parts)
    sf.write(out_file, full, sr_main)
    print(f"SUCCESS: Generated {len(full)/sr_main:.2f}s audio in {time.time()-t0:.2f}s, size={os.path.getsize(out_file)} bytes")

if __name__ == "__main__":
    asyncio.run(test_rhythm())
