'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, Ghost, Heart, Play, Search, Shuffle, Star, X } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from '@/providers/use-translations';
import { toast } from '@/components/toast';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { motion, AnimatePresence } from 'framer-motion';

export type AnimeType = 'Series' | 'Movie' | 'OVA';
export type AnimeStatus = 'finished' | 'airing';

export interface AnimeTitle {
  id: string;
  title: string;
  original: string;
  cover: string;
  hue: [number, number];
  type: AnimeType;
  year: number;
  episodes: number;
  status: AnimeStatus;
  rating: number;
  genres: string[];
  studio: string;
  overview: string;
}

const CATALOGUE: AnimeTitle[] = [
  { id: 'cowboy-bebop', title: 'Cowboy Bebop', original: 'カウボーイビバップ', cover: '', hue: [210, 350], type: 'Series', year: 1998, episodes: 26, status: 'finished', rating: 8.9, genres: ['Action', 'Sci-Fi', 'Jazz', 'Space'], studio: 'Sunrise', overview: 'Bounty hunters chase fugitives across the solar system while a jazz soundtrack keeps time. A genre-defining space-noir about people running from their pasts.' },
  { id: 'fma-brotherhood', title: 'Fullmetal Alchemist: Brotherhood', original: '鋼の錬金術師 FULLMETAL ALCHEMIST', cover: '', hue: [15, 45], type: 'Series', year: 2009, episodes: 64, status: 'finished', rating: 9.1, genres: ['Action', 'Adventure', 'Drama', 'Fantasy'], studio: 'Bones', overview: 'Two brothers search for the Philosopher\'s Stone to restore what the forbidden alchemy took from them, unravelling a conspiracy that could decide the fate of an entire nation.' },
  { id: 'death-note', title: 'Death Note', original: 'デスノート', cover: '', hue: [250, 280], type: 'Series', year: 2006, episodes: 37, status: 'finished', rating: 8.6, genres: ['Thriller', 'Psychological', 'Supernatural'], studio: 'Madhouse', overview: 'A brilliant student finds a notebook with the power to kill anyone whose name is written inside, and begins a deadly game of cat and mouse with the world\'s greatest detectives.' },
  { id: 'steins-gate', title: 'Steins;Gate', original: 'シュタインズ・ゲート', cover: '', hue: [190, 240], type: 'Series', year: 2011, episodes: 24, status: 'finished', rating: 8.8, genres: ['Sci-Fi', 'Thriller', 'Drama'], studio: 'White Fox', overview: 'An eccentric group of academics accidentally discovers time travel, then realises every leap forward rewrites a timeline someone always has to pay for. Mad scientist logic at its best.' },
  { id: 'spirited-away', title: 'Spirited Away', original: '千と千尋の神隠し', cover: '', hue: [330, 40], type: 'Movie', year: 2001, episodes: 1, status: 'finished', rating: 8.6, genres: ['Fantasy', 'Adventure', 'Family'], studio: 'Studio Ghibli', overview: 'A girl wanders into a world of spirits and must work in a bathhouse to free her captive parents. Miyazaki\'s masterpiece of imagination, loss and growing up.' },
  { id: 'your-name', title: 'Your Name', original: '君の名は。', cover: '', hue: [220, 300], type: 'Movie', year: 2016, episodes: 1, status: 'finished', rating: 8.4, genres: ['Romance', 'Fantasy', 'Drama'], studio: 'CoMix Wave Films', overview: 'Two strangers keep waking up inside each other\'s lives. When the impossible link breaks, they must find each other across time, distance and a disaster they could only prevent together.' },
  { id: 'aot', title: 'Attack on Titan', original: '進撃の巨人', cover: '', hue: [10, 140], type: 'Series', year: 2013, episodes: 87, status: 'finished', rating: 8.8, genres: ['Action', 'Dark Fantasy', 'Drama'], studio: 'Wit Studio / MAPPA', overview: 'Humanity shelters behind colossal walls from man-eating titans, until one boy vows to wipe them out. A brutal, philosophical war story about freedom and the cost of it.' },
  { id: 'jujutsu', title: 'Jujutsu Kaisen', original: '呪術廻戦', cover: '', hue: [120, 200], type: 'Series', year: 2020, episodes: 47, status: 'airing', rating: 8.6, genres: ['Action', 'Supernatural', 'Fantasy'], studio: 'MAPPA', overview: 'To save a friend, a teenager swallows a cursed finger and inherits the power of the King of Curses. He joins a school of sorcerers fighting the curses that feed on human fear.' },
  { id: 'one-piece', title: 'One Piece', original: 'ワンピース', cover: '', hue: [20, 180], type: 'Series', year: 1999, episodes: 1100, status: 'airing', rating: 8.7, genres: ['Adventure', 'Action', 'Comedy', 'Fantasy'], studio: 'Toei Animation', overview: 'A pirate crew searches for the legendary treasure left behind by the Pirate King. Decades-long adventure, unmatched worldbuilding and pure joy on the open sea.' },
  { id: 'vinland', title: 'Vinland Saga', original: 'ヴィンランド・サガ', cover: '', hue: [160, 210], type: 'Series', year: 2019, episodes: 48, status: 'finished', rating: 8.8, genres: ['Action', 'Drama', 'Historical'], studio: 'Wit Studio / MAPPA', overview: 'A boy who swears revenge on the man who killed his father is pulled into a world of vikings, war and eventually the search for a peaceful land he was promised.' },
  { id: 'hunter', title: 'Hunter × Hunter', original: 'ハンター×ハンター', cover: '', hue: [90, 160], type: 'Series', year: 2011, episodes: 148, status: 'finished', rating: 8.6, genres: ['Action', 'Adventure', 'Fantasy'], studio: 'Madhouse', overview: 'A boy becomes a hunter to find his missing father — an elite profession of adventures, assassins and monsters. Deceptively bright, then breathtakingly dark.' },
  { id: 'ghibli-princess', title: 'Princess Mononoke', original: 'もののけ姫', cover: '', hue: [110, 220], type: 'Movie', year: 1997, episodes: 1, status: 'finished', rating: 8.4, genres: ['Fantasy', 'Adventure', 'Eco'], studio: 'Studio Ghibli', overview: 'A prince cursed by a boar god is drawn into a war between an iron-mining fortress and the guardian spirits of the forest. There are no villains, only colliding worlds.' },
  { id: 'psycho-pass', title: 'Psycho-Pass', original: 'サイコパス', cover: '', hue: [260, 320], type: 'Series', year: 2012, episodes: 22, status: 'finished', rating: 8.2, genres: ['Sci-Fi', 'Psychological', 'Thriller'], studio: 'Production I.G', overview: 'In a future where a system scans every mind and judges criminal intent before the crime, an inspector hunts an antagonist who proves the system\'s blind spot.' },
  { id: 'evangelion', title: 'Neon Genesis Evangelion', original: '新世紀エヴァンゲリオン', cover: '', hue: [280, 20], type: 'Series', year: 1995, episodes: 26, status: 'finished', rating: 8.5, genres: ['Sci-Fi', 'Mecha', 'Psychological', 'Drama'], studio: 'Gainax', overview: 'Children pilot biomechanical giants against cosmic threats, but the real battle is inside each of them. A landmark that redefined what anime could be.' },
  { id: 'mob-psycho', title: 'Mob Psycho 100', original: 'モブサイコ100', cover: '', hue: [30, 120], type: 'Series', year: 2016, episodes: 37, status: 'finished', rating: 8.6, genres: ['Action', 'Comedy', 'Supernatural'], studio: 'Bones', overview: 'A powerful psychic who wants to live a normal life works through his teenage years with a con-artist mentor. Absurd animation, huge heart, and one of the best finales in anime.' },
  { id: 'serial-experiments', title: 'Serial Experiments Lain', original: 'シリアルエクスペリメンツレイン', cover: '', hue: [200, 260], type: 'Series', year: 1998, episodes: 13, status: 'finished', rating: 8.0, genres: ['Sci-Fi', 'Psychological', 'Mystery'], studio: 'Triangle Staff', overview: 'A shy girl begins receiving messages from the dead, pulled deeper into the Wired — a net that is quietly fusing with reality. Twenty years ahead of its time.' },
  { id: 'bocchi', title: 'Bocchi the Rock!', original: 'ぼっち・ざ・ろっく！', cover: '', hue: [180, 240], type: 'Series', year: 2022, episodes: 12, status: 'finished', rating: 8.4, genres: ['Comedy', 'Music', 'Slice of Life'], studio: 'CloverWorks', overview: 'A cripplingly anxious guitarist who only shines online joins a band and slowly learns that other people can be safe, noisy and wonderful.' },
  { id: 'frieren', title: 'Frieren: Beyond Journey\'s End', original: '葬送のフリーレン', cover: '', hue: [150, 210], type: 'Series', year: 2023, episodes: 28, status: 'finished', rating: 9.0, genres: ['Fantasy', 'Drama', 'Adventure'], studio: 'Madhouse', overview: 'After heroically defeating the Demon King, an elven mage outlives her companions for centuries and finally sets out to understand what they meant to her. A gentle meditation on time and memory.' },
  { id: 'chainsaw', title: 'Chainsaw Man', original: 'チェンソーマン', cover: '', hue: [0, 45], type: 'Series', year: 2022, episodes: 12, status: 'finished', rating: 8.4, genres: ['Action', 'Dark Comedy', 'Horror'], studio: 'MAPPA', overview: 'A poverty-stricken devil hunter merges with his chainsaw-dog devil and hunts monsters for a shady government branch. Loud, filthy, touching and impossible to predict.' },
];

