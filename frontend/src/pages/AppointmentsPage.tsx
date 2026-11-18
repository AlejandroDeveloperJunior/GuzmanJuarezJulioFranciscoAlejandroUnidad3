import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, CheckCircle2, CreditCard, Video, AlertCircle } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface Doctor {
  id: string;
  specialty: string;
  consultationFee: number;
  clinic: { name: string };
  user: { fullName: string };
}

interface FeeQuote {
  feeType: string;
  baseAmount: number;
  discountRate: number;
  discountAmount: number;
  finalAmount: number;
  description: string;
}

interface AppointmentItem {
  id: string;
  folio: string;
  scheduledAt: string;
  mode: string;
  status: string;
  feeType: string;
  finalAmount: number;
  paymentStatus: string;
  paymentProviderRef: string | null;
  meetingRoomUrl: string | null;
  isHolidayWarning: boolean;
  reason: string;
  clinic: { name: string };
  doctor: { specialty: string; user: { fullName: string } };
  patient: { fullName: string };
}

export const AppointmentsPage: React.FC = () => {
  const { token, csrfToken } = useAuth();
  const qc = useQueryClient();

  const [doctorId, setDoctorId] = useState('doc-01');
  const [scheduledDate, setScheduledDate] = useState('2026-11-25T11:00');
  const [mode, setMode] = useState<'PRESENCIAL' | 'TELEMEDICINA'>('TELEMEDICINA');
  const [feeType, setFeeType] = useState<'STANDARD' | 'INSURANCE' | 'CORPORATE'>('INSURANCE');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('WHATSAPP');
  const [reason, setReason] = useState('Seguimiento preventivo cardiovascular y receta digital');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => apiFetch<Doctor[]>('/api/v1/doctors'),
  });

  const selectedDoc = doctors.find((d) => d.id === doctorId) || doctors[0];

  const { data: quote } = useQuery({
    queryKey: ['quote', selectedDoc?.consultationFee, feeType],
    enabled: Boolean(selectedDoc),
    queryFn: () =>
      apiFetch<FeeQuote>(
        `/api/v1/appointments/quote?baseAmount=${selectedDoc?.consultationFee || 650}&feeType=${feeType}`,
        { token },
      ),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => apiFetch<AppointmentItem[]>('/api/v1/appointments', { token }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ appointment: AppointmentItem; patternsApplied: string[] }>('/api/v1/appointments', {
        method: 'POST',
        token,
        csrfToken,
        body: JSON.stringify({
          doctorId,
          scheduledAt: new Date(scheduledDate).toISOString(),
          mode,
          feeType,
          notificationChannel: channel,
          reason,
          payNow: true,
        }),
      }),
    onSuccess: (res) => {
      setFeedback({
        type: 'ok',
        text: `Cita ${res.appointment.folio} confirmada y pagada ($${res.appointment.finalAmount} MXN). Patrones aplicados: ${res.patternsApplied.join(', ')}.`,
      });
      void qc.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Error al agendar cita',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Agenda Inteligente y Pasarela de Pago</h2>
        <p className="text-sm text-slate-500">
          Control anti-colisión en tiempo real + Patrón Strategy (tarifas) + Adapter (Stripe Sandbox) + Observer/Factory (notificaciones) + Nager.Date MX Holidays
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-blue-600" />
            Nueva Reserva Clínica
          </h3>

          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Médico</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.fullName} — {d.specialty} (${d.consultationFee} MXN)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha y hora</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'PRESENCIAL' | 'TELEMEDICINA')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="TELEMEDICINA">Telemedicina (WebRTC)</option>
                <option value="PRESENCIAL">Presencial en Sede</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notificación (Factory)
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as 'EMAIL' | 'SMS' | 'WHATSAPP')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Correo Electrónico</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tarifa Aplicada (Patrón Strategy)
            </label>
            <select
              value={feeType}
              onChange={(e) => setFeeType(e.target.value as 'STANDARD' | 'INSURANCE' | 'CORPORATE')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="STANDARD">Estándar (0% desc.)</option>
              <option value="INSURANCE">Seguro Gastos Médicos (35% desc.)</option>
              <option value="CORPORATE">Convenio Corporativo (20% desc.)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo de consulta</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          {quote && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Tarifa base:</span>
                <span>${quote.baseAmount.toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Descuento ({(quote.discountRate * 100).toFixed(0)}%):</span>
                <span>-${quote.discountAmount.toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total a cobrar (Adapter):</span>
                <span>${quote.finalAmount.toFixed(2)} MXN</span>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <CreditCard className="w-4 h-4" />
            {createMutation.isPending ? 'Procesando...' : 'Confirmar y Pagar Cita'}
          </button>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Citas Registradas</h3>
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {appt.folio}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {appt.doctor.user.fullName}
                    </span>
                    <span className="text-xs text-slate-500">({appt.doctor.specialty})</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Paciente: <b>{appt.patient.fullName}</b> · Sede: {appt.clinic.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Fecha: {new Date(appt.scheduledAt).toLocaleString('es-MX')} · {appt.reason}
                  </p>
                  {appt.meetingRoomUrl && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      <Video className="w-3.5 h-3.5" />
                      Sala WebRTC: {appt.meetingRoomUrl}
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-bold text-slate-900">
                    ${appt.finalAmount.toFixed(2)} MXN
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {appt.feeType} · {appt.paymentStatus}
                  </p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    {appt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
