export type QueueItemStatus = 'waiting' | 'working' | 'done' | 'error';

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: QueueItemStatus;
  progress: number;
  message?: string;
  url?: string;
  outputName?: string;
}

export interface ConversionSettings {
  quality: string;
  resolution: string;
  audio: string;
}
