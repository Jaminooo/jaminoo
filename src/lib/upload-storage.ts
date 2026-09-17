import path from 'path';

const configuredUploadDir = process.env.UPLOAD_DIR?.trim();

export const UPLOAD_DIR = path.resolve(
  configuredUploadDir || path.join(process.cwd(), 'uploads')
);
