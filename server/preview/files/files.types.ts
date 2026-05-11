export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
  children: FileItem[];
}

export interface ListFilesResult {
  ok: boolean;
  files: FileItem[];
  total: number;
  error?: string;
}

export interface CreateFileInput {
  fileName: string;
  isFolder: boolean;
  content?: string;
  parentPath?: string;
}

export interface CreateFileResult {
  ok: boolean;
  path: string;
  isDirectory: boolean;
  error?: string;
}

export interface UploadedFile {
  originalName: string;
  savedPath: string;
  size: number;
}

export interface UploadFileResult {
  ok: boolean;
  uploaded: UploadedFile[];
  failed: string[];
  error?: string;
}

export interface DeleteFileResult {
  ok: boolean;
  path: string;
  wasDirectory: boolean;
  error?: string;
}

export interface DownloadResult {
  ok: boolean;
  buffer?: Buffer;
  filename: string;
  mimeType: string;
  error?: string;
}

export interface FilesServiceConfig {
  rootPath: string;
  maxUploadSizeMb: number;
  allowedExtensions?: string[];
  excludePatterns: string[];
}
