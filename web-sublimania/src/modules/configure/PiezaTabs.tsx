// ============================================================
//  modules/configure/PiezaTabs.tsx
// ============================================================
import { type FC } from 'react';
import { SCHEMA } from '../../utils/schema';
import type { PiezaKey } from '../../types';

// ── Garment piece SVG icons ───────────────────────────────────
const FrenteIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" className="pieza-svg" aria-hidden="true">
    <path
      d="M5 8L11 8L16 14L21 8L27 8L30 14L25 16L25 29L7 29L7 16L2 14Z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
    />
  </svg>
);

const EspaldaIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" className="pieza-svg" aria-hidden="true">
    <path
      d="M5 8Q11 8 16 13Q21 8 27 8L30 14L25 16L25 29L7 29L7 16L2 14Z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
    />
  </svg>
);

const MangaIzqIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" className="pieza-svg" aria-hidden="true">
    <path
      d="M2 6L22 7L20 12L10 12L8 27L2 25Z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
    />
  </svg>
);

const MangaDerIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" className="pieza-svg" aria-hidden="true">
    <path
      d="M30 6L10 7L12 12L22 12L24 27L30 25Z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
    />
  </svg>
);

const DefaultPiezaIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" className="pieza-svg" aria-hidden="true">
    <rect x="4" y="4" width="24" height="24" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 14H22M10 18H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PIEZA_ICONS: Partial<Record<string, FC>> = {
  frente:    FrenteIcon,
  espalda:   EspaldaIcon,
  manga_izq: MangaIzqIcon,
  manga_der: MangaDerIcon,
};

// ── Component ─────────────────────────────────────────────────
interface Props {
  active: PiezaKey;
  onChange: (pieza: PiezaKey) => void;
  size?: 'normal' | 'sm';
}

export function PiezaTabs({ active, onChange, size = 'normal' }: Props) {
  // Compact mode inside player cards
  if (size === 'sm') {
    return (
      <div className="pieza-tabs">
        {(Object.keys(SCHEMA) as PiezaKey[]).map(pieza => (
          <button
            key={pieza}
            className={`pieza-tab-sm ${active === pieza ? 'active' : ''}`}
            style={{ '--pieza-color': SCHEMA[pieza].color } as React.CSSProperties}
            onClick={() => onChange(pieza)}
          >
            {SCHEMA[pieza].label}
          </button>
        ))}
      </div>
    );
  }

  // Full card selector (normal mode)
  return (
    <div className="pieza-selector">
      {(Object.keys(SCHEMA) as PiezaKey[]).map(pieza => {
        const schema = SCHEMA[pieza];
        const isActive = active === pieza;
        const Icon = PIEZA_ICONS[pieza] ?? DefaultPiezaIcon;
        return (
          <button
            key={pieza}
            className={`pieza-card ${isActive ? 'active' : ''}`}
            style={{ '--pieza-color': schema.color } as React.CSSProperties}
            onClick={() => onChange(pieza)}
            title={schema.label}
          >
            <div className="pieza-card-icon">
              <Icon />
            </div>
            <span className="pieza-card-name">{schema.label}</span>
            <div className="pieza-card-accent" />
          </button>
        );
      })}
    </div>
  );
}
