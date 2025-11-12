import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import NewChatModal from './NewChatModal';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

const ChatContainer: React.FC = () => {
  const {
    currentEventId,
    messages,
    events,
    loading,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    setCurrentEvent,
    loadMoreMessages,
  } = useChat();

  const { user } = useAuth();
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  const handleBackToConversations = () => {
    // Usamos null para limpar a conversa atual e voltar para a lista
    setCurrentEvent(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!currentEventId) return;
    await sendMessage({
      content,
      eventId: currentEventId,
    });
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    await editMessage(messageId, content);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta mensagem?')) {
      await deleteMessage(messageId);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Faça login para acessar o chat</p>
      </div>
    );
  }

  // Formatar a última mensagem para exibição
  const formatLastMessage = (message: any) => {
    if (!message) return '';
    
    const isCurrentUser = message.user?.id === user?.id;
    const senderName = isCurrentUser ? 'Você' : message.user?.full_name || 'Remetente';
    let content = message.content || '';
    
    // Limita o tamanho da mensagem para a prévia
    if (content.length > 30) {
      content = `${content.substring(0, 30)}...`;
    }
    
    // Retorna no formato: "Nome: mensagem"
    return `${senderName}: ${content}`;
  };


  // Encontrar informações do chat atual
  const getChatInfo = (): { 
    currentEvent: any | null; 
    otherParticipant: { id: string; full_name: string; avatar_url?: string; email?: string } | null; 
    displayName: string 
  } => {
    if (!currentEventId) return { currentEvent: null, otherParticipant: null, displayName: 'Chat' };
    
    const currentEventData = events.find(e => e.id === currentEventId);
    if (!currentEventData) return { currentEvent: null, otherParticipant: null, displayName: 'Chat' };
    
    let otherParticipant: { id: string; full_name: string; avatar_url?: string; email?: string } | null = null;
    let displayName = currentEventData.title || 'Chat';
    
    if (currentEventData.is_direct_message && currentEventData.participants) {
      if (currentEventData.other_participant) {
        otherParticipant = currentEventData.other_participant;
        displayName = otherParticipant.full_name || displayName;
      } else if (Array.isArray(currentEventData.participants)) {
        if (currentEventData.participants.length > 0 && typeof currentEventData.participants[0] === 'string') {
          const otherParticipantId = (currentEventData.participants as string[]).find((id: string) => id !== user?.id);
          if (otherParticipantId) {
            otherParticipant = { id: otherParticipantId, full_name: displayName };
          }
        } else {
          const participant = (currentEventData.participants as any[]).find((p: any) => p.id !== user?.id);
          if (participant) {
            otherParticipant = {
              id: participant.id,
              full_name: participant.full_name || displayName,
              avatar_url: participant.avatar_url,
              email: participant.email
            };
            displayName = participant.full_name || displayName;
          }
        }
      }
    }
    
    return { currentEvent: currentEventData, otherParticipant, displayName };
  };
  
  const chatInfo = getChatInfo();
  const { currentEvent, otherParticipant, displayName } = chatInfo;
  
  // Renderizar a visualização da conversa
  const renderChatView = () => {
    if (!currentEventId || !currentEvent) return null;

    return (
      <div className="flex-1 flex flex-col h-screen bg-white dark:bg-gray-900">
        {/* Cabeçalho do chat com botão de voltar */}
        <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
          <button
            onClick={handleBackToConversations}
            className="p-2 mr-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Voltar para conversas"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          
          {otherParticipant?.avatar_url ? (
            <img 
              src={otherParticipant.avatar_url} 
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {displayName}
            </h2>
            {otherParticipant?.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {otherParticipant.email}
              </p>
            )}
          </div>
          
          {/* Botão de voltar para a lista de conversas (visível apenas em telas pequenas) */}
          <button
            onClick={handleBackToConversations}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Voltar para conversas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
        </div>

        {/* Lista de mensagens */}
        <div className="flex-1 overflow-hidden flex flex-col h-[calc(100vh-64px)]">
          <MessageList
            messages={messages}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        </div>

        {/* Input de mensagem */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mt-auto">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={loading}
            placeholder="Digite sua mensagem..."
          />
        </div>
      </div>
    );
  };

  console.log('CurrentEventId:', currentEventId);
  console.log('Eventos disponíveis:', events);
  
  // Encontra o evento atual se existir
  const currentEventData = currentEventId ? events.find(e => e.id === currentEventId) : null;
  
  // Se não houver currentEventId ou se o evento não for encontrado, mostra a lista de conversas
  const showConversationList = !currentEventId || !currentEventData;
  
  console.log('showConversationList:', showConversationList, 'currentEventId:', currentEventId, 'currentEventData:', currentEventData);
  
  // Se não houver currentEventId ou se o evento não for encontrado, mostra a lista de conversas
  if (showConversationList) {
    return (
      <div className="h-full bg-white dark:bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mensagens</h2>
          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            title="Nova conversa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Modal de nova conversa */}
        <NewChatModal 
          isOpen={isNewChatModalOpen} 
          onClose={() => setIsNewChatModalOpen(false)} 
        />
        <div className="flex-1 overflow-y-auto">
          {events.map((event) => {
            // Lógica para encontrar o outro participante
            let otherParticipant: { id: string; full_name: string; avatar_url?: string } | undefined;
            
            if (event.is_direct_message && event.participants) {
              if (typeof event.participants[0] === 'string') {
                const otherParticipantId = event.participants.find(id => id !== user?.id);
                otherParticipant = otherParticipantId ? { id: otherParticipantId, full_name: event.title } : undefined;
              } else {
                otherParticipant = (event.participants as any[]).find((p: any) => p.id !== user?.id);
              }
            }
            
            const displayName = otherParticipant?.full_name || event.title;
            
            return (
              <button
                key={event.id}
                onClick={() => setCurrentEvent(event.id)}
                className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center"
              >
                <div className="flex-shrink-0 mr-3">
                  {otherParticipant?.avatar_url ? (
                    <img 
                      src={otherParticipant.avatar_url} 
                      alt={displayName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 ml-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {displayName}
                    </p>
                    {event.last_message?.created_at && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(event.last_message.created_at), { 
                          addSuffix: true,
                          locale: ptBR 
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate pr-2">
                      {formatLastMessage(event.last_message)}
                    </p>
                    {event.unread_count > 0 && (
                      <span className="flex-shrink-0 bg-blue-500 text-white text-xs font-semibold h-5 w-5 rounded-full flex items-center justify-center">
                        {event.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          
          {events.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6">
                <p className="text-gray-500 dark:text-gray-400">Nenhuma conversa encontrada</p>
                <p className="text-sm text-gray-400 mt-2">Inicie uma nova conversa para começar a enviar mensagens.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Se tiver currentEventId, mostra a visualização da conversa
  return (
    <div className="h-full flex flex-col">
      {renderChatView()}
    </div>
  );
}

// Exportação padrão para garantir compatibilidade
export default ChatContainer;
