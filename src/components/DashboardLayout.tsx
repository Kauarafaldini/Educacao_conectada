import { useState, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Home,
  Calendar as CalendarIcon,
  FileText,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Bell,
  LogOut,
  User,
  Menu,
  X,
  CheckSquare,
  Megaphone,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onShowNotifications: () => void;
  onShowProfile: () => void;
  onShowSettings: () => void;
}

export function DashboardLayout({
  children,
  currentView,
  onViewChange,
  onShowNotifications,
  onShowProfile,
  onShowSettings,
}: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { id: 'home', name: 'Início', icon: Home },
    { id: 'events', name: 'Eventos', icon: CalendarIcon },
    { id: 'materials', name: 'Materiais', icon: FileText },
    { id: 'tasks', name: 'Tarefas', icon: CheckSquare },
    { id: 'chat', name: 'Chat', icon: MessageSquare },
    { id: 'forum', name: 'Fórum', icon: Users },
    { id: 'announcements', name: 'Comunicados', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-50 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
        >
          {sidebarOpen ? (
            <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          ) : (
            <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          )}
        </button>

        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Educação Conectada
        </h1>

        <button
          onClick={onShowNotifications}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
        >
          <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            Educação Conectada
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {profile?.full_name}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
            {profile?.role === 'professor' ? 'Professor' : 'Estudante'}
          </p>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
          <button
            onClick={onShowSettings}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="font-medium">Configurações</span>
          </button>

          <button
            onClick={onShowProfile}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Perfil</span>
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="hidden lg:flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize">
              {navigation.find((n) => n.id === currentView)?.name || 'Início'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onShowNotifications}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all relative"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
