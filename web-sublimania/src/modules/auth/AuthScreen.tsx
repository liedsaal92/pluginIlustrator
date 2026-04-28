// ============================================================
//  modules/auth/AuthScreen.tsx — Login + Registro + Accept Invite + Recovery
// ============================================================
import { useState, useEffect, type FormEvent } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

type AuthTab  = 'login' | 'register';
type AuthMode = 'tabs' | 'forgot' | 'sent' | 'reset';

export function AuthScreen() {
  const { login, register, acceptInvite, requestPasswordReset, updatePassword, loading, error, clearError, recoveryMode } = useAuthStore();

  // Detectar invite token en URL
  const inviteToken = new URLSearchParams(window.location.search).get('invite');

  const [mode, setMode] = useState<AuthMode>('tabs');

  // Cuando Supabase dispara PASSWORD_RECOVERY → mostrar form de reset
  useEffect(() => {
    if (recoveryMode) setMode('reset');
  }, [recoveryMode]);

  const [tab, setTab] = useState<AuthTab>('login');

  // Login
  const [lEmail, setLEmail] = useState('');
  const [lPass,  setLPass]  = useState('');

  // Register
  const [rOrg,      setROrg]      = useState('');
  const [rNombre,   setRNombre]   = useState('');
  const [rEmail,    setREmail]    = useState('');
  const [rPass,     setRPass]     = useState('');
  const [rPassConf, setRPassConf] = useState('');

  // Accept invite
  const [iNombre,   setINombre]   = useState('');
  const [iPass,     setIPass]     = useState('');
  const [iPassConf, setIPassConf] = useState('');

  // Forgot password
  const [fEmail, setFEmail] = useState('');

  // Reset password
  const [nPass,  setNPass]  = useState('');
  const [nPass2, setNPass2] = useState('');

  const [localErr, setLocalErr] = useState('');

  useEffect(() => {
    clearError();
    setLocalErr('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mode]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLocalErr('');
    if (!lEmail.trim() || !lPass) { setLocalErr('Completá todos los campos'); return; }
    await login(lEmail, lPass);
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setLocalErr('');
    if (!rOrg.trim() || !rNombre.trim() || !rEmail.trim() || !rPass || !rPassConf) {
      setLocalErr('Completá todos los campos'); return;
    }
    if (rPass.length < 8) { setLocalErr('Mínimo 8 caracteres'); return; }
    if (rPass !== rPassConf) { setLocalErr('Las contraseñas no coinciden'); return; }
    await register(rEmail, rPass, rNombre, rOrg);
  }

  async function handleAcceptInvite(e: FormEvent) {
    e.preventDefault();
    setLocalErr('');
    if (!iNombre.trim() || !iPass || !iPassConf) {
      setLocalErr('Completá todos los campos'); return;
    }
    if (iPass.length < 8) { setLocalErr('Mínimo 8 caracteres'); return; }
    if (iPass !== iPassConf) { setLocalErr('Las contraseñas no coinciden'); return; }
    await acceptInvite(inviteToken!, iNombre, iPass);
    // Limpiar token de la URL sin recargar
    window.history.replaceState({}, '', window.location.pathname);
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    setLocalErr('');
    if (!fEmail.trim()) { setLocalErr('Ingresá tu email'); return; }
    await requestPasswordReset(fEmail.trim());
    if (!useAuthStore.getState().error) setMode('sent');
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setLocalErr('');
    if (!nPass || !nPass2) { setLocalErr('Completá ambos campos'); return; }
    if (nPass.length < 8) { setLocalErr('Mínimo 8 caracteres'); return; }
    if (nPass !== nPass2) { setLocalErr('Las contraseñas no coinciden'); return; }
    await updatePassword(nPass);
    if (!useAuthStore.getState().error) {
      useAuthStore.setState({ recoveryMode: false });
      window.history.replaceState({}, '', window.location.pathname);
      setMode('tabs');
    }
  }

  const displayErr = localErr || error;

  // ── INVITE FLOW ──────────────────────────────────────────────
  if (inviteToken) {
    return (
      <div className="auth-screen">
        <div className="auth-bg-grid" aria-hidden="true" />
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-name">SUBLI<span>FLOW</span></div>
            <div className="auth-logo-sub">// INVITACIÓN</div>
          </div>

          <div className="auth-invite-note">
            Fuiste invitado a unirte. Completá tu perfil para continuar.
          </div>

          {displayErr && (
            <div className="auth-error" role="alert">⚠ {displayErr}</div>
          )}

          <form className="auth-form" onSubmit={handleAcceptInvite} noValidate>
            <label className="auth-label" htmlFor="i-nombre">TU NOMBRE</label>
            <input
              id="i-nombre"
              className="input-global auth-input"
              type="text"
              value={iNombre}
              onChange={e => setINombre(e.target.value)}
              placeholder="Tu nombre completo"
              autoComplete="name"
              disabled={loading}
            />
            <label className="auth-label" htmlFor="i-pass">CONTRASEÑA</label>
            <input
              id="i-pass"
              className="input-global auth-input"
              type="password"
              value={iPass}
              onChange={e => setIPass(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              disabled={loading}
            />
            <label className="auth-label" htmlFor="i-pass2">CONFIRMAR CONTRASEÑA</label>
            <input
              id="i-pass2"
              className="input-global auth-input"
              type="password"
              value={iPassConf}
              onChange={e => setIPassConf(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
            />
            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? 'CREANDO CUENTA...' : '→ UNIRSE A LA ORGANIZACIÓN'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── LOGIN / REGISTER / FORGOT / SENT / RESET FLOW ───────────
  return (
    <div className="auth-screen">
      <div className="auth-bg-grid" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-name">SUBLI<span>FLOW</span></div>
          <div className="auth-logo-sub">
            {mode === 'forgot' && '// RECUPERAR CONTRASEÑA'}
            {mode === 'sent'   && '// REVISÁ TU EMAIL'}
            {mode === 'reset'  && '// NUEVA CONTRASEÑA'}
            {mode === 'tabs'   && '// SISTEMA DE ACCESO'}
          </div>
        </div>

        {/* ── FORGOT ─────────────────────────────────────────── */}
        {mode === 'forgot' && (
          <>
            {displayErr && <div className="auth-error" role="alert">⚠ {displayErr}</div>}
            <form className="auth-form" onSubmit={handleForgot} noValidate>
              <p className="auth-role-note" style={{ marginBottom: '1rem' }}>
                Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
              </p>
              <label className="auth-label" htmlFor="f-email">EMAIL</label>
              <input
                id="f-email" className="input-global auth-input" type="email"
                value={fEmail} onChange={e => setFEmail(e.target.value)}
                placeholder="usuario@empresa.com" autoComplete="email" disabled={loading}
                autoFocus
              />
              <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                {loading ? 'ENVIANDO...' : '→ ENVIAR ENLACE'}
              </button>
              <button type="button" className="auth-forgot-link" onClick={() => setMode('tabs')}>
                ← Volver al inicio de sesión
              </button>
            </form>
          </>
        )}

        {/* ── SENT ───────────────────────────────────────────── */}
        {mode === 'sent' && (
          <div className="auth-form">
            <div className="auth-success-box">
              <div className="auth-success-icon">✓</div>
              <p>Revisá tu bandeja de entrada.</p>
              <p>Te enviamos un enlace para restablecer tu contraseña.</p>
            </div>
            <button type="button" className="btn btn-primary auth-submit" onClick={() => setMode('tabs')}>
              → VOLVER AL INICIO
            </button>
          </div>
        )}

        {/* ── RESET ──────────────────────────────────────────── */}
        {mode === 'reset' && (
          <>
            {displayErr && <div className="auth-error" role="alert">⚠ {displayErr}</div>}
            <form className="auth-form" onSubmit={handleReset} noValidate>
              <label className="auth-label" htmlFor="n-pass">NUEVA CONTRASEÑA</label>
              <input
                id="n-pass" className="input-global auth-input" type="password"
                value={nPass} onChange={e => setNPass(e.target.value)}
                placeholder="Mínimo 8 caracteres" autoComplete="new-password" disabled={loading}
                autoFocus
              />
              <label className="auth-label" htmlFor="n-pass2">CONFIRMAR CONTRASEÑA</label>
              <input
                id="n-pass2" className="input-global auth-input" type="password"
                value={nPass2} onChange={e => setNPass2(e.target.value)}
                placeholder="••••••••" autoComplete="new-password" disabled={loading}
              />
              <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                {loading ? 'GUARDANDO...' : '→ GUARDAR CONTRASEÑA'}
              </button>
            </form>
          </>
        )}

        {/* ── TABS: LOGIN / REGISTER ─────────────────────────── */}
        {mode === 'tabs' && (
          <>
            <div className="auth-tabs" role="tablist">
              <button
                className={`auth-tab${tab === 'login' ? ' active' : ''}`}
                role="tab" aria-selected={tab === 'login'}
                onClick={() => setTab('login')}
              >
                INGRESAR
              </button>
              <button
                className={`auth-tab${tab === 'register' ? ' active' : ''}`}
                role="tab" aria-selected={tab === 'register'}
                onClick={() => setTab('register')}
              >
                REGISTRARSE
              </button>
            </div>

            {displayErr && <div className="auth-error" role="alert">⚠ {displayErr}</div>}

            {tab === 'login' && (
              <form className="auth-form" onSubmit={handleLogin} noValidate>
                <label className="auth-label" htmlFor="l-email">EMAIL</label>
                <input
                  id="l-email" className="input-global auth-input" type="email"
                  value={lEmail} onChange={e => setLEmail(e.target.value)}
                  placeholder="usuario@empresa.com" autoComplete="email" disabled={loading}
                />
                <label className="auth-label" htmlFor="l-pass">CONTRASEÑA</label>
                <input
                  id="l-pass" className="input-global auth-input" type="password"
                  value={lPass} onChange={e => setLPass(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password" disabled={loading}
                />
                <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                  {loading ? 'VERIFICANDO...' : '→ INGRESAR'}
                </button>
                <button type="button" className="auth-forgot-link" onClick={() => setMode('forgot')}>
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
            )}

            {tab === 'register' && (
              <form className="auth-form" onSubmit={handleRegister} noValidate>
                <label className="auth-label" htmlFor="r-org">NOMBRE DE LA EMPRESA</label>
                <input
                  id="r-org" className="input-global auth-input" type="text"
                  value={rOrg} onChange={e => setROrg(e.target.value)}
                  placeholder="Ej: Sublimania SRL" autoComplete="organization" disabled={loading}
                />
                <label className="auth-label" htmlFor="r-nombre">TU NOMBRE</label>
                <input
                  id="r-nombre" className="input-global auth-input" type="text"
                  value={rNombre} onChange={e => setRNombre(e.target.value)}
                  placeholder="Tu nombre completo" autoComplete="name" disabled={loading}
                />
                <label className="auth-label" htmlFor="r-email">EMAIL</label>
                <input
                  id="r-email" className="input-global auth-input" type="email"
                  value={rEmail} onChange={e => setREmail(e.target.value)}
                  placeholder="usuario@empresa.com" autoComplete="email" disabled={loading}
                />
                <label className="auth-label" htmlFor="r-pass">CONTRASEÑA</label>
                <input
                  id="r-pass" className="input-global auth-input" type="password"
                  value={rPass} onChange={e => setRPass(e.target.value)}
                  placeholder="Mínimo 8 caracteres" autoComplete="new-password" disabled={loading}
                />
                <label className="auth-label" htmlFor="r-pass2">CONFIRMAR CONTRASEÑA</label>
                <input
                  id="r-pass2" className="input-global auth-input" type="password"
                  value={rPassConf} onChange={e => setRPassConf(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password" disabled={loading}
                />
                <div className="auth-role-note">
                  Al registrarte creás una nueva organización y serás su <strong>ADMINISTRADOR</strong>.
                  Desde ahí podés invitar a tus empleados.
                </div>
                <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                  {loading ? 'CREANDO CUENTA...' : '→ CREAR CUENTA'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
