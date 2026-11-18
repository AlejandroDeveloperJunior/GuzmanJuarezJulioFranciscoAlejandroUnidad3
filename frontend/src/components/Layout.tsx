import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarClock,
  FileLock2,
  Globe,
  LayoutDashboard,
  LogOut,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';

const NAV_ITEMS = [
  { to: '/', label: 'Panel Clínico', icon: LayoutDashboard },
  { to: '/appointments', label: 'Agenda y Pagos', icon: CalendarClock },
  { to: '/records', label: 'Expediente NOM-004', icon: FileLock2 },
  { to: '/clinics', label: 'Mapa de Sedes', icon: MapPin },
  { to: '/security', label: 'Centro de Seguridad', icon: ShieldCheck },
  { to: '/services', label: 'Web Services (REST/SOAP)', icon: Globe },
];

const ROLE_BADGES: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  DOCTOR: 'bg-teal-100 text-teal-800 border-teal-200',
  RECEPTIONIST: 'bg-amber-100 text-amber-800 border-amber-200',
  PATIENT: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white">MediConnect Pro</h1>
            <p className="text-[11px] text-slate-400">DWI Unidad 3 · UTC Coahuila</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="bg-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-white truncate">
                {user?.fullName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mb-2">{user?.email}</p>
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                ROLE_BADGES[user?.role || 'PATIENT']
              }`}
            >
              ROL: {user?.role}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-600/90 text-slate-200 hover:text-white text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión segura
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API NestJS + Prisma Activa
            </span>
            <span className="hidden md:inline">
              Arquitectura 3 Capas · JWT + HttpOnly + CSRF + AES-256-GCM
            </span>
          </div>
          <a
            href="http://localhost:4000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Swagger OpenAPI →
          </a>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
