import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('pass123', 10);

  const sara = await prisma.user.upsert({
    where: { username: 'sara' },
    update: {},
    create: {
      username: 'sara',
      email: 'sara@jam.dev',
      passwordHash: hash,
      questionId: 0,
      answerHash: await bcrypt.hash('tehran', 10),
      avatarId: 4,
      bio: 'sound engineer · lost in delay pedals',
    },
  });
  const kaveh = await prisma.user.upsert({
    where: { username: 'kaveh' },
    update: {},
    create: {
      username: 'kaveh',
      email: 'k@jam.dev',
      passwordHash: hash,
      avatarId: 7,
      bio: 'synthwave & city lights',
    },
  });
  const nila = await prisma.user.upsert({
    where: { username: 'nila' },
    update: {},
    create: {
      username: 'nila',
      email: 'n@jam.dev',
      passwordHash: hash,
      avatarId: 9,
      bio: 'making playlists nobody asked for',
    },
  });
  const rumi = await prisma.user.upsert({
    where: { username: 'rumi' },
    update: {},
    create: {
      username: 'rumi',
      email: 'r@jam.dev',
      passwordHash: hash,
      avatarId: 2,
      bio: 'night owl',
    },
  });

  const seedMembers = [sara.id, kaveh.id, nila.id, rumi.id];

  const jamDefs = [
    { id: 'J1', name: 'Lounge', desc: 'Casual hangout - everyone is welcome.', type: 'PUBLIC', ownerId: sara.id },
    { id: 'J2', name: 'Synthwave Studio', desc: 'Talking music, gear and late-night vibes.', type: 'PUBLIC', ownerId: kaveh.id },
    { id: 'J3', name: 'Friends Only', desc: 'Private - invite only.', type: 'PRIVATE', ownerId: sara.id },
  ];

  for (const j of jamDefs) {
    const existing = await prisma.jam.findUnique({ where: { id: j.id } });
    if (!existing) {
      await prisma.jam.create({
        data: {
          id: j.id,
          name: j.name,
          desc: j.desc,
          type: j.type,
          ownerId: j.ownerId,
        },
      });
    }
  }

  // public jams: seed members
  for (const id of ['J1', 'J2']) {
    for (const uid of seedMembers) {
      await prisma.jamMember.upsert({
        where: { jamId_userId: { jamId: id, userId: uid } },
        update: {},
        create: { jamId: id, userId: uid },
      });
    }
  }
  // private jam J3
  for (const uid of [sara.id, kaveh.id, nila.id]) {
    await prisma.jamMember.upsert({
      where: { jamId_userId: { jamId: 'J3', userId: uid } },
      update: {},
      create: { jamId: 'J3', userId: uid },
    });
  }

  const seedMessages = [
    { jamId: 'J1', user: sara, text: 'hey hey, lounge is open' },
    { jamId: 'J1', user: kaveh, text: 'perfect, I need a break from synths' },
    { jamId: 'J1', user: nila, text: 'put me in the cool corner plz' },
    { jamId: 'J2', user: kaveh, text: 'drop your current loop here' },
    { jamId: 'J2', user: rumi, text: 'this one: 128 bpm, all memory of people soon forgotten' },
    { jamId: 'J3', user: nila, text: 'is this room also secretly a cult? asking for a friend' },
  ];
  for (const m of seedMessages) {
    const count = await prisma.jamMessage.count();
    if (count < 6) {
      await prisma.jamMessage.create({
        data: { jamId: m.jamId, userId: m.user.id, text: m.text },
      });
    }
  }

  console.log('✅ seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });