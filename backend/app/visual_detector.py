import os
import cv2
import torch
import numpy as np
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification
from .utils import image_to_base64

class VisualDeepfakeDetector:
    def __init__(self, model_name: str = "dima806/deepfake_vs_real_image_detection"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[VisualDetector] Initializing on {self.device} with model: {model_name}")
        
        self.processor = AutoImageProcessor.from_pretrained(model_name)
        self.model = AutoModelForImageClassification.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        # Load OpenCV Face Detector
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        cascade_path = os.path.join(curr_dir, "models", "haarcascade_frontalface_default.xml")
        if not os.path.exists(cascade_path):
            cascade_path = getattr(cv2.data, 'haarcascades', '') + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            print(f"[VisualDetector] Warning: Could not load cascade from {cascade_path}")
        else:
            print(f"[VisualDetector] Face cascade loaded from {cascade_path}")
        
        # Label indices
        self.id2label = self.model.config.id2label
        # Usually {0: 'Real', 1: 'Fake'}
        self.fake_label_idx = 1
        for idx, lbl in self.id2label.items():
            if "fake" in str(lbl).lower():
                self.fake_label_idx = int(idx)
                break
        self.real_label_idx = 1 - self.fake_label_idx

    def detect_and_crop_face(self, frame_bgr: np.ndarray, margin_ratio: float = 0.2) -> tuple[np.ndarray | None, tuple[int, int, int, int] | None]:
        """
        Detects primary face and crops with a margin.
        Returns (cropped_bgr, (x, y, w, h)) or (None, None).
        """
        if self.face_cascade.empty():
            return None, None

        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=3,
            minSize=(40, 40)
        )
        
        if len(faces) == 0:
            return None, None
            
        # Select largest face
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        
        # Add margin
        h_img, w_img = frame_bgr.shape[:2]
        mx = int(w * margin_ratio)
        my = int(h * margin_ratio)
        
        x1 = max(0, x - mx)
        y1 = max(0, y - my)
        x2 = min(w_img, x + w + mx)
        y2 = min(h_img, y + h + my)
        
        face_crop = frame_bgr[y1:y2, x1:x2]
        return face_crop, [int(x1), int(y1), int(x2 - x1), int(y2 - y1)]

    def generate_gradcam(self, face_bgr: np.ndarray, target_class: int = 1) -> str:
        """
        Computes Grad-CAM attention heatmap for ViT model on face image,
        overlays colormap onto face crop, and returns base64 data URL.
        """
        try:
            face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(face_rgb)
            inputs = self.processor(images=pil_img, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            activations = []
            gradients = []
            
            # Forward and backward hooks on the last layernorm
            def forward_hook(module, inp, outp):
                activations.append(outp)
                
            def backward_hook(module, grad_in, grad_out):
                gradients.append(grad_out[0])
                
            handle_fwd = self.model.vit.layernorm.register_forward_hook(forward_hook)
            handle_bwd = self.model.vit.layernorm.register_full_backward_hook(backward_hook)
            
            # Forward pass
            outputs = self.model(**inputs)
            logits = outputs.logits
            score = logits[0, target_class]
            
            self.model.zero_grad()
            score.backward(retain_graph=False)
            
            handle_fwd.remove()
            handle_bwd.remove()
            
            if len(activations) == 0 or len(gradients) == 0:
                return image_to_base64(face_bgr)
                
            act = activations[0].detach() # (1, 197, 768)
            grad = gradients[0].detach()  # (1, 197, 768)
            
            # Patch tokens (196 tokens representing 14x14 grid)
            weights = grad[:, 1:, :].mean(dim=1, keepdim=True)
            cam = (act[:, 1:, :] * weights).sum(dim=-1) # (1, 196)
            cam = torch.clamp(cam, min=0)[0].reshape(14, 14).cpu().numpy()
            
            # Normalize
            cam_min, cam_max = cam.min(), cam.max()
            cam = (cam - cam_min) / (cam_max - cam_min + 1e-8)
            
            # Resize heatmap to match face crop dimensions
            h, w = face_bgr.shape[:2]
            cam_resized = cv2.resize(cam, (w, h), interpolation=cv2.INTER_CUBIC)
            
            # Color map overlay
            heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
            overlay = cv2.addWeighted(face_bgr, 0.65, heatmap, 0.35, 0)
            
            # Draw subtle bounding border
            cv2.rectangle(overlay, (0, 0), (w - 1, h - 1), (0, 255, 255), 2)
            return image_to_base64(overlay)
        except Exception as e:
            print(f"[GradCAM Error] {e}")
            return image_to_base64(face_bgr)

    def analyze_frames(self, sampled_frames: list[tuple[float, np.ndarray]]) -> dict:
        """
        Analyzes sampled frames from video/webcam.
        Returns comprehensive visual authenticity report.
        """
        if not sampled_frames:
            return {
                "visual_score": 0.5,
                "fake_score": 0.5,
                "faces_detected": 0,
                "frames_analyzed": 0,
                "gradcam_base64": None,
                "explanation": "No frames provided for visual analysis."
            }
            
        crops = []
        timestamps = []
        boxes = []
        original_crops = []
        
        for t, frame in sampled_frames:
            crop, box = self.detect_and_crop_face(frame)
            if crop is not None:
                crops.append(crop)
                timestamps.append(t)
                boxes.append(box)
                original_crops.append(crop)
                
        # If no faces were detected by face cascade, analyze full frames center-cropped
        if len(crops) == 0:
            for t, frame in sampled_frames:
                h, w = frame.shape[:2]
                min_dim = min(h, w)
                y1 = (h - min_dim) // 2
                x1 = (w - min_dim) // 2
                crop = frame[y1:y1 + min_dim, x1:x1 + min_dim]
                crops.append(crop)
                timestamps.append(t)
                boxes.append([int(x1), int(y1), int(min_dim), int(min_dim)])
                original_crops.append(crop)
            face_detected_flag = False
        else:
            face_detected_flag = True
            
        # Run inference in batches or loop
        per_frame_scores = []
        max_fake_score = -1.0
        best_cam_crop = None
        
        with torch.no_grad():
            for i, crop in enumerate(crops):
                rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb)
                inputs = self.processor(images=pil_img, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                
                outputs = self.model(**inputs)
                probs = torch.softmax(outputs.logits, dim=-1)[0]
                
                fake_prob = float(probs[self.fake_label_idx].item())
                real_prob = float(probs[self.real_label_idx].item())
                
                cur_box = [int(v) for v in boxes[i]] if boxes[i] is not None else None
                per_frame_scores.append({
                    "timestamp": round(float(timestamps[i]), 2),
                    "fake_prob": round(float(fake_prob), 4),
                    "real_prob": round(float(real_prob), 4),
                    "box": cur_box
                })
                
                if fake_prob > max_fake_score:
                    max_fake_score = fake_prob
                    best_cam_crop = original_crops[i]
                    
        # Aggregate scores (mean probability across sampled sequence)
        avg_fake_prob = float(np.mean([s["fake_prob"] for s in per_frame_scores]))
        avg_real_prob = float(np.mean([s["real_prob"] for s in per_frame_scores]))
        
        # Authenticity score: 1.0 = definitely authentic, 0.0 = manipulated
        visual_authenticity = avg_real_prob
        
        # Generate Grad-CAM for the most suspicious frame (or median if all real)
        gradcam_b64 = None
        if best_cam_crop is not None:
            # Generate CAM highlighting the fake activations (or dominant class)
            target_class = self.fake_label_idx if avg_fake_prob >= 0.5 else self.real_label_idx
            gradcam_b64 = self.generate_gradcam(best_cam_crop, target_class=target_class)
            
        # Natural language summary
        face_note = " (Frontal face localized)" if face_detected_flag else " (Center-crop, no frontal face localized)"
        if visual_authenticity >= 0.70:
            exp = f"Visual branch detected natural textures and coherent boundaries across {len(crops)} frames{face_note} (Authenticity: {visual_authenticity * 100:.1f}%)."
        elif visual_authenticity <= 0.35:
            exp = f"Visual branch flagged generative artifacts or digital manipulation across {len(crops)} frames{face_note} (Fake Confidence: {avg_fake_prob * 100:.1f}%)."
        else:
            exp = f"Visual branch shows borderline artifact indicators{face_note} ({visual_authenticity * 100:.1f}% authenticity score)."
            
        return {
            "visual_score": round(visual_authenticity, 4),
            "fake_score": round(avg_fake_prob, 4),
            "faces_detected": len(crops) if face_detected_flag else 0,
            "frames_analyzed": len(crops),
            "per_frame_scores": per_frame_scores,
            "gradcam_base64": gradcam_b64,
            "explanation": exp
        }
