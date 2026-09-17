'use client';

import { ArrowDown, ArrowRight, Headphones, MessageCircle, PlaySquare, Sparkles, UsersRound } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { AuthScreen } from '@/components/auth-screen';
import { JamiMascot } from '@/components/jami-mascot';

export function LandingPage() {
  const setAuthView = useAppStore((state) => state.setAuthView);

  const openAuth = (view: 'login' | 'signup') => {
    setAuthView(view);
    document.getElementById('landing-auth')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <a className="landing-brand" href="#top" aria-label="Jamino home">
          <span className="wordmark-mark"><Sparkles size={15} /></span>
          <span>Jamino</span>
        </a>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#landing-auth">Join Jamino</a>
        </div>
        <div className="landing-nav-actions">
          <button type="button" className="btn btn-ghost pill-sm" onClick={() => openAuth('login')}>Log in</button>
          <button type="button" className="btn btn-violet pill-sm" onClick={() => openAuth('signup')}>Create account</button>
        </div>
      </nav>

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <div className="landing-kicker"><span className="landing-pulse" /> SOCIAL, MUSIC & VIDEO — TOGETHER</div>
          <h1>Make space for the people, sounds and stories that matter.</h1>
          <p>Jamino connects private rooms, shared listening, creator channels and watch-together moments in one calm workspace.</p>
          <div className="landing-actions">
            <button type="button" className="btn btn-violet landing-cta" onClick={() => openAuth('signup')}>Start your space <ArrowRight size={16} /></button>
            <a className="landing-secondary-cta" href="#features"><span>Explore the experience</span><ArrowDown size={15} /></a>
          </div>
          <div className="landing-proof"><span className="landing-proof-avatars"><JamiMascot state="happy" size={30} /><JamiMascot state="chat" size={30} /><JamiMascot state="party" size={30} /></span><span>One account. Many ways to hang out.</span></div>
        </div>
        <div className="landing-hero-stage" aria-label="Jamino workspace preview">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="landing-mascot-glow"><JamiMascot state="wave" size={270} /></div>
          <div className="landing-float-card landing-float-card-top"><span className="landing-float-icon violet"><UsersRound size={15} /></span><div><b>Private Jams</b><small>your people, your room</small></div><span className="landing-live-pill">LIVE</span></div>
          <div className="landing-float-card landing-float-card-bottom"><span className="landing-float-icon pink"><Headphones size={15} /></span><div><b>Synced listening</b><small>music that moves together</small></div><span className="landing-eq"><i /><i /><i /><i /></span></div>
        </div>
      </section>

      <section className="landing-marquee" aria-label="Jamino products">
        <span>COMMUNITY HUB</span><i /> <span>MUSIC HUB</span><i /> <span>VIDEO HUB</span><i /> <span>CINEMA HUB</span><i /> <span>ONE CONNECTED ACCOUNT</span>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-section-heading"><div><div className="landing-kicker">BUILT FOR REAL MOMENTS</div><h2>Less noise. More together.</h2></div><p>Every hub has its own rhythm, while your identity, friends and rooms stay connected.</p></div>
        <div className="landing-card-grid">
          <article className="landing-feature-card landing-feature-violet"><div className="landing-card-number">01</div><span className="landing-feature-icon"><MessageCircle size={22} /></span><h3>Rooms that feel alive</h3><p>Chat, voice, invitations and presence are designed around the people already in your circle.</p><span className="landing-card-link">Community Hub <ArrowRight size={14} /></span></article>
          <article className="landing-feature-card landing-feature-pink"><div className="landing-card-number">02</div><span className="landing-feature-icon"><Headphones size={22} /></span><h3>Music in sync</h3><p>Build a library, queue a soundtrack and listen together without losing the conversation.</p><span className="landing-card-link">Music Hub <ArrowRight size={14} /></span></article>
          <article className="landing-feature-card landing-feature-blue"><div className="landing-card-number">03</div><span className="landing-feature-icon"><PlaySquare size={22} /></span><h3>Creators with a home</h3><p>Publish posts, shorts and long videos, grow a channel and understand what your audience loves.</p><span className="landing-card-link">Video Hub <ArrowRight size={14} /></span></article>
        </div>
      </section>

      <section className="landing-section landing-flow-section" id="how-it-works">
        <div className="landing-section-heading"><div><div className="landing-kicker">THE JAMINO FLOW</div><h2>Open. Invite. Press play.</h2></div><p>Designed to move with you from a quick chat to a full creator workflow.</p></div>
        <div className="landing-flow-grid">
          <div className="landing-flow-card"><strong>01</strong><JamiMascot state="idle" size={86} /><div><h3>Find your people</h3><p>Search friends, open a room and make the moment private by default.</p></div></div>
          <div className="landing-flow-card"><strong>02</strong><JamiMascot state="wave" size={86} /><div><h3>Bring the energy</h3><p>Use synced music, voice chat or a shared cinema session to stay together.</p></div></div>
          <div className="landing-flow-card"><strong>03</strong><JamiMascot state="party" size={86} /><div><h3>Build your channel</h3><p>Apply as a creator, publish with intention and learn from every post.</p></div></div>
        </div>
      </section>

      <section className="landing-auth-section" id="landing-auth">
        <div className="landing-auth-copy"><div className="landing-kicker">YOUR NEXT ROOM IS WAITING</div><h2>Bring your people in.</h2><p>Sign in with your account or create a new space in less than a minute.</p><div className="landing-auth-note"><Sparkles size={15} /><span>Your hubs, rooms and creator identity stay connected.</span></div></div>
        <div className="landing-auth-card"><AuthScreen /></div>
      </section>

      <footer className="landing-footer"><span>© 2026 Jamino</span><span>Hang out, without the noise.</span><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
