export type UploadTaskStatus =
  | "queued"
  | "uploading"
  | "paused"
  | "error"
  | "needs-file"
  | "completed"
  | "cancelled";

export type UploadTask = {
  bytesTotal: number;
  bytesUploaded: number;
  error?: string;
  id: string;
  name: string;
  percent: number;
  size: number;
  status: UploadTaskStatus;
  type: string;
};

export type UploadFileSnapshot = {
  error?: string;
  id: string;
  isPaused?: boolean;
  isRestored?: boolean;
  name: string;
  progress: {
    bytesTotal: number | null;
    bytesUploaded: number | false;
    uploadComplete?: boolean;
    uploadStarted: number | null;
  };
  size: number | null;
  type: string;
};
