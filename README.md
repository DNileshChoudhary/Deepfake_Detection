# Real-Time Deepfake Detection using Multimodal AI

A multimodal deepfake detection system engineered for college project demonstrations and technical review. The system analyzes both video and audio streams simultaneously to catch synthetic face replacements, voice cloning, and phoneme-viseme desynchronization in real time.

---

## 🌟 Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Input Media (Upload or Webcam)      │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┼────────────────────────┐
                 ▼                       ▼                        ▼
       ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
       │  Visual Branch   │    │   Audio Branch   │    │  Lip-Sync Branch │
       ├──────────────────┤    ├──────────────────┤    ├──────────────────┤
       │ OpenCV Face Crop │    │  16kHz Downmix   │    │ MediaPipe Mesh   │
       │ ViT Transformer  │    │ Wav2Vec2 Spoof   │    │ Blendshape jaw   │
       │ Grad-CAM Heatmap │    │ MFCCs / Flatness │    │ vs Audio RMS     │
       └─────────┬────────┘    └────────┬─────────┘    └────────┬─────────┘
                 │                      │                       │
                 └──────────────────────┼───────────────────────┘
                                        ▼
                      ┌──────────────────────────────────┐
                      │     Multimodal Fusion Layer      │
                      ├──────────────────────────────────┤
                      │ Calibrated Dynamic Weighting     │
                      │ S_auth = 0.45(V)+0.35(A)+0.20(S) │
                      │ Modality Attribution Breakdown   │
                      └─────────────────┬────────────────┘
                                        ▼
                      ┌──────────────────────────────────┐
                      │ Master Verdict Badge & Dashboard │
                      │ ("Likely Manipulated" / "Real")  │
                      └──────────────────────────────────┘
```

---

## 🔬 Pretrained Models & Datasets (For Review Q&A)

| Modality Branch | Model Architecture | Hugging Face ID / Source | Pretrained Dataset / Benchmark | Purpose & Output |
| :--- | :--- | :--- | :--- | :--- |
| **Visual Branch** | **Vision Transformer** (ViT-Base-Patch16-224) | `dima806/deepfake_vs_real_image_detection` | FaceForensics++, Celeb-DF, Deepfake Detection Challenge (DFDC) | Classifies facial blending seams and generative artifacts. Outputs `visual_score` (0–1). |
| **Audio Branch** | **Wav2Vec2 Audio Transformer** | `MelodyMachine/Deepfake-audio-detection` | ASVspoof 2019/2021, In-the-Wild Audio Deepfake Dataset | Detects synthetic speech, vocoder phase distortion, and neural TTS. Outputs `audio_score` (0–1). |
| **Acoustic Features** | **Spectral Feature Extractor** | `librosa` | 13 MFCCs, F0 pitch tracking (YIN algorithm), Spectral Flatness & Centroid | Quantifies robotic frequency flattening and harmonic unnaturalness. |
| **Lip-Sync Check** | **MediaPipe FaceLandmarker** | Google MediaPipe 478 3D Mesh (`face_landmarker.task`) | Google MediaPipe Blendshapes Benchmark | Computes `jawOpen` aperture and lip distance vs speech energy envelope cross-correlation. |
| **Explainability** | **Grad-CAM Attention Map** | PyTorch backward hooks on ViT layernorm | 196 patch tokens (14×14 grid) | Overlays thermal Jet colormap on face highlighting manipulation regions. |

---

## 📐 Multimodal Fusion Formulation

The system computes an overall authenticity score $S_{\text{authenticity}} \in [0.0, 1.0]$:

$$S_{\text{authenticity}} = (w_v \cdot S_{\text{visual}}) + (w_a \cdot S_{\text{audio}}) + (w_s \cdot S_{\text{sync}})$$

- **Base Weights**: $w_v = 0.45$ (Visual), $w_a = 0.35$ (Audio), $w_s = 0.20$ (Lip-Sync).
- **Dynamic Recalibration**:
  - If lip-sync correlation divergence is severe ($r < 0.1$ or mismatch penalty high), $w_s$ is elevated up to $0.35$ to flag dubbing/desync.
  - If no audio stream is detected (silent clip), $w_v = 1.0, w_a = 0, w_s = 0$.
  - If no face is detected, $w_a = 1.0, w_v = 0, w_s = 0$.
- **Decision Verdict Thresholds**:
  - $S_{\text{authenticity}} \le 0.42$: **Likely Manipulated (Deepfake)**
  - $S_{\text{authenticity}} \ge 0.60$: **Likely Real (Authentic Media)**
  - $0.42 < S_{\text{authenticity}} < 0.60$: **Suspicious / Inconclusive**

---

## 🚀 Running Locally

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.11)
- **Node.js**: 18+ (tested on Node v22)
- **Webcam & Microphone** (for live webcam testing)

---

### 1. Backend Setup (FastAPI + PyTorch)

Open a terminal in the project root:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment (if not already created)
python -m venv venv

# 3. Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the FastAPI backend server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be live at:
- **API URL**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### 2. Frontend Setup (Next.js + Tailwind CSS)

Open a second terminal:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if needed)
npm install

# 3. Start the Next.js dev server
npm run dev
```

