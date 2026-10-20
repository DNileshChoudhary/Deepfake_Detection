const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DetectionResult {
  status: string;
  filename?: string;
  processing_time_s: number;
  fusion: {
    verdict: string;
    verdict_badge: "REAL" | "FAKE" | "UNCERTAIN" | "STREAMING";
    status_color: "emerald" | "red" | "amber" | "gray";
    confidence_pct: number;
    authenticity_score: number;
    fake_score: number;
    weights_used: {
      visual: number;
      audio: number;
      sync: number;
    };
    fake_contributions: {
      visual: number;
      audio: number;
      sync: number;
    };
    dominant_modality: string;
    modality_reason: string;
    summary_explanation: string;
  };
  visual: {
    visual_score: number;
    fake_score: number;
    faces_detected: number;
    frames_analyzed: number;
    per_frame_scores?: Array<{
      timestamp: number;
      fake_prob: number;
      real_prob: number;
      box?: [number, number, number, number];
    }>;
    gradcam_base64: string | null;
    explanation: string;
  };
  audio: {
    has_audio: boolean;
    audio_score: number;
    fake_score: number;
    duration_s?: number;
    spectral_features?: {
      mfcc_13: number[];
      spectral_centroid_hz: number;
      spectral_contrast_mean: number;
      contrast_bands: number[];
      spectral_flatness: number;
      zero_crossing_rate: number;
      pitch_f0_hz: number;
    };
    explanation: string;
  };
  sync: {
    sync_score: number;
    correlation: number;
    lip_sync_mismatch: boolean;
    confidence: number;
    plot_series: Array<{
      time_s: number;
      mouth_aperture: number;
      audio_energy: number;
    }>;
    explanation: string;
  };
}

export interface SystemHealth {
  status: string;
  device: string;
  models: {
    visual_vit: boolean;
    audio_wav2vec2: boolean;
    mediapipe_lip_sync: boolean;
    fusion_layer: boolean;
  };
}

export async function checkBackendHealth(): Promise<SystemHealth | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function fetchModelsInfo(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/models`, {
      method: "GET",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function uploadVideoForDetection(file: File): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("video", file);

  const res = await fetch(`${API_BASE_URL}/api/detect/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }

  return await res.json();
}

export async function sendWebcamChunk(chunkBlob: Blob): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("chunk", chunkBlob, "webcam_chunk.webm");

  const res = await fetch(`${API_BASE_URL}/api/detect/chunk`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Chunk inference failed" }));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }

  return await res.json();
}
