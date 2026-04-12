import { useState, useEffect, useRef } from 'react';

interface Props {
  onConfirm: () => void;
  className?: string;
  title?: string;
  stopPropagation?: boolean;
}

export function ConfirmButton({ onConfirm, className, title, stopPropagation = false }: Props) {
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pending) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPending(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pending]);

  if (pending) {
    return (
      <span
        ref={ref}
        className="confirm-popover"
        onClick={e => { if (stopPropagation) e.stopPropagation(); }}
      >
        <span className="confirm-popover__label">¿Eliminar?</span>
        <button
          className="confirm-popover__yes"
          onClick={e => { e.stopPropagation(); setPending(false); onConfirm(); }}
        >
          Sí
        </button>
        <button
          className="confirm-popover__no"
          onClick={e => { e.stopPropagation(); setPending(false); }}
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      className={className}
      title={title}
      onClick={e => { if (stopPropagation) e.stopPropagation(); setPending(true); }}
    >
      ×
    </button>
  );
}
