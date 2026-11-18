import React, { useState } from 'react';
import { Code2, Globe2, Send, Server } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

const DEFAULT_SOAP_FOLIO = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://mediconnect.utc.mx/soap/clinical">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:VerifyAppointmentFolioRequest>
      <folio>MC-2026-1001</folio>
    </tns:VerifyAppointmentFolioRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

const DEFAULT_SOAP_DOCTORS = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://mediconnect.utc.mx/soap/clinical">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:GetDoctorCatalogRequest>
      <specialty>Cardiología</specialty>
    </tns:GetDoctorCatalogRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

export const WebServicesPage: React.FC = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState<'rest' | 'soap' | 'third-party'>('rest');
  const [authMode, setAuthMode] = useState<'jwt' | 'apikey'>('jwt');
  const [customApiKey, setCustomApiKey] = useState('mc_live_utc_dwi_demo_key_2026');
  const [restOutput, setRestOutput] = useState<string>('');
  const [restMeta, setRestMeta] = useState<string>('Selecciona un endpoint REST para probarlo en vivo');

  const [soapRequest, setSoapRequest] = useState(DEFAULT_SOAP_FOLIO);
  const [soapOutput, setSoapOutput] = useState('');

  const [extOutput, setExtOutput] = useState('');
  const [extMeta, setExtMeta] = useState('Selecciona una API de terceros para consultar en vivo');

  const callOwnRest = async (endpoint: string) => {
    const started = performance.now();
    try {
      const data = await apiFetch<unknown>(endpoint, {
        ...(authMode === 'jwt' ? { token } : { apiKey: customApiKey }),
      });
      const ms = Math.round(performance.now() - started);
      setRestMeta(`HTTP 200 OK · ${endpoint} · Auth: ${authMode.toUpperCase()} · ${ms} ms`);
      setRestOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      if (err instanceof ApiError) {
        setRestMeta(`HTTP ${err.status} · ${endpoint}`);
        setRestOutput(JSON.stringify({ status: err.status, message: err.message }, null, 2));
      }
    }
  };

  const sendSoap = async () => {
    const res = await fetch('/soap/clinical', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: soapRequest,
    });
    const text = await res.text();
    setSoapOutput(text);
  };

  const fetchWsdl = async () => {
    const res = await fetch('/soap/clinical?wsdl');
    setSoapOutput(await res.text());
  };

  const callThirdParty = async (label: string, path: string) => {
    const started = performance.now();
    const data = await apiFetch<unknown>(path);
    const ms = Math.round(performance.now() - started);
    setExtMeta(`${label} · HTTP 200 OK · ${ms} ms`);
    setExtOutput(JSON.stringify(data, null, 2));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Consola de Web Services (Propios REST/SOAP y Terceros)
          </h2>
          <p className="text-sm text-slate-500">
            Pruebas interactivas en vivo de API RESTful (JWT / X-API-Key), SOAP XML + WSDL y APIs externas
          </p>
        </div>
        <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setTab('rest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'rest' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Web Service Propio (REST)
          </button>
          <button
            type="button"
            onClick={() => setTab('soap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'soap' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Web Service Propio (SOAP)
          </button>
          <button
            type="button"
            onClick={() => setTab('third-party')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'third-party' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Web Services de Terceros
          </button>
        </div>
      </div>

      {tab === 'rest' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Server className="w-4 h-4 text-blue-600" />
              Endpoints Propios NestJS (/api/v1)
            </h3>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">Autenticación Remota:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('jwt')}
                  className={`flex-1 py-1.5 rounded border font-semibold ${
                    authMode === 'jwt'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 text-slate-700'
                  }`}
                >
                  Bearer JWT
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('apikey')}
                  className={`flex-1 py-1.5 rounded border font-semibold ${
                    authMode === 'apikey'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 text-slate-700'
                  }`}
                >
                  X-API-Key
                </button>
              </div>
              {authMode === 'apikey' && (
                <input
                  type="text"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
                />
              )}
            </div>

            <div className="space-y-2">
              {[
                { label: 'GET /api/v1/health', path: '/api/v1/health' },
                { label: 'GET /api/v1/clinics', path: '/api/v1/clinics' },
                { label: 'GET /api/v1/doctors', path: '/api/v1/doctors' },
                { label: 'GET /api/v1/appointments', path: '/api/v1/appointments' },
                { label: 'GET /api/v1/medical-records', path: '/api/v1/medical-records' },
                {
                  label: 'GET /api/v1/appointments/quote?feeType=INSURANCE',
                  path: '/api/v1/appointments/quote?baseAmount=850&feeType=INSURANCE',
                },
              ].map((ep) => (
                <button
                  key={ep.path}
                  type="button"
                  onClick={() => void callOwnRest(ep.path)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-mono text-slate-800 transition"
                >
                  {ep.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 text-slate-100 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
              <span className="font-mono text-emerald-400">{restMeta}</span>
              <a
                href="http://localhost:4000/api/docs"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline"
              >
                Abrir Swagger UI
              </a>
            </div>
            <pre className="text-xs font-mono overflow-auto max-h-[420px] text-sky-100">
              {restOutput || '// Presiona cualquier endpoint a la izquierda para ejecutar la petición REST.'}
            </pre>
          </div>
        </div>
      )}

      {tab === 'soap' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600" />
                Sobre XML SOAP (POST /soap/clinical)
              </h3>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSoapRequest(DEFAULT_SOAP_FOLIO)}
                  className="px-2.5 py-1 rounded bg-slate-100 text-[11px] font-semibold"
                >
                  VerifyFolio
                </button>
                <button
                  type="button"
                  onClick={() => setSoapRequest(DEFAULT_SOAP_DOCTORS)}
                  className="px-2.5 py-1 rounded bg-slate-100 text-[11px] font-semibold"
                >
                  GetDoctors
                </button>
                <button
                  type="button"
                  onClick={() => void fetchWsdl()}
                  className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-[11px] font-semibold"
                >
                  Ver WSDL
                </button>
              </div>
            </div>
            <textarea
              rows={12}
              value={soapRequest}
              onChange={(e) => setSoapRequest(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg font-mono text-xs bg-slate-50"
            />
            <button
              type="button"
              onClick={() => void sendSoap()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar Petición SOAP XML
            </button>
          </div>

          <div className="bg-slate-900 text-emerald-300 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-mono text-slate-400 border-b border-slate-800 pb-2 mb-3">
              Respuesta XML del Web Service Propio SOAP 1.1
            </p>
            <pre className="text-xs font-mono overflow-auto max-h-[380px]">
              {soapOutput || '<!-- Ejecuta "Enviar Petición SOAP XML" o "Ver WSDL" -->'}
            </pre>
          </div>
        </div>
      )}

      {tab === 'third-party' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-teal-600" />
              APIs Externas Integradas (4 en Vivo)
            </h3>
            {[
              {
                name: '1. NIH Clinical Tables (ICD-10-CM)',
                desc: 'Catálogo médico oficial CIE-10 de EE.UU.',
                path: '/api/v1/integrations/icd10?term=diabetes',
              },
              {
                name: '2. Open-Meteo Weather API',
                desc: 'Telemetría climática Coahuila y alertas',
                path: '/api/v1/integrations/weather?city=Ramos%20Arizpe',
              },
              {
                name: '3. OpenStreetMap Nominatim',
                desc: 'Geocodificación de sedes y direcciones',
                path: '/api/v1/integrations/geocode?q=Universidad%20Tecnologica%20de%20Coahuila',
              },
              {
                name: '4. Nager.Date Public Holidays',
                desc: 'Días festivos oficiales en México 2026',
                path: '/api/v1/integrations/holidays?year=2026',
              },
            ].map((api) => (
              <button
                key={api.path}
                type="button"
                onClick={() => void callThirdParty(api.name, api.path)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition"
              >
                <p className="font-bold text-xs text-slate-900">{api.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{api.desc}</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 bg-slate-900 text-slate-100 rounded-xl p-5 shadow-sm space-y-3">
            <div className="text-xs font-mono text-teal-400 border-b border-slate-800 pb-2">
              {extMeta}
            </div>
            <pre className="text-xs font-mono overflow-auto max-h-[420px] text-sky-100">
              {extOutput || '// Selecciona cualquier Web Service de terceros para consultar su respuesta en tiempo real.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
