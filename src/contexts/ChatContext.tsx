import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Message, ChatEvent, ChatContextType } from '../types/chat';

interface ChatProviderProps {
  children: React.ReactNode;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }): JSX.Element => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const MESSAGES_PER_PAGE = 20;

  // Carrega todos os contatos e combina com conversas
  const loadChatEvents = useCallback(async () => {
    console.log('Iniciando carregamento de eventos...');
    if (!user?.id) {
      console.log('Usuário não autenticado ou ID inválido');
      return;
    }
    
    setLoading(true);
    try {
      // Busca todos os perfis (contatos)
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .neq('id', user.id)
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      console.log('Buscando eventos do usuário...');
      const { data: eventsData, error: eventsError } = await supabase
        .from('event_participants')
        .select(`
          event:events!inner(
            id,
            title,
            description,
            is_direct_message,
            participants,
            created_at,
            updated_at,
            created_by
          )
        `)
        .eq('user_id', user.id);
        
      console.log('Eventos encontrados:', eventsData);
      if (eventsError) {
        console.error('Erro ao carregar eventos:', eventsError);
        throw eventsError;
      }

      if (eventsError) {
        console.error('Erro ao carregar eventos:', eventsError);
        throw eventsError;
      }

      console.log('Eventos carregados:', eventsData);
      // Busca última mensagem de cada conversa
      const eventIds = (eventsData || []).map(ep => (ep.event as any).id);
      let lastMessages: Record<string, any> = {};
      
      if (eventIds.length > 0) {
        const { data: messagesData } = await supabase
          .from('messages')
          .select('id, event_id, content, created_at, user_id')
          .in('event_id', eventIds)
          .order('created_at', { ascending: false });

        if (messagesData) {
          messagesData.forEach(msg => {
            if (!lastMessages[msg.event_id]) {
              lastMessages[msg.event_id] = msg;
            }
          });
        }
      }

      // Processa os eventos
      const processedEvents: ChatEvent[] = (eventsData || []).map(ep => {
        const eventData = ep.event as any;
        console.log('Processando evento:', eventData.id, eventData.title);
        const lastMsg = lastMessages[eventData.id];
        return {
          id: eventData.id,
          title: eventData.title || 'Sem título',
          description: eventData.description || '',
          is_direct_message: eventData.is_direct_message || false,
          participants: eventData.participants || [],
          created_by: eventData.created_by,
          created_at: eventData.created_at,
          updated_at: eventData.updated_at,
          last_message: lastMsg ? {
            id: lastMsg.id,
            content: lastMsg.content,
            created_at: lastMsg.created_at,
            user_id: lastMsg.user_id
          } : undefined,
          unread_count: 0,
          other_participant: undefined
        } as ChatEvent;
      });

      setEvents(processedEvents);

      // Combina contatos com conversas existentes
      const contactsWithChats = (allProfiles || []).map(profile => {
        // Encontra conversa direta com este contato
        const directChat = processedEvents.find(event => 
          event.is_direct_message && 
          event.participants?.includes(profile.id)
        );

        return {
          ...profile,
          chatId: directChat?.id,
          lastMessage: directChat?.last_message,
          updatedAt: directChat?.updated_at || directChat?.created_at,
          hasUnread: false
        };
      });

      // Ordena por última mensagem (mais recente primeiro)
      contactsWithChats.sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });

      setAllContacts(contactsWithChats);
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
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, email)
        `)
        .eq('event_id', currentEventId)
        .order('created_at', { ascending: true })
        .range(
          currentPage * MESSAGES_PER_PAGE, 
          (currentPage + 1) * MESSAGES_PER_PAGE - 1
        );
        
      if (messagesError) throw messagesError;
      
      if (reset) {
        setMessages(messagesData || []);
      } else {
        setMessages(prev => [...prev, ...(messagesData || [])]);
      }
      
      setHasMore((messagesData?.length || 0) >= MESSAGES_PER_PAGE);
      
      // Marca mensagens como lidas (última mensagem)
      if (messagesData && messagesData.length > 0) {
        const lastMessage = messagesData[messagesData.length - 1];
        await supabase
          .from('message_reads')
          .upsert({
            user_id: user.id,
            message_id: lastMessage.id,
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
  }, [currentEventId, page, user?.id]);

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
        // Busca eventos diretos onde ambos usuários são participantes
        const { data: userEvents, error: userEventsError } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', user.id);
          
        if (userEventsError) throw userEventsError;
        
        const userEventIds = userEvents?.map(ep => ep.event_id) || [];
        
        if (userEventIds.length > 0) {
          // Verifica se algum desses eventos é um chat direto com o recipientId
          const { data: directChats, error: directChatsError } = await supabase
            .from('events')
            .select('id')
            .eq('is_direct_message', true)
            .contains('participants', [user.id, recipientId])
            .in('id', userEventIds)
            .limit(1);
            
          if (directChatsError && directChatsError.code !== 'PGRST116') {
            // Se não for erro de "not found", verifica via event_participants
            const { data: recipientEvents, error: recipientError } = await supabase
              .from('event_participants')
              .select('event_id')
              .eq('user_id', recipientId)
              .in('event_id', userEventIds);
              
            if (recipientError) throw recipientError;
            
            if (recipientEvents && recipientEvents.length > 0) {
              // Verifica se algum desses eventos é direto
              const { data: existingDirectChat, error: checkError } = await supabase
                .from('events')
                .select('id')
                .eq('is_direct_message', true)
                .in('id', recipientEvents.map(ep => ep.event_id))
                .limit(1);
                
              if (!checkError && existingDirectChat && existingDirectChat.length > 0) {
                targetEventId = existingDirectChat[0].id;
              }
            }
          } else if (directChats && directChats.length > 0) {
            targetEventId = directChats[0].id;
          }
        }
        
        // Se não encontrou chat existente, cria um novo
        if (!targetEventId) {
          const now = new Date().toISOString();
          const newChat = {
            title: `Chat direto`,
            description: 'Conversa privada',
            event_type: 'reuniao', // Usa reuniao como tipo padrão para chats diretos
            is_direct_message: true,
            participants: [user.id, recipientId],
            created_by: user.id,
            creator_id: user.id, // Também define creator_id para compatibilidade
            start_date: now, // Campos obrigatórios
            end_date: new Date(Date.now() + 86400000).toISOString(), // 24h depois
            created_at: now,
            updated_at: now
          };
          
          const { data: createdChat, error: createError } = await supabase
            .from('events')
            .insert([newChat])
            .select('id')
            .single();
            
          if (createError) {
            console.error('Erro ao criar chat:', createError);
            throw createError;
          }
          
          if (!createdChat) throw new Error('Falha ao criar o chat');
          
          targetEventId = createdChat.id;
          
          // Adiciona os participantes ao chat
          const participants = [
            { 
              event_id: targetEventId, 
              user_id: user.id
            },
            { 
              event_id: targetEventId, 
              user_id: recipientId
            }
          ];
          
          const { error: participantsError } = await supabase
            .from('event_participants')
            .insert(participants);
            
          if (participantsError) {
            console.error('Erro ao adicionar participantes:', participantsError);
            throw participantsError;
          }
          
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
      
      // Atualiza a lista de mensagens (adiciona no final)
      setMessages(prev => [...prev, messageData]);
      
      // Atualiza a data de atualização do evento
      await supabase
        .from('events')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetEventId);
      
      // Se o evento atual não estava definido, define agora
      if (!currentEventId && targetEventId) {
        setCurrentEventId(targetEventId);
        // Carrega as mensagens do novo chat
        setPage(0);
        setMessages([]);
      }
      
      // Recarrega os eventos/contatos para incluir a nova mensagem
      await loadChatEvents();
      
      return { ...messageData, eventId: targetEventId };
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }, [user, loadChatEvents, currentEventId]);

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
  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
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
  // Marca uma mensagem como lida
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('message_reads')
        .upsert(
          { 
            user_id: user.id, 
            message_id: messageId, 
            read_at: new Date().toISOString() 
          },
          { onConflict: 'user_id,message_id' }
        );

      if (error) {
        console.warn('Aviso ao marcar mensagem como lida (pode ser um problema de permissão):', error);
        // Não lançamos o erro para não interromper o fluxo do usuário
        return;
      }
    } catch (error) {
      console.warn('Erro ao marcar mensagem como lida (não crítico):', error);
      // Não lançamos o erro para não interromper o fluxo do usuário
    }
  }, [user?.id]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
  }, [hasMore, loading]);

  // Define o evento atual
  const setCurrentEvent = useCallback(async (eventId: string | null) => {
    try {
      console.log('Definindo evento atual para:', eventId);
      
      // Se for null, estamos voltando para a lista de conversas
      if (eventId === null) {
        console.log('Voltando para a lista de conversas');
        setCurrentEventId(null);
        setMessages([]);
        setPage(0);
        setHasMore(true);
        return;
      }
      
      // Se for uma string, estamos abrindo uma conversa
      console.log('Abrindo conversa com ID:', eventId);
      setCurrentEventId(eventId);
      setPage(0);
      setMessages([]);
      setHasMore(true);
      setLoading(true);
      
      try {
        // Força o carregamento das mensagens
        console.log('Carregando mensagens para o evento:', eventId);
        await loadMessages(true);
        console.log('Mensagens carregadas com sucesso');
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        setError('Erro ao carregar as mensagens');
        // Volta para a lista de conversas em caso de erro
        setCurrentEventId(null);
        setMessages([]);
        setPage(0);
        setHasMore(true);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao definir evento atual:', error);
      setError('Erro ao abrir a conversa');
      // Em caso de erro, garante que o estado seja consistente
      setCurrentEventId(null);
      setMessages([]);
      setPage(0);
      setHasMore(true);
      setLoading(false);
    }
  }, [loadMessages]);

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
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentEventId, user?.id]);

  // Carrega os eventos quando o usuário mudar
  useEffect(() => {
    if (user) {
      loadChatEvents();
    }
  }, [user, loadChatEvents]);

  // Valor do contexto
  const contextValue = useMemo((): ChatContextType => ({
    currentEventId,
    messages,
    events,
    allContacts,
    loading,
    error,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    setCurrentEvent,
    loadMoreMessages,
    markMessageAsRead,
    loadChatEvents
  }), [
    currentEventId,
    messages,
    events,
    allContacts,
    loading,
    error,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    setCurrentEvent,
    loadMoreMessages,
    markMessageAsRead,
    loadChatEvents
  ]);

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
