"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, VideoOff, Play, Square, Activity, AlertCircle, Volume2, Radio } from "lucide-react";
import { sendWebcamChunk, DetectionResult } from "@/lib/api";

interface WebcamDetectorProps {
  onResult: (result: DetectionResult) => void;
  onError: (err: string | null) => void;
}

export default function WebcamDetector({ onResult, onError }: WebcamDetectorProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [isChunkProcessing, setIsChunkProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isStreamingRef = useRef(false);

  // Monitor audio volume level
  const startAudioMonitor = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!isStreamingRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (e) {
      console.warn("Could not start audio level visualizer:", e);
    }
  };

  const stopAudioMonitor = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const startWebcam = async () => {
    onError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsStreaming(true);
      isStreamingRef.current = true;
      setChunkIndex(0);
      startAudioMonitor(stream);

      // Start recording rolling chunks (2.5 second cycles)
      startRecordingCycle(stream);
    } catch (err: any) {
      console.error("Camera access error:", err);
      onError(
        err.name === "NotAllowedError"
          ? "Camera and microphone permissions were denied. Please allow browser access."
          : `Failed to access webcam/mic: ${err.message}`
      );
    }
  };

  const startRecordingCycle = (stream: MediaStream) => {
    if (!isStreamingRef.current) return;

    let mimeType = "video/webm;codecs=vp8,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (chunks.length > 0 && isStreamingRef.current) {
          const blob = new Blob(chunks, { type: mimeType });
          if (blob.size > 2000) {
            handleProcessChunk(blob);
          }
        }
        // Start next chunk if still streaming
        if (isStreamingRef.current) {
          startRecordingCycle(stream);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      // Record for 2.5 seconds per chunk
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 2500);
    } catch (e: any) {
      console.error("MediaRecorder cycle error:", e);
    }
  };

  const handleProcessChunk = async (blob: Blob) => {
    setIsChunkProcessing(true);
    setChunkIndex((prev) => prev + 1);

    try {
      const result = await sendWebcamChunk(blob);
      if (isStreamingRef.current && result.status === "success") {
        onResult(result);
      }
    } catch (err: any) {
      console.warn("Chunk analysis warning:", err);
    } finally {
      setIsChunkProcessing(false);
    }
  };

  const stopWebcam = () => {
    isStreamingRef.current = false;
    setIsStreaming(false);
    stopAudioMonitor();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Video Viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-80 border border-zinc-800 flex items-center justify-center shadow-lg shadow-black/50">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isStreaming ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Live Camera State Overlays */}
        {isStreaming ? (
          <>
            {/* Live Indicator Badge */}
            <div className="absolute top-3 left-3 flex items-center space-x-2 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/40 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-red-300">
                LIVE STREAM
              </span>
            </div>

            {/* Chunk counter & processing status */}
            <div className="absolute top-3 right-3 flex items-center space-x-2 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/60 backdrop-blur-md text-[11px] text-zinc-300">
              {isChunkProcessing ? (
                <>
                  <Activity className="h-3 w-3 text-cyan-400 animate-spin" />
                  <span>Analyzing Chunk #{chunkIndex}...</span>
                </>
              ) : (
                <span>Streaming Window #{chunkIndex}</span>
              )}
            </div>

            {/* Microphone activity meter */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
              <div className="flex items-center space-x-2">
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-medium text-zinc-300">Mic Input</span>
              </div>
              <div className="w-32 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-6 space-y-3">
            <div className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-500 border border-zinc-800 mx-auto w-fit">
              <Camera className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-300">Webcam Inactive</h4>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Start real-time detection to stream 2.5s rolling audio/video chunks directly to the multimodal AI pipeline.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-3">
        {!isStreaming ? (
          <button
            onClick={startWebcam}
            className="flex-1 flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Radio className="h-4 w-4" />
            <span>Start Live Webcam Detection</span>
          </button>
        ) : (
          <button
            onClick={stopWebcam}
            className="flex-1 flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition-all"
          >
            <Square className="h-4 w-4 fill-current" />
            <span>Stop Live Stream</span>
          </button>
        )}
      </div>
    </div>
  );
}
