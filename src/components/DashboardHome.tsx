import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Event, Task, Announcement } from '../lib/supabase';
import { Calendar as CalendarIcon, Clock, BookOpen, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export function DashboardHome() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingEvents: 0,
    todayEvents: 0,
    pendingTasks: 0,
    completedTasks: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const now = new Date().toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      today.setHours(23, 59, 59, 999);
      const todayEnd = today.toISOString();

      const { data: events } = await supabase
        .from('events')
        .select('*, creator:profiles!events_creator_id_fkey(*)')
        .eq('is_cancelled', false)
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(5);

      const { data: todayEventsData } = await supabase
        .from('events')
        .select('id')
        .eq('is_cancelled', false)
        .gte('start_date', todayStart)
        .lte('start_date', todayEnd);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, creator:profiles!tasks_created_by_fkey(*)')
        .order('due_date', { ascending: true })
        .limit(5);

      const { data: submissions } = profile?.role === 'student'
        ? await supabase
            .from('task_submissions')
            .select('id')
            .eq('student_id', profile.id)
        : { data: null };

      const { data: allTasks } = profile?.role === 'student'
        ? await supabase.from('tasks').select('id')
        : { data: null };

      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*, creator:profiles!announcements_created_by_fkey(*)')
        .order('published_at', { ascending: false })
        .limit(3);

      setUpcomingEvents(events || []);
      setPendingTasks(tasks || []);
      setAnnouncements(announcementsData || []);

      setStats({
        upcomingEvents: events?.length || 0,
        todayEvents: todayEventsData?.length || 0,
        pendingTasks: profile?.role === 'student'
          ? (allTasks?.length || 0) - (submissions?.length || 0)
          : tasks?.length || 0,
        completedTasks: submissions?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 7) return `Em ${diffDays} dias`;
    return formatDate(dateStr);
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    normal: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Bem-vindo, {profile?.full_name}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Aqui está um resumo das suas atividades
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {stats.upcomingEvents}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Próximos Eventos</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {stats.todayEvents}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Eventos Hoje</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {stats.pendingTasks}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Tarefas Pendentes</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {stats.completedTasks}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Tarefas Concluídas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
            Próximos Eventos
          </h3>
          {upcomingEvents.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              Nenhum evento próximo
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {event.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatRelativeDate(event.start_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
            Tarefas Pendentes
          </h3>
          {pendingTasks.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              Nenhuma tarefa pendente
            </p>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Prazo: {formatDate(task.due_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Comunicados Recentes
            </h3>
          </div>
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="border-l-4 border-blue-500 pl-4 py-2"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                    {announcement.title}
                  </h4>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      priorityColors[announcement.priority]
                    }`}
                  >
                    {announcement.priority === 'urgent' ? 'Urgente' : announcement.priority === 'high' ? 'Alta' : announcement.priority === 'low' ? 'Baixa' : 'Normal'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {announcement.content}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  {formatDate(announcement.published_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
