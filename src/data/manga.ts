export interface MangaChapter {
  no: number;
  title: string;
}

export interface MangaTitle {
  slug: string;
  title: string;
  original: string;
  hue: [number, number];
  studio: string;
  genres: string[];
  /** total chapter count (dynamic) */
  chapters: number;
  stage?: string;
}

const CHAPTERS_SERIES: Record<string, string> = {
  'one-piece': 'Wano — Final Saga',
  'aot': 'The Final Season',
  'jujutsu': 'Shinjuku Showdown',
  'frieren': 'The Godess of Destruction',
  'hunter': 'Dark Continent Expedition',
  'chainsaw': 'The Global Horror',
  'vinland': 'The Colony of Vinland',
  'mob': 'The Final Push',
  'fma': 'Promised Day',
  'bocchi': 'Guitar, Girl and the World',
};

export const MANGA: MangaTitle[] = [
  { slug: 'one-piece', title: 'One Piece', original: 'ワンピース', hue: [20, 180], studio: 'Toei Animation', genres: ['Adventure', 'Action', 'Comedy', 'Fantasy'], chapters: 1188, stage: CHAPTERS_SERIES['one-piece'] },
  { slug: 'aot', title: 'Attack on Titan', original: '進撃の巨人', hue: [10, 140], studio: 'Wit Studio / MAPPA', genres: ['Action', 'Dark Fantasy', 'Drama'], chapters: 139, stage: CHAPTERS_SERIES['aot'] },
  { slug: 'jujutsu', title: 'Jujutsu Kaisen', original: '呪術廻戦', hue: [120, 200], studio: 'MAPPA', genres: ['Action', 'Supernatural', 'Fantasy'], chapters: 271, stage: CHAPTERS_SERIES['jujutsu'] },
  { slug: 'frieren', title: 'Frieren: Beyond Journey\'s End', original: '葬送のフリーレン', hue: [150, 210], studio: 'Madhouse', genres: ['Fantasy', 'Drama', 'Adventure'], chapters: 140, stage: CHAPTERS_SERIES['frieren'] },
  { slug: 'hunter', title: 'Hunter × Hunter', original: 'ハンター×ハンター', hue: [90, 160], studio: 'Madhouse', genres: ['Action', 'Adventure', 'Fantasy'], chapters: 400, stage: CHAPTERS_SERIES['hunter'] },
  { slug: 'chainsaw', title: 'Chainsaw Man', original: 'チェンソーマン', hue: [0, 45], studio: 'MAPPA', genres: ['Action', 'Dark Comedy', 'Horror'], chapters: 190, stage: CHAPTERS_SERIES['chainsaw'] },
  { slug: 'vinland', title: 'Vinland Saga', original: 'ヴィンランド・サガ', hue: [160, 210], studio: 'Wit Studio / MAPPA', genres: ['Action', 'Drama', 'Historical'], chapters: 214, stage: CHAPTERS_SERIES['vinland'] },
  { slug: 'mob', title: 'Mob Psycho 100', original: 'モブサイコ100', hue: [30, 120], studio: 'Bones', genres: ['Action', 'Comedy', 'Supernatural'], chapters: 101, stage: CHAPTERS_SERIES['mob'] },
  { slug: 'fma', title: 'Fullmetal Alchemist: Brotherhood', original: '鋼の錬金術師 FULLMETAL ALCHEMIST', hue: [15, 45], studio: 'Bones', genres: ['Action', 'Adventure', 'Drama', 'Fantasy'], chapters: 108, stage: CHAPTERS_SERIES['fma'] },
  { slug: 'bocchi', title: 'Bocchi the Rock!', original: 'ぼっち・ざ・ろっく！', hue: [180, 240], studio: 'CloverWorks', genres: ['Comedy', 'Music', 'Slice of Life'], chapters: 92, stage: CHAPTERS_SERIES['bocchi'] },
];

export { CHAPTERS_SERIES };

export function mangaBySlug(slug: string) {
  return MANGA.find((m) => m.slug === slug);
}

export function chapterPages(slug: string, chapter: number): string[] {
  if (slug === 'one-piece' && chapter === 1188) {
    return Array.from({ length: 15 }, (_, i) => `/manga/one-piece/1188/${i + 1}${i === 0 ? '.jpg' : '.png'}`);
  }
  return [];
}