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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
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
      } else if (editable && target instanceof HTMLElement) {
        const el = target;
        const isTextField = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
        const focusEl = () => {
          if (document.activeElement !== el && typeof el.focus === 'function') el.focus();
        };
        const fieldValue = () => (isTextField ? (el as HTMLInputElement).value : el.isContentEditable ? (el.textContent ?? '') : '');
        const applyValue = (next: string) => {
          if (isTextField) {
            (el as HTMLInputElement).value = next;
            (el as HTMLInputElement).dispatchEvent(new Event('input', { bubbles: true }));
          } else if (el.isContentEditable) {
            el.textContent = next;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        };
        const selRange = () => {
          if (isTextField) {
            const input = el as HTMLInputElement;
            const s = input.selectionStart ?? 0;
            const e = input.selectionEnd ?? input.value.length;
            return { start: s, end: e, text: input.value.slice(s, e) };
          }
          const sel = window.getSelection();
          if (sel && sel.rangeCount && el.contains(sel.anchorNode)) return { start: 0, end: 0, text: sel.toString() };
          return { start: 0, end: 0, text: '' };
        };
        items.push({
          icon: <Clipboard size={14} />,
          label: t('ctx.copy'),
          onClick: () => {
            focusEl();
            const r = selRange();
            const text = (r && r.text) || fieldValue();
            if (!text) return;
            void copyText(text).then((ok) => { if (ok) toast(t('ctx.copied'), 'ok'); });
          },
        });
        items.push({
          icon: <Scissors size={14} />,
          label: t('ctx.cut'),
          onClick: () => {
            focusEl();
            const r = selRange();
            const text = (r && r.text) || fieldValue();
            if (!text) return;
            void copyText(text).then((ok) => {
              if (!ok) return;
              if (isTextField) {
                const input = el as HTMLInputElement;
                const s = r?.start ?? 0;
                const e = r?.end ?? input.value.length;
                applyValue(input.value.slice(0, s) + input.value.slice(e));
                (el as HTMLInputElement).setSelectionRange(s, s);
              } else if (el.isContentEditable) {
                const sel = window.getSelection();
                if (sel && sel.rangeCount) sel.deleteFromDocument();
              }
              toast(t('ctx.copied'), 'ok');
            });
          },
        });
        items.push({
          icon: <ClipboardPaste size={14} />,
          label: t('ctx.paste'),
          onClick: () => {
            focusEl();
            void navigator.clipboard
              ?.readText()
              .then((text) => {
                if (!text || !el) return;
                if (isTextField) {
                  const input = el as HTMLInputElement;
                  const s = input.selectionStart ?? input.value.length;
                  const e = input.selectionEnd ?? s;
                  const next = input.value.slice(0, s) + text + input.value.slice(e);
                  applyValue(next);
                  const caret = s + text.length;
                  (el as HTMLInputElement).setSelectionRange(caret, caret);
                } else if (el.isContentEditable) {
                  document.execCommand('insertText', false, text);
                }
              })
              .catch(() => toast(t('ctx.pasteError'), 'error'));
          },
        });
        items.push({
          icon: <BoxSelect size={14} />,
          label: t('ctx.selectAll'),
          onClick: () => {
            focusEl();
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.select();
            else if (el.isContentEditable) {
              const range = document.createRange();
              range.selectNodeContents(el);
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