const GENRE_SET = Array.from(new Set(CATALOGUE.flatMap((a) => a.genres))).sort();

const FAV_KEY = 'anime_favs';

export function AnimeHub() {
  const t = useTranslations();
  const setProduct = useAppStore((state) => state.setProduct);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [favsOnly, setFavsOnly] = useState(false);
  const [favs, setFavs] = useState<string[]>([]);
  const [open, setOpen] = useState<AnimeTitle | null>(null);

  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
    } catch {}
  }, []);

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    setFavs(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {}
    toast(favs.includes(id) ? t('anime.removedFromFavs') : t('anime.addedToFavs'));
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CATALOGUE.filter((a) => {
      if (favsOnly && !favs.includes(a.id)) return false;
      if (genre && !a.genres.includes(genre)) return false;
      if (q && !`${a.title} ${a.original} ${a.studio}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, genre, favsOnly, favs]);

  return (
    <div className="hub-shell anime-hub-shell">
      <WorkspaceTopbar onHome={() => setProduct('home')} product={t('anime.title')} />
      <main className="anime-hub-content">
        <button type="button" className="hub-back" onClick={() => setProduct('home')}>
          <ArrowLeft size={15} /> {t('anime.backToHub')}
        </button>

        <header className="anime-hero">
          <div className="hub-kicker">{t('anime.kicker')}</div>
          <h1>{t('anime.title')}</h1>
          <p>{t('anime.tagline')}</p>
        </header>

        <div className="anime-toolbar">
          <div className="anime-search">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('anime.searchPlaceholder')} aria-label={t('anime.searchPlaceholder')} />
            {search && (
              <button type="button" className="anime-search-clear" onClick={() => setSearch('')} aria-label={t('anime.clearSearch')}>
                <X size={14} />
              </button>
            )}
          </div>
          <button type="button" className={`anime-fav-toggle ${favsOnly ? 'active' : ''}`} onClick={() => setFavsOnly((v) => !v)}>
            <Heart size={15} fill={favsOnly ? 'currentColor' : 'none'} /> {t('anime.favoritesOnly')}
          </button>
        </div>

        <div className="anime-genres">
          <button type="button" className={`anime-genre ${!genre ? 'active' : ''}`} onClick={() => setGenre(null)}>
            {t('anime.all')}
          </button>
          {GENRE_SET.map((g) => (
            <button type="button" key={g} className={`anime-genre ${genre === g ? 'active' : ''}`} onClick={() => setGenre(genre === g ? null : g)}>
              {g}
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <div className="anime-empty">
            <Ghost size={30} />
            <p>{favsOnly ? t('anime.noFavs') : t('anime.noResults')}</p>
          </div>
        ) : (
          <div className="anime-grid">
            {results.map((a) => {
              const fav = favs.includes(a.id);
              return (
                <AnimeCard key={a.id} title={a} fav={fav} onOpen={() => setOpen(a)} onToggleFav={() => toggleFav(a.id)} />
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {open && <AnimeDetail title={open} fav={favs.includes(open.id)} onClose={() => setOpen(null)} onToggleFav={() => toggleFav(open.id)} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function coverStyle(title: AnimeTitle): React.CSSProperties {
  const [h1, h2] = title.hue;
  return {
    background: `linear-gradient(135deg, hsl(${h1} 60% 30%), hsl(${h2} 70% 42%))`,
  };
}

function AnimeCard({ title, fav, onOpen, onToggleFav }: { title: AnimeTitle; fav: boolean; onOpen: () => void; onToggleFav: () => void }) {
  return (
    <button type="button" className="anime-card" onClick={onOpen} style={coverStyle(title)}>
      <span className="anime-card-shade" />
      <span className="anime-card-vignette" />
      <button type="button" className={`anime-card-fav ${fav ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleFav(); }} aria-label="Toggle favourite">
        <Heart size={14} fill={fav ? 'currentColor' : 'none'} />
      </button>
      <span className="anime-card-type">{title.type}</span>
      <span className="anime-card-wordmark">
        <Ghost size={15} /> <b>{title.studio}</b>
      </span>
      <span className="anime-card-meta">
        <span className="anime-card-score"><Star size={12} fill="currentColor" /> {title.rating.toFixed(1)}</span>
        <span>{title.year}</span>
        <span>{title.episodes} {title.type === 'Movie' ? '' : title.type === 'OVA' ? 'OVA' : ''}</span>
      </span>
      <span className="anime-card-copy">
        <strong>{title.title}</strong>
        <em>{title.original}</em>
      </span>
    </button>
  );
}

function AnimeDetail({ title, fav, onClose, onToggleFav }: { title: AnimeTitle; fav: boolean; onClose: () => void; onToggleFav: () => void }) {
  const t = useTranslations();
  return (
    <motion.div className="anime-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="anime-modal" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} onClick={(e) => e.stopPropagation()}>
        <div className="anime-modal-hero" style={coverStyle(title)} />
        <button type="button" className="anime-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="anime-modal-body">
          <h2>{title.title}</h2>
          <p className="anime-modal-original">{title.original}</p>
          <div className="anime-chip-row">
            <span className="anime-chip"><Star size={12} fill="currentColor" /> {title.rating.toFixed(1)}</span>
            <span className="anime-chip">{t('anime.type')}: {title.type}</span>
            <span className="anime-chip">{t('anime.year')}: {title.year}</span>
            <span className="anime-chip">{title.episodes > 1 ? `${title.episodes} ${t('anime.episodes')}` : title.type}</span>
            <span className="anime-chip">{t('anime.status')}: {title.status === 'finished' ? t('anime.statusFinished') : t('anime.statusAiring')}</span>
          </div>
          <div className="anime-chip-row anime-genre-chips">
            {title.genres.map((g) => <span key={g} className="anime-repeat">{g}</span>)}
          </div>
          <section className="anime-overview">
            <h3>{t('anime.overview')}</h3>
            <p>{title.overview}</p>
          </section>
          <div className="anime-modal-actions">
            <button type="button" className="anime-watch-btn" onClick={() => { toast(`${t('anime.watch')} — ${title.title}`); }}>
              <Play size={15} fill="currentColor" /> {t('anime.watch')}
            </button>
            <button type="button" className={`anime-fav-btn ${fav ? 'active' : ''}`} onClick={onToggleFav}>
              <Heart size={15} fill={fav ? 'currentColor' : 'none'} /> {t('anime.favorites')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}