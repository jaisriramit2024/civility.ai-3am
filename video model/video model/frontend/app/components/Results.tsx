'use client';

import React from 'react';
import { DetectionResult } from '../utils/api';

interface ResultsProps {
  result: DetectionResult;
  fileName: string;
}

/**
 * Results display component
 * Shows classification scores and confidence visualization
 */
export const Results: React.FC<ResultsProps> = ({ result, fileName }) => {
  const { ai_generated, morphed, real, frame_count } = result;

  // Determine classification
  const getClassification = () => {
    if (ai_generated > 0.7) return 'Likely Deepfake';
    if (ai_generated > 0.5) return 'Suspicious';
    if (real > 0.7) return 'Likely Real';
    return 'Inconclusive';
  };

  const getClassificationColor = () => {
    const classification = getClassification();
    if (classification === 'Likely Deepfake') return 'bg-red-100 text-red-700';
    if (classification === 'Suspicious') return 'bg-yellow-100 text-yellow-700';
    if (classification === 'Likely Real') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const ClassificationIcon = () => {
    const classification = getClassification();
    if (classification === 'Likely Deepfake') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      );
    }
    if (classification === 'Likely Real') {
      return (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
      </svg>
    );
  };

  const ScoreCard = ({
    label,
    score,
    color,
  }: {
    label: string;
    score: number;
    color: string;
  }) => {
    const percentage = Math.round(score * 100);

    return (
      <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-gray-900">{label}</span>
          <span className={`text-2xl font-bold ${color}`}>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-300 bg-opacity-30 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-smooth duration-500 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-scale">
      {/* Main Classification Card */}
      <div className={`p-6 rounded-2xl mb-6 ${getClassificationColor()}`}>
        <div className="flex items-start gap-4">
          <ClassificationIcon />
          <div>
            <h2 className="text-2xl font-bold mb-1">{getClassification()}</h2>
            <p className="text-sm opacity-90">
              Based on analysis of {frame_count} frames
            </p>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div className="space-y-4 mb-6">
        <ScoreCard label="AI Generated" score={ai_generated} color="text-red-500" />
        <ScoreCard label="Morphed/Manipulated" score={morphed} color="text-yellow-500" />
        <ScoreCard label="Real/Authentic" score={real} color="text-green-500" />
      </div>

      {/* Details Card */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Analysis Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">File Analyzed</p>
            <p className="font-medium text-gray-900 truncate">{fileName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Frames Processed</p>
            <p className="font-medium text-gray-900">{frame_count}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-gray-600">Confidence Score (Raw)</p>
          <p className="font-mono text-sm text-gray-900">
            {result.raw_fake_probability?.toFixed(4) || 'N/A'}
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">📌 Recommendation:</span>
          {getClassification() === 'Likely Deepfake' &&
            ' This video appears to be AI-generated or heavily manipulated. Verify source before sharing.'}
          {getClassification() === 'Likely Real' &&
            ' This video appears to be authentic. It passed the deepfake detection analysis.'}
          {getClassification() === 'Suspicious' &&
            ' This video has mixed signals. Manual review recommended.'}
          {getClassification() === 'Inconclusive' &&
            ' Results are inconclusive. Consider additional verification methods.'}
        </p>
      </div>
    </div>
  );
};
