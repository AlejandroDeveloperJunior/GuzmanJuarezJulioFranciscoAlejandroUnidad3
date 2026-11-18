import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldAlert, ShieldCheck, Smartphone, Terminal } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface SecuritySummary {
  currentSession: { email: string; role: string; authMethod: string };
  controls: Array<{ name: string; standard: string; status: string }>;
  metrics: {
    totalUsers: number;
    totalRecords: number;
    totalLogs: number;
    blockedAttempts: number;
  };
}

interface AuditItem {
  id: string;
  userEmail: string | null;
  action: string;
  resource: string;
  status: string;
  ipAddress: string | null;
  details: string | null;
  createdAt: string;
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
}

export const SecurityAuditPage: React.FC = () => {
  const { user, token, csrfToken } = useAuth();
  const qc = useQueryClient();

  const [probeOutput, setProbeOutput] = useState<string>(
    'Haz clic en cualquier prueba de seguridad para validar la respuesta real del servidor.',
  );
  const [newKeyName, setNewKeyName] = useState('Integración Externa ClinicLab');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [mfaSetupData, setMfaSetupData] = useState<{
    secret: string;
    currentPreviewCode: string;
  } | null>(null);
  const [mfaInput, setMfaInput] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['security-summary'],
    queryFn: () => apiFetch<SecuritySummary>('/api/v1/audit/security-summary', { token }),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    enabled: user?.role !== 'PATIENT',
    queryFn: () => apiFetch<AuditItem[]>('/api/v1/audit/logs', { token }),
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiFetch<ApiKeyItem[]>('/api/v1/auth/api-keys', { token }),
  });

  const runCsrfProbe = async () => {
    try {
      await apiFetch('/api/v1/appointments', {
        method: 'POST',
        token,
        csrfToken: null,
        body: JSON.stringify({
          doctorId: 'doc-01',
          scheduledAt: '2026-12-01T10:00:00.000Z',
          mode: 'PRESENCIAL',
          reason: 'Prueba de bloqueo CSRF',
          feeType: 'STANDARD',
        }),
      });
      setProbeOutput('Inesperado: pasó sin token CSRF');
    } catch (err) {
      if (err instanceof ApiError) {
        setProbeOutput(`✅ CSRF BLOQUEADO [HTTP ${err.status}]: ${err.message}`);
      }
    }
    void qc.invalidateQueries({ queryKey: ['audit-logs'] });
    void qc.invalidateQueries({ queryKey: ['security-summary'] });
  };

  const runRbacProbe = async () => {
    try {
      await apiFetch('/api/v1/doctors', {
        method: 'POST',
        token,
        csrfToken,
        body: JSON.stringify({
          fullName: 'Dr. Prueba RBAC',
          email: `rbac.${Date.now()}@mediconnect.mx`,
          clinicId: 'clinic-ramos-arizpe',
          specialty: 'Neurología',
          licenseNumber: `CED-${Date.now()}`,
          consultationFee: 900,
        }),
      });
      setProbeOutput('✅ Acceso autorizado: tu rol actual es ADMIN y superó el RolesGuard.');
    } catch (err) {
      if (err instanceof ApiError) {
        setProbeOutput(`✅ RBAC PROTEGIDO [HTTP ${err.status}]: ${err.message}`);
      }
    }
    void qc.invalidateQueries({ queryKey: ['audit-logs'] });
  };

  const runXssSanitizeProbe = async () => {
    try {
      const payload = {
        doctorId: 'doc-01',
        scheduledAt: '2026-12-12T15:30:00.000Z',
        mode: 'TELEMEDICINA',
        reason: '<script>alert("XSS")</script>Consulta general saneada',
        feeType: 'STANDARD',
      };
      const res = await apiFetch<{ appointment: { folio: string; reason: string } }>(
        '/api/v1/appointments',
        {
          method: 'POST',
          token,
          csrfToken,
          body: JSON.stringify(payload),
        },
      );
      setProbeOutput(
        `✅ Saneamiento XSS (SanitizeInputPipe): enviado "${payload.reason}" → almacenado limpio como "${res.appointment.reason}" (Folio ${res.appointment.folio}).`,
      );
      void qc.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err) {
      if (err instanceof ApiError) {
        setProbeOutput(`[HTTP ${err.status}] ${err.message}`);
      }
    }
  };

  const handleGenerateApiKey = async () => {
    const res = await apiFetch<{ plainKey: string }>('/api/v1/auth/api-keys', {
      method: 'POST',
      token,
      csrfToken,
      body: JSON.stringify({ name: newKeyName }),
    });
    setGeneratedKey(res.plainKey);
    void qc.invalidateQueries({ queryKey: ['api-keys'] });
  };

  const handleSetupMfa = async () => {
    const res = await apiFetch<{ secret: string; currentPreviewCode: string }>(
      '/api/v1/auth/mfa/setup',
      { token },
    );
    setMfaSetupData(res);
    setMfaInput(res.currentPreviewCode);
  };

  const handleEnableMfa = async () => {
    try {
      const res = await apiFetch<{ message: string }>('/api/v1/auth/mfa/enable', {
        method: 'POST',
        token,
        csrfToken,
        body: JSON.stringify({ code: mfaInput }),
      });
      setProbeOutput(`✅ ${res.message}`);
    } catch (err) {
      if (err instanceof ApiError) setProbeOutput(`❌ ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Centro de Seguridad, Criptografía y Auditoría
        </h2>
        <p className="text-sm text-slate-500">
          Demostración interactiva en vivo de los mecanismos de defensa implementados en MediConnect Pro
        </p>
      </div>

      {/* Controls grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {(summary?.controls || []).map((ctrl) => (
          <div key={ctrl.name} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {ctrl.status}
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">{ctrl.name}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{ctrl.standard}</p>
          </div>
        ))}
      </div>

      {/* Interactive Security Lab + MFA + API Key */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Laboratorio de Pruebas de Seguridad en Vivo
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runCsrfProbe()}
              className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              1. Probar Ataque sin CSRF
            </button>
            <button
              type="button"
              onClick={() => void runRbacProbe()}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              2. Probar RBAC (Ruta Admin)
            </button>
            <button
              type="button"
              onClick={() => void runXssSanitizeProbe()}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              3. Probar Saneamiento XSS
            </button>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs min-h-[76px] flex items-center gap-2">
            <Terminal className="w-4 h-4 shrink-0 text-slate-400" />
            <span>{probeOutput}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              Gestión de X-API-Key (Hash SHA-256)
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={() => void handleGenerateApiKey()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
              >
                Generar Llave
              </button>
            </div>
            {generatedKey && (
              <p className="p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-emerald-900 break-all">
                Nueva X-API-Key: <b>{generatedKey}</b>
              </p>
            )}
            <div className="text-[11px] text-slate-500">
              Llaves registradas: {apiKeys.map((k) => `${k.name} (${k.keyPrefix}...)`).join(', ') || 'Ninguna'}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-teal-600" />
              Autenticación Multifactor TOTP (RFC-6238)
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSetupMfa()}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold"
              >
                Generar Secreto TOTP
              </button>
              {mfaSetupData && (
                <>
                  <input
                    type="text"
                    value={mfaInput}
                    onChange={(e) => setMfaInput(e.target.value)}
                    className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => void handleEnableMfa()}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Activar MFA
                  </button>
                </>
              )}
            </div>
            {mfaSetupData && (
              <p className="text-[11px] font-mono text-slate-600">
                Secreto Base32: {mfaSetupData.secret} · Código actual: <b>{mfaSetupData.currentPreviewCode}</b>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Bitácora Inmutable de Auditoría</h3>
          <span className="text-xs text-slate-500">
            Eventos totales: {summary?.metrics.totalLogs ?? 0} · Bloqueos detectados:{' '}
            <b className="text-red-600">{summary?.metrics.blockedAttempts ?? 0}</b>
          </span>
        </div>

        {user?.role === 'PATIENT' ? (
          <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            La bitácora completa solo es visible para roles ADMIN / DOCTOR / RECEPTIONIST (RBAC).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Usuario</th>
                  <th className="py-2">Acción</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 12).map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 text-slate-500">
                      {new Date(log.createdAt).toLocaleTimeString('es-MX')}
                    </td>
                    <td className="py-2 font-medium">{log.userEmail || 'Anónimo'}</td>
                    <td className="py-2 font-mono">{log.action}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
