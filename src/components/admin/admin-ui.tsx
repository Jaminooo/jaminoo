'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { CheckSquare, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

export function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

export function timeAgo(iso: string | number | Date) {
  const d = typeof iso === 'number' ? iso : new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function fmtDateTime(iso: string | Date) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export type Tone = 'violet' | 'green' | 'red' | 'amber' | 'steel';

export function Badge({ tone = 'steel', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`admin-badge ${tone}`}>{children}</span>;
}

export function useSelection(ids: Array<string | number> = []) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string | number) => {
    const key = String(id);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback((nextIds: Array<string | number>) => {
    const keys = nextIds.map(String);
    setSelected((current) => {
      const allSelected = keys.length > 0 && keys.every((key) => current.has(key));
      if (allSelected) return new Set([...current].filter((key) => !keys.includes(key)));
      return new Set([...current, ...keys]);
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);
  const isSelected = useCallback((id: string | number) => selected.has(String(id)), [selected]);

  return {
    selected,
    selectedIds: [...selected],
    count: selected.size,
    toggle,
    toggleAll,
    clear,
    isSelected,
    allSelected: ids.length > 0 && ids.every((id) => selected.has(String(id))),
  };
}

export function SelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} className="admin-checkbox" type="checkbox" checked={checked} onChange={onChange} aria-label={label} />;
}

export function SelectionToolbar({ count, onClear, children }: { count: number; onClear: () => void; children?: ReactNode }) {
  const t = useTranslations();
  if (!count) return null;
  return (
    <div className="admin-selection-toolbar">
      <div className="admin-selection-copy">
        <CheckSquare size={15} />
        <strong>{t('admin.selected', { n: count })}</strong>
        <button type="button" className="admin-selection-clear" onClick={onClear}>
          {t('admin.clearSelection')}
        </button>
      </div>
      {children ? <div className="admin-selection-actions">{children}</div> : null}
    </div>
  );
}

export function StatCard({ icon, label, value, tone = 'steel' }: { icon: ReactNode; label: string; value: string | number; tone?: Tone }) {
  return (
    <div className="admin-stat">
      <div className={`admin-stat-icon ${tone}`}>{icon}</div>
      <div className="admin-stat-meta">
        <div className="admin-stat-value">{value}</div>
        <div className="admin-stat-label">{label}</div>
      </div>
    </div>
  );
}

export function flagEmoji(code: string) {
  if (!code || code.length !== 2) return '🌐';
  const base = 0x1f1e6;
  return String.fromCodePoint(base + (code.charCodeAt(0) - 65), base + (code.charCodeAt(1) - 65));
}

export function HBarChart({
  rows,
  valueLabel,
  emptyText,
}: {
  rows: { label: string; value: number }[];
  valueLabel: string;
  emptyText: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <div className="admin-empty-pad">{emptyText}</div>;
  return (
    <div className="admin-hbars">
      {rows.map((r, i) => (
        <div key={i} className="admin-hbar-row">
          <div className="admin-hbar-flag">{flagEmoji(r.label)}</div>
          <div className="admin-hbar-meta">
            <div className="admin-hbar-top">
              <span className="admin-hbar-label">{r.label}</span>
              <span className="admin-hbar-value">
                {r.value} {valueLabel}
              </span>
            </div>
            <div className="admin-hbar-track">
              <div className="admin-hbar-fill" style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BarSeriesChart({
  rows,
  emptyText,
}: {
  rows: { label: string; value: number }[];
  emptyText: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <div className="admin-empty-pad">{emptyText}</div>;
  return (
    <div className="admin-barseries">
      {rows.map((r, i) => (
        <div key={i} className="admin-barseries-col">
          <div className="admin-barseries-val">{r.value}</div>
          <div className="admin-barseries-track">
            <div className="admin-barseries-fill" style={{ height: `${Math.max(4, Math.round((r.value / max) * 100))}%` }} />
          </div>
          <div className="admin-barseries-label">{r.label}</div>
        </div>
      ))}
    </div>
  );
}

export function dayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { weekday: 'short' });
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  placeholder: string;
}) {
  return (
    <form
      className="admin-search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <Search size={16} className="admin-search-icon" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value ? (
        <button
          type="button"
          className="admin-search-clear"
          onClick={() => {
            onChange('');
            onSearch();
          }}
          aria-label="clear"
        >
          <X size={14} />
        </button>
      ) : null}
    </form>
  );
}

export function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="admin-pager">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="prev">
        <ChevronLeft size={16} />
      </button>
      <span>
        {page} / {pages}
      </span>
      <button disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="next">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function LoadingRow({ text }: { text: string }) {
  return (
    <tr className="admin-empty-row">
      <td colSpan={99} className="admin-empty">
        <span className="admin-loader" />
        {text}
      </td>
    </tr>
  );
}

export function EmptyRow({ text }: { text: string }) {
  return (
    <tr className="admin-empty-row">
      <td colSpan={99} className="admin-empty">
        {text}
      </td>
    </tr>
  );
}

interface ConfirmState {
  title: string;
  body: string;
  danger?: boolean;
  onOk: () => void;
}
const emptyConfirm: ConfirmState | null = null;

export function useConfirm() {
  const [c, setC] = useState<ConfirmState | null>(emptyConfirm);
  const ask = useCallback((title: string, body: string, onOk: () => void, danger = true) => {
    setC({ title, body, onOk, danger });
  }, []);
  const close = useCallback(() => setC(emptyConfirm), []);
  return { confirm: c, ask, close };
}

export function ConfirmModal({ confirm, close }: { confirm: ConfirmState; close: () => void }) {
  const t = useTranslations();
  return (
    <div className="admin-modal-backdrop" onMouseDown={close}>
      <div className="admin-modal admin-confirm" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{confirm.title}</h3>
        <p>{confirm.body}</p>
        <div className="admin-modal-actions">
          <button className="btn btn-ghost" onClick={close}>
            {t('admin.cancel')}
          </button>
          <button
            className={`btn ${confirm.danger ? 'btn-danger' : 'btn-violet'}`}
            onClick={() => {
              close();
              confirm.onOk();
            }}
          >
            {t('admin.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminModal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="admin-modal-backdrop" onMouseDown={onClose}>
      <div className={`admin-modal ${wide ? 'admin-modal-wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="close">
            <X size={16} />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer ? <div className="admin-modal-actions">{footer}</div> : null}
      </div>
    </div>
  );
}

export interface ListOptions<R> {
  path: string;
  extra?: Record<string, string>;
  per?: number;
}

export function useAdminList<R>({ path, extra = {}, per = 25 }: ListOptions<R>) {
  const [rows, setRows] = useState<R[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const extraKey = JSON.stringify(extra);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per: String(per) });
    if (query) params.set('q', query);
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    api<{ rows: R[]; total: number }>(`${path}?${params}`)
      .then((d) => {
        if (!alive) return;
        setRows(d.rows);
        setTotal(d.total);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, page, query, per, extraKey, nonce]);

  const pages = Math.max(1, Math.ceil(total / per));
  return { rows, total, page, pages, setPage, q, setQ, query, setQuery, loading, reload };
}
