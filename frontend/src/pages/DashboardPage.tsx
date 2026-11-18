import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CalendarCheck2,
  CloudSun,
  FileLock2,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface Appointment {
  id: string;
  folio: string;
  scheduledAt: string;
  mode: string;
  status: string;
  finalAmount: number;
  clinic: { name: string };
  doctor: { specialty: string; user: { fullName: string } };
}

interface WeatherResponse {
  source: string;
  provider: string;
  city: string;
  latencyMs: number;
  clinicalAdvisory: string;
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
}

interface HealthResponse {
  architecture: string;
  patterns: string[];
  cache: { engine: string; keys: number; hits: number; misses: number };
}

export const DashboardPage: React.FC = () => {
  const { user, token } = useAuth();

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => apiFetch<Appointment[]>('/api/v1/appointments', { token }),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => apiFetch<unknown[]>('/api/v1/doctors'),
  });

  const { data: clinicsRes } = useQuery({
    queryKey: ['clinics'],
    queryFn: () => apiFetch<{ source: string; data: unknown[] }>('/api/v1/clinics'),
  });

  const { data: weather } = useQuery({
    queryKey: ['weather'],
    queryFn: () => apiFetch<WeatherResponse>('/api/v1/integrations/weather'),
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/api/v1/health'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Bienvenido, {user?.fullName}
          </h2>
          <p className="text-sm text-slate-500">
            Resumen operativo de MediConnect Pro — Arquitectura 3 Capas + Seguridad + Web Services
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
          <ShieldCheck className="w-4 h-4" />
          Sesión JWT Activa · Rol {user?.role}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Citas Activas</span>
            <CalendarCheck2 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{appointments.length}</p>
          <p className="text-xs text-slate-500 mt-1">Control anti-colisión y tarifas Strategy</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Especialistas</span>
            <Stethoscope className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{doctors.length}</p>
          <p className="text-xs text-slate-500 mt-1">Directorio médico certificado Coahuila</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Sedes Clínicas</span>
            <MapPin className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{clinicsRes?.data?.length ?? 3}</p>
          <p className="text-xs text-slate-500 mt-1">
            Fuente: {clinicsRes?.source || 'cache'} (Singleton)
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Cifrado ECE</span>
            <FileLock2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">AES-256-GCM</p>
          <p className="text-xs text-slate-500 mt-1">Cumplimiento NOM-004-SSA3-2012</p>
        </div>
      </div>

      {/* Telemetría Open-Meteo (Tercero) + Arquitectura & Patrones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-sky-600 to-blue-700 text-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-100">
              Web Service Tercero · Open-Meteo
            </span>
            <CloudSun className="w-6 h-6 text-amber-300" />
          </div>
          <h3 className="text-lg font-bold mb-1">
            {weather?.city || 'Saltillo / Ramos Arizpe'}
          </h3>
          <div className="flex items-baseline gap-3 my-3">
            <span className="text-4xl font-extrabold">
              {weather?.current?.temperature_2m ?? '--'}°C
            </span>
            <span className="text-xs text-sky-100">
              Humedad: {weather?.current?.relative_humidity_2m ?? '--'}% · Viento:{' '}
              {weather?.current?.wind_speed_10m ?? '--'} km/h
            </span>
          </div>
          <p className="text-xs bg-white/15 rounded-lg p-3 leading-relaxed">
            {weather?.clinicalAdvisory || 'Consultando condiciones ambientales en vivo...'}
          </p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Patrones de Diseño Activos en Tiempo de Ejecución
            </h3>
            <span className="text-xs text-slate-500">
              Caché Singleton: {health?.cache.keys ?? 0} claves ({health?.cache.hits ?? 0} hits)
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {(health?.patterns || []).map((pattern) => (
              <span
                key={pattern}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
              >
                {pattern}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Folio</th>
                  <th className="py-2">Médico / Especialidad</th>
                  <th className="py-2">Sede</th>
                  <th className="py-2">Modalidad</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.slice(0, 4).map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 font-mono font-semibold text-blue-700">{a.folio}</td>
                    <td className="py-2.5">
                      {a.doctor.user.fullName}{' '}
                      <span className="text-slate-400">({a.doctor.specialty})</span>
                    </td>
                    <td className="py-2.5">{a.clinic.name}</td>
                    <td className="py-2.5">{a.mode}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
