/** Design tokens — the black / red / white identity used across web + desktop. */
export const tokens = {
  color: {
    ink: '#0E0E11',
    paper: '#F6F5F4',
    surface: '#FFFFFF',
    line: '#E4E2E0',
    text: '#14141A',
    textMuted: '#5C5A5E',
    red: '#C8102E',
    redPress: '#9E0B23',
    good: '#1F7A54',
    warn: '#9A6A00',
  },
  radius: { sm: '8px', md: '12px', pill: '999px' },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
} as const;

export type Tokens = typeof tokens;
