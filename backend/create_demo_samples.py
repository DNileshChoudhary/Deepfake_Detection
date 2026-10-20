"""
Demo Sample Generator for College Project Review
Generates 2 sample clips:
1. sample_authentic.mp4: Synthetic face with natural mouth movement synchronized to audio tone
2. sample_manipulated.mp4: Synthetic face with desynchronized audio and visual boundary distortion
"""
import os
import math
import subprocess
import tempfile
import cv2
import numpy as np
import soundfile as sf
import imageio_ffmpeg

def create_samples():
    samples_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")
    os.makedirs(samples_dir, exist_ok=True)
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    # 1. Create Authentic Sample (3 seconds, 24 fps = 72 frames)
    print("Generating sample_authentic.mp4...")
    fps = 24
    duration = 3.0
    total_frames = int(fps * duration)
    sr = 16000
    total_samples = int(sr * duration)

    # Audio: 220Hz harmonic voice vowel sound (pulse train / formant)
    t_audio = np.linspace(0, duration, total_samples, endpoint=False)
    # 2 vowels alternating at 1.5 Hz
    envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 1.5 * t_audio)
    carrier = np.sin(2 * np.pi * 220 * t_audio) + 0.5 * np.sin(2 * np.pi * 440 * t_audio) + 0.25 * np.sin(2 * np.pi * 660 * t_audio)
    audio_wav = (carrier * envelope * 0.4).astype(np.float32)

    temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_wav.close()
    sf.write(temp_wav.name, audio_wav, sr)

    # Video frames: drawing a stylized face with mouth aperture opening exactly with envelope
    temp_avi = tempfile.NamedTemporaryFile(suffix=".avi", delete=False)
    temp_avi.close()
    fourcc = cv2.VideoWriter_fourcc(*'MJPG')
    out = cv2.VideoWriter(temp_avi.name, fourcc, fps, (480, 480))

    for i in range(total_frames):
        t_frame = i / fps
        frame = np.full((480, 480, 3), (35, 25, 20), dtype=np.uint8) # Dark studio bg

        # Face oval
        cv2.ellipse(frame, (240, 240), (120, 150), 0, 0, 360, (180, 150, 130), -1)

        # Eyes
        cv2.circle(frame, (195, 210), 12, (255, 255, 255), -1)
        cv2.circle(frame, (285, 210), 12, (255, 255, 255), -1)
        cv2.circle(frame, (195, 210), 6, (40, 30, 20), -1)
        cv2.circle(frame, (285, 210), 6, (40, 30, 20), -1)

        # Nose
        cv2.line(frame, (240, 230), (235, 260), (150, 120, 100), 3)
        cv2.line(frame, (235, 260), (245, 260), (150, 120, 100), 3)

        # Mouth aperture synchronized with envelope
        env_val = 0.5 + 0.5 * np.sin(2 * np.pi * 1.5 * t_frame)
        mouth_h = int(6 + 22 * env_val)
        cv2.ellipse(frame, (240, 305), (32, mouth_h), 0, 0, 360, (70, 50, 130), -1)
        cv2.ellipse(frame, (240, 305), (32, mouth_h), 0, 0, 360, (90, 70, 170), 2)

        out.write(frame)

    out.release()

    # Mux with FFmpeg to H.264 + AAC MP4
    auth_mp4 = os.path.join(samples_dir, "sample_authentic.mp4")
    cmd_mux = [
        ffmpeg_exe, "-y",
        "-i", temp_avi.name,
        "-i", temp_wav.name,
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        auth_mp4
    ]
    subprocess.run(cmd_mux, check=True)
    os.remove(temp_avi.name)
    os.remove(temp_wav.name)
    print(f"Created: {auth_mp4} ({os.path.getsize(auth_mp4)} bytes)")

    # 2. Create Manipulated / Desync Sample
    print("Generating sample_manipulated.mp4...")
    temp_wav2 = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_wav2.close()
    # Desync audio: phase shifted by 180 degrees (peak audio when mouth is closed) + vocoder noise
    env_desync = 0.5 + 0.5 * np.sin(2 * np.pi * 1.5 * t_audio + np.pi)
    vocoder_noise = np.random.normal(0, 0.08, total_samples)
    audio_wav2 = ((carrier * env_desync * 0.4) + vocoder_noise).astype(np.float32)
    sf.write(temp_wav2.name, audio_wav2, sr)

    temp_avi2 = tempfile.NamedTemporaryFile(suffix=".avi", delete=False)
    temp_avi2.close()
    out2 = cv2.VideoWriter(temp_avi2.name, fourcc, fps, (480, 480))

    for i in range(total_frames):
        t_frame = i / fps
        frame = np.full((480, 480, 3), (35, 25, 20), dtype=np.uint8)

        # Face oval with artificial color warping seam
        cv2.ellipse(frame, (240, 240), (120, 150), 0, 0, 360, (140, 180, 120), -1)
        # Deepfake boundary blending artifact circle
        cv2.circle(frame, (240, 240), 90, (100, 220, 150), 4)

        # Eyes with asymmetry artifact
        cv2.circle(frame, (195, 210), 15, (255, 255, 255), -1)
        cv2.circle(frame, (285, 210), 9, (255, 255, 255), -1)
        cv2.circle(frame, (195, 210), 7, (40, 30, 20), -1)
        cv2.circle(frame, (285, 210), 4, (40, 30, 20), -1)

        # Mouth opening out of phase
        env_val = 0.5 + 0.5 * np.sin(2 * np.pi * 1.5 * t_frame)
        mouth_h = int(6 + 24 * env_val)
        cv2.ellipse(frame, (240, 305), (32, mouth_h), 0, 0, 360, (70, 50, 130), -1)

        out2.write(frame)

    out2.release()

    manip_mp4 = os.path.join(samples_dir, "sample_manipulated.mp4")
    cmd_mux2 = [
        ffmpeg_exe, "-y",
        "-i", temp_avi2.name,
        "-i", temp_wav2.name,
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        manip_mp4
    ]
    subprocess.run(cmd_mux2, check=True)
    os.remove(temp_avi2.name)
    os.remove(temp_wav2.name)
    print(f"Created: {manip_mp4} ({os.path.getsize(manip_mp4)} bytes)")

if __name__ == "__main__":
    create_samples()
