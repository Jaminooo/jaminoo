import { uidDisplay } from '@/lib/constants';

type PubUserRow = {
  id: number;
  username: string;
  avatarId: number;
  bio?: string;
  github: boolean;
  createdAt?: Date;
  profilePhotoId?: string | null;
};

export function pubUser(u: PubUserRow) {
  return {
    id: u.id,
    username: u.username,
    uid: uidDisplay(u.id),
    avatarId: u.avatarId,
    bio: u.bio ?? '',
    github: u.github,
    ...(u.createdAt ? { createdAt: u.createdAt.toISOString() } : {}),
    avatarPhoto: u.profilePhotoId ? `/api/media/${u.profilePhotoId}` : null,
  };
}