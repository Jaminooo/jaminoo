import { prisma } from '@/lib/prisma';

export function convoId(a: number, b: number) {
  return `${Math.min(a, b)}:${Math.max(a, b)}`;
}

export async function getOrCreateConvo(meId: number, otherId: number) {
  const a = Math.min(meId, otherId);
  const b = Math.max(meId, otherId);
  const conv = await prisma.conversation.upsert({
    where: { userA_userB: { userA: a, userB: b } },
    update: {},
    create: { id: convoId(a, b), userA: a, userB: b },
  });
  return conv;
}

export async function areFriends(aId: number, bId: number) {
  const rel = await prisma.friendRequest.findFirst({
    where: { status: 'FRIENDS', OR: [{ fromId: aId, toId: bId }, { fromId: bId, toId: aId }] },
  });
  return !!rel;
}