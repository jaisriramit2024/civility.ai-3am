'use client';

import React, { useRef, useEffect } from 'react';

interface VideoPreviewProps {
  videoUrl: string;
  fileName: string;
}

/**
 * Video preview player component
 * Displays the uploaded video in Instagram Reels style
 */
export const VideoPreview: React.FC<VideoPreviewProps> = ({ videoUrl, fileName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.log('Video playback prevented:', error);
      });
    }
  }, [videoUrl]);

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-in-scale">
      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video">
        {/* Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          controls
          controlsList="nodownload"
          muted
        />

        {/* File Name Badge */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <p className="text-white text-sm font-medium truncate">{fileName}</p>
        </div>
      </div>

      {/* Preview Badge */}
      <div className="mt-4 text-center">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          Preview Ready
        </span>
      </div>
    </div>
  );
};
