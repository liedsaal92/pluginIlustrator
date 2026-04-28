// ============================================================
//  modules/portal/PortalScreen.tsx — Form público para jugadores
//  Sin auth. Acceso solo por token en la URL.
// ============================================================
import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../utils/supabase';
import type { PortalInfo } from '../../types';

const TALLAS = [
  '24H','26H','28H','30H','32H','34H','35H','36H','38H','40H','42H','44H',
  '24M','26M','28M','30M','32M','34M','35M','36M','38M','40M','42M','44M',
];

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Cerrado';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

type Stage = 'loading' | 'closed' | 'form' | 'success' | 'error';

export function PortalScreen({ token }: { token: string }) {
  const [info,    setInfo]    = useState<PortalInfo | null>(null);
  const [stage,   setStage]   = useState<Stage>('loading');
  const [localErr, setLocalErr] = useState('');
  const [sending,  setSending]  = useState('');

  // Campos del form
  const [cedula,    setCedula]    = useState('');
  const [nombre,    setNombre]    = useState('');
  const [camiseta,  setCamiseta]  = useState('');
  const [numero,    setNumero]    = useState('');
  const [talla,     setTalla]     = useState('');
  const [numErr,    setNumErr]    = useState('');

  const remaining = useCountdown(info?.expiresAt ?? null);

  // Cargar info del portal
  useEffect(() => {
    if (!token) { setStage('error'); return; }
    supabase.rpc('get_portal_info', { p_token: token }).then(({ data, error }) => {
      if (error || !data || data.length === 0) { setStage('error'); return; }
      const row = data[0];
      const inf: PortalInfo = {
        teamNombre:  row.team_nombre,
        expiresAt:   row.expires_at,
        status:      row.status,
        playerCount: row.player_count,
      };
      setInfo(inf);
      const expired = inf.expiresAt && new Date(inf.expiresAt) <= new Date();
      if (inf.status !== 'open' || expired) setStage('closed');
      else setStage('form');
    });
  }, [token]);

  // Cerrar si el countdown llega a 0
  useEffect(() => {
    if (remaining === 0) setStage('closed');
  }, [remaining]);

  // Validar número al cambiar
  useEffect(() => {
    if (!numero.trim()) { setNumErr(''); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.rpc('check_numero_available', {
        p_token: token, p_numero: numero.trim(),
      });
      setNumErr(data === false ? `El número ${numero} ya está tomado` : '');
    }, 400);
    return () => clearTimeout(timeout);
  }, [numero, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalErr('');
    if (!cedula.trim() || !nombre.trim() || !camiseta.trim() || !numero.trim() || !talla) {
      setLocalErr('Completá todos los campos'); return;
    }
    if (numErr) { setLocalErr(numErr); return; }
    setSending('Enviando...');
    const { error } = await supabase.rpc('submit_portal_player', {
      p_token:           token,
      p_cedula:          cedula.trim(),
      p_nombre:          nombre.trim().toUpperCase(),
      p_nombre_camiseta: camiseta.trim().toUpperCase(),
      p_numero:          numero.trim(),
      p_talla:           talla,
    });
    setSending('');
    if (error) { setLocalErr(error.message); return; }
    setStage('success');
  }

  // ── LOADING ──────────────────────────────────────────────────
  if (stage === 'loading') return (
    <div className="portal-screen">
      <div className="portal-card">
        <div className="portal-logo">SUBLI<span>FLOW</span></div>
        <p className="portal-loading">Cargando...</p>
      </div>
    </div>
  );

  // ── ERROR ────────────────────────────────────────────────────
  if (stage === 'error') return (
    <div className="portal-screen">
      <div className="portal-card">
        <div className="portal-logo">SUBLI<span>FLOW</span></div>
        <div className="portal-closed">
          <div className="portal-closed-icon">✕</div>
          <p>Este enlace no es válido.</p>
        </div>
      </div>
    </div>
  );

  // ── CLOSED ───────────────────────────────────────────────────
  if (stage === 'closed') return (
    <div className="portal-screen">
      <div className="portal-card">
        <div className="portal-logo">SUBLI<span>FLOW</span></div>
        <div className="portal-team-name">{info?.teamNombre}</div>
        <div className="portal-closed">
          <div className="portal-closed-icon">🔒</div>
          <p>Este formulario ya está cerrado.</p>
          <p className="portal-closed-sub">El equipo fue aprobado o el plazo venció.</p>
        </div>
      </div>
    </div>
  );

  // ── SUCCESS ──────────────────────────────────────────────────
  if (stage === 'success') return (
    <div className="portal-screen">
      <div className="portal-card">
        <div className="portal-logo">SUBLI<span>FLOW</span></div>
        <div className="portal-team-name">{info?.teamNombre}</div>
        <div className="portal-success">
          <div className="portal-success-icon">✓</div>
          <p>¡Tus datos fueron enviados!</p>
          <p className="portal-closed-sub">Ya podés cerrar esta ventana.</p>
        </div>
      </div>
    </div>
  );

  // ── FORM ─────────────────────────────────────────────────────
  const isExpiring = remaining !== null && remaining < 3_600_000; // menos de 1h
  return (
    <div className="portal-screen">
      <div className="portal-card">
        <div className="portal-logo">SUBLI<span>FLOW</span></div>
        <div className="portal-team-name">{info?.teamNombre}</div>

        {info?.expiresAt && (
          <div className={`portal-countdown ${isExpiring ? 'portal-countdown-urgent' : ''}`}>
            ⏱ Cierra en: <strong>{remaining !== null ? formatCountdown(remaining) : '...'}</strong>
          </div>
        )}

        <p className="portal-subtitle">Completá tus datos para el equipo</p>

        {localErr && <div className="portal-error">⚠ {localErr}</div>}

        <form className="portal-form" onSubmit={handleSubmit} noValidate>
          <label className="portal-label">CÉDULA / IDENTIFICACIÓN</label>
          <input className="input-global portal-input" type="text"
            value={cedula} onChange={e => setCedula(e.target.value)}
            placeholder="Ej: 1234567890" inputMode="numeric" />

          <label className="portal-label">NOMBRE COMPLETO</label>
          <input className="input-global portal-input" type="text"
            value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: RODRIGUEZ GARCIA" autoCapitalize="characters" />

          <label className="portal-label">NOMBRE EN CAMISETA</label>
          <input className="input-global portal-input" type="text"
            value={camiseta} onChange={e => setCamiseta(e.target.value)}
            placeholder="Ej: RODRIGUEZ" autoCapitalize="characters"
            maxLength={12} />
          <span className="portal-hint">{camiseta.length}/12 caracteres</span>

          <label className="portal-label">NÚMERO</label>
          <input className={`input-global portal-input ${numErr ? 'input-error' : ''}`}
            type="number" min="1" max="99"
            value={numero} onChange={e => setNumero(e.target.value)}
            placeholder="Ej: 10" inputMode="numeric" />
          {numErr && <span className="portal-field-err">{numErr}</span>}

          <label className="portal-label">TALLA</label>
          <select className="input-global portal-input" value={talla}
            onChange={e => setTalla(e.target.value)}>
            <option value="">-- Seleccioná tu talla --</option>
            <optgroup label="Hombres">
              {TALLAS.filter(t => t.endsWith('H')).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
            <optgroup label="Mujeres">
              {TALLAS.filter(t => t.endsWith('M')).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
          </select>

          <button className="btn btn-primary portal-submit" type="submit"
            disabled={!!sending || !!numErr}>
            {sending || '→ ENVIAR DATOS'}
          </button>
        </form>

        <p className="portal-footer">
          {info?.playerCount ?? 0} jugador{info?.playerCount !== 1 ? 'es' : ''} registrado{info?.playerCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
