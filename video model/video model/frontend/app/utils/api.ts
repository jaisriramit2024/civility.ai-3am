/**
 * API Client for communicating with the FastAPI backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export interface UploadResponse {
  job_id: string;
  video_url: string;
}

export interface JobStatus {
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  result: DetectionResult | null;
  error: string | null;
}

export interface DetectionResult {
  ai_generated: number;
  morphed: number;
  real: number;
  frame_count: number;
  raw_fake_probability: number;
  suspicious_frame_indices?: number[];
}

/**
 * Upload a video file to the backend
 */
export const uploadVideo = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadResponse>('/upload', formData);

  return response.data;
};

/**
 * Poll the job status
 */
export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await apiClient.get<JobStatus>(`/status/${jobId}`);
  return response.data;
};

/**
 * Perform a health check
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

export default apiClient;
