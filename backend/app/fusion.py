import numpy as np

class MultimodalFusionLayer:
    """
    Multimodal AI Fusion Layer combining Visual, Audio, and Lip-Sync modalities
    with dynamic confidence calibration and explainability attribution.
    """
    def __init__(
        self,
        weight_visual: float = 0.45,
        weight_audio: float = 0.35,
        weight_sync: float = 0.20
    ):
        self.w_v = weight_visual
        self.w_a = weight_audio
        self.w_s = weight_sync

    def fuse(
        self,
        visual_result: dict,
        audio_result: dict,
        sync_result: dict
    ) -> dict:
        """
        Combines scores from visual, audio, and sync branches into a final verdict,
        confidence score, and explainability breakdown.
        """
        v_score = visual_result.get("visual_score", 0.5)
        a_score = audio_result.get("audio_score", 0.5)
        s_score = sync_result.get("sync_score", 0.5)
        
        has_face = visual_result.get("faces_detected", 0) > 0 or visual_result.get("frames_analyzed", 0) > 0
        has_audio = audio_result.get("has_audio", False)
        
        # Calculate dynamic modality weights based on modality availability
        if has_face and has_audio:
            wv = self.w_v
            wa = self.w_a
            ws = self.w_s
            
            # If lip-sync mismatch is severe, increase sync weight
            if sync_result.get("lip_sync_mismatch", False):
                ws = min(0.35, ws + 0.15)
                wv = (1.0 - ws) * (self.w_v / (self.w_v + self.w_a))
                wa = (1.0 - ws) * (self.w_a / (self.w_v + self.w_a))
        elif has_face and not has_audio:
            wv, wa, ws = 1.0, 0.0, 0.0
        elif not has_face and has_audio:
            wv, wa, ws = 0.0, 1.0, 0.0
        else:
            wv, wa, ws = 0.5, 0.5, 0.0
            
        # Overall authenticity score [0.0 = Fake, 1.0 = Real]
        combined_authenticity = (wv * v_score) + (wa * a_score) + (ws * s_score)
        combined_authenticity = float(np.clip(combined_authenticity, 0.01, 0.99))
        
        fake_probability = 1.0 - combined_authenticity
        
        # Determine verdict
        if combined_authenticity <= 0.42:
            verdict = "Likely Manipulated"
            verdict_badge = "FAKE"
            status_color = "red"
        elif combined_authenticity >= 0.60:
            verdict = "Likely Real"
            verdict_badge = "REAL"
            status_color = "emerald"
        else:
            verdict = "Suspicious / Inconclusive"
            verdict_badge = "UNCERTAIN"
            status_color = "amber"
            
        # Confidence score (distance from decision boundary 0.5)
        # 0.5 -> 50%, 0.0 or 1.0 -> 99%
        confidence_pct = round(50.0 + (abs(combined_authenticity - 0.5) * 2.0 * 49.0), 1)
        
        # Modality fake contributions
        v_fake_contrib = wv * (1.0 - v_score)
        a_fake_contrib = wa * (1.0 - a_score)
        s_fake_contrib = ws * (1.0 - s_score)
        
        contributions = {
            "visual": round(v_fake_contrib, 4),
            "audio": round(a_fake_contrib, 4),
            "sync": round(s_fake_contrib, 4)
        }
        
        # Identify dominant contributor to "Fake" verdict
        if verdict_badge in ["FAKE", "UNCERTAIN"]:
            max_contrib_key = max(contributions, key=contributions.get)
            if max_contrib_key == "visual":
                dominant_modality = "Visual Generative Artifacts"
                modality_reason = "ViT detected pixel-level blending artifacts, skin smoothing, or deepfake generative boundaries."
            elif max_contrib_key == "audio":
                dominant_modality = "Synthetic Voice / Vocoder Spoof"
                modality_reason = "Wav2Vec2 and spectral analysis flagged unnatural frequency distributions and neural voice synthesis signatures."
            else:
                dominant_modality = "Lip-Sync Desynchronization"
                modality_reason = "MediaPipe blendshapes showed mouth motion does not match acoustic speech energy peaks."
        else:
            dominant_modality = "None (Coherent Authentic Modalities)"
            modality_reason = "Visual facial textures, acoustic voice harmonics, and lip-audio timing all demonstrate natural human patterns."
            
        # Construct unified multimodal summary
        summary = (
            f"Verdict: {verdict} ({confidence_pct}% confidence). "
            f"Visual Authenticity: {v_score * 100:.1f}%, Audio Authenticity: {a_score * 100:.1f}%, "
            f"Lip-Sync Coherence: {s_score * 100:.1f}%. "
            f"Primary factor: {dominant_modality}. {modality_reason}"
        )
        
        return {
            "verdict": verdict,
            "verdict_badge": verdict_badge,
            "status_color": status_color,
            "confidence_pct": confidence_pct,
            "authenticity_score": round(combined_authenticity, 4),
            "fake_score": round(fake_probability, 4),
            "weights_used": {
                "visual": round(wv, 2),
                "audio": round(wa, 2),
                "sync": round(ws, 2)
            },
            "fake_contributions": contributions,
            "dominant_modality": dominant_modality,
            "modality_reason": modality_reason,
            "summary_explanation": summary
        }
