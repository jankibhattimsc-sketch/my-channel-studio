import os
import sys
import types
import shutil
import argparse
import subprocess
from pathlib import Path

# 1. Compatibility shim for basicsr with torchvision >= 0.17
import torchvision.transforms.functional as _tvF
if 'torchvision.transforms.functional_tensor' not in sys.modules:
    _ft_mod = types.ModuleType('torchvision.transforms.functional_tensor')
    _ft_mod.rgb_to_grayscale = _tvF.rgb_to_grayscale
    sys.modules['torchvision.transforms.functional_tensor'] = _ft_mod

# 2. Compatibility shims for older numpy / scipy calls in SadTalker (NumPy 1.26+)
import numpy as np
if not hasattr(np, 'VisibleDeprecationWarning'):
    np.VisibleDeprecationWarning = UserWarning
for _np_alias, _py_type in [('float', float), ('int', int), ('bool', bool), ('complex', complex), ('object', object), ('str', str)]:
    if not hasattr(np, _np_alias):
        setattr(np, _np_alias, _py_type)

import warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

# 3. Ensure ffmpeg executable directory is in PATH before importing SadTalker/pydub
ROOT_DIR = Path(__file__).resolve().parent.parent
SADTALKER_DIR = Path(__file__).resolve().parent / 'SadTalker'

def ensure_ffmpeg_in_path():
    static_ffmpeg = ROOT_DIR / 'node_modules' / 'ffmpeg-static' / 'ffmpeg.exe'
    if static_ffmpeg.exists():
        os.environ['PATH'] = str(static_ffmpeg.parent) + os.pathsep + os.environ.get('PATH', '')
        return str(static_ffmpeg)
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and Path(exe).exists():
            shim_dir = ROOT_DIR / 'ai_engines' / 'bin'
            shim_dir.mkdir(parents=True, exist_ok=True)
            shim_exe = shim_dir / 'ffmpeg.exe'
            if not shim_exe.exists():
                shutil.copy2(exe, shim_exe)
            os.environ['PATH'] = str(shim_dir) + os.pathsep + os.environ.get('PATH', '')
            return str(shim_exe)
    except Exception:
        pass
    return 'ffmpeg'

FFMPEG_EXE = ensure_ffmpeg_in_path()

# Add SadTalker to sys.path and set working directory when running inference
sys.path.insert(0, str(SADTALKER_DIR))
os.chdir(str(SADTALKER_DIR))

from time import strftime
import torch
from src.utils.preprocess import CropAndExtract
from src.test_audio2coeff import Audio2Coeff
from src.facerender.animate import AnimateFromCoeff
from src.generate_batch import get_data
from src.generate_facerender_batch import get_facerender_data
from src.utils.init_path import init_path


def convert_audio_to_wav(input_audio: Path, work_dir: Path) -> Path:
    wav_path = work_dir / 'speech_16k.wav'
    cmd = [
        FFMPEG_EXE, '-y',
        '-i', str(input_audio),
        '-acodec', 'pcm_s16le',
        '-ac', '1',
        '-ar', '16000',
        str(wav_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0 or not wav_path.exists():
        raise RuntimeError(f'FFmpeg audio conversion failed: {res.stderr[-400:]}')
    return wav_path


def run_avatar(args):
    device = 'cuda' if torch.cuda.is_available() and not args.cpu else 'cpu'
    print(f'[AvatarEngine] Device: {device} | Size: {args.size} | Enhancer: {args.enhancer or "none"} | Preprocess: {args.preprocess}', flush=True)

    work_dir = Path(args.work_dir).resolve()
    work_dir.mkdir(parents=True, exist_ok=True)

    wav_audio = convert_audio_to_wav(Path(args.audio).resolve(), work_dir)
    print(f'[AvatarEngine] Prepared 16kHz mono WAV: {wav_audio}', flush=True)

    checkpoint_dir = str(SADTALKER_DIR / 'checkpoints')
    config_dir = str(SADTALKER_DIR / 'src' / 'config')
    sadtalker_paths = init_path(checkpoint_dir, config_dir, args.size, False, args.preprocess)

    print('[AvatarEngine] Loading SadTalker AI models...', flush=True)
    preprocess_model = CropAndExtract(sadtalker_paths, device)
    audio_to_coeff = Audio2Coeff(sadtalker_paths, device)
    animate_from_coeff = AnimateFromCoeff(sadtalker_paths, device)

    first_frame_dir = str(work_dir / 'first_frame_dir')
    os.makedirs(first_frame_dir, exist_ok=True)
    print('[AvatarEngine] Extracting 3D face landmarks from speaker photo...', flush=True)
    first_coeff_path, crop_pic_path, crop_info = preprocess_model.generate(
        str(Path(args.image).resolve()),
        first_frame_dir,
        args.preprocess,
        source_image_flag=True,
        pic_size=args.size
    )
    if first_coeff_path is None:
        raise RuntimeError('ફોટામાં ચહેરો સ્પષ્ટ દેખાયો નહીં (Face not detected). કૃપા કરીને સીધો, સ્પષ્ટ ચહેરાનો ફોટો અપલોડ કરો.')

    print('[AvatarEngine] Synthesizing realistic lip-sync & head motion from speech...', flush=True)
    batch = get_data(first_coeff_path, str(wav_audio), device, None, still=args.still)
    coeff_path = audio_to_coeff.generate(batch, str(work_dir), args.pose_style, None)

    print('[AvatarEngine] Rendering high-realism talking video frames on GPU...', flush=True)
    data = get_facerender_data(
        coeff_path,
        crop_pic_path,
        first_coeff_path,
        str(wav_audio),
        args.batch_size,
        None,
        None,
        None,
        expression_scale=args.expression_scale,
        still_mode=args.still,
        preprocess=args.preprocess,
        size=args.size
    )

    enhancer = args.enhancer if args.enhancer in ('gfpgan', 'RestoreFormer') else None
    result_mp4 = animate_from_coeff.generate(
        data,
        str(work_dir),
        str(Path(args.image).resolve()),
        crop_info,
        enhancer=enhancer,
        background_enhancer=None,
        preprocess=args.preprocess,
        img_size=args.size
    )

    out_path = Path(args.output).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(result_mp4, str(out_path))
    print(f'[AvatarEngine] SUCCESS -> {out_path}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', required=True)
    parser.add_argument('--audio', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--work-dir', required=True)
    parser.add_argument('--size', type=int, default=256, choices=[256, 512])
    parser.add_argument('--preprocess', default='full', choices=['crop', 'extcrop', 'resize', 'full', 'extfull'])
    parser.add_argument('--enhancer', default='gfpgan')
    parser.add_argument('--still', action='store_true')
    parser.add_argument('--expression-scale', type=float, default=1.1)
    parser.add_argument('--pose-style', type=int, default=0)
    parser.add_argument('--batch-size', type=int, default=4)
    parser.add_argument('--cpu', action='store_true')
    parsed = parser.parse_args()
    run_avatar(parsed)
