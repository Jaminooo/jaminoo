'use client';

import { useTranslations } from 'next-intl';
import { useJamStore } from '@/store/jam-store';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Trash2, Upload, Image as ImageIcon, X } from 'lucide-react';

export function MediaCard() {
  const t = useTranslations();
  const store = useJamStore();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const media = store.media();
  const canAdd = media.length < 5;

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) addFile(file);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const addFile = (file: File) => {
    const entry = store.addMedia(file);
    if (entry) {
      // immediate preview, stale-URL revokable on remove
    }
  };

  return (
    <div className="media-card">
      <div className={`media-dropzone ${dragActive ? 'active' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} hidden />
        <Upload size={24} />
        <span>{t('media.dropHint')}</span>
      </div>

      {media.length > 0 && (
        <div className="media-grid">
          {media.map((item) => (
            <motion.div key={item.id} className="media-item" layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <img src={item.url || ''} alt="" />
              <button className="media-remove" onClick={() => store.removeMedia(item.id)} title={t('media.removePhoto')} aria-label={t('media.removePhoto')}>
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="media-hint">
        <ImageIcon size={12} />
        <span>{t('media.photosCount', { current: media.length, max: 5 })}</span>
      </div>
    </div>
  );
}
