import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileLock2, Lock, Search, ShieldAlert, Stethoscope } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface MedicalRecordItem {
  id: string;
  icd10Code: string;
  icd10Title: string;
  vitalSigns: string;
  diagnosis: string;
  clinicalNotes: string;
  prescription: string;
  encryptedSample: string;
  digitalSignatureHash: string;
  createdAt: string;
  patient: { id: string; fullName: string; email: string };
  doctor: { fullName: string; specialty: string; licenseNumber: string; clinicName: string };
}

interface Icd10Response {
  source: string;
  provider: string;
  latencyMs: number;
  items: Array<{ code: string; name: string }>;
}

export const MedicalRecordsPage: React.FC = () => {
  const { user, token, csrfToken } = useAuth();
  const qc = useQueryClient();

  const [icdTerm, setIcdTerm] = useState('hypertension');
  const [selectedIcd, setSelectedIcd] = useState({
    code: 'I10',
    name: 'Essential (primary) hypertension',
  });
  const [patientId, setPatientId] = useState('user-patient-01');
  const [vitalSigns, setVitalSigns] = useState('TA: 118/76 mmHg | FC: 68 lpm | Temp: 36.4 °C');
  const [diagnosis, setDiagnosis] = useState(
    'Control clínico favorable sin datos de alarma cardiovascular.',
  );
  const [clinicalNotes, setClinicalNotes] = useState(
    'Se actualiza nota de evolución bajo lineamientos NOM-004-SSA3-2012.',
  );
  const [prescription, setPrescription] = useState(
    'Continuar esquema actual e hidratación 2L/día.',
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: records = [] } = useQuery({
    queryKey: ['medical-records'],
    queryFn: () => apiFetch<MedicalRecordItem[]>('/api/v1/medical-records', { token }),
  });

  const { data: icdRes, refetch: searchIcd } = useQuery({
    queryKey: ['icd10', icdTerm],
    queryFn: () =>
      apiFetch<Icd10Response>(
        `/api/v1/integrations/icd10?term=${encodeURIComponent(icdTerm)}`,
      ),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<MedicalRecordItem>('/api/v1/medical-records', {
        method: 'POST',
        token,
        csrfToken,
        body: JSON.stringify({
          patientId,
          icd10Code: selectedIcd.code,
          icd10Title: selectedIcd.name,
          vitalSigns,
          diagnosis,
          clinicalNotes,
          prescription,
        }),
      }),
    onSuccess: () => {
      setMsg({
        ok: true,
        text: 'Expediente cifrado con AES-256-GCM y firmado con SHA-256 correctamente.',
      });
      void qc.invalidateQueries({ queryKey: ['medical-records'] });
    },
    onError: (err) => {
      setMsg({
        ok: false,
        text:
          err instanceof ApiError
            ? `[HTTP ${err.status}] ${err.message}`
            : 'Error al guardar expediente',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Expediente Clínico Electrónico (NOM-004-SSA3-2012)
        </h2>
        <p className="text-sm text-slate-500">
          Cifrado simétrico AES-256-GCM en base de datos + Integración en vivo con API NIH ICD-10-CM
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Nueva Nota Clínica
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              RBAC: DOCTOR / ADMIN
            </span>
          </div>

          {user?.role === 'PATIENT' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Tu rol actual es <b>PATIENT</b>. El backend bloqueará con <b>403 Forbidden</b> si
                intentas firmar una nota médica (demostración de RBAC).
              </span>
            </div>
          )}

          {msg && (
            <div
              className={`p-3 rounded-lg text-xs border ${
                msg.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {msg.text}
            </div>
          )}

          {/* NIH ICD-10-CM Third-Party API Search */}
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
            <label className="block text-xs font-bold text-blue-900">
              Catálogo NIH ICD-10-CM (Web Service Tercero en Vivo)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={icdTerm}
                onChange={(e) => setIcdTerm(e.target.value)}
                placeholder="Buscar diagnóstico (ej. diabetes, asthma)"
                className="flex-1 px-2.5 py-1.5 border border-blue-200 rounded-md text-xs bg-white"
              />
              <button
                type="button"
                onClick={() => void searchIcd()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                Buscar
              </button>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {(icdRes?.items || []).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setSelectedIcd(item)}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] transition ${
                    selectedIcd.code === item.code
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-blue-100 text-slate-700'
                  }`}
                >
                  <b>{item.code}</b> — {item.name}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-blue-700">
              Seleccionado: <b>{selectedIcd.code}</b> ({selectedIcd.name}) · {icdRes?.latencyMs ?? 0}ms
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ID Paciente</label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Signos Vitales</label>
            <input
              type="text"
              value={vitalSigns}
              onChange={(e) => setVitalSigns(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Diagnóstico (se cifra con AES-256-GCM)
            </label>
            <textarea
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notas de Evolución
            </label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receta / Prescripción
            </label>
            <textarea
              rows={2}
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition"
          >
            <FileLock2 className="w-4 h-4" />
            Firmar y Cifrar Nota Clínica
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 font-mono text-xs font-bold mr-2">
                    CIE-10: {rec.icd10Code}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{rec.icd10Title}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(rec.createdAt).toLocaleString('es-MX')}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <p>
                  <span className="text-slate-500">Paciente:</span> <b>{rec.patient.fullName}</b>
                </p>
                <p>
                  <span className="text-slate-500">Médico:</span> <b>{rec.doctor.fullName}</b> (
                  {rec.doctor.licenseNumber})
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 text-xs font-mono text-slate-700">
                <b>Signos Vitales:</b> {rec.vitalSigns}
              </div>

              <div className="space-y-2 text-xs">
                <p>
                  <b className="text-slate-800">Diagnóstico (descifrado):</b> {rec.diagnosis}
                </p>
                <p>
                  <b className="text-slate-800">Evolución:</b> {rec.clinicalNotes}
                </p>
                <p>
                  <b className="text-slate-800">Prescripción:</b> {rec.prescription}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  Evidencia de Cifrado en Reposo (Base de Datos)
                </div>
                <p className="truncate">Texto cifrado en BD: {rec.encryptedSample}</p>
                <p className="truncate text-slate-400">
                  Sello SHA-256 NOM-004: {rec.digitalSignatureHash}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
