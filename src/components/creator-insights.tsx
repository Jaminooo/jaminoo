'use client';

import { useEffect, useState } from 'react';
import { BarChart3, BadgeCheck, Clock3, Eye, Heart, MessageCircle, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';

type Insights = {
  status: string | null; reviewNote: string; reviewedAt: string | null;
  analytics: null | { followers: number; published: number; drafts: number; likes: number; saves: number; comments: number; interactions: number; recentInteractions: number; trend: { date: string; posts: number; interactions: number }[]; topPosts: { id: number; title: string; kind: string; interactions: number }[] };
};

export function CreatorInsights() {
  const [data, setData] = useState<Insights | null>(null);
  useEffect(() => { api<Insights>('/api/creator/insights').then(setData).catch(() => setData(null)); }, []);
  if (!data) return null;
  if (!data.analytics) return <div className="creator-insights creator-insights-review"><Clock3 size={16} /><span>Creator review status: <b>{data.status ?? 'NOT SUBMITTED'}</b>{data.reviewNote ? ` · ${data.reviewNote}` : ''}</span></div>;
  const max = Math.max(1, ...data.analytics.trend.map((day) => day.interactions));
  return (
    <section className="creator-insights">
      <div className="creator-insights-head"><div><div className="hub-kicker"><BarChart3 size={13} /> CREATOR INTELLIGENCE</div><h3>Know what is moving.</h3><p>Live engagement signals from your published work.</p></div><span className="creator-insights-approved"><BadgeCheck size={14} /> Approved creator</span></div>
      <div className="creator-insights-cards">
        <div><UsersRound size={15} /><b>{data.analytics.followers}</b><small>Followers</small></div>
        <div><Eye size={15} /><b>{data.analytics.published}</b><small>Published</small></div>
        <div><Heart size={15} /><b>{data.analytics.likes}</b><small>Likes</small></div>
        <div><MessageCircle size={15} /><b>{data.analytics.interactions}</b><small>Interactions</small></div>
      </div>
      <div className="creator-insights-grid">
        <div className="creator-insights-chart"><div className="creator-insights-label"><span>7-day interaction pulse</span><b>{data.analytics.recentInteractions} recent</b></div><div className="creator-insights-bars">{data.analytics.trend.map((day) => <div className="creator-insights-bar-wrap" key={day.date} title={`${day.date}: ${day.interactions} interactions`}><span className="creator-insights-bar" style={{ height: `${Math.max(8, (day.interactions / max) * 100)}%` }} /><small>{day.date.slice(5)}</small></div>)}</div></div>
        <div className="creator-insights-top"><div className="creator-insights-label"><span>Top content</span><b>{data.analytics.drafts} drafts</b></div>{data.analytics.topPosts.map((post) => <div className="creator-insights-post" key={post.id}><span><b>{post.title}</b><small>{post.kind}</small></span><strong>{post.interactions}</strong></div>)}</div>
      </div>
    </section>
  );
}
