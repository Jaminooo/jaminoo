'use client';

import { ArrowDown, ArrowRight, Clapperboard, Globe, Headphones, MessageCircle, Music2, Play, PlaySquare, Shield, Sparkles, UsersRound, Video, Zap } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from '@/providers/use-translations';
import { JamiMascot } from '@/components/jami-mascot';
import { motion } from 'motion/react';
import { resetSpotlight, trackSpotlight } from '@/lib/spotlight';

const PRODUCTS: { icon: typeof MessageCircle; label: string; tone: string }[] = [
  { icon: MessageCircle, label: 'COMMUNITY HUB', tone: 'violet' },
  { icon: Music2, label: 'MUSIC HUB', tone: 'pink' },
  { icon: PlaySquare, label: 'VIDEO HUB', tone: 'blue' },
  { icon: Video, label: 'CINEMA HUB', tone: 'teal' },
  { icon: Clapperboard, label: 'WATCH HUB', tone: 'violet' },
];

export function LandingPage() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const rtl = locale === 'fa';

  const go = (view: 'login' | 'signup') => () => {
    window.location.href = `/auth?view=${view}`;
  };
  const toggleLang = () => setLocale(rtl ? 'en' : 'fa');

  return (
    <main className="landing-page" dir={rtl ? 'rtl' : 'ltr'}>
      {/* ---------- Navigation ---------- */}
      <nav className="landing-nav">
        <a className="landing-brand" href="#top">
          <span className="wordmark-mark"><Sparkles size={15} /></span>
          <span className="brand-text">Jamino</span>
        </a>
        <div className="landing-nav-links">
          <a href="#features">{t('landing.features')}</a>
          <a href="#how-it-works">{t('landing.how')}</a>
          <a href="#demo">{t('landing.demo')}</a>
        </div>
        <div className="landing-nav-actions">
          <button type="button" className="lang-toggle" onClick={toggleLang}>
            <Globe size={16} />
            <span>{rtl ? 'English' : 'فارسی'}</span>
          </button>
          <button type="button" className="btn btn-ghost pill-sm hide-mobile" onClick={go('login')}>{t('landing.login')}</button>
          <button type="button" className="btn btn-violet pill-sm" onClick={go('signup')}>{t('landing.create')}</button>
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="landing-kicker">
            <span className="landing-pulse" /> {t('landing.kicker')}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.08 }}>
            {t('landing.hero')}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.16 }}>
            {t('landing.intro')}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.24 }} className="landing-actions">
            <button type="button" className="btn btn-violet landing-cta" onClick={go('signup')}>
              {t('landing.start')} <ArrowRight size={16} className="icon-rtl" />
            </button>
            <a className="landing-secondary-cta" href="#features">
              <span>{t('landing.explore')}</span> <ArrowDown size={15} />
            </a>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.36 }} className="landing-proof">
            <div className="landing-proof-avatars">
              <JamiMascot state="happy" size={30} />
              <JamiMascot state="chat" size={30} />
              <JamiMascot state="party" size={30} />
            </div>
            <span>{t('landing.proof')}</span>
          </motion.div>
        </div>

        {/* animated stage (pure CSS mock of the app) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.86, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="landing-hero-stage"
        >
          <div className="hero-glow-container">
            <div className="hero-blob blob-1" />
            <div className="hero-blob blob-2" />
          </div>
          <div className="landing-orbit" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="landing-product-window" role="img" aria-label={t('landing.preview')}>
            <div className="landing-window-topbar">
              <div className="landing-window-brand"><span className="wordmark-mark"><Sparkles size={12} /></span><b>Jamino</b></div>
              <div className="landing-window-room"><span className="landing-pulse" />{t('landing.mockRoom')}</div>
              <span className="landing-window-avatar"><UsersRound size={13} /></span>
            </div>
            <div className="landing-window-body">
              <div className="landing-window-rail" aria-hidden="true"><span className="active"><Clapperboard size={15} /></span><span><Music2 size={15} /></span><span><MessageCircle size={15} /></span><span><PlaySquare size={15} /></span></div>
              <div className="landing-window-content">
                <div className="landing-window-heading"><div><small>{t('landing.mockWatchParty')}</small><b>{t('landing.mockHeading')}</b></div><span><UsersRound size={12} /> 4</span></div>
                <div className="landing-screen-poster">
                  <Image src="/defaults/images/movie.png" alt="" fill sizes="(max-width: 700px) 80vw, 440px" priority />
                  <div className="landing-poster-shade" />
                  <span className="landing-screen-badge"><span className="landing-pulse" /> {t('landing.live')}</span>
                  <button type="button" tabIndex={-1} aria-hidden="true" className="landing-screen-play"><Play size={22} fill="currentColor" /></button>
                  <div className="landing-screen-copy"><small>{t('landing.mockSubheading')}</small><b>{t('landing.mockNowPlaying')}</b><span><i /> <i /> <i /> <i /> <i /> <i /> <i /> <i /> <i /> <i /> <i /> <i /> <i /> <i /> <i /></span></div>
                </div>
                <div className="landing-window-bottom"><span className="landing-mini-cover"><Image src="/defaults/images/album.png" alt="" fill sizes="40px" /></span><span><b>{t('landing.synced')}</b><small>{t('landing.mockListening')}</small></span><span className="landing-window-eq"><i /><i /><i /><i /><i /></span><span className="landing-window-members"><i /><i /><i /><b>+1</b></span></div>
              </div>
            </div>
          </div>
          <div className="landing-float-card landing-float-card-top">
            <span className="landing-float-icon violet"><UsersRound size={15} /></span>
            <div><b>{t('landing.private')}</b><small>{t('landing.privateHint')}</small></div>
            <span className="landing-live-pill">● {t('landing.live')}</span>
          </div>
          <div className="landing-float-card landing-float-card-bottom">
            <span className="landing-float-icon pink"><Headphones size={15} /></span>
            <div><b>{t('landing.synced')}</b><small>{t('landing.syncedHint')}</small></div>
            <span className="landing-eq"><i /><i /><i /><i /></span>
          </div>
        </motion.div>
      </section>

      {/* ---------- Product rail ---------- */}
      <div className="landing-products" aria-hidden="true">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          return (
            <span key={p.label} className={`landing-product-chip tone-${p.tone}`}>
              <Icon size={13} /> {t(`landing.${p.label === 'COMMUNITY HUB' ? 'community' : p.label === 'MUSIC HUB' ? 'music' : p.label === 'VIDEO HUB' ? 'video' : p.label === 'WATCH HUB' ? 'watch' : 'cinema'}`)}
            </span>
          );
        })}
        <span className="landing-connected"><Zap size={12} fill="currentColor" /> {t('landing.connected')}</span>
      </div>

      {/* ---------- Features ---------- */}
      <section className="landing-section" id="features">
        <div className="landing-section-heading">
          <div>
            <div className="landing-kicker">{t('landing.built')}</div>
            <h2>{t('landing.lessNoise')}</h2>
          </div>
          <p>{t('landing.featureIntro')}</p>
        </div>

        <div className="landing-card-grid">
          <motion.article whileHover={{ y: -9, rotateX: 2, rotateY: -1 }} onPointerMove={trackSpotlight} onPointerLeave={resetSpotlight} className="landing-feature-card landing-feature-violet jamino-spotlight">
            <span className="landing-card-number">01</span>
            <div className="landing-feature-icon"><MessageCircle size={20} /></div>
            <h3>{t('landing.rooms')}</h3>
            <p>{t('landing.roomsDesc')}</p>
            <div className="landing-feature-art rooms" aria-hidden="true">
              <span className="la-bubble" /><span className="la-bubble delay" /><span className="la-dot dot-v" /><span className="la-dot dot-p" /><span className="la-dot dot-c" />
            </div>
          </motion.article>

          <motion.article whileHover={{ y: -9, rotateX: 2, rotateY: -1 }} onPointerMove={trackSpotlight} onPointerLeave={resetSpotlight} className="landing-feature-card landing-feature-pink jamino-spotlight">
            <span className="landing-card-number">02</span>
            <div className="landing-feature-icon"><Music2 size={20} /></div>
            <h3>{t('landing.musicSync')}</h3>
            <p>{t('landing.musicDesc')}</p>
            <div className="landing-feature-art music" aria-hidden="true">
              <span className="la-eq"><i /><i /><i /><i /><i /></span>
            </div>
          </motion.article>

          <motion.article whileHover={{ y: -9, rotateX: 2, rotateY: -1 }} onPointerMove={trackSpotlight} onPointerLeave={resetSpotlight} className="landing-feature-card landing-feature-blue jamino-spotlight">
            <span className="landing-card-number">03</span>
            <div className="landing-feature-icon"><PlaySquare size={20} /></div>
            <h3>{t('landing.creatorHome')}</h3>
            <p>{t('landing.creatorDesc')}</p>
            <div className="landing-feature-art video" aria-hidden="true">
              <span className="la-video-row"><i className="la-thumb" /><i className="la-line" /></span>
              <span className="la-video-row"><i className="la-thumb" /><i className="la-line short" /></span>
              <span className="la-video-row"><i className="la-thumb" /><i className="la-line" /></span>
            </div>
          </motion.article>

          <motion.div whileHover={{ y: -4 }} className="landing-mini-chip">
            <Zap size={17} className="chip-amber" /> <span>{t('landing.fast')}</span>
          </motion.div>
          <motion.div whileHover={{ y: -4 }} className="landing-mini-chip">
            <Shield size={17} className="chip-teal" /> <span>{t('landing.privacy')}</span>
          </motion.div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="landing-section landing-flow-section" id="how-it-works">
        <div className="landing-section-heading">
          <div>
            <div className="landing-kicker">{t('landing.flow')}</div>
            <h2>{t('landing.flowTitle')}</h2>
          </div>
          <p>{t('landing.flowIntro')}</p>
        </div>

        <div className="landing-flow-grid">
          <motion.div className="landing-flow-card" whileHover={{ y: -6 }}>
            <strong>01</strong>
            <JamiMascot state="chat" size={82} />
            <div>
              <h3>{t('landing.find')}</h3>
              <p>{t('landing.findDesc')}</p>
            </div>
          </motion.div>
          <motion.div className="landing-flow-card" whileHover={{ y: -6 }}>
            <strong>02</strong>
            <JamiMascot state="party" size={82} />
            <div>
              <h3>{t('landing.energy')}</h3>
              <p>{t('landing.energyDesc')}</p>
            </div>
          </motion.div>
          <motion.div className="landing-flow-card" whileHover={{ y: -6 }}>
            <strong>03</strong>
            <JamiMascot state="happy" size={82} />
            <div>
              <h3>{t('landing.channel')}</h3>
              <p>{t('landing.channelDesc')}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- Live demo ---------- */}
      <section className="landing-section" id="demo">
        <div className="landing-section-heading">
          <div>
            <div className="landing-kicker">{t('landing.demoKicker')}</div>
            <h2>{t('landing.demoTitle')}</h2>
          </div>
          <p>{t('landing.demoDesc')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="landing-demo"
        >
          <div className="landing-demo-video">
            <video controls playsInline preload="metadata" aria-label={t('landing.preview')}>
              <source src="/defaults/videos/demo.mp4" type="video/mp4" />
            </video>
            <span className="landing-demo-badge"><Play size={11} /> {t('landing.preview')}</span>
          </div>
        </motion.div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="landing-auth-section">
        <div className="landing-auth-copy">
          <div className="landing-kicker"><Sparkles size={12} /> {t('landing.waiting')}</div>
          <h2>{t('landing.bring')}</h2>
          <p>{t('landing.authIntro')}</p>
          <div className="landing-actions">
            <button type="button" className="btn btn-violet landing-cta" onClick={go('signup')}>
              {t('landing.start')} <ArrowRight size={16} className="icon-rtl" />
            </button>
            <button type="button" className="btn btn-ghost" onClick={go('login')}>{t('landing.login')}</button>
          </div>
          <span className="landing-auth-note"><Zap size={12} fill="currentColor" /> {t('landing.authNote')}</span>
        </div>
        <div className="landing-auth-stage" aria-hidden="true">
          <div className="landing-auth-stage-ring" />
          <JamiMascot state="party" size={150} />
          <span className="landing-auth-card-mini mini-a"><MessageCircle size={13} /> {t('landing.community')}</span>
          <span className="landing-auth-card-mini mini-b"><Music2 size={13} /> {t('landing.music')}</span>
          <span className="landing-auth-card-mini mini-c"><PlaySquare size={13} /> {t('landing.video')}</span>
          <span className="landing-auth-card-mini mini-d"><Video size={13} /> {t('landing.cinema')}</span>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="wordmark-mark"><Sparkles size={12} /></span>
            <span>Jamino © 2026</span>
          </div>
          <p className="footer-tagline">{t('landing.footer')}</p>
          <a href="#top" className="back-to-top">{t('landing.back')} ↑</a>
        </div>
      </footer>
    </main>
  );
}
