import { json } from '@/lib/api';

export const GET = async () => {
  const enabled = Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
  return json({ enabled });
};