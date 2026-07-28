import type { ButtonHTMLAttributes } from 'react';
import { tokens } from './tokens.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

/** Primary/ghost button in the Fintranact identity. First of the shared UI kit. */
export function Button({ variant = 'primary', style, children, ...rest }: ButtonProps) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: tokens.radius.sm,
    padding: '9px 16px',
    fontWeight: 650,
    fontSize: 14,
    cursor: 'pointer',
    border: '1px solid transparent',
    fontFamily: tokens.font.sans,
  } as const;

  const variants = {
    primary: { background: tokens.color.red, color: '#fff' },
    ghost: {
      background: tokens.color.surface,
      color: tokens.color.text,
      borderColor: tokens.color.line,
    },
  } as const;

  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}
