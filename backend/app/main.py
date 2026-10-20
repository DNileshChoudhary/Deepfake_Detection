import os
import time
import shutil
import tempfile
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .visual_detector import VisualDeepfakeDetector
from .audio_detector import AudioDeepfakeDetector
from .sync_check import LipSyncChecker
from .fusion import MultimodalFusionLayer
from .utils import extract_audio_from_video, sample_video_frames

# Global model references
visual_detector: VisualDeepfakeDetector = None
audio_detector: AudioDeepfakeDetector = None
sync_checker: LipSyncChecker = None
fusion_layer: MultimodalFusionLayer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global visual_detector, audio_detector, sync_checker, fusion_layer
    print("[Startup] Initializing Multimodal Deepfake Detection Pipeline...")
    visual_detector = VisualDeepfakeDetector()
    audio_detector = AudioDeepfakeDetector()
    sync_checker = LipSyncChecker()
    fusion_layer = MultimodalFusionLayer()
    print("[Startup] All Multimodal AI models successfully initialized!")
    yield
    print("[Shutdown] Cleaning up pipeline resources.")

app = FastAPI(
    title="Real-Time Deepfake Detection using Multimodal AI",
    description="Multimodal deepfake detection REST API combining ViT visual analysis, Wav2Vec2 audio detection, MediaPipe lip-sync check, and explainability layer.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Real-Time Multimodal Deepfake Detection API is running.",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }

@app.get("/api/health")
def health_check():
    import torch
    return {
        "status": "online",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "models": {
            "visual_vit": visual_detector is not None,
            "audio_wav2vec2": audio_detector is not None,
            "mediapipe_lip_sync": sync_checker is not None and sync_checker.landmarker is not None,
            "fusion_layer": fusion_layer is not None
        }
    }

@app.get("/api/models")
def get_models_info():
    """Information about models and algorithms for review Q&A."""
    return {
        "visual_branch": {
            "model_architecture": "Vision Transformer (ViT-Base-Patch16-224)",
            "hf_model_id": "dima806/deepfake_vs_real_image_detection",
            "weights": "Pretrained on FaceForensics++ / Deepfake datasets",
            "face_detector": "OpenCV Haar-Cascade & Geometric Anchor Cropping",
            "explainability": "Grad-CAM attention heatmap overlay over 14x14 ViT patch tokens"
        },
        "audio_branch": {
            "model_architecture": "Wav2Vec2 Audio Transformer",
            "hf_model_id": "MelodyMachine/Deepfake-audio-detection",
            "weights": "Fine-tuned on synthetic speech and voice clone spoofing benchmarks",
            "features_extracted": [
                "13 MFCCs (Mel-Frequency Cepstral Coefficients)",
                "Pitch / Fundamental Frequency (F0 tracking)",
                "Spectral Contrast across 7 octave bands",
                "Spectral Centroid and Flatness (vocoder artifact detection)",
                "Zero Crossing Rate"
            ]
        },
        "lip_sync_branch": {
            "landmarks_model": "Google MediaPipe FaceLandmarker (478 3D Mesh + Blendshapes)",
            "metric": "Mouth Aspect Ratio & jawOpen blendshape vs Audio RMS Speech Energy Envelope",
            "correlation_analysis": "Pearson correlation coefficient + phoneme-viseme desynchronization penalty"
        },
        "fusion_layer": {
            "strategy": "Dynamic Multimodal Calibrated Weighting with explainability attribution",
            "base_weights": {"visual": 0.45, "audio": 0.35, "sync": 0.20}
        }
    }

