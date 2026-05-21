// ============================================================
//  components/ui/Toast.tsx
// ============================================================
import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'ok' | 'error';
  onDone: () => void;
}

export function Toast({ message, type, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300); }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div role="status" aria-live="polite" className={`toast toast-${type} ${visible ? 'toast-show' : ''}`}>
      {message}
    </div>
  );
}
