/**
 * Jamino default-content seeder.
 *
 * Populates the app with demo users, artists, songs, playlists, cinema
 * movies/series, creator video posts, tweets and jams so freshly deployed
 * instances feel alive. All artwork points at the bundled defaults in
 * /public/defaults (artist.png / album.png / song.png / playlist.png /
 * movie.png / video.png / profile.png / post-picture.png) and the bundled
 * demo.mp3 / demo.mp4, served by the built-in fallback routes — so nothing
 * breaks when the ephemeral uploads/ directory is wiped on a deploy.
 *
 * Run with:  npm run db:seed   (needs a reachable DATABASE_URL)
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Media rows whose filename intentionally never exists on disk: the media
// route falls back to the matching bundled default asset.
const P = {
  profile: 'default-profile.png',
  banner: 'default-banner.png',
  video: 'default-video-content.mp4',
  post: 'default-post-picture.png',
};
const SYNC = { music: 'artist-default.png', album: 'album-default.png', song: 'song-default.png', playlist: 'playlist-default.png', remix: 'remix-default.png' };

const DAY = 24 * 60 * 60 * 1000;

async function ensureMedia(id, userId, kind, filename, mime, size) {
  const existing = await prisma.media.findUnique({ where: { id } });
  if (existing) return existing;
  return prisma.media.create({ data: { id, userId, kind, filename, mime, size } });
}

async function ensureUser(u) {
  const data = {
    email: u.email,
    passwordHash: await bcrypt.hash(u.password, 10),
    avatarId: 0,
    bio: u.bio || '',
    github: false,
    githubLogin: null,
    status: u.status || 'ONLINE',
    statusText: u.statusText || '',
    isAdmin: !!u.isAdmin,
    name: u.name || u.username,
    website: u.website || '',
    location: u.location || '',
    createdAt: u.createdAt || new Date(),
  };
  const user = await prisma.user.upsert({ where: { username: u.username }, update: data, create: { username: u.username, ...data } });
  return user;
}

let USERS = {};

async function seedUsers() {
  const defs = [
    { username: 'admin', name: 'Jamino Admin', email: 'admin@jamino.app', password: 'admin1234', isAdmin: true, status: 'ONLINE', statusText: 'Building Jamino', bio: 'Welcome to Jamino — your home for music, films, jams and friends.', website: 'https://jamino.app', location: 'Tehran, IR' },
    { username: 'nava', name: 'Nava Studio', email: 'nava@jamino.app', password: 'demo1234', status: 'ONLINE', statusText: 'Recording new single', bio: 'Filmmaker & music producer from Tehran. Late nights, hard drives, good light.', website: 'https://nava.studio', location: 'Tehran, IR' },
    { username: 'kian', name: 'Kian Beats', email: 'kian@jamino.app', password: 'demo1234', status: 'ONLINE', statusText: 'Looping live', bio: 'Beatmaker. Making synth-heavy loops from a tiny desk in Karaj.', location: 'Karaj, IR' },
    { username: 'arash', name: 'Arash Karimi', email: 'arash@jamino.app', password: 'demo1234', status: 'IDLE', statusText: 'Might be grabbing coffee', bio: 'Cloud engineer by day, choir singer on weekends.', location: 'Tehran, IR' },
    { username: 'mina', name: 'Mina Tafreshi', email: 'mina@jamino.app', password: 'demo1234', status: 'ONLINE', statusText: 'Recommend me films', bio: 'Cinema nerd — watch parties welcome. Persian classic movies are underrated.', location: 'Isfahan, IR' },
    { username: 'sara', name: 'Sara Ahmadi', email: 'sara@jamino.app', password: 'demo1234', status: 'BUSY', statusText: 'Photography walk', bio: 'Street photographer. If it moves, I shoot it.', location: 'Shiraz, IR' },
    { username: 'ali', name: 'Ali Rezvani', email: 'ali@jamino.app', password: 'demo1234', status: 'OFFLINE', statusText: '', bio: 'Musician and coffee enthusiast. Mostly both at once.', location: 'Mashhad, IR' },
    { username: 'reza', name: 'Reza Nadimi', email: 'reza@jamino.app', password: 'demo1234', status: 'ONLINE', statusText: 'One more episode…', bio: 'Series hunter. Currently lost in Station Zero.', location: 'Rasht, IR' },
  ];

  USERS = {};
  for (const d of defs) {
    USERS[d.username] = await ensureUser(d);
  }

  // Profile media (bundled defaults via fallback).
  const profileOwners = [USERS.nava.id, USERS.kian.id, USERS.arash.id, USERS.mina.id, USERS.sara.id, USERS.ali.id, USERS.reza.id];
  for (const uid of profileOwners) {
    const m = await ensureMedia(`seed-profile-${uid}`, uid, 'IMAGE', `seed-profile-${uid}.png`, 'image/png', 160430);
    await prisma.user.update({ where: { id: uid }, data: { profilePhotoId: m.id } });
  }
  // Banner for two users.
  for (const uid of [USERS.nava.id, USERS.sara.id]) {
    const m = await ensureMedia(`seed-banner-${uid}`, uid, 'IMAGE', `seed-banner-${uid}.png`, 'image/png', 167813);
    await prisma.user.update({ where: { id: uid }, data: { bannerPhotoId: m.id } });
  }

  // Friendships.
  const pair = (a, b) => ({ fromId: USERS[a].id, toId: USERS[b].id });
  const friends = [pair('arash', 'mina'), pair('mina', 'sara'), pair('arash', 'kian'), pair('nava', 'sara'), pair('nava', 'mina'), pair('ali', 'reza')];
  for (const { fromId, toId } of friends) {
    await prisma.friendRequest.upsert({
      where: { fromId_toId: { fromId, toId } },
      update: { status: 'FRIENDS' },
      create: { fromId, toId, status: 'FRIENDS' },
    });
  }

  // Creator applications.
  const apps = [
    { user: 'nava', hub: 'VIDEO', channel: 'Nava Studio', handle: '@nava', category: 'Filmmaker', bio: USERS.nava.bio, links: '["https://nava.studio"]', status: 'APPROVED' },
    { user: 'kian', hub: 'VIDEO', channel: 'Kian Beats', handle: '@kianbeats', category: 'Music', bio: USERS.kian.bio, links: '[]', status: 'APPROVED' },
    { user: 'kian', hub: 'MUSIC', channel: 'Kian Beats', handle: '@kianbeats', category: 'Music', bio: USERS.kian.bio, links: '[]', status: 'APPROVED' },
    { user: 'sara', hub: 'VIDEO', channel: 'Sara Frames', handle: '@sara', category: 'Photography', bio: USERS.sara.bio, links: '[]', status: 'APPROVED' },
    { user: 'ali', hub: 'MUSIC', channel: 'Ali Rezvani', handle: '@ali', category: 'Musician', bio: USERS.ali.bio, links: '[]', status: 'PENDING' },
    { user: 'reza', hub: 'VIDEO', channel: 'Reza Reviews', handle: '@reza', category: 'Commentary', bio: USERS.reza.bio, links: '[]', status: 'PENDING' },
  ];
  for (const a of apps) {
    const userId = USERS[a.user].id;
    await prisma.creatorApplication.upsert({
      where: { userId_hub: { userId, hub: a.hub } },
      update: { channelName: a.channel, handle: a.handle, category: a.category, bio: a.bio, links: a.links, status: a.status, reviewerId: a.status === 'APPROVED' ? USERS.admin.id : null, reviewedAt: a.status === 'APPROVED' ? new Date() : null },
      create: { userId, hub: a.hub, channelName: a.channel, handle: a.handle, category: a.category, bio: a.bio, links: a.links, status: a.status, reviewerId: a.status === 'APPROVED' ? USERS.admin.id : null, reviewedAt: a.status === 'APPROVED' ? new Date() : null },
    });
  }
}

async function seedMusic() {
  const ensureArtist = async (name, extra) => {
    const data = { coverFile: SYNC.music, bio: extra.bio, country: extra.country, genres: extra.genres, debutYear: extra.debutYear };
    return prisma.artist.upsert({ where: { name }, update: data, create: { name, ...data } });
  };

  const neon = await ensureArtist('Neon Atlas', { bio: 'A midnight electronic project built for bright rooms and long drives.', country: 'Global', genres: '["Electronic","Synthwave"]', debutYear: 2024 });
  const mira = await ensureArtist('Mira Sol', { bio: 'Warm vocals, soft percussion and songs that feel like late summer.', country: 'Spain', genres: '["Pop","Soul"]', debutYear: 2023 });
  const north = await ensureArtist('Northbound', { bio: 'Indie melodies for the people who keep moving forward.', country: 'Canada', genres: '["Indie","Alternative"]', debutYear: 2022 });
  const shahr = await ensureArtist('Shahr Radio', { bio: 'Persian electronic stories: basslines over Tehran rooftops.', country: 'Iran', genres: '["Persian Electronic","House"]', debutYear: 2020 });
  const darya = await ensureArtist('Darya & The Waves', { bio: 'Persian folk-pop trio singing about the sea and its people.', country: 'Iran', genres: '["Folk","Pop"]', debutYear: 2017 });

  const ensureAlbum = async (artistId, title, extra) => {
    const data = { artistId, year: extra.year, type: extra.type, label: extra.label, desc: extra.desc, coverFile: SYNC.album };
    const existing = await prisma.album.findFirst({ where: { title, artistId } });
    return existing ? prisma.album.update({ where: { id: existing.id }, data }) : prisma.album.create({ data: { title, ...data } });
  };

  const alb = {};
  alb.afterglow = await ensureAlbum(neon.id, 'Afterglow District', { year: 2026, type: 'ALBUM', label: 'Jamino Selects', desc: 'A neon-lit collection of midnight grooves.' });
  alb.soft = await ensureAlbum(mira.id, 'Soft Signal', { year: 2025, type: 'EP', label: 'Jamino Selects', desc: 'Small songs with a warm signal.' });
  alb.keep = await ensureAlbum(north.id, 'Keep Going', { year: 2024, type: 'ALBUM', label: 'Independent', desc: 'Open-road indie with a little electricity.' });
  alb.tehran = await ensureAlbum(shahr.id, 'Tehran Nights', { year: 2025, type: 'ALBUM', label: 'Shahr Studio', desc: 'Basslines and neon over the capital.' });
  alb.salt = await ensureAlbum(darya.id, 'Salt Air', { year: 2023, type: 'EP', label: 'Caspian Records', desc: 'Songs recorded within earshot of the sea.' });

  const ensureSong = async (title, artistId, albumId, trackNo, extra) => {
    const data = {
      artistId,
      featArtistIds: extra.featArtistIds || '[]',
      albumId,
      trackNo,
      durationSec: extra.durationSec,
      genres: extra.genres || '[]',
      producer: extra.producer || '',
      label: extra.label || '',
      year: extra.year || 2025,
      explicit: !!extra.explicit,
      featured: !!extra.featured,
      lyrics: extra.lyrics || '',
      lrc: extra.lrc || '',
      coverFile: extra.coverFile || SYNC.song,
      audioFile: 'song-default.mp3',
      audioLink: '',
      plays: extra.plays || 0,
    };
    const existing = await prisma.song.findFirst({ where: { title, artistId } });
    return existing ? prisma.song.update({ where: { id: existing.id }, data }) : prisma.song.create({ data: { title, ...data } });
  };

  const S = [];
  const push = (row) => S.push(row);
  push(await ensureSong('City Lights', neon.id, alb.afterglow.id, 1, { durationSec: 214, genres: '["Synthwave"]', producer: 'Neon Atlas', featured: true, plays: 52180, lyrics: 'City lights are calling out my name…', lrc: `[00:00.00] <00:00.20>City<00:01.10>lights<00:02.00>are<00:02.70>calling<00:03.40>out<00:04.20>my<00:04.90>name
[00:08.00]Down the boulevard, every window glows
[00:15.00]Neon river running through the rain
[00:22.00]I keep chasing where the current goes
[00:30.00]Silver signals flicker on the wall
[00:38.00]Every street is humming like a song
[00:46.00]I don't hear the silence at all
[00:53.00]Midnight keeps me moving on and on
[01:02.00]City lights, city lights / burning gold
[01:10.00]Underneath the skyline I feel bold
[01:18.00]City lights, city lights / take me home
[01:26.00]Every alley echoes, every chrome
[01:35.00]Past the station, past the parking lots
[01:43.00]Past the faces I was meant to meet
[01:51.00]I keep writing little afterthoughts
[01:59.00]In the haze above the empty street
[02:07.00]City lights are calling out my name
[02:12.00]Neon river running through the rain` }));
  push(await ensureSong('Gold Static', neon.id, alb.afterglow.id, 2, { durationSec: 188, plays: 42200 }));
  push(await ensureSong('Neon Rain', neon.id, alb.afterglow.id, 3, { durationSec: 231, featArtistIds: JSON.stringify([mira.id]), plays: 30900 }));
  push(await ensureSong('Sunroom', mira.id, alb.soft.id, 1, { durationSec: 201, genres: '["Pop","Soul"]', producer: 'Mira Sol', featured: true, plays: 47800, lyrics: 'Golden hour shining through the sunroom…', lrc: `[00:00.00]Golden hour shining through the sunroom glass
[00:07.00]Warm light spilling on the floor and past
[00:14.00]Every shadow leaning slow and low
[00:21.00]I've got nowhere else I need to go
[00:29.00]Coffee cooling, pages half unread
[00:36.00]Soft piano drifting overhead
[00:44.00]All the noise out there can wait a while
[00:52.00]Let the sunlight warm this quiet pile
[01:00.00]Sunroom, sunroom / keep me in this glow
[01:08.00]Sunroom, sunroom / hang the world below
[01:16.00]Let the afternoon turn amber sweet
[01:24.00]Let the hours settle at my feet
[01:33.00]Mira petals turning in the light
[01:41.00]Dust is dancing, slow and out of sight
[01:49.00]I could stay here till the colors fade
[01:56.00]Wrapped in afternoon that never made` }));
  push(await ensureSong('Golden Hour', mira.id, alb.soft.id, 2, { durationSec: 176, plays: 33500 }));
  push(await ensureSong('Motion Lines', north.id, alb.keep.id, 1, { durationSec: 232, featured: true, plays: 28100 }));
  push(await ensureSong('Open Road', north.id, alb.keep.id, 2, { durationSec: 199, plays: 24200 }));
  push(await ensureSong('Homebound', north.id, alb.keep.id, 3, { durationSec: 225, plays: 21700 }));
  push(await ensureSong('Tehran Nights', shahr.id, alb.tehran.id, 1, { durationSec: 243, genres: '["Persian Electronic"]', producer: 'Shahr Radio', featured: true, plays: 39600, lyrics: 'خونهها چراغون، شب تهران بیداره…', lrc: `[00:00.00]خونهها چراغون، شب تهران بیداره
[00:07.00]ماشینها بیصدا تو ترافیک شهره
[00:14.00]نور نئون رو پیادهرو میباره
[00:21.00]صدای ساز از یه کافه میخونه
[00:29.00]متروی آخر شب خواب و بیداره
[00:36.00]چشمای شهر از پشت شیشه خیره
[00:44.00]من تو این شب با تموم آدمها
[00:52.00]یه قصه تازه از ته دل دارم
[01:00.00]شب تهران، شب تهران / پر از ستارهست
[01:08.00]تو بامهای شهر یه ماه غریبهست
[01:16.00]دلم با نور خیابونا میخونه
[01:24.00]و این شهر تا سحر بیدار میمونه
[01:33.00]سیگار سرد و لیوان چای تو دستم
[01:41.00]فکرای خونه، عطر بارون و مستم
[01:49.00]دارم از این کوچهی پرنور رد میشم
[01:57.00]به پرندهی خواب تو فکر میکشم
[02:05.00]خونهها چراغون، شب تهران بیداره
[02:13.00]ماشینها بیصدا تو ترافیک شهره
[02:21.00]نور نئون رو پیادهرو میباره
[02:29.00]صدای ساز از یه کافه میخونه` }));
  push(await ensureSong('Rooftop Signal', shahr.id, alb.tehran.id, 2, { durationSec: 207, plays: 26400 }));
  push(await ensureSong('Midnight Metro', shahr.id, alb.tehran.id, 3, { durationSec: 185, plays: 18800 }));
  push(await ensureSong('Salt Air', darya.id, alb.salt.id, 1, { durationSec: 218, genres: '["Folk"]', featured: true, plays: 29500, lrc: `[00:00.00]Salt air coming off the morning tide
[00:07.00]Boats are swinging slow on the riverside
[00:14.00]I breathe the ocean in and hold it long
[00:21.00]The gulls are stitching circles in the song
[00:29.00]Wooden planks below and wind ahead
[00:36.00]Every wave a sentence left unsaid
[00:44.00]Anchors rusting, ropes are getting tight
[00:52.00]I trade the inland worries for the light
[01:00.00]Salt air, salt air / fill my lungs again
[01:08.00]Down where the horizon meets the evening plain
[01:16.00]Salt air, salt air / wash the city gray
[01:24.00]Leave me where the water finds its way
[01:33.00]Fishermen are hauling in the blue
[01:41.00]Every net a question, and it is true
[01:49.00]I could spend my whole life at this pier
[01:57.00]With the salt air ringing in my ear
[02:05.00]Salt air coming off the morning tide
[02:13.00]And I am grateful for the ride` }));
  push(await ensureSong('Lighthouse', darya.id, alb.salt.id, 2, { durationSec: 194, plays: 15300 }));
  push(await ensureSong('Wave After Wave', darya.id, alb.salt.id, 3, { durationSec: 221, plays: 12700 }));

  // One remix with the remix default cover + a real-sounding audio pointer.
  const remix = await ensureSong('City Lights (Kian Remix)', neon.id, null, 0, { durationSec: 197, featArtistIds: JSON.stringify([kianId()]), genres: '["Remix"]', producer: 'Kian Beats', plays: 18200, coverFile: SYNC.remix });

  const byTitle = (t) => S.find((s) => s.title === t).id;
  const ensurePlaylist = async (name, desc, titles, featured) => {
    const data = { desc, coverFile: SYNC.playlist, featured };
    const pl = await prisma.musicPlaylist.upsert({ where: { name }, update: data, create: { name, ...data } });
    const items = titles.map((t, i) => ({ songId: byTitle(t), pos: i + 1 }));
    const existing = await prisma.musicPlaylistSong.findFirst({ where: { playlistId: pl.id } });
    if (!existing) {
      for (const it of items) {
        await prisma.musicPlaylistSong.create({ data: { playlistId: pl.id, songId: it.songId, pos: it.pos } });
      }
    }
    return pl;
  };

  await ensurePlaylist('Late Night Focus', 'A clean, glowing mix for deep work.', ['City Lights', 'Sunroom', 'Rooftop Signal', 'Gold Static'], true);
  await ensurePlaylist('Fresh Signals', 'New sounds from the Jamino community.', ['Neon Rain', 'Golden Hour', 'Motion Lines', 'Midnight Metro', 'Salt Air'], true);
  await ensurePlaylist('Persian Vibes', 'Persian pop, folk and bass.', ['Tehran Nights', 'Rooftop Signal', 'Midnight Metro', 'Salt Air', 'Lighthouse'], false);
  await ensurePlaylist('Road Trip', 'Open windows, open roads.', ['Open Road', 'Homebound', 'Wave After Wave', 'City Lights', 'Motion Lines'], false);

  function kianId() {
    return USERS.kian.id;
  }
}

async function seedCinema() {
  const rows = [
    { title: 'Midnight Protocol', kind: 'MOVIE', desc: 'A hacker on the run in a city that never sleeps. When a rogue AI takes over the transit grid, one crate of tapes is all that stands between order and chaos.', dur: 7560, thumb: '/defaults/images/movie.png' },
    { title: 'The Lighthouse Keeper', kind: 'MOVIE', desc: 'A quiet drama about a retired keeper who refuses to leave his island while the last light of the season dies.', dur: 6120, thumb: '/defaults/images/movie.png' },
    { title: 'Crimson Skies', kind: 'MOVIE', desc: 'Two rival pilots are forced to fly one plane across the desert in this high-altitude action thriller.', dur: 6720, thumb: '/defaults/images/movie.png' },
    { title: 'A Colder Sun', kind: 'MOVIE', desc: 'A slow-burn sci-fi about the last solar observatory before the sun dims forever.', dur: 7140, thumb: '/defaults/images/movie.png' },
    { title: 'Neon District', kind: 'SERIES', desc: 'Seasonal crime-noir set in the glow of a megacity. Every neon sign is a lead.', dur: 2880, thumb: '/defaults/images/video.png' },
    { title: 'Tales of the Caspian', kind: 'SERIES', desc: 'Anthology stories from the Caspian coastline — fishermen, storm chasers and one very opinionated lighthouse.', dur: 2200, thumb: '/defaults/images/video.png' },
    { title: 'Station Zero', kind: 'SERIES', desc: 'A sci-fi drama where passengers aboard a deep-space station discover it is already home to something else.', dur: 2550, thumb: '/defaults/images/video.png' },
  ];
  for (const r of rows) {
    const existing = await prisma.cinemaVideo.findFirst({ where: { title: r.title } });
    const data = { description: r.desc, kind: r.kind, externalUrl: '', thumbnailUrl: r.thumb, subtitlesUrl: '', durationSec: r.dur, visibility: 'PUBLIC' };
    if (existing) await prisma.cinemaVideo.update({ where: { id: existing.id }, data });
    else await prisma.cinemaVideo.create({ data: { title: r.title, ...data } });
  }
}

async function seedAnime() {
  const DEMO = '/defaults/videos/demo.mp4';
  const rows = [
    {
      slug: 'cowboy-bebop',
      title: 'Cowboy Bebop',
      original: 'カウンボーイビバップ',
      type: 'TV',
      status: 'FINISHED',
      year: 1998,
      episodes: 26,
      rating: 9.5,
      studio: 'Sunrise',
      genres: ['Action', 'Sci-Fi', 'Drama'],
      colors: [260, 340],
      overview: 'The Bebop crew hunt bounties across the solar system in this space-western classic.',
      coverFile: '/defaults/images/movie.png',
      eps: [
        { number: 1, title: 'Asteroid Blaster', dur: 1680 },
        { number: 2, title: 'Less from Legend', dur: 1600 },
        { number: 3, title: 'Ballad of Fallen Angels', dur: 1620 },
        { number: 5, title: 'Ballad of the Brave', dur: 1660 },
      ],
    },
    {
      slug: 'spirited-away',
      title: 'Spirited Away',
      original: '千と千への剣',
      type: 'MOVIE',
      status: 'FINISHED',
      year: 2001,
      episodes: 1,
      rating: 9.7,
      studio: 'Studio Ghibli',
      genres: ['Adventure', 'Fantasy', 'Family'],
      colors: [30, 40],
      overview: 'A young girl enters the spirit world and works in a bathhouse to find her way home.',
      coverFile: '/defaults/images/movie.png',
      eps: [{ number: 1, title: 'The River, the Shrine, and the Girl', dur: 7800 }],
    },
    {
      slug: 'demon-slayer',
      title: 'Demon Slayer: Kimetsu',
      original: '鬼滅の刃',
      type: 'TV',
      status: 'AIRING',
      year: 2019,
      episodes: 44,
      rating: 8.9,
      studio: 'ufotable',
      genres: ['Action', 'Demons', 'Fantasy'],
      colors: [340, 260],
      overview: 'Tanjiro hunts demons to save his sister, whose soul still burns with kindness.',
      coverFile: '/defaults/images/video.png',
      eps: [
        { number: 1, title: 'Cruelty: The Demon', dur: 1440 },
        { number: 19, title: 'Hinokami', dur: 1320 },
        { number: 26, title: 'Hinokami Rising', dur: 1260 },
      ],
    },
    {
      slug: 'your-name',
      title: 'Your Name',
      original: '君の名は。',
      type: 'MOVIE',
      status: 'FINISHED',
      year: 2016,
      episodes: 1,
      rating: 8.4,
      studio: 'CoMix Wave Films',
      genres: ['Romance', 'Drama', 'Fantasy'],
      colors: [200, 260],
      overview: 'Two strangers begin swapping bodies and timelines in a story that defies distance.',
      coverFile: '/defaults/images/movie.png',
      eps: [{ number: 1, title: 'The Girl Who Fell', dur: 6120 }],
    },
  ];

  for (const r of rows) {
    const existing = await prisma.anime.upsert({
      where: { slug: r.slug },
      update: {
        title: r.title,
        original: r.original,
        overview: r.overview,
        coverFile: r.coverFile,
        trailerUrl: '',
        type: r.type,
        status: r.status,
        year: r.year,
        episodes: r.episodes,
        rating: r.rating,
        genres: JSON.stringify(r.genres),
        studio: r.studio,
        colorFrom: r.colors[0],
        colorTo: r.colors[1],
        visibility: 'PUBLIC',
      },
      create: {
        slug: r.slug,
        title: r.title,
        original: r.original,
        overview: r.overview,
        coverFile: r.coverFile,
        trailerUrl: '',
        type: r.type,
        status: r.status,
        year: r.year,
        episodes: r.episodes,
        rating: r.rating,
        genres: JSON.stringify(r.genres),
        studio: r.studio,
        colorFrom: r.colors[0],
        colorTo: r.colors[1],
        visibility: 'PUBLIC',
      },
    });
    for (const e of r.eps) {
      const exists = await prisma.animeEpisode.findFirst({ where: { animeId: existing.id, number: e.number } });
      const epData = {
        animeId: existing.id,
        number: e.number,
        slug: e.number === 1 ? 'e01' : `e${String(e.number).padStart(2, '0')}`,
        title: e.title,
        externalUrl: DEMO,
        thumbnailUrl: r.coverFile,
        subtitlesUrl: '',
        durationSec: e.dur,
      };
      if (exists) await prisma.animeEpisode.update({ where: { id: exists.id }, data: epData });
      else await prisma.animeEpisode.create({ data: epData });
    }
  }
}

async function seedSuperAdmin() {
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) return;
  await prisma.adminRole.upsert({
    where: { userId: admin.id },
    update: { role: 'SUPER', scope: '' },
    create: { userId: admin.id, role: 'SUPER', scope: '' },
  });
}

async function seedVideoPosts() {
  const byName = async (name) => prisma.user.findUnique({ where: { username: name } });

  const posts = [
    { author: 'nava', title: 'Behind the Neon — Studio Session', kind: 'POST', mediaType: 'VIDEO', asset: 'seed-video-1', duration: 187, thumb: '/defaults/images/video.png', desc: 'A 3-minute look inside the Neon Atlas studio session. Everyone was supposed to be working. Nobody worked.' },
    { author: 'nava', title: 'Tehran Rooftops — Short Film Teaser', kind: 'POST', mediaType: 'VIDEO', asset: 'seed-video-2', duration: 96, thumb: '/defaults/images/video.png', desc: 'First teaser for my rooftop short film. Shot on one battery, one lens, endless patience.' },
    { author: 'kian', title: 'Live Loop Jam From Home', kind: 'POST', mediaType: 'VIDEO', asset: 'seed-video-3', duration: 245, thumb: '/defaults/images/video.png', desc: 'One synth, one drum machine, no plan. Full jam for the Jamino fam.' },
    { author: 'kian', title: 'New Track Storyline', kind: 'POST', mediaType: 'TEXT', asset: null, duration: 0, thumb: '/defaults/images/post-picture.png', desc: 'Sketching the next remix. Votes on the drop: clean gap or wobble?' },
    { author: 'sara', title: 'My Morning Routine in 60 Seconds', kind: 'POST', mediaType: 'VIDEO', asset: 'seed-video-4', duration: 61, thumb: '/defaults/images/video.png', desc: 'Fast cuts, fast coffee. The whole routine before the city wakes up.' },
    { author: 'sara', title: 'Photography Notes', kind: 'POST', mediaType: 'TEXT', asset: null, duration: 0, thumb: '/defaults/images/post-picture.png', desc: 'Chasing light in Shiraz — a few frames and the lessons they taught me.' },
  ];

  const assets = {};
  for (const p of posts) {
    if (p.asset) {
      const author = await byName(p.author);
      assets[p.asset] = await ensureMedia(p.asset, author.id, 'VIDEO_ASSET', p.asset + '.mp4', 'video/mp4', 10474662);
    }
  }

  for (const p of posts) {
    const author = await byName(p.author);
    const existing = await prisma.videoPost.findFirst({ where: { title: p.title, authorId: author.id } });
    const data = {
      authorId: author.id,
      assetId: p.asset ? assets[p.asset].id : null,
      thumbnailAssetId: null,
      title: p.title,
      description: p.desc,
      kind: p.kind,
      mediaType: p.mediaType,
      externalUrl: '',
      thumbnailUrl: p.thumb,
      subtitlesUrl: '',
      durationSec: p.duration,
      visibility: 'PUBLIC',
      workflowStatus: 'PUBLISHED',
    };
    const post = existing ? await prisma.videoPost.update({ where: { id: existing.id }, data }) : await prisma.videoPost.create({ data });
    if (existing) continue;

    // Likes / saves / comments from the rest of the demo crew.
    const others = ['arash', 'mina', 'sara', 'ali', 'reza', 'kian', 'nava'].filter((n) => n !== p.author);
    for (const n of others.slice(0, 3 + (post.id % 2))) {
      await prisma.videoLike.upsert({ where: { postId_userId: { postId: post.id, userId: USERS[n].id } }, update: {}, create: { postId: post.id, userId: USERS[n].id } }).catch(() => {});
    }
    const comments = [
      { u: others[0], t: 'This is so good, more please 🔥' },
      { u: others[1], t: 'Did not expect the ending. 10/10.' },
      { u: others[2], t: 'The vibe is immaculate ✨' },
    ];
    for (const c of comments.slice(0, 1 + (post.id % 2))) {
      await prisma.videoComment.create({ data: { postId: post.id, userId: USERS[c.u].id, text: c.t } });
    }
    if (post.id % 2 === 0) {
      await prisma.videoSave.create({ data: { postId: post.id, userId: USERS[others[3] ? others[3] : others[0]].id } }).catch(() => {});
    }
  }
}

async function seedTweets() {
  const rows = [
    { author: 'admin', text: 'Welcome to Jamino 🎉 Music, films, jams and good people — all in one place.' },
    { author: 'nava', text: 'New film teaser drops this weekend 🎬✨ last frame finally cut.' },
    { author: 'kian', text: 'Working on a remix of City Lights. Need to rearrange the whole chorus.' },
    { author: 'arash', text: 'Tehran nights hit different 🌙' },
    { author: 'sara', text: 'Morning photography walk — the light today was unfair, in the best way.' },
    { author: 'mina', text: 'Just watched A Colder Sun. I need to sit down for a bit. Wow.' },
    { author: 'ali', text: 'New loop in the bag. Somewhere between synthwave and prayer, honestly.' },
    { author: 'reza', text: 'Binged Station Zero in one sitting. Episode 4 is a masterpiece.' },
    { author: 'nava', text: 'Reply to sara: your frames are STUNNING, teach me your ways ✨', replyTo: 'sara' },
    { author: 'sara', text: 'Thanks Nava — the secret is shooting before 7am 🌅', replyTo: 'nava' },
  ];

  const created = {};
  for (const r of rows) {
    const author = await prisma.user.findUnique({ where: { username: r.author } });
    const data = { authorId: author.id, text: r.text, visibility: 'PUBLIC' };
    const existing = await prisma.tweet.findFirst({ where: { authorId: author.id, text: r.text } });
    let tweet;
    if (existing) tweet = await prisma.tweet.update({ where: { id: existing.id }, data });
    else tweet = await prisma.tweet.create({ data });
    created[r.author] = tweet;
  }

  // Wire up replies we created before the target existed.
  for (const r of rows) {
    if (!r.replyTo) continue;
    const author = await prisma.user.findUnique({ where: { username: r.author } });
    const tweet = await prisma.tweet.findFirst({ where: { authorId: author.id, text: r.text } });
    const parent = created[r.replyTo];
    if (tweet && parent) await prisma.tweet.update({ where: { id: tweet.id }, data: { replyToId: parent.id } });
  }

  // A retweet.
  const arash = created.arash;
  const admin = created.admin;
  if (arash && admin) {
    const existingRt = await prisma.tweet.findFirst({ where: { retweetOfId: arash.id, authorId: admin.id } });
    if (!existingRt) await prisma.tweet.create({ data: { authorId: admin.id, text: '', retweetOfId: arash.id, visibility: 'PUBLIC' } });
  }

  // Likes spread.
  const all = Object.values(created);
  const likers = ['nava', 'kian', 'arash', 'mina', 'sara', 'ali', 'reza'];
  for (const t of all) {
    for (const n of likers.slice(0, 3)) {
      await prisma.tweetLike.upsert({ where: { tweetId_userId: { tweetId: t.id, userId: USERS[n].id } }, update: {}, create: { tweetId: t.id, userId: USERS[n].id } }).catch(() => {});
    }
  }

  // Follows: everyone follows nava, sara, admin.
  for (const targetName of ['nava', 'sara', 'admin']) {
    await prisma.tweetFollow.createMany({
      data: likers.filter((n) => n !== targetName).map((n) => ({ followerId: USERS[n].id, followingId: USERS[targetName].id })),
      skipDuplicates: true,
    }).catch(() => {});
  }
}

async function seedJams() {
  const ensureJam = async (def) => {
    const data = {
      name: def.name,
      desc: def.desc,
      type: 'PUBLIC',
      kind: def.kind,
      ownerId: USERS[def.owner].id,
      closed: false,
      createdAt: new Date(Date.now() - 3 * DAY),
    };
    const existing = await prisma.jam.findFirst({ where: { name: def.name } });
    const jam = existing ? await prisma.jam.update({ where: { id: existing.id }, data }) : await prisma.jam.create({ data: { id: randomUUID(), ...data } });
    const members = [{ u: def.owner, role: 'HOST' }, ...def.members.map((m) => ({ u: m, role: 'MEMBER' }))];
    for (const m of members) {
      await prisma.jamMember.upsert({ where: { jamId_userId: { jamId: jam.id, userId: USERS[m.u].id } }, update: { role: m.role }, create: { jamId: jam.id, userId: USERS[m.u].id, role: m.role } });
    }
    const existingMsg = await prisma.jamMessage.findFirst({ where: { jamId: jam.id } });
    if (!existingMsg) {
      for (const m of def.messages) {
        await prisma.jamMessage.create({ data: { jamId: jam.id, userId: USERS[m.u].id, kind: 'TEXT', text: m.t, createdAt: new Date(Date.now() - (2 + m.i) * 3600000) } });
      }
    }
    return jam;
  };

  const hangout = await ensureJam({
    name: 'Late Night Hangout',
    desc: 'Slow evenings, good voice, no schedule.',
    kind: 'CHAT',
    owner: 'arash',
    members: ['mina', 'sara', 'ali'],
    messages: [
      { u: 'mina', t: 'Any film recs for tonight? Movie night material only 🍿', i: 0 },
      { u: 'arash', t: 'A Colder Sun just landed on the cinema hub 👀', i: 1 },
      { u: 'sara', t: 'It is SO good. You will not believe the ending.', i: 2 },
    ],
  });

  const cityLights = await prisma.song.findFirst({ where: { title: 'City Lights' } });
  const focus = await ensureJam({
    name: 'Focus Beats',
    desc: 'Study / work audio room. No memes, only grooves.',
    kind: 'MUSIC',
    owner: 'kian',
    members: ['nava', 'arash', 'reza'],
    messages: [
      { u: 'nava', t: 'Nah this City Lights remix flows too hard for focus', i: 0 },
      { u: 'kian', t: 'That is the point 😌 queue up the next track', i: 1 },
    ],
  });
  if (cityLights) {
    await prisma.jam.update({ where: { id: focus.id }, data: { currentSongId: cityLights.id, currentStartedAt: new Date(Date.now() - 5 * 60000), currentPlaying: true, currentPosition: 0 } });
    const q = await prisma.jamQueueItem.findFirst({ where: { jamId: focus.id } });
    if (!q) {
      for (const [i, title] of ['Sunroom', 'Motion Lines', 'Tehran Nights'].entries()) {
        const song = await prisma.song.findFirst({ where: { title } });
        if (song) await prisma.jamQueueItem.create({ data: { jamId: focus.id, songId: song.id, addedBy: USERS.kian.id, pos: i + 1 } });
      }
    }
  }

  const mid = await prisma.cinemaVideo.findFirst({ where: { title: 'Midnight Protocol' } });
  const movie = await ensureJam({
    name: 'Movie Night: Midnight Protocol',
    desc: 'Watch party for the midnight thriller.',
    kind: 'MOVIE',
    owner: 'nava',
    members: ['sara', 'mina'],
    messages: [
      { u: 'nava', t: 'Lights low, snacks out, starting in 5!', i: 0 },
      { u: 'sara', t: 'THE SOUND DESIGN in the first scene 😱', i: 1 },
    ],
  });
  if (mid) {
    await prisma.jam.update({ where: { id: movie.id }, data: { currentCinemaVideoId: mid.id, currentCinemaStartedAt: new Date(Date.now() - 3 * 60000), currentCinemaPlaying: true, currentCinemaPosition: 0 } });
  }
}

async function main() {
  await seedUsers();
  await seedMusic();
  await seedCinema();
  await seedAnime();
  await seedVideoPosts();
  await seedTweets();
  await seedJams();
  await seedSuperAdmin();
  console.log('> Seed complete. Demo password for users: demo1234 (admin: admin1234)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());