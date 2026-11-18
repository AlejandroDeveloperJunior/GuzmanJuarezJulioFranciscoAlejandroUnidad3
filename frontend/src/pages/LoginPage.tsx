import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { AuthUser, useAuth } from '../lib/auth-context';

interface LoginResponse {
  mfaRequired: boolean;
  message?: string;
  accessToken?: string;
  csrfToken?: string;
  user?: AuthUser;
}

const DEMO_ACCOUNTS = [
  { label: 'Paciente', email: 'paciente@mediconnect.mx', pass: 'Paciente2026!' },
  { label: 'Médico', email: 'dra.martinez@mediconnect.mx', pass: 'Doctor2026!' },
  { label: 'Admin TI', email: 'admin@mediconnect.mx', pass: 'Admin2026!' },
  { label: 'Recepción', email: 'recepcion@mediconnect.mx', pass: 'Recep2026!' },
];

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('paciente@mediconnect.mx');
  const [password, setPassword] = useState('Paciente2026!');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'register') {
        const reg = await apiFetch<{ message: string }>('/api/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, fullName, phone }),
        });
        setSuccessMsg(`${reg.message}. Ya puedes iniciar sesión.`);
        setMode('login');
      } else {
        const res = await apiFetch<LoginResponse>('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            ...(mfaCode ? { mfaCode } : {}),
          }),
        });
        if (res.mfaRequired) {
          setMfaRequired(true);
          setSuccessMsg(res.message || 'Ingresa tu código MFA TOTP de 6 dígitos');
          return;
        }
        if (res.user && res.accessToken && res.csrfToken) {
          setSession(res.user, res.accessToken, res.csrfToken);
          navigate('/');
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(`[HTTP ${err.status}] ${err.message}`);
      } else {
        setErrorMsg('No se pudo conectar con la API de MediConnect Pro.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-5">
        <div className="md:col-span-2 bg-gradient-to-b from-blue-700 to-teal-700 text-white p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">MediConnect Pro</h1>
                <p className="text-xs text-blue-100">Red Clínica Coahuila · DWI U3</p>
              </div>
            </div>
            <p className="text-sm text-blue-50 leading-relaxed mb-6">
              Plataforma web desacoplada en 3 capas para gestión clínica, telemedicina y
              Expediente Clínico Electrónico bajo la norma NOM-004-SSA3-2012.
            </p>
            <div className="space-y-3 text-xs text-blue-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0" />
                <span>Cifrado bcrypt + JWT + HttpOnly Refresh + CSRF</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-300 shrink-0" />
                <span>AES-256-GCM en expedientes + bloqueo tras 5 fallos</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-300 shrink-0" />
                <span>Web Services Propios (REST + SOAP) y de Terceros</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/20 text-[11px] text-blue-100">
            Universidad Tecnológica de Coahuila (UTC) · Alumno: Guzmán Juárez Julio F. A.
          </div>
        </div>

        <div className="md:col-span-3 p-8">
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
                mode === 'login' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
                mode === 'register' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Registrarse
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. María Fernanda López"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono de contacto
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="844-000-0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña (bcrypt salt=12)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {mode === 'register' && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Mínimo 8 caracteres, al menos 1 mayúscula y 1 número.
                </p>
              )}
            </div>

            {mfaRequired && mode === 'login' && (
              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1">
                  Código MFA (TOTP 6 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="000000"
                  className="w-full px-3 py-2 border border-amber-400 bg-amber-50 rounded-lg text-sm tracking-widest font-mono"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition disabled:opacity-60"
            >
              {submitting
                ? 'Validando credenciales...'
                : mode === 'login'
                  ? 'Ingresar de forma segura'
                  : 'Crear cuenta cifrada'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 pt-5 border-t border-slate-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Cuentas de demostración RBAC (1 clic)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.pass);
                      setMfaRequired(false);
                      setErrorMsg(null);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-medium text-slate-700 transition"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