The frontend dashboard will be live at:
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)

---

## 🎯 How to Demonstrate in the Review

1. **Open the Web Application**: Open [http://localhost:3000](http://localhost:3000). Check that the top status pill says `API Online (CPU)`.
2. **Demo Authentic Video**:
   - In the "Upload Video" tab, click the **"Load Authentic Clip"** button under Quick Demo Samples.
   - Click **"Run Multimodal Deepfake Detection"**.
   - Observe: Visual score is high (~80% Real), Lip-Sync score is high (~96% Sync with $r > 0.9$), and the Lip-Sync waveform shows tightly aligned mouth aperture and audio energy.
3. **Demo Manipulated / Desynchronized Video**:
   - Click the **"Load Manipulated Clip"** button.
   - Click **"Run Multimodal Deepfake Detection"**.
   - Observe: Master Verdict turns **"Likely Manipulated"**, dominant factor flags **"Lip-Sync Desynchronization"** ($r = -0.30$), and Grad-CAM displays the thermal anomaly focus.
4. **Demo Live Webcam Stream**:
   - Switch to the **"Live Webcam"** tab.
   - Click **"Start Live Webcam Detection"**.
   - Allow camera and microphone permissions in the browser.
   - Speak into the microphone and watch the live volume indicator, rolling chunk stream, and dynamic confidence updates!
5. **Examiner Q&A**:
   - Click the **"Project Specs & Q&A"** button in the header to display the architecture diagram and defense questions.

---

## 📂 Project Directory Structure

```
Deepfake_Detection/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI server routes & CORS
│   │   ├── visual_detector.py   # ViT deepfake classifier & Grad-CAM
│   │   ├── audio_detector.py    # Wav2Vec2 classifier & Librosa spectral features
│   │   ├── sync_check.py        # MediaPipe blendshapes vs audio RMS correlation
│   │   ├── fusion.py            # Multimodal fusion & explainability attribution
│   │   ├── utils.py             # FFmpeg audio extract & frame sampling
│   │   └── models/              # Pretrained models (face_landmarker.task, haarcascade)
│   ├── samples/                 # Sample authentic and manipulated demo MP4 clips
│   ├── create_demo_samples.py   # Script generating sample demo videos
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout & dark theme metadata
│   │   │   ├── page.tsx         # Master dashboard integrating tabs
│   │   │   └── globals.css      # Tailwind CSS v4 styling
│   │   ├── components/
│   │   │   ├── Header.tsx           # Branding & live status
│   │   │   ├── VerdictBadge.tsx     # Master verdict, confidence & latency
│   │   │   ├── MetricsBreakdown.tsx # 3-branch modality metrics
│   │   │   ├── GradCamViewer.tsx    # Thermal facial attention overlay
│   │   │   ├── LipSyncChart.tsx     # SVG viseme-phoneme alignment chart
│   │   │   ├── VideoUploader.tsx    # Drag-and-drop & quick sample loader
│   │   │   ├── WebcamDetector.tsx   # Live rolling chunk webcam recorder
│   │   │   └── ArchitectureModal.tsx# Review Q&A & pipeline specifications
│   │   └── lib/
│   │       └── api.ts               # REST API client
│   └── package.json
└── README.md
```
