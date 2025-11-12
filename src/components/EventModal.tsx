import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Event, Profile } from '../lib/supabase';
import { X, Calendar, Clock, MapPin, FileText, Users } from 'lucide-react';

// Função para normalizar a data para o fuso horário local
export const normalizeDateToLocal = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  // Ajusta para o fuso horário local e remove a informação de fuso horário
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
};

// Função para criar uma data no fuso horário local
export const createLocalDate = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Cria a data no fuso horário local
  const localDate = new Date(year, month - 1, day, hours, minutes);
  
  // Ajusta para UTC para armazenamento consistente
  const utcDate = new Date(Date.UTC(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    localDate.getHours(),
    localDate.getMinutes()
  ));
  
  return utcDate;
};

interface EventModalProps {
  event: Event | null;
  onClose: () => void;
  onSave: () => void;
}

export function EventModal({ event, onClose, onSave }: EventModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'aula' as 'aula' | 'seminario' | 'reuniao',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    location: '',
  });

  useEffect(() => {
    loadProfiles();
    if (event) {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

      // Ajusta para o fuso horário local ao exibir
      const localStartDate = new Date(startDate.getTime() + (startDate.getTimezoneOffset() * 60000));
      const localEndDate = new Date(endDate.getTime() + (endDate.getTimezoneOffset() * 60000));

      setFormData({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        start_date: localStartDate.toISOString().split('T')[0],
        start_time: localStartDate.toTimeString().slice(0, 5),
        end_date: localEndDate.toISOString().split('T')[0],
        end_time: localEndDate.toTimeString().slice(0, 5),
        location: event.location || '',
      });

      loadParticipants(event.id);
    } else {
      // Define valores padrão para novo evento
      const now = new Date();
      const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      const defaultStart = localNow.toISOString().slice(0, 16).replace('T', ' ');
      const defaultEnd = new Date(now.getTime() + 3600000).toISOString().slice(0, 16).replace('T', ' ');

      setFormData(prev => ({
        ...prev,
        start_date: defaultStart.split(' ')[0],
        start_time: defaultStart.split(' ')[1],
        end_date: defaultEnd.split(' ')[0],
        end_time: defaultEnd.split(' ')[1]
      }));
    }
  }, [event]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;
      setAllProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadParticipants = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId);

      if (error) throw error;
      setSelectedParticipants(data?.map((p) => p.user_id) || []);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.title || !formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time) {
      setError('Preencha todos os campos obrigatórios');
      setLoading(false);
      return;
    }

    // Cria as datas no fuso horário local
    const startDateTime = createLocalDate(formData.start_date, formData.start_time);
    const endDateTime = createLocalDate(formData.end_date, formData.end_time);

    if (endDateTime <= startDateTime) {
      setError('A data de término deve ser posterior à data de início');
      setLoading(false);
      return;
    }

    try {
      if (event) {
        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title,
            description: formData.description,
            event_type: formData.event_type,
            start_date: startDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            location: formData.location,
          })
          .eq('id', event.id);

        if (error) throw error;

        await updateParticipants(event.id);
      } else {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert({
            title: formData.title,
            description: formData.description,
            event_type: formData.event_type,
            start_date: startDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            location: formData.location,
            creator_id: profile!.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (newEvent) {
          await updateParticipants(newEvent.id);
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Erro ao salvar evento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const updateParticipants = async (eventId: string) => {
    const { error: deleteError } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) throw deleteError;

    if (selectedParticipants.length > 0) {
      const participants = selectedParticipants.map((userId) => ({
        event_id: eventId,
        user_id: userId,
        invitation_status: 'pending' as const,
      }));

      const { error: insertError } = await supabase
        .from('event_participants')
        .insert(participants);

      if (insertError) throw insertError;
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const isEditable = !event || (event.creator_id === profile?.id || (profile && profile.role && ['admin', 'professor'].includes(profile.role)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            {event ? (isEditable ? 'Editar Evento' : 'Detalhes do Evento') : 'Criar Novo Evento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Nome do evento"
              disabled={!isEditable || loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Descrição do evento"
              rows={3}
              disabled={!isEditable || loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Evento *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'aula', label: 'Aula' },
                { value: 'seminario', label: 'Seminário' },
                { value: 'reuniao', label: 'Reunião' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, event_type: type.value as any })}
                  className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                    formData.event_type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                  disabled={!isEditable || loading}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Data de Início *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={!isEditable || loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Hora de Início *
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={!isEditable || loading}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Data de Término *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={!isEditable || loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Hora de Término *
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={!isEditable || loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Local
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Local do evento"
              disabled={!isEditable || loading}
            />
          </div>

          {isEditable && profile?.role === 'professor' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <Users className="w-4 h-4 inline mr-2" />
                Participantes
              </label>
              <div className="border border-slate-300 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {allProfiles.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum estudante disponível</p>
                ) : (
                  allProfiles.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(p.id)}
                        onChange={() => toggleParticipant(p.id)}
                        className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm text-slate-700">{p.full_name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {isEditable && (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50"
              >
                {loading ? 'Salvando...' : event ? 'Salvar Alterações' : 'Criar Evento'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
