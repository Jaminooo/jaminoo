'use client';

import { useEffect } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useCmStore, type CmItem } from '@/components/context-menu';
import { toast } from '@/components/toast';
import { ExternalLink, Image as ImageIcon, Clipboard, Scissors, ClipboardPaste, BoxSelect, RefreshCw, Link2, ArrowLeft, ArrowRight, Save } from 'lucide-react';

function isEditable(node: EventTarget | null): boolean {
  if (!node || !(node instanceof HTMLElement)) return false;
  const tag = node.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || node.isContentEditable;
}

function selectionText(): string {
  const sel = window.getSelection?.();
  return sel && sel.toString().trim() ? sel.toString() : '';
}

function closestHref(node: EventTarget | null): string | null {
  if (!node || !(node instanceof HTMLElement)) return null;
  return node.closest('a[href]')?.getAttribute('href') ?? null;
}

function closestImg(node: EventTarget | null): string | null {
  if (!node || !(node instanceof HTMLElement)) return null;
  const img = node.closest('img[src]');
  return img ? img.getAttribute('src') : null;
}

function closestVideo(node: EventTarget | null): string | null {
  if (!node || !(node instanceof HTMLElement)) return null;
  const v = node.closest('video[src],video source[src]');
  return v ? v.getAttribute('src') : null;
}

function normalizeUrl(src: string): string {
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    /* noop */
  }
}

export function SiteGuard() {
  const t = useTranslations();

  useEffect(() => {
const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      const target = e.target as EventTarget | null;
      if (target instanceof HTMLElement && target.closest('.msg')) return;

      const href = closestHref(target);
      const img = closestImg(target);
      const video = closestVideo(target);
      const selection = selectionText();
      const editable = isEditable(target);

      const items: CmItem[] = [];
      if (href) {
        items.push({
          icon: <ExternalLink size={14} />,
          label: t('ctx.openNewTab'),
          onClick: () => window.open(normalizeUrl(href), '_blank', 'noopener'),
        });
        items.push({
          icon: <Link2 size={14} />,
          label: t('ctx.copyLink'),
          onClick: () => copyText(normalizeUrl(href)),
        });
        items.push({ separator: true, label: '', onClick: () => {} });
      } else if (img) {
        items.push({
          icon: <ImageIcon size={14} />,
          label: t('ctx.openImage'),
          onClick: () => window.open(normalizeUrl(img), '_blank', 'noopener'),
        });
        items.push({
          icon: <Link2 size={14} />,
          label: t('ctx.copyImage'),
          onClick: () => copyText(normalizeUrl(img)),
        });
        items.push({
          icon: <Save size={14} />,
          label: t('ctx.saveImage'),
          onClick: () => {
            const a = document.createElement('a');
            a.href = normalizeUrl(img);
            a.download = '';
            a.target = '_blank';
            a.rel = 'noopener';
            a.click();
          },
        });
        items.push({ separator: true, label: '', onClick: () => {} });
      } else if (video && video !== href) {
        items.push({
          icon: <ExternalLink size={14} />,
          label: t('ctx.openVideo'),
          onClick: () => window.open(normalizeUrl(video), '_blank', 'noopener'),
        });
        items.push({
          icon: <Link2 size={14} />,
          label: t('ctx.copyVideo'),
          onClick: () => copyText(normalizeUrl(video)),
        });
        items.push({ separator: true, label: '', onClick: () => {} });
      } else if (selection && !editable) {
        items.push({
          icon: <Clipboard size={14} />,
          label: t('ctx.copySelection'),
          onClick: () => copyText(selection),
        });
        items.push({ separator: true, label: '', onClick: () => {} });
      } else if (editable) {
        items.push({
          icon: <Clipboard size={14} />,
          label: t('ctx.copy'),
          onClick: () => document.execCommand('copy'),
        });
        items.push({
          icon: <Scissors size={14} />,
          label: t('ctx.cut'),
          onClick: () => document.execCommand('cut'),
        });
        items.push({
          icon: <ClipboardPaste size={14} />,
          label: t('ctx.paste'),
          onClick: () => document.execCommand('paste'),
        });
        items.push({
          icon: <BoxSelect size={14} />,
          label: t('ctx.selectAll'),
          onClick: () => {
            const el = target as Element;
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.select();
            else if (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable) {
              const range = document.createRange();
              range.selectNodeContents(document.activeElement);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          },
        });
        items.push({ separator: true, label: '', onClick: () => {} });
      }

      items.push({
        icon: <ArrowLeft size={14} />,
        label: t('ctx.goBack'),
        onClick: () => window.history.back(),
      });
      items.push({
        icon: <ArrowRight size={14} />,
        label: t('ctx.goForward'),
        onClick: () => window.history.forward(),
      });
      items.push({
        icon: <RefreshCw size={14} />,
        label: t('ctx.refresh'),
        onClick: () => window.location.reload(),
      });
      items.push({ separator: true, label: '', onClick: () => {} });
      items.push({
        icon: <Link2 size={14} />,
        label: t('ctx.copyUrl'),
        onClick: () => copyText(window.location.href),
      });

      useCmStore.getState().openCm(e.clientX, e.clientY, items);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'f12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) || (e.ctrlKey && key === 'u')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toast(t('guard.devtoolsBlocked'), 'error');
      }
    };

    const devtoolsLoop = window.setInterval(() => {
      const threshold = 180;
      const opened = Math.abs(window.outerWidth - window.innerWidth) > threshold || Math.abs(window.outerHeight - window.innerHeight) > threshold;
      if (opened && (window.outerWidth > 0 && window.innerWidth > 0)) {
        toast(t('guard.devtoolsBlocked'), 'error');
      }
    }, 1500);

    window.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.clearInterval(devtoolsLoop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  return null;
}