import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

type Theme = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  theme: Theme;
  fontSize: FontSize;
  highContrast: boolean;
  toggleTheme: () => void;
  setFontSize: (size: FontSize) => void;
  setHighContrast: (enabled: boolean) => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');
  const [highContrast, setHighContrastState] = useState(false);
  const [loading, setLoading] = useState(true);

  // Função para salvar preferências no localStorage
  const saveToLocalStorage = useCallback((newTheme: Theme, newFontSize: FontSize, newHighContrast: boolean) => {
    try {
      console.log('Salvando no localStorage:', { newTheme, newFontSize, newHighContrast });
      localStorage.setItem('theme', newTheme);
      localStorage.setItem('fontSize', newFontSize);
      localStorage.setItem('highContrast', String(newHighContrast));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }, []);

  // Função para salvar preferências no banco de dados
  const saveToDatabase = useCallback(async (userId: string, newTheme: Theme, newFontSize: FontSize, newHighContrast: boolean) => {
    try {
      console.log('Salvando no banco de dados:', { userId, newTheme, newFontSize, newHighContrast });
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          theme: newTheme,
          font_size: newFontSize,
          high_contrast: newHighContrast,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Erro ao salvar no banco de dados:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  }, []);

  // Carrega as preferências do localStorage e do banco de dados
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Primeiro carrega do localStorage para uma resposta mais rápida
        const savedTheme = (localStorage.getItem('theme') as Theme) || 'light';
        const savedFontSize = (localStorage.getItem('fontSize') as FontSize) || 'medium';
        const savedHighContrast = localStorage.getItem('highContrast') === 'true';

        console.log('Preferências carregadas do localStorage:', { savedTheme, savedFontSize, savedHighContrast });
        
        // Atualiza o estado com os valores do localStorage
        setThemeState(savedTheme);
        setFontSizeState(savedFontSize);
        setHighContrastState(savedHighContrast);

        // Se o usuário estiver logado, tenta carregar do banco de dados
        if (user?.id) {
          console.log('Carregando preferências do banco de dados para o usuário:', user.id);
          const { data, error } = await supabase
            .from('user_preferences')
            .select('theme, font_size, high_contrast')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = nenhum resultado encontrado
            console.error('Erro ao carregar preferências do banco de dados:', error);
            return;
          }

          if (data) {
            console.log('Preferências carregadas do banco de dados:', data);
            const dbTheme = (data.theme as Theme) || 'light';
            const dbFontSize = (data.font_size as FontSize) || 'medium';
            const dbHighContrast = data.high_contrast || false;

            // Atualiza o estado com os valores do banco de dados
            setThemeState(dbTheme);
            setFontSizeState(dbFontSize);
            setHighContrastState(dbHighContrast);

            // Atualiza o localStorage com os valores do banco de dados
            saveToLocalStorage(dbTheme, dbFontSize, dbHighContrast);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar preferências:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id, saveToLocalStorage]);

  // Aplica o tema ao documento
  useEffect(() => {
    console.log('Aplicando tema ao documento:', { theme, fontSize, highContrast });
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [theme, fontSize, highContrast]);

  // Função para atualizar o tema
  const setTheme = useCallback((newTheme: Theme) => {
    console.log('Atualizando tema para:', newTheme);
    setThemeState(newTheme);
    saveToLocalStorage(newTheme, fontSize, highContrast);
    if (user?.id) {
      saveToDatabase(user.id, newTheme, fontSize, highContrast);
    }
  }, [fontSize, highContrast, user?.id, saveToLocalStorage, saveToDatabase]);

  // Função para atualizar o tamanho da fonte
  const setFontSize = useCallback((newFontSize: FontSize) => {
    console.log('Atualizando tamanho da fonte para:', newFontSize);
    setFontSizeState(newFontSize);
    saveToLocalStorage(theme, newFontSize, highContrast);
    if (user?.id) {
      saveToDatabase(user.id, theme, newFontSize, highContrast);
    }
  }, [theme, highContrast, user?.id, saveToLocalStorage, saveToDatabase]);

  // Função para atualizar o alto contraste
  const setHighContrast = useCallback((newHighContrast: boolean) => {
    console.log('Atualizando alto contraste para:', newHighContrast);
    setHighContrastState(newHighContrast);
    saveToLocalStorage(theme, fontSize, newHighContrast);
    if (user?.id) {
      saveToDatabase(user.id, theme, fontSize, newHighContrast);
    }
  }, [theme, fontSize, user?.id, saveToLocalStorage, saveToDatabase]);

  // Alterna entre os temas claro e escuro
  const toggleTheme = useCallback(() => {
    console.log('Alternando tema...');
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Atualiza as preferências no banco de dados quando o usuário fizer login
  useEffect(() => {
    if (user?.id && !loading) {
      console.log('Usuário autenticado, sincronizando preferências...');
      saveToDatabase(user.id, theme, fontSize, highContrast);
    }
  }, [user?.id, theme, fontSize, highContrast, loading, saveToDatabase]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        fontSize,
        highContrast,
        toggleTheme,
        setFontSize,
        setHighContrast,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
