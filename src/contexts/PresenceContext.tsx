import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface UserPresence {
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
}

interface PresenceContextType {
  onlineUsers: Set<string>;
  isUserOnline: (userId: string) => boolean;
  markMessageAsRead: (messageId: string) => Promise<void>;
  unreadCounts: Record<string, number>;
  presence: Record<string, UserPresence>;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadCounts] = useState<Record<string, number>>({});
  const [presence, setPresence] = useState<Record<string, UserPresence>>({});
  const { user } = useAuth();

  // Verificar status online/offline dos usuários
  useEffect(() => {
    if (!user) return;

    // Atualiza o status do usuário atual
    const updatePresence = async (status: 'online' | 'offline' | 'away' = 'online') => {
      if (!user) return;
      
      try {
        const { error } = await supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            status,
            last_seen: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Erro ao atualizar presença:', error);
          return;
        }

        // Atualiza o estado local
        setPresence(prev => ({
          ...prev,
          [user.id]: {
            status,
            lastSeen: new Date().toISOString()
          }
        }));
      } catch (err) {
        console.error('Erro inesperado ao atualizar presença:', err);
      }
    };

    // Atualiza a cada 30 segundos
    updatePresence();
    const interval = setInterval(updatePresence, 30000);

    // Limpar ao desmontar
    return () => clearInterval(interval);
  }, [user]);

  // Assinar mudanças de presença
  useEffect(() => {
    if (!user) return;

    // Buscar usuários online
    const fetchOnlineUsers = async () => {
      const { data: presenceData, error } = await supabase
        .from('user_presence')
        .select('user_id, last_seen, status')
        .gt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Últimos 5 minutos
        .eq('status', 'online');

      if (!error && presenceData) {
        const onlineUserIds = new Set(presenceData.map(p => p.user_id));
        setOnlineUsers(onlineUserIds);
      }
    };

    fetchOnlineUsers();
    const presenceInterval = setInterval(fetchOnlineUsers, 30000);

    // Configurar canais em tempo real
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const userIds = new Set<string>();
        
        Object.values(state).forEach((users: any) => {
          users.forEach((presence: any) => {
            if (presence.user_id) {
              userIds.add(presence.user_id);
            }
          });
        });

        setOnlineUsers(userIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      clearInterval(presenceInterval);
      channel.unsubscribe();
    };
  }, [user]);

  // Marcar mensagem como lida
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('message_reads')
      .insert({
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  }, [user]);

  // Verificar se um usuário está online
  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return (
    <PresenceContext.Provider value={{ 
      onlineUsers, 
      isUserOnline, 
      markMessageAsRead, 
      unreadCounts,
      presence
    }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = (): PresenceContextType => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence deve ser usado dentro de um PresenceProvider');
  }
  return context;
};
