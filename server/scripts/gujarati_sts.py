"""
Gujarati Speech-to-Speech (STS) Engine
Transforms 100% authentic native Gujarati pronunciation into the user's authentic cloned voice.
"""

import argparse
import asyncio
import json
import os
import sys
import edge_tts
import requests

async def synthesize_native_gujarati(text: str, temp_wav_path: str):
    communicate = edge_tts.Communicate(text, 'gu-IN-DhwaniNeural', rate='+0%', pitch='+0Hz')
    await communicate.save(temp_wav_path)

def convert_voice_sts(source_audio_path: str, voice_id: str, api_key: str, output_path: str, stability: float = 0.45, similarity: float = 0.85):
    with open(source_audio_path, 'rb') as f:
        audio_data = f.read()

    files = {'audio': ('source.mp3', audio_data, 'audio/mpeg')}
    data = {
        'model_id': 'eleven_multilingual_sts_v2',
        'voice_settings': json.dumps({
            'stability': stability,
            'similarity_boost': similarity,
            'style': 0.0,
            'use_speaker_boost': True
        })
    }

    url = f'https://api.elevenlabs.io/v1/speech-to-speech/{voice_id}?output_format=mp3_44100_128'
    r = requests.post(url, headers={'xi-api-key': api_key}, files=files, data=data, timeout=60)

    if r.status_code == 200:
        with open(output_path, 'wb') as out_f:
            out_f.write(r.content)
        return True
    else:
        sys.stderr.write(f"STS Error ({r.status_code}): {r.text}\n")
        return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--text', required=True)
    parser.add_argument('--voice_id', required=True)
    parser.add_argument('--api_key', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--stability', type=float, default=0.45)
    parser.add_argument('--similarity', type=float, default=0.85)

    args = parser.parse_args()

    temp_source = f"{args.output}.temp_source.mp3"
    try:
        # Step 1: Native Gujarati synthesis
        asyncio.run(synthesize_native_gujarati(args.text, temp_source))
        if not os.path.exists(temp_source) or os.path.getsize(temp_source) == 0:
            sys.stderr.write("Failed to synthesize native Gujarati audio\n")
            sys.exit(1)

        # Step 2: ElevenLabs STS voice transformation
        success = convert_voice_sts(
            temp_source,
            args.voice_id,
            args.api_key,
            args.output,
            args.stability,
            args.similarity
        )

        if not success:
            sys.exit(1)

        print(f"SUCCESS:{os.path.getsize(args.output)}")
    finally:
        if os.path.exists(temp_source):
            try:
                os.remove(temp_source)
            except Exception:
                pass

if __name__ == '__main__':
    main()
