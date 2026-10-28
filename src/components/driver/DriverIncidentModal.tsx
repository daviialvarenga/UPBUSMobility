import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Camera,
  MapPin,
  Clock,
  Send,
  Upload,
  CheckCircle,
  Truck,
  Wrench,
  ShieldAlert,
  TrafficCone,
  Car,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

interface DriverIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTripId?: string | null;
  activeVehicleId?: string | null;
  currentLocation?: { latitude: number; longitude: number } | null;
  onSubmitIncident: (params: {
    incidentType: string;
    title: string;
    description: string;
    latitude?: number | null;
    longitude?: number | null;
    photoUrl?: string | null;
  }) => Promise<void>;
}

export const DriverIncidentModal: React.FC<DriverIncidentModalProps> = ({
  isOpen,
  onClose,
  activeTripId,
  activeVehicleId,
  currentLocation,
  onSubmitIncident,
}) => {
  const [incidentType, setIncidentType] = useState<string>('traffic_delay');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickTypes = [
    { id: 'traffic_delay', label: 'Trânsito Intenso', icon: TrafficCone, color: 'text-amber-400' },
    { id: 'mechanical_failure', label: 'Pane Mecânica', icon: Wrench, color: 'text-red-400' },
    { id: 'accident', label: 'Acidente / Batida', icon: Car, color: 'text-rose-400' },
    { id: 'route_obstruction', label: 'Desvio de Rota', icon: Truck, color: 'text-amber-400' },
    { id: 'safety_issue', label: 'Problema no Ponto', icon: MapPin, color: 'text-blue-400' },
    { id: 'other', label: 'Outros Incidentes', icon: ShieldAlert, color: 'text-slate-400' },
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Descreva detalhadamente o ocorrido.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const selectedObj = quickTypes.find((t) => t.id === incidentType);
      const computedTitle = title.trim() || selectedObj?.label || 'Ocorrência Operacional';

      await onSubmitIncident({
        incidentType: incidentType === 'safety_issue' ? 'route_obstruction' : incidentType,
        title: computedTitle,
        description: description.trim(),
        latitude: currentLocation?.latitude ?? null,
        longitude: currentLocation?.longitude ?? null,
        photoUrl: photoPreview,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao transmitir ocorrência para o CCO.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-950/80 text-red-400 flex items-center justify-center border border-red-800/80">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Reportar Ocorrência Rápida</h3>
              <p className="text-xs text-slate-400">Notificação imediata ao CCO (Centro de Controle)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Seleção do Tipo de Ocorrência Rápida */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tipo da Ocorrência
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickTypes.map((item) => {
                const Icon = item.icon;
                const isSelected = incidentType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIncidentType(item.id);
                      if (!title) setTitle(item.label);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-red-950/50 border-red-600 text-white ring-1 ring-red-600'
                        : 'bg-slate-800/70 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="font-semibold text-xs leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Título do Incidente
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Pneu furado na Avenida Principal"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Descrição Detalhada */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Descrição do Ocorrido <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a gravidade, se há bloqueio total da via, passageiros aguardando ou necessidade de socorro..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Localização e Horário Automáticos */}
          <div className="grid grid-cols-2 gap-2 text-slate-400 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-semibold">Localização GPS</div>
                <div className="font-mono text-[11px] text-white">
                  {currentLocation
                    ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                    : 'Aguardando GPS...'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-semibold">Data & Hora</div>
                <div className="font-mono text-[11px] text-white">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Anexo de Foto Opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Foto Opcional do Incidente
            </label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-40">
                <img
                  src={photoPreview}
                  alt="Prévia do incidente"
                  className="w-full h-36 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-white hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-slate-600 transition-colors bg-slate-800/40">
                <Camera className="w-6 h-6 text-slate-400 mb-1" />
                <span className="font-medium text-slate-300">Tirar ou anexar foto</span>
                <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG até 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950 -mx-4 -mb-4 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={loading}
              className="font-bold text-xs px-5 shadow-lg flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Transmitindo...' : 'Transmitir ao CCO'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
