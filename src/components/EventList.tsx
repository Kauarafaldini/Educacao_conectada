import { Event } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Clock, MapPin, User, Trash2 } from 'lucide-react';

interface EventListProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
}

export function EventList({ events, onEventClick, onEventDelete }: EventListProps) {
  const { profile } = useAuth();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const eventTypeLabels = {
    aula: 'Aula',
    seminario: 'Seminário',
    reuniao: 'Reunião',
  };

  const eventTypeColors = {
    aula: 'bg-blue-100 text-blue-700 border-blue-200',
    seminario: 'bg-green-100 text-green-700 border-green-200',
    reuniao: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-slate-500">Nenhum evento encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Próximos Eventos</h2>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all cursor-pointer"
            onClick={() => onEventClick(event)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 mb-1">{event.title}</h3>
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded-md border ${
                    eventTypeColors[event.event_type]
                  }`}
                >
                  {eventTypeLabels[event.event_type]}
                </span>
              </div>

              {profile?.id === event.creator_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventDelete(event.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Cancelar evento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatDate(event.start_date)}</span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}

              {event.creator && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{event.creator.full_name}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="mt-3 text-sm text-slate-500 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
