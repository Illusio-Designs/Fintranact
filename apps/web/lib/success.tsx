'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckmarkBadge01Icon, Alert02Icon, Alert01Icon, InformationCircleIcon } from 'hugeicons-react';

/** Centered status card — success / error / warning / info. Auto-closes; no button. */
export type StatusKind = 'ok' | 'err' | 'warn' | 'info';
export type StatusInfo = { kind: StatusKind; title: string; rows: [string, string][] };

let listeners: ((s: StatusInfo) => void)[] = [];
function emit(s: StatusInfo) { listeners.forEach((l) => l(s)); }

export function showSuccess(info: Omit<StatusInfo, 'kind'>): void { emit({ kind: 'ok', ...info }); }
export function showError(title: string, rows: [string, string][] = []): void { emit({ kind: 'err', title, rows }); }
export function showWarning(title: string, rows: [string, string][] = []): void { emit({ kind: 'warn', title, rows }); }
export function showInfo(title: string, rows: [string, string][] = []): void { emit({ kind: 'info', title, rows }); }
export function showStatus(kind: StatusKind, title: string, rows: [string, string][] = []): void { emit({ kind, title, rows }); }

const BADGE: Record<StatusKind, { color: string; Icon: typeof CheckmarkBadge01Icon }> = {
  ok: { color: 'var(--good)', Icon: CheckmarkBadge01Icon },
  err: { color: 'var(--red)', Icon: Alert02Icon },
  warn: { color: 'var(--warn)', Icon: Alert01Icon },
  info: { color: 'var(--text-2)', Icon: InformationCircleIcon },
};

export function SuccessHost() {
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const l = (s: StatusInfo) => {
      setInfo(s);
      const t = setTimeout(() => setInfo(null), s.kind === 'ok' ? 2600 : 3400); // auto-close
      return () => clearTimeout(t);
    };
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  if (!mounted || !info) return null;
  const { color, Icon } = BADGE[info.kind];
  return createPortal(
    <div className="ok-scrim" onClick={() => setInfo(null)}>
      <div className="ok-card" onClick={(e) => e.stopPropagation()} role="status" aria-live="polite">
        <div className={`ok-badge ${info.kind}`}><Icon size={54} color={color} strokeWidth={1.8} /></div>
        <h3 className="ok-title">{info.title}</h3>
        {info.rows.length > 0 && (
          <div className="ok-rows">
            {info.rows.map(([k, v], i) => (
              <div className="ok-row" key={i}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>
        )}
        <div className="ok-hint">This closes automatically</div>
      </div>
    </div>,
    document.body,
  );
}