@app.post("/api/detect/upload")
async def detect_uploaded_video(video: UploadFile = File(...)):
    """
    Analyzes an uploaded video file (MP4, WebM, MOV, AVI)
    running the end-to-end multimodal pipeline.
    """
    start_time = time.time()
    
    # Save uploaded video to temporary file
    suffix = os.path.splitext(video.filename)[1] or ".mp4"
    temp_video = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    temp_wav = None
    
    try:
        shutil.copyfileobj(video.file, temp_video)
        temp_video.close()
        
        # 1. Sample frames (12 frames for thorough video clip analysis)
        sampled_frames = sample_video_frames(temp_video.name, max_frames=12)
        if not sampled_frames:
            raise HTTPException(status_code=400, detail="Could not read video frames from uploaded file.")
            
        # 2. Extract audio
        temp_wav = extract_audio_from_video(temp_video.name, target_sr=16000)
        
        # 3. Visual Branch
        visual_result = visual_detector.analyze_frames(sampled_frames)
        
        # 4. Audio Branch
        audio_result = audio_detector.analyze_audio_file(temp_wav)
        
        # 5. Lip-Sync Branch
        sync_result = sync_checker.analyze_lip_sync(sampled_frames, temp_wav)
        
        # 6. Multimodal Fusion
        fusion_result = fusion_layer.fuse(visual_result, audio_result, sync_result)
        
        elapsed_s = round(time.time() - start_time, 2)
        
        return {
            "status": "success",
            "filename": video.filename,
            "processing_time_s": elapsed_s,
            "fusion": fusion_result,
            "visual": visual_result,
            "audio": audio_result,
            "sync": sync_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Upload Error] {e}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
    finally:
        # Cleanup temporary files
        if os.path.exists(temp_video.name):
            try:
                os.remove(temp_video.name)
            except Exception:
                pass
        if temp_wav and os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass

@app.post("/api/detect/chunk")
async def detect_webcam_chunk(chunk: UploadFile = File(...)):
    """
    Analyzes a 2-3 second rolling audio/video chunk from browser webcam.
    Optimized for low-latency near-real-time streaming inference.
    """
    start_time = time.time()
    
    # Save chunk
    suffix = os.path.splitext(chunk.filename)[1] or ".webm"
    temp_chunk = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    temp_wav = None
    
    try:
        shutil.copyfileobj(chunk.file, temp_chunk)
        temp_chunk.close()
        
        # Sample 6 frames for fast turnaround (< 1.5s)
        sampled_frames = sample_video_frames(temp_chunk.name, max_frames=6)
        if not sampled_frames:
            # Fallback if container was empty or zero frame
            return {
                "status": "partial",
                "message": "Waiting for continuous stream frames...",
                "processing_time_s": round(time.time() - start_time, 2),
                "fusion": {
                    "verdict": "Streaming...",
                    "verdict_badge": "STREAMING",
                    "status_color": "gray",
                    "confidence_pct": 50.0,
                    "authenticity_score": 0.5,
                    "fake_score": 0.5,
                    "dominant_modality": "Awaiting Frame Sequence",
                    "summary_explanation": "Buffering webcam chunk..."
                },
                "visual": {"visual_score": 0.5, "fake_score": 0.5, "faces_detected": 0, "gradcam_base64": None},
                "audio": {"audio_score": 0.5, "has_audio": False},
                "sync": {"sync_score": 0.5, "lip_sync_mismatch": False, "plot_series": []}
            }
            
        # Audio extraction
        temp_wav = extract_audio_from_video(temp_chunk.name, target_sr=16000)
        
        # Visual analysis
        visual_result = visual_detector.analyze_frames(sampled_frames)
        
        # Audio analysis
        audio_result = audio_detector.analyze_audio_file(temp_wav)
        
        # Lip-sync analysis
        sync_result = sync_checker.analyze_lip_sync(sampled_frames, temp_wav)
        
        # Multimodal Fusion
        fusion_result = fusion_layer.fuse(visual_result, audio_result, sync_result)
        
        elapsed_s = round(time.time() - start_time, 2)
        
        return {
            "status": "success",
            "processing_time_s": elapsed_s,
            "fusion": fusion_result,
            "visual": visual_result,
            "audio": audio_result,
            "sync": sync_result
        }
    except Exception as e:
        print(f"[Chunk Error] {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
    finally:
        if os.path.exists(temp_chunk.name):
            try:
                os.remove(temp_chunk.name)
            except Exception:
                pass
        if temp_wav and os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass
