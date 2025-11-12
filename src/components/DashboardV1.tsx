import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Event } from '../lib/supabase';
import { Calendar } from './Calendar';
import { EventModal } from './EventModal';
import { EventList } from './EventList';
import { ProfileModal } from './ProfileModal';
import { NotificationPanel } from './NotificationPanel';
import { SearchBar } from './SearchBar';
import { Plus, LogOut, User, Bell } from 'lucide-react';

export function Dashboard() {
  const { profile, signOut } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    date: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const loadEvents = async () => {
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
      const { error } = await supabase
        .from('events')
        .update({ is_cancelled: true })
        .eq('id', eventId);

      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Erro ao cancelar evento');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Educação Conectada
              </h1>
              <p className="text-sm text-slate-500">
                Olá, {profile?.full_name} ({profile?.role === 'professor' ? 'Professor' : 'Estudante'})
              </p>
            </div>

            <div className="flex items-center gap-3">
              {profile?.role === 'professor' && (
                <button
                  onClick={handleCreateEvent}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Criar Evento</span>
                </button>
              )}

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all relative"
              >
                <Bell className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
              >
                <User className="w-5 h-5" />
              </button>

              <button
                onClick={signOut}
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </main>

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
    </div>
  );
}
