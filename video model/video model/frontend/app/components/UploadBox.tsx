'use client';

import React, { useRef, useState } from 'react';

interface UploadBoxProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

/**
 * Drag-and-drop upload component
 * Inspired by Instagram Reels style
 */
export const UploadBox: React.FC<UploadBoxProps> = ({ onFileSelect, isLoading = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      } else {
        alert('Please select a video file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative w-full max-w-md mx-auto p-12 rounded-2xl border-2 border-dashed
        cursor-pointer transition-smooth
        ${
          isDragOver
            ? 'border-deepfake-primary bg-deepfake-primary/10 scale-105'
            : 'border-gray-300 bg-white hover:border-deepfake-primary hover:bg-gray-50'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        disabled={isLoading}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center gap-4">
        {/* Upload Icon */}
        <div className="text-5xl">
          <svg
            className="w-16 h-16 mx-auto text-deepfake-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Upload Video for AI Detection
          </h3>
          <p className="text-gray-500 text-sm">
            Drag and drop your video here or click to select
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Supported formats: MP4, MOV, AVI, MKV, WebM (Max 500MB)
          </p>
        </div>

        {/* Action Button */}
        <button
          disabled={isLoading}
          className={`
            mt-4 px-6 py-2 rounded-lg font-medium text-white transition-smooth
            ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-deepfake-primary hover:bg-deepfake-secondary active:scale-95'
            }
          `}
        >
          {isLoading ? 'Processing...' : 'Select File'}
        </button>
      </div>
    </div>
  );
};
