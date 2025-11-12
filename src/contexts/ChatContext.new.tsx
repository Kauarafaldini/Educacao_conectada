import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Message, ChatEvent, ChatContextType } from '../types/chat';
import { Profile } from '../lib/supabase';

interface ChatProviderProps {
  children: React.ReactNode;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }): JSX.Element => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const MESSAGES_PER_PAGE = 20;

  // Carrega os eventos de chat do usuário
  const loadChatEvents = useCallback(async () => {
    if (!user?.id) {
      console.log('Usuário não autenticado ou ID inválido');
      return;
    }
    
    setLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('event_participants')
        .select(`
          event:events!inner(
            id,
            title,
            description,
            is_direct_message,
            created_at,
            updated_at,
            created_by,
            metadata
          )
        `)
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      // Processa os eventos
      const processedEvents: ChatEvent[] = (eventsData || []).map(ep => {
        const eventData = ep.event as any; // Usando any temporariamente para evitar erros de tipagem
        return {
          id: eventData.id,
          title: eventData.title || 'Sem título',
          description: eventData.description || '',
          is_direct_message: eventData.is_direct_message || false,
          participants: eventData.metadata?.participants || [],
          created_by: eventData.created_by,
          created_at: eventData.created_at,
          updated_at: eventData.updated_at,
          last_message: undefined,
          unread_count: 0,
          other_participant: undefined
        } as ChatEvent; // Usando type assertion para garantir a tipagem correta
      });

      setEvents(processedEvents);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      setError('Falha ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Carrega as mensagens do evento atual
  const loadMessages = useCallback(async (reset = false) => {
    if (!currentEventId || !user?.id) return;
    
    const currentPage = reset ? 0 : page;
    
    setLoading(true);
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('event_id', currentEventId)
        .order('created_at', { ascending: false })
        .range(
          currentPage * MESSAGES_PER_PAGE, 
          (currentPage + 1) * MESSAGES_PER_PAGE - 1
        );
        
      if (messagesError) throw messagesError;
      
      if (reset) {
        setMessages(messagesData || []);
      } else {
        setMessages(prev => [...(messagesData || []), ...prev]);
      }
      
      setHasMore((messagesData?.length || 0) >= MESSAGES_PER_PAGE);
      
      // Marca mensagens como lidas
      if (messagesData && messagesData.length > 0) {
        await supabase
          .from('message_reads')
          .upsert({
            user_id: user.id,
            message_id: messagesData[0].id,
            read_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,message_id'
          });
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError('Falha ao carregar as mensagens');
    } finally {
      setLoading(false);
    }
  }, [currentEventId, user?.id, page]);

  // Envia uma mensagem
  const sendMessage = useCallback(async ({ 
    content, 
    eventId, 
    recipientId 
  }: { 
    content: string; 
    eventId?: string; 
    recipientId?: string 
  }): Promise<Message> => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    if (!content.trim()) {
      throw new Error('A mensagem não pode estar vazia');
    }
    
    if (!eventId && !recipientId) {
      throw new Error('É necessário especificar um evento ou destinatário');
    }
    
    let targetEventId = eventId;
    
    try {
      // Lógica para criar um novo chat direto se necessário
      if (!targetEventId && recipientId) {
        // Verifica se já existe um chat direto entre os usuários
        const { data: existingChats, error: chatError } = await supabase
          .from('event_participants')
          .select('event_id')
          .in('event_id', 
            (await supabase
              .from('event_participants')
              .select('event_id')
              .eq('user_id', user.id)
            ).data?.map(ep => ep.event_id) || []
          )
          .eq('user_id', recipientId);
          
        if (chatError) throw chatError;
        
        if (existingChats && existingChats.length > 0) {
          // Usa o chat existente
          targetEventId = existingChats[0].event_id;
        } else {
          // Cria um novo chat direto
          const now = new Date().toISOString();
          const newChat = {
            title: `Chat com ${recipientId}`,
            description: 'Conversa privada',
            event_type: 'direct_message',
            is_direct_message: true,
            created_by: user.id,
            created_at: now,
            updated_at: now,
            metadata: {
              is_direct_message: true,
              participants: [user.id, recipientId]
            }
          };
          
          const { data: createdChat, error: createError } = await supabase
            .from('events')
            .insert([newChat])
            .select('id')
            .single();
            
          if (createError) throw createError;
          if (!createdChat) throw new Error('Falha ao criar o chat');
          
          targetEventId = createdChat.id;
          
          // Adiciona os participantes ao chat
          const participants = [
            { 
              event_id: targetEventId, 
              user_id: user.id, 
              role: 'participant',
              created_at: now
            },
            { 
              event_id: targetEventId, 
              user_id: recipientId, 
              role: 'participant',
              created_at: now
            }
          ];
          
          const { error: participantsError } = await supabase
            .from('event_participants')
            .insert(participants);
            
          if (participantsError) throw participantsError;
          
          // Atualiza a lista de eventos
          await loadChatEvents();
        }
      }
      
      if (!targetEventId) {
        throw new Error('Não foi possível criar ou encontrar o chat');
      }
      
      // Cria a mensagem
      const newMessage = {
        content: content.trim(),
        event_id: targetEventId,
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([newMessage])
        .select()
        .single();
        
      if (messageError) throw messageError;
      if (!messageData) throw new Error('Falha ao enviar mensagem');
      
      // Atualiza a lista de mensagens
      setMessages(prev => [messageData, ...prev]);
      
      // Atualiza a data de atualização do evento
      await supabase
        .from('events')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetEventId);
      
      return messageData;
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }, [user, loadChatEvents]);

  // Edita uma mensagem
  const editMessage = useCallback(async (messageId: string, content: string): Promise<void> => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();
      
    if (error) throw error;
    
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, ...data, is_edited: true } 
          : msg
      )
    );
  }, [user?.id]);

  // Exclui uma mensagem
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('messages')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', messageId);
      
    if (error) throw error;
    
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              is_deleted: true, 
              deleted_at: new Date().toISOString(),
              deleted_by: user.id
            } 
          : msg
      )
    );
  }, [user?.id]);

  // Carrega mais mensagens
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
  }, [hasMore, loading]);

  // Define o evento atual
  const setCurrentEvent = useCallback((eventId: string) => {
    setCurrentEventId(eventId);
    setPage(0);
    setMessages([]);
    setHasMore(true);
  }, []);

  // Carrega as mensagens quando o evento atual ou a página mudar
  useEffect(() => {
    if (currentEventId) {
      loadMessages(page === 0);
    }
  }, [currentEventId, page, loadMessages]);

  // Configura o listener em tempo real para novas mensagens
  useEffect(() => {
    if (!currentEventId || !user?.id) return;
    
    const channel = supabase
      .channel(`messages:${currentEventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `event_id=eq.${currentEventId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [newMessage, ...prev]);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentEventId, user?.id]);

  // Valor do contexto
  const contextValue: ChatContextType = useMemo(() => ({
    currentEventId,
    messages,
    events,
    loading,
    error,
    hasMore,
    sendMessage,
    editMessage: async (messageId: string, content: string) => {
      await editMessage(messageId, content);
    },
    deleteMessage: async (messageId: string) => {
      await deleteMessage(messageId);
    },
    setCurrentEvent,
    loadMoreMessages: async () => {
      await loadMoreMessages();
    }
  }), [
    currentEventId,
    messages,
    events,
    loading,
    error,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    setCurrentEvent,
    loadMoreMessages
  ]);
  
  // Carrega os eventos quando o componente é montado
  useEffect(() => {
    loadChatEvents();
  }, [loadChatEvents]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat deve ser usado dentro de um ChatProvider');
  }
  return context;
};

export default ChatContext;
