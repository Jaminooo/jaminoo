'use client';

import { ArrowDown, ArrowRight, Headphones, MessageCircle, PlaySquare, Sparkles, UsersRound, Globe, Zap, Shield, Music2 } from 'lucide-react';
import { useLocale, useTranslations } from '@/providers/use-translations';
import { JamiMascot } from '@/components/jami-mascot';
import { motion } from 'framer-motion';

export function LandingPage() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();

  const openAuth = (view: 'login' | 'signup') => {
    window.location.href = `/auth?view=${view}`;
  };

  const toggleLang = () => setLocale(locale === 'fa' ? 'en' : 'fa');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <main className="landing-page" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="landing-nav">
        <motion.a 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="landing-brand" 
          href="#top"
        >
          <span className="wordmark-mark"><Sparkles size={15} /></span>
          <span className="brand-text">Jamino</span>
        </motion.a>
        
        <div className="landing-nav-links">
          <a href="#features">{t('landing.features')}</a>
          <a href="#how-it-works">{t('landing.how')}</a>
        </div>

        <div className="landing-nav-actions">
          <button type="button" className="lang-toggle" onClick={toggleLang}>
            <Globe size={16} />
            <span>{locale === 'fa' ? 'English' : 'فارسی'}</span>
          </button>
          <button type="button" className="btn btn-ghost pill-sm hide-mobile" onClick={() => (window.location.href = '/auth?view=login')}>{t('landing.login')}</button>
          <button type="button" className="btn btn-violet pill-sm" onClick={() => (window.location.href = '/auth?view=signup')}>{t('landing.create')}</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero" id="top">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="landing-hero-copy"
        >
          <motion.div variants={itemVariants} className="landing-kicker">
            <span className="landing-pulse" /> 
            {t('landing.kicker')}
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="hero-title">
            {t('landing.hero')}
          </motion.h1>
          
          <motion.p variants={itemVariants} className="hero-subtitle">
            {t('landing.intro')}
          </motion.p>
          
          <motion.div variants={itemVariants} className="landing-actions">
            <button type="button" className="btn btn-violet landing-cta" onClick={() => (window.location.href = '/auth?view=signup')}>
              {t('landing.start')} 
              <ArrowRight size={16} className="icon-rtl" />
            </button>
            <a className="landing-secondary-cta" href="#features">
              <span>{t('landing.explore')}</span>
              <ArrowDown size={15} />
            </a>
          </motion.div>

          <motion.div variants={itemVariants} className="landing-proof">
            <div className="landing-proof-avatars">
              <JamiMascot state="happy" size={30} />
              <JamiMascot state="chat" size={30} />
              <JamiMascot state="party" size={30} />
            </div>
            <span>{t('landing.proof')}</span>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="landing-hero-stage"
        >
          <div className="hero-glow-container">
            <div className="hero-blob blob-1"></div>
            <div className="hero-blob blob-2"></div>
          </div>
          
          <div className="landing-mascot-glow">
            <JamiMascot state="wave" size={270} />
          </div>
          
          <div className="landing-float-card card-1">
            <span className="landing-float-icon violet"><UsersRound size={15} /></span>
            <div>
              <b>{t('landing.private')}</b>
              <small>{t('landing.privateHint')}</small>
            </div>
          </div>
          
          <div className="landing-float-card card-2">
            <span className="landing-float-icon pink"><Headphones size={15} /></span>
            <div>
              <b>{t('landing.synced')}</b>
              <small>{t('landing.syncedHint')}</small>
            </div>
            <span className="landing-eq"><i /><i /><i /></span>
          </div>
        </motion.div>
      </section>

      {/* Bento Grid Features */}
      <section className="landing-section" id="features">
        <div className="landing-section-heading">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="landing-kicker">{t('landing.built')}</div>
            <h2>{t('landing.lessNoise')}</h2>
          </motion.div>
          <p className="heading-desc">{t('landing.featureIntro')}</p>
        </div>

        <div className="bento-grid">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item bento-main"
          >
            <div className="bento-content">
              <div className="bento-icon-box violet"><MessageCircle size={24} /></div>
              <h3>{t('landing.rooms')}</h3>
              <p>{t('landing.roomsDesc')}</p>
            </div>
            <div className="bento-visual">
              <div className="chat-bubble-mock"></div>
              <div className="chat-bubble-mock delay"></div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item bento-secondary pink"
          >
            <div className="bento-icon-box pink"><Music2 size={24} /></div>
            <h3>{t('landing.musicSync')}</h3>
            <p>{t('landing.musicDesc')}</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item bento-secondary blue"
          >
            <div className="bento-icon-box blue"><PlaySquare size={24} /></div>
            <h3>{t('landing.creatorHome')}</h3>
            <p>{t('landing.creatorDesc')}</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item bento-small"
          >
            <Zap size={20} className="text-emerald-400" />
            <span>Fast at the edge</span>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bento-item bento-small"
          >
            <Shield size={20} className="text-blue-400" />
            <span>Privacy by design</span>
          </motion.div>
        </div>
      </section>

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
