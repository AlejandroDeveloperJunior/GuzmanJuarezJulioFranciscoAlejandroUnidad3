import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { MapPin, Navigation, Phone, Search } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Clinic {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  latitude: number;
  longitude: number;
}

interface GeocodeResponse {
  provider: string;
  latencyMs: number;
  results: Array<{
    placeId: number;
    displayName: string;
    lat: number;
    lon: number;
  }>;
}

export const ClinicsMapPage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('Ramos Arizpe Coahuila');
  const [geoResult, setGeoResult] = useState<GeocodeResponse | null>(null);

  const { data: clinicsRes } = useQuery({
    queryKey: ['clinics'],
    queryFn: () => apiFetch<{ source: string; data: Clinic[] }>('/api/v1/clinics'),
  });

  const clinics = clinicsRes?.data || [];

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([25.51, -101.2], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || clinics.length === 0) return;

    clinics.forEach((c) => {
      L.circleMarker([c.latitude, c.longitude], {
        radius: 10,
        color: '#1d4ed8',
        fillColor: '#0d9488',
        fillOpacity: 0.85,
      })
        .addTo(map)
        .bindPopup(
          `<b>${c.name}</b><br/>${c.address}<br/>${c.city}, ${c.state}<br/>Tel: ${c.phone}`,
        );
    });
  }, [clinics]);

  const handleGeocode = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch<GeocodeResponse>(
      `/api/v1/integrations/geocode?q=${encodeURIComponent(searchQuery)}`,
    );
    setGeoResult(res);
    if (res.results.length > 0 && mapRef.current) {
      const first = res.results[0];
      mapRef.current.setView([first.lat, first.lon], 13);
      L.circleMarker([first.lat, first.lon], {
        radius: 9,
        color: '#dc2626',
        fillColor: '#f59e0b',
        fillOpacity: 0.9,
      })
        .addTo(mapRef.current)
        .bindPopup(`<b>Ubicación Nominatim:</b><br/>${first.displayName}`)
        .openPopup();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Geolocalización de Sedes Clínicas (OpenStreetMap + Nominatim)
        </h2>
        <p className="text-sm text-slate-500">
          Web Service de terceros en vivo para búsqueda geográfica de sedes médicas en Coahuila
        </p>
      </div>

      <form onSubmit={handleGeocode} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar ciudad, colonia o universidad en Coahuila..."
          className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm shadow-sm"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
        >
          <Search className="w-4 h-4" />
          Geocodificar con Nominatim
        </button>
      </form>

      {geoResult && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1">
          <p className="font-bold text-blue-900">
            Respuesta en vivo: {geoResult.provider} ({geoResult.latencyMs} ms)
          </p>
          {geoResult.results.slice(0, 2).map((r) => (
            <p key={r.placeId} className="text-blue-800">
              • {r.displayName} → <code>[{r.lat.toFixed(5)}, {r.lon.toFixed(5)}]</code>
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {clinics.map((c) => (
            <div
              key={c.id}
              onClick={() => mapRef.current?.setView([c.latitude, c.longitude], 14)}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-blue-400 cursor-pointer transition space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  {c.code}
                </span>
                <Navigation className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
              <p className="text-xs text-slate-600 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                {c.address}, {c.city}, {c.state}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {c.phone} · ({c.latitude.toFixed(4)}, {c.longitude.toFixed(4)})
              </p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
          <div ref={mapContainerRef} className="w-full h-[430px] rounded-lg" />
        </div>
      </div>
    </div>
  );
};
