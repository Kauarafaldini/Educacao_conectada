import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Event } from '../lib/supabase';
import { DashboardLayout } from './DashboardLayout';
import { DashboardHome } from './DashboardHome';
import { Calendar } from './Calendar';
import { EventModal } from './EventModal';
import { EventList } from './EventList';
import { ProfileModal } from './ProfileModal';
import { NotificationPanel } from './NotificationPanel';
import { SettingsModal } from './SettingsModal';
import { SearchBar } from './SearchBar';
import { Plus } from 'lucide-react';
import ChatButton from './chat/ChatButton';

export function Dashboard() {
  const { profile } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    date: '',
  });

  useEffect(() => {
    if (currentView === 'events') {
      loadEvents();
    }
  }, [currentView]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(*)
        `)
        .eq('is_cancelled', false)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.creator?.full_name.toLowerCase().includes(searchLower)
      );
    }

    if (filters.type) {
      filtered = filtered.filter((event) => event.event_type === filters.type);
    }

    if (filters.date) {
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.start_date).toISOString().split('T')[0];
        return eventDate === filters.date;
      });
    }

    setFilteredEvents(filtered);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleEventSaved = () => {
    loadEvents();
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este evento?')) return;

    try {
      // Primeiro, verifica se o usuário é o criador do evento ou um administrador
      const { data: eventData, error: fetchError } = await supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      // Verifica se o usuário atual é o criador do evento ou um administrador/professor
      const isAdminOrProfessor = profile?.role && ['admin', 'professor'].includes(profile.role);
      if (eventData.creator_id !== profile?.id && !isAdminOrProfessor) {
        throw new Error('Você não tem permissão para cancelar este evento');
      }

      // Atualiza o status do evento para cancelado
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          is_cancelled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (updateError) throw updateError;
      
      // Recarrega os eventos para refletir as mudanças
      await loadEvents();
      
      // Mostra mensagem de sucesso
      alert('Evento cancelado com sucesso!');
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert(error instanceof Error ? error.message : 'Erro ao cancelar evento');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <DashboardHome />;

      case 'events':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Gerenciar Eventos
              </h2>
              {profile?.role === 'professor' && (
                <button
                  onClick={handleCreateEvent}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Criar Evento
                </button>
              )}
            </div>

            <SearchBar filters={filters} onFiltersChange={setFilters} />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Calendar events={filteredEvents} onEventClick={handleEditEvent} />
                </div>

                <div>
                  <EventList
                    events={filteredEvents}
                    onEventClick={handleEditEvent}
                    onEventDelete={handleDeleteEvent}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'materials':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">
              Selecione um evento para visualizar os materiais
            </p>
          </div>
        );

      case 'tasks':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">
              Módulo de tarefas em desenvolvimento
            </p>
          </div>
        );

      case 'chat':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">
              Módulo de chat em desenvolvimento
            </p>
          </div>
        );

      case 'forum':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">
              Módulo de fórum em desenvolvimento
            </p>
          </div>
        );

      case 'announcements':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">
              Módulo de comunicados em desenvolvimento
            </p>
          </div>
        );

      default:
        return <DashboardHome />;
    }
  };

  return (
    <>
      <DashboardLayout
        currentView={currentView}
        onViewChange={setCurrentView}
        onShowNotifications={() => setShowNotifications(true)}
        onShowProfile={() => setShowProfileModal(true)}
        onShowSettings={() => setShowSettings(true)}
      >
        {renderContent()}
      </DashboardLayout>
      
      {/* Botão de chat flutuante */}
      <ChatButton />
      
      {/* Modais */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onClose={() => setShowEventModal(false)}
          onSave={handleEventSaved}
        />
      )}
      
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
