import os
import subprocess
import tempfile
import cv2
import base64
import numpy as np
import imageio_ffmpeg

def get_ffmpeg_binary():
    """Retrieve bundled ffmpeg executable path."""
    return imageio_ffmpeg.get_ffmpeg_exe()

def extract_audio_from_video(video_path: str, target_sr: int = 16000) -> str | None:
    """
    Extracts audio from a video file and converts it to a 16kHz mono WAV file.
    Returns path to temporary wav file, or None if no audio exists.
    """
    ffmpeg_exe = get_ffmpeg_binary()
    temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_wav.close()
    
    cmd = [
        ffmpeg_exe,
        "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", str(target_sr),
        "-ac", "1",
        temp_wav.name
    ]
    
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if result.returncode == 0 and os.path.exists(temp_wav.name) and os.path.getsize(temp_wav.name) > 1000:
            return temp_wav.name
        else:
            if os.path.exists(temp_wav.name):
                os.remove(temp_wav.name)
            return None
    except Exception as e:
        if os.path.exists(temp_wav.name):
            os.remove(temp_wav.name)
        return None

def sample_video_frames(video_path: str, max_frames: int = 12) -> list[tuple[float, np.ndarray]]:
    """
    Samples up to max_frames uniformly spaced across the video duration.
    Returns list of (timestamp_seconds, frame_bgr) tuples.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    duration = total_frames / fps if total_frames > 0 else 0
    
    if total_frames <= 0:
        # Fallback reading sequentially
        frames = []
        count = 0
        while True:
            ret, frame = cap.read()
            if not ret or count > 120:
                break
            t = count / fps
            frames.append((t, frame))
            count += 1
        cap.release()
        if len(frames) == 0:
            return []
        step = max(1, len(frames) // max_frames)
        return frames[::step][:max_frames]
    
    # Calculate uniform indices
    if total_frames <= max_frames:
        indices = list(range(total_frames))
    else:
        indices = np.linspace(0, total_frames - 1, max_frames, dtype=int).tolist()
    
    sampled = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret and frame is not None:
            t = idx / fps
            sampled.append((t, frame))
    cap.release()
    return sampled

def image_to_base64(image_bgr: np.ndarray, quality: int = 85) -> str:
    """Encodes BGR numpy image to base64 data URL."""
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    ret, buffer = cv2.imencode('.jpg', image_bgr, encode_params)
    if not ret:
        return ""
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"
