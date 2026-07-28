'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckmarkCircle02Icon, Alert01Icon, InformationCircleIcon } from 'hugeicons-react';

/** Global toast — call toast() from anywhere; <ToastHost/> (in AppShell) renders them. */
export type ToastKind = 'ok' | 'info' | 'err';
type ToastMsg = { id: number; kind: ToastKind; text: string };

let listeners: ((t: ToastMsg) => void)[] = [];
let seq = 1;

export function toast(text: string, kind: ToastKind = 'ok'): void {
  const msg = { id: seq++, kind, text };
  listeners.forEach((l) => l(msg));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const l = (t: ToastMsg) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 3400);
    };
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="toast-stack" aria-live="polite">
      {items.map((t) => (
        <div className={`toast toast-${t.kind}`} key={t.id} role="status">
          {t.kind === 'ok' ? <CheckmarkCircle02Icon size={17} color="var(--good)" />
            : t.kind === 'err' ? <Alert01Icon size={17} color="var(--red-ink)" />
            : <InformationCircleIcon size={17} color="currentColor" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
