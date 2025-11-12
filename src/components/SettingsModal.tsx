import { useTheme } from '../contexts/ThemeContext';
import { X, Moon, Sun, Type, Contrast, Bell, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { 
    theme, 
    fontSize, 
    highContrast, 
    toggleTheme, 
    setFontSize, 
    setHighContrast 
  } = useTheme();
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const updateNotificationSettings = async (field: 'email_notifications' | 'push_notifications', value: boolean) => {
    if (!user) return;

    try {
      await supabase
        .from('user_preferences')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (field === 'email_notifications') {
        setEmailNotifications(value);
      } else {
        setPushNotifications(value);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Configurações
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Sun className="w-5 h-5" />
              Aparência
            </h3>

            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {theme === 'dark' ? 'Tema escuro ativado' : 'Tema claro ativado'}
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900"
                    title="Alternar para o outro tema"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    ) : (
                      <Moon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Type className="w-5 h-5" />
              Acessibilidade
            </h3>

            <div className="space-y-4">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100 mb-2">
                  Tamanho da Fonte
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'small', label: 'Pequena' },
                    { value: 'medium', label: 'Média' },
                    { value: 'large', label: 'Grande' },
                  ].map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setFontSize(size.value as 'small' | 'medium' | 'large')}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        fontSize === size.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Contrast className="w-4 h-4" />
                    Alto Contraste
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Aumenta o contraste das cores
                  </p>
                </div>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    highContrast ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      highContrast ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Notificações por E-mail
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Receber atualizações por e-mail
                  </p>
                </div>
                <button
                  onClick={() => updateNotificationSettings('email_notifications', !emailNotifications)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    emailNotifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      emailNotifications ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notificações Push
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Receber notificações no navegador
                  </p>
                </div>
                <button
                  onClick={() => updateNotificationSettings('push_notifications', !pushNotifications)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    pushNotifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      pushNotifications ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
          >
            Salvar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
