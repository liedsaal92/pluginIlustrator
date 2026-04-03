// ============================================================
//  modules/configure/PiezaTabs.tsx
// ============================================================
import { SCHEMA } from '../../utils/schema';
import type { PiezaKey } from '../../types';

interface Props {
  active: PiezaKey;
  onChange: (pieza: PiezaKey) => void;
  size?: 'normal' | 'sm';
}

export function PiezaTabs({ active, onChange, size = 'normal' }: Props) {
  const cls = size === 'sm' ? 'pieza-tab-sm' : 'pieza-tab';
  return (
    <div className="pieza-tabs">
      {(Object.keys(SCHEMA) as PiezaKey[]).map(pieza => (
        <button
          key={pieza}
          className={`${cls} ${active === pieza ? 'active' : ''}`}
          style={{ '--pieza-color': SCHEMA[pieza].color } as React.CSSProperties}
          onClick={() => onChange(pieza)}
        >
          {SCHEMA[pieza].label}
        </button>
      ))}
    </div>
  );
}
