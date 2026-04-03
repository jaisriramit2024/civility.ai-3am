'use client';

import React from 'react';

/**
 * Loading animation component
 * Shows processing progress and status
 */
export const LoadingAnimation: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full max-w-md mx-auto animate-fade-in-scale">
      <div className="flex flex-col items-center gap-6">
        {/* Spinner */}
        <div className="relative w-20 h-20">
          <svg
            className="spinner w-full h-full text-deepfake-primary"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.1"
            />
            <path
              d="M12 2a10 10 0 0110 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Progress Text */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Analyzing Video
          </h3>
          <p className="text-gray-600 text-sm">
            Extracting frames and running detection model...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-deepfake-primary to-deepfake-secondary h-full rounded-full transition-smooth duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Percentage */}
        <div className="text-sm font-medium text-gray-600">
          {progress}% Complete
        </div>

        {/* Status Messages */}
        <div className="mt-4 text-xs text-gray-500 text-center space-y-1">
          <p>• Extracting frames from video</p>
          <p>• Detecting faces in each frame</p>
          <p>• Running deepfake detection model</p>
          <p>• Aggregating results</p>
        </div>
      </div>
    </div>
  );
};
