// ============================================================
//  modules/pricing/MigrateDataBanner.tsx
//  Detecta datos de pricing en localStorage y ofrece migrarlos
//  a Supabase. Idempotente — puede ejecutarse más de una vez.
// ============================================================
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { usePricingStore } from '../../store/usePricingStore';
import { useTiposClienteStore } from '../../store/useTiposClienteStore';
import {
  hasLocalStoragePricingData,
  clearLocalStoragePricingData,
  migratePricingFromLocalStorage,
  type MigrationResult,
} from '../../utils/pricingMigration';

type Status = 'idle' | 'running' | 'done' | 'error';

export function MigrateDataBanner() {
  const [visible,  setVisible]  = useState(false);
  const [status,   setStatus]   = useState<Status>('idle');
  const [progress, setProgress] = useState('');
  const [pct,      setPct]      = useState(0);
  const [result,   setResult]   = useState<MigrationResult | null>(null);
  const orgId = useAuthStore(s => s.session?.user.orgId);

  useEffect(() => {
    setVisible(hasLocalStoragePricingData());
  }, []);

  if (!visible || !orgId) return null;

  async function handleMigrate() {
    setStatus('running');
    setResult(null);

    const res = await migratePricingFromLocalStorage(orgId!, (step, done, total) => {
      setProgress(step);
      setPct(Math.round((done / total) * 100));
    });

    setResult(res);
    setStatus(res.success ? 'done' : 'error');

    if (res.success) {
      // Recargar stores desde Supabase
      await Promise.all([
        usePricingStore.getState().init(),
        useTiposClienteStore.getState().init(),
      ]);
    }
  }

  function handleClear() {
    clearLocalStoragePricingData();
    setVisible(false);
  }

  return (
    <div className="migrate-banner">
      <div className="migrate-banner-icon">⬆</div>

      <div className="migrate-banner-body">
        {status === 'idle' && (
          <>
            <p className="migrate-banner-title">Datos de precios en almacenamiento local</p>
            <p className="migrate-banner-desc">
              Hay configuración de precios, cotizaciones y datos guardados en este navegador.
              Migrálos a Supabase para acceder desde cualquier dispositivo y no perder nada.
            </p>
            <button className="btn btn-primary btn-sm" onClick={handleMigrate}>
              Migrar a Supabase
            </button>
          </>
        )}

        {status === 'running' && (
          <>
            <p className="migrate-banner-title">Migrando datos…</p>
            <div className="migrate-progress-bar">
              <div className="migrate-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="migrate-banner-step">{progress}</p>
          </>
        )}

        {status === 'done' && result && (
          <>
            <p className="migrate-banner-title migrate-banner-ok">Migración completada</p>
            <p className="migrate-banner-desc">
              {Object.entries(result.counts)
                .map(([k, v]) => `${v} ${k}`)
                .join(' · ')}
            </p>
            <div className="migrate-banner-actions">
              <button className="btn btn-outline-secondary btn-sm" onClick={handleClear}>
                Limpiar localStorage
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setVisible(false)}>
                Cerrar
              </button>
            </div>
          </>
        )}

        {status === 'error' && result && (
          <>
            <p className="migrate-banner-title migrate-banner-err">
              Migración con errores ({result.errors.length})
            </p>
            <ul className="migrate-banner-errors">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
            <div className="migrate-banner-actions">
              <button className="btn btn-primary btn-sm" onClick={handleMigrate}>
                Reintentar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setVisible(false)}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
