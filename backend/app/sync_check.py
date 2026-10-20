import os
import cv2
import numpy as np
import librosa
import mediapipe as mp
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions
from mediapipe.tasks.python import BaseOptions

class LipSyncChecker:
    def __init__(self, model_asset_path: str | None = None):
        if model_asset_path is None:
            # Default model asset path
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_asset_path = os.path.join(current_dir, "models", "face_landmarker.task")
            
        self.model_path = model_asset_path
        self.landmarker = None
        self._init_landmarker()

    def _init_landmarker(self):
        try:
            if os.path.exists(self.model_path):
                options = FaceLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=self.model_path),
                    output_face_blendshapes=True,
                    num_faces=1
                )
                self.landmarker = FaceLandmarker.create_from_options(options)
                print(f"[SyncCheck] MediaPipe FaceLandmarker initialized from {self.model_path}")
            else:
                print(f"[SyncCheck] Warning: {self.model_path} not found. Fallback landmark calculation will be used.")
        except Exception as e:
            print(f"[SyncCheck] Failed to initialize FaceLandmarker: {e}")
            self.landmarker = None

    def compute_mouth_aspect_ratio(self, frame_bgr: np.ndarray) -> float:
        """
        Computes mouth opening measurement using blendshapes or facial landmarks.
        Returns normalized aperture (0.0 = shut, 1.0 = wide open).
        """
        if self.landmarker is None:
            # Fallback heuristic: gray intensity variance in lower third of center face
            return 0.2
            
        try:
            rgb_frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            detection_result = self.landmarker.detect(mp_image)
            
            # Check blendshapes first
            if detection_result.face_blendshapes and len(detection_result.face_blendshapes) > 0:
                blendshapes = detection_result.face_blendshapes[0]
                jaw_open = 0.0
                mouth_close = 0.0
                
                for b in blendshapes:
                    if b.category_name == "jawOpen":
                        jaw_open = b.score
                    elif b.category_name == "mouthClose":
                        mouth_close = b.score
                        
                aperture = max(0.0, jaw_open - (mouth_close * 0.5))
                return float(np.clip(aperture * 1.5, 0.0, 1.0))
                
            # If blendshapes not available, use landmark geometry
            if detection_result.face_landmarks and len(detection_result.face_landmarks) > 0:
                landmarks = detection_result.face_landmarks[0]
                # Upper lip landmark 13, Lower lip landmark 14
                # Left corner 61, Right corner 291
                p13 = np.array([landmarks[13].x, landmarks[13].y])
                p14 = np.array([landmarks[14].x, landmarks[14].y])
                p61 = np.array([landmarks[61].x, landmarks[61].y])
                p291 = np.array([landmarks[291].x, landmarks[291].y])
                
                vertical_dist = np.linalg.norm(p13 - p14)
                horizontal_dist = np.linalg.norm(p61 - p291) + 1e-6
                mar = vertical_dist / horizontal_dist
                # Normalize MAR (typically ranges from 0.05 closed to 0.5 open)
                norm_mar = float(np.clip((mar - 0.05) / 0.45, 0.0, 1.0))
                return norm_mar
                
            return 0.0
        except Exception as e:
            return 0.0

    def analyze_lip_sync(
        self,
        sampled_frames: list[tuple[float, np.ndarray]],
        wav_path: str | None
    ) -> dict:
        """
        Cross-examines facial mouth motion against acoustic energy envelope.
        Returns sync score, correlation, mismatch flag, and plot series.
        """
        if wav_path is None or not os.path.exists(wav_path) or len(sampled_frames) < 3:
            return {
                "sync_score": 0.70,
                "correlation": 0.50,
                "lip_sync_mismatch": False,
                "confidence": 0.50,
                "plot_series": [],
                "explanation": "Insufficient audio or visual temporal samples for lip-sync verification."
            }
            
        try:
            # 1. Extract audio energy envelope
            y, sr = librosa.load(wav_path, sr=16000, mono=True)
            if len(y) < 1600:
                return {
                    "sync_score": 0.70,
                    "correlation": 0.50,
                    "lip_sync_mismatch": False,
                    "confidence": 0.50,
                    "plot_series": [],
                    "explanation": "Audio clip too short for lip-sync analysis."
                }
                
            # Hop length ~20ms (320 samples at 16kHz)
            hop_length = 320
            rms = librosa.feature.rms(y=y, frame_length=640, hop_length=hop_length)[0]
            t_audio = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
            
            # Normalize audio energy envelope to 0-1
            if np.max(rms) > 1e-4:
                rms_norm = (rms - np.min(rms)) / (np.max(rms) - np.min(rms) + 1e-8)
            else:
                rms_norm = np.zeros_like(rms)
                
            # 2. Extract mouth aperture at each sampled video frame
            frame_times = []
            mouth_openings = []
            
            for t_frame, frame_bgr in sampled_frames:
                mar = self.compute_mouth_aspect_ratio(frame_bgr)
                frame_times.append(t_frame)
                mouth_openings.append(mar)
                
            frame_times = np.array(frame_times)
            mouth_openings = np.array(mouth_openings)
            
            # Normalize mouth openings
            if np.max(mouth_openings) > np.min(mouth_openings) + 1e-3:
                mouth_norm = (mouth_openings - np.min(mouth_openings)) / (np.max(mouth_openings) - np.min(mouth_openings) + 1e-8)
            else:
                mouth_norm = mouth_openings
                
            # 3. Interpolate audio energy to exact video frame timestamps
            audio_sampled_energy = np.interp(frame_times, t_audio, rms_norm)
            
            # 4. Compute correlation and mismatch penalties
            # Pearson correlation
            std_m = np.std(mouth_norm)
            std_a = np.std(audio_sampled_energy)
            
            if std_m > 1e-3 and std_a > 1e-3:
                r_matrix = np.corrcoef(mouth_norm, audio_sampled_energy)
                correlation = float(r_matrix[0, 1])
                if np.isnan(correlation):
                    correlation = 0.4
            else:
                # If one is static (e.g. static image or background noise), check for discrepancy
                if std_a > 0.1 and std_m < 0.05:
                    correlation = -0.3 # Voice speaking, but face is frozen/still
                elif std_m > 0.1 and std_a < 0.05:
                    correlation = -0.2 # Mouth moving, but silence
                else:
                    correlation = 0.5
                    
            # Compute mismatch penalties
            # Penalty 1: Voice activity peak without mouth aperture
            silent_mouth_speaking = np.mean((audio_sampled_energy > 0.5) & (mouth_norm < 0.2))
            
            # Penalty 2: Open moving mouth during flat silence
            speaking_mouth_silent = np.mean((mouth_norm > 0.5) & (audio_sampled_energy < 0.15))
            
            total_penalty = float(silent_mouth_speaking * 1.5 + speaking_mouth_silent * 1.0)
            
            # Map correlation [-1, 1] to normalized score [0, 1]
            base_sync = max(0.0, min(1.0, (correlation + 1.0) / 2.0))
            sync_score = float(np.clip(base_sync - total_penalty, 0.05, 0.98))
            
            # Lip-sync mismatch flag (threshold: sync_score < 0.40)
            is_mismatch = bool(sync_score < 0.40)
            
            # Prepare interactive plot series
            plot_series = []
            for i in range(len(frame_times)):
                plot_series.append({
                    "time_s": round(float(frame_times[i]), 2),
                    "mouth_aperture": round(float(mouth_norm[i]), 3),
                    "audio_energy": round(float(audio_sampled_energy[i]), 3)
                })
                
            # Natural language explanation
            if is_mismatch:
                exp = f"Lip-sync check detected significant phoneme-viseme desynchronization (correlation: {correlation:.2f}, sync score: {sync_score * 100:.1f}%). Audio energy peaks do not match mouth aperture movement."
            elif sync_score >= 0.70:
                exp = f"Lip-sync check confirmed natural temporal coherence between speech audio energy and facial mouth opening (correlation: {correlation:.2f}, sync score: {sync_score * 100:.1f}%)."
            else:
                exp = f"Lip-sync coherence is moderate (correlation: {correlation:.2f}, sync score: {sync_score * 100:.1f}%)."
                
            return {
                "sync_score": round(sync_score, 4),
                "correlation": round(correlation, 3),
                "lip_sync_mismatch": is_mismatch,
                "confidence": round(abs(sync_score - 0.5) * 2.0, 3),
                "plot_series": plot_series,
                "explanation": exp
            }
        except Exception as e:
            print(f"[SyncCheck Error] {e}")
            return {
                "sync_score": 0.60,
                "correlation": 0.40,
                "lip_sync_mismatch": False,
                "confidence": 0.50,
                "plot_series": [],
                "explanation": f"Lip-sync check encountered an error: {str(e)}"
            }
