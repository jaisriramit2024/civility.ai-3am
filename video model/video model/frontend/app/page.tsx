'use client';

import React, { useState, useEffect } from 'react';
import { UploadBox } from './components/UploadBox';
import { VideoPreview } from './components/VideoPreview';
import { LoadingAnimation } from './components/LoadingAnimation';
import { Results } from './components/Results';
import { Header } from './components/Header';
import { uploadVideo, getJobStatus, DetectionResult } from './utils/api';

type Stage = 'upload' | 'processing' | 'results';

interface ProcessingState {
  jobId: string | null;
  progress: number;
  result: DetectionResult | null;
  error: string | null;
}

/**
 * Main page component - orchestrates the entire detection flow
 */
export default function Home() {
  const [stage, setStage] = useState<Stage>('upload');
  const [fileName, setFileName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    jobId: null,
    progress: 0,
    result: null,
    error: null,
  });

  /**
   * Handle video selection and upload
   */
  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setStage('processing');

    // Create a preview URL
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    try {
      // Upload video to backend
      const response = await uploadVideo(file);
      setProcessing((prev) => ({
        ...prev,
        jobId: response.job_id,
      }));

      // Update video URL to backend URL
      setVideoUrl(`http://localhost:8000${response.video_url}`);
    } catch (error) {
      setProcessing((prev) => ({
        ...prev,
        error: 'Failed to upload video. Please try again.',
      }));
      setStage('upload');
      console.error('Upload error:', error);
    }
  };

  /**
   * Poll job status periodically
   */
  useEffect(() => {
    if (!processing.jobId || stage !== 'processing') return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await getJobStatus(processing.jobId!);

        setProcessing((prev) => ({
          ...prev,
          progress: status.progress,
          error: status.error,
        }));

        if (status.status === 'done' && status.result) {
          setProcessing((prev) => ({
            ...prev,
            result: status.result,
          }));
          setStage('results');
          clearInterval(pollInterval);
        } else if (status.status === 'error') {
          clearInterval(pollInterval);
          setStage('upload');
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [processing.jobId, stage]);

  /**
   * Reset to upload stage
   */
  const handleReset = () => {
    setStage('upload');
    setFileName('');
    setVideoUrl('');
    setProcessing({
      jobId: null,
      progress: 0,
      result: null,
      error: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/10 to-slate-900">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Title Section */}
        <div className="text-center mb-16 animate-fade-in-scale">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI Deepfake Detection
          </h1>
          <p className="text-lg text-gray-400 mb-2">
            Detect AI-generated videos and deepfakes with advanced machine learning
          </p>
          <p className="text-sm text-gray-500">
            Upload a video to analyze whether it's authentic or artificially manipulated
          </p>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Upload & Preview */}
          <div>
            {stage === 'upload' && <UploadBox onFileSelect={handleFileSelect} />}
            {stage === 'processing' && <VideoPreview videoUrl={videoUrl} fileName={fileName} />}
            {stage === 'results' && <VideoPreview videoUrl={videoUrl} fileName={fileName} />}
          </div>

          {/* Right Column - Status & Results */}
          <div>
            {stage === 'processing' && <LoadingAnimation progress={processing.progress} />}
            {stage === 'results' && processing.result && (
              <Results result={processing.result} fileName={fileName} />
            )}

            {/* Error Message */}
            {processing.error && (
              <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <p className="font-semibold mb-1">Error</p>
                <p>{processing.error}</p>
              </div>
            )}

            {/* Action Buttons */}
            {stage === 'results' && (
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-deepfake-primary hover:bg-deepfake-secondary text-white font-medium rounded-lg transition-smooth active:scale-95"
                >
                  Analyze Another Video
                </button>
                <button
                  onClick={() => {
                    const element = document.querySelector('[data-printable]');
                    if (element) window.print();
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-smooth active:scale-95"
                >
                  Export Results
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass p-6 rounded-xl">
            <div className="text-3xl mb-3">🎬</div>
            <h3 className="font-semibold text-white mb-2">Multiple Formats</h3>
            <p className="text-gray-300 text-sm">
              Supports MP4, MOV, AVI, MKV, and WebM files up to 500MB
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold text-white mb-2">Advanced AI</h3>
            <p className="text-gray-300 text-sm">
              EfficientNet-B4 trained on FaceForensics++ dataset
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-white mb-2">Real-time Analysis</h3>
            <p className="text-gray-300 text-sm">
              Get results in minutes with detailed confidence scores
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-12 border-t border-white/10 text-center text-gray-500 text-sm">
          <p>© 2024 Deepfake Detector. Built with PyTorch, FastAPI, and React.</p>
          <p className="mt-2">Always verify with additional sources before making critical decisions.</p>
        </div>
      </main>
    </div>
  );
}
