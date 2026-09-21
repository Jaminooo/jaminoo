import { pubUser } from '@/lib/users';

export const GROUP_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

export const GROUP_USER_SELECT = {
  id: true,
  username: true,
  avatarId: true,
  bio: true,
  github: true,
  status: true,
  statusText: true,
  createdAt: true,
  profilePhotoId: true,
} as const;

export type GroupMsgRow = {
  id: string;
  communityId: string;
  channelId: string;
  userId: number;
  kind: string;
  text: string;
  mediaId: string | null;
  createdAt: Date;
  user: any;
  reactions?: { emoji: string; userId: number }[];
};

export function groupMsgPayload(m: GroupMsgRow, meId?: number) {
  const reactions: { emoji: string; count: number; me: boolean }[] = [];
  for (const r of m.reactions ?? []) {
    const cur = reactions.find((x) => x.emoji === r.emoji);
    if (cur) cur.count++;
    else reactions.push({ emoji: r.emoji, count: 1, me: meId != null && r.userId === meId });
  }
  return {
    id: m.id,
    channelId: m.channelId,
    userId: m.userId,
    kind: m.kind ?? 'TEXT',
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    media: m.mediaId ? { id: m.mediaId, url: `/api/media/${m.mediaId}` } : null,
    user: pubUser(m.user),
    reactions,
  };
}

type GroupRowBasic = {
  id: string;
  name: string;
  desc: string;
  avatarId: number;
  isPrivate: boolean;
  ownerId: number;
  createdAt: Date;
  members?: { userId: number }[];
  messages?: { createdAt: Date }[];
};

export function groupSummary(c: GroupRowBasic, myRole: string | null) {
  let lastActive = c.createdAt.toISOString();
  if (c.messages && c.messages.length > 0) {
    const latest = c.messages.reduce((a, b) => (b.createdAt.getTime() > a.createdAt.getTime() ? b : a));
    lastActive = latest.createdAt.toISOString();
  }
  return {
    id: c.id,
    name: c.name,
    desc: c.desc,
    avatarId: c.avatarId,
    isPrivate: c.isPrivate,
    ownerId: c.ownerId,
    memberCount: c.members?.length ?? 0,
    myRole,
    createdAt: c.createdAt.toISOString(),
    lastActiveAt: lastActive,
  };
}