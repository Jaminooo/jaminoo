import { uidDisplay } from '@/lib/constants';

type PubUserRow = {
  id: number;
  username: string;
  avatarId: number;
  bio?: string;
  github: boolean;
  google?: boolean;
  createdAt?: Date;
  profilePhotoId?: string | null;
  status?: string;
  statusText?: string;
  name?: string;
  isGuest?: boolean;
};

export function pubUser(u: PubUserRow) {
  return {
    id: u.id,
    username: u.username,
    uid: uidDisplay(u.id),
    avatarId: u.avatarId,
    bio: u.bio ?? '',
    github: u.github,
    google: u.google ?? false,
    status: u.status ?? 'ONLINE',
    statusText: u.statusText ?? '',
    name: u.name ?? '',
    isGuest: u.isGuest ?? false,
    ...(u.createdAt ? { createdAt: u.createdAt.toISOString() } : {}),
    avatarPhoto: u.profilePhotoId ? `/api/media/${u.profilePhotoId}` : null,
  };
}