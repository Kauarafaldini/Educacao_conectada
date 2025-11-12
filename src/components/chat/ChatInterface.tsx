import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePresence } from '../../contexts/PresenceContext';
import { supabase } from '../../lib/supabase';
import { 
  PaperAirplaneIcon, 
  XMarkIcon, 
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  PlusIcon,
  UserCircleIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import UserList from './UserList';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type MessageMenu = {
  messageId: string;
  x: number;
  y: number;
} | null;

const ChatInterface: React.FC = () => {
  const { 
    currentEventId, 
    messages, 
    events, 
    allContacts,
    loading, 
    sendMessage,
    deleteMessage,
    loadMoreMessages,
    hasMore,
    setCurrentEvent
  } = useChat();
  
  const { markMessageAsRead, isUserOnline } = usePresence();
  const { user } = useAuth();
  
  const [newMessage, setNewMessage] = useState('');
  const [, setEditingMessage] = useState<{id: string, content: string} | null>(null);
  const [messageMenu, setMessageMenu] = useState<MessageMenu>(null);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showConversationsList, setShowConversationsList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Efeito para rolar para baixo quando novas mensagens chegarem
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        
        // Marcar mensagens como lidas ao rolar até o final
        if (!loading && user) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.user_id !== user.id) {
            markMessageAsRead(lastMessage.id);
          }
        }
      }, 100);
    }
  }, [messages.length, loading, markMessageAsRead, user]);

  // Assinar canais em tempo real
  useEffect(() => {
    if (!user) return;
    
    const messageChannel = supabase
      .channel('new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            console.log('Nova mensagem recebida:', payload.new);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user]);

  const getSelectedChatInfo = () => {
    if (selectedUserId) {
      return 'Chat direto';
    }
    if (currentEventId) {
      const event = events?.find((e: any) => e.id === currentEventId);
      return event ? `Evento: ${event.title || 'Sem título'}` : `Evento ${currentEventId?.substring(0, 8)}...`;
    }
    return 'Nenhum chat selecionado';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    
    if (!content || !user) {
      console.log('Mensagem vazia ou usuário não autenticado');
      return;
    }
    
    if (!currentEventId && !selectedUserId) {
      console.error('Nenhum chat ou usuário selecionado para enviar mensagem');
      alert('Por favor, selecione um chat ou usuário para enviar a mensagem.');
      return;
    }
    
    try {
      const messageParams = selectedUserId ? {
        content,
        recipientId: selectedUserId
      } : {
        content,
        eventId: currentEventId || ''
      };
      
      console.log('Enviando mensagem para:', getSelectedChatInfo());
      
      const result = await sendMessage(messageParams as any);
      
      // Se foi criado um novo chat, atualiza o selectedUserId e seleciona o chat
      if (result && (result as any).eventId) {
        if (selectedUserId) {
          // Limpa o selectedUserId pois agora temos um eventId
          setSelectedUserId(null);
        }
        // Seleciona o chat criado/encontrado
        setCurrentEvent((result as any).eventId);
      }
      
      if (messages.length > 0 && user) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.user_id !== user.id) {
          await markMessageAsRead(lastMessage.id);
        }
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente.');
    }
  };

  const handleEditClick = (messageId: string, content: string) => {
    setEditingMessage({ id: messageId, content });
    setNewMessage(content);
    setMessageMenu(null);
    // Focar no input após um pequeno delay para garantir que o estado foi atualizado
    setTimeout(() => {
      const input = document.getElementById('message-input') as HTMLInputElement;
      input?.focus();
    }, 0);
  };

  const handleDeleteClick = async (messageId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta mensagem?')) {
      await deleteMessage(messageId);
      setMessageMenu(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setMessageMenu({
      messageId,
      x: e.clientX,
      y: e.clientY
    });
  };

  // Fechar menu de contexto ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setMessageMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSelectUser = async (userId: string) => {
    if (!user) return;
    
    // Busca se já existe um chat direto com esse usuário
    const existingChat = events.find(event => 
      event.is_direct_message && 
      event.participants?.includes(userId) &&
      event.participants?.includes(user.id)
    );
    
    if (existingChat) {
      // Se já existe, seleciona o chat existente
      setCurrentEvent(existingChat.id);
      setSelectedUserId(null);
      setShowUserList(false);
    } else {
      // Se não existe, define o userId para criar quando enviar mensagem
      setSelectedUserId(userId);
      setShowUserList(false);
    }
  };

  const isChatSelected = currentEventId || selectedUserId;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 text-gray-500">
        <p>Faça login para acessar o chat</p>
      </div>
    );
  }

  // Filtrar contatos baseado na busca
  const filteredContacts = allContacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.full_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex h-full bg-black text-white overflow-hidden">
      {/* Sidebar - Lista de conversas (estilo Instagram) */}
      <div className={`${
        showConversationsList ? 'flex' : 'hidden'
      } md:flex flex-col w-full md:w-[350px] bg-black border-r border-gray-800`}>
        {/* Header com nome do usuário */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">{user?.email?.split('@')[0] || 'Usuário'}</span>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </div>
            <button
              onClick={() => setShowUserList(true)}
              className="p-1.5 rounded-full hover:bg-gray-800 transition-colors"
              title="Nova mensagem"
            >
              <PencilIcon className="h-5 w-5 text-white" />
            </button>
          </div>
          
          {/* Barra de pesquisa */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 text-white placeholder-gray-500 rounded-lg border border-gray-800 focus:outline-none focus:border-gray-700 text-sm"
            />
          </div>
        </div>
        
        {/* Tabs (estilo Instagram) */}
        <div className="flex border-b border-gray-800">
          <button className="flex-1 py-3 text-center text-sm font-semibold text-white border-b-2 border-white">
            Mensagens
          </button>
          <button className="flex-1 py-3 text-center text-sm font-semibold text-gray-500 hover:text-gray-300">
            Pedidos
          </button>
        </div>

        {/* Lista de contatos/conversas */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto mb-2 text-white" />
              <p className="text-sm">Carregando...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Nenhum contato encontrado</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const hasChat = !!contact.chatId;
              const isActive = currentEventId === contact.chatId;
              
              return (
                <div
                  key={contact.id}
                  className={`w-full flex items-center p-3 hover:bg-gray-900 transition-colors cursor-pointer ${
                    isActive ? 'bg-gray-900' : ''
                  }`}
                  onClick={() => {
                    if (hasChat) {
                      setCurrentEvent(contact.chatId);
                      setSelectedUserId(null);
                    } else {
                      setSelectedUserId(contact.id);
                      setCurrentEvent(null);
                    }
                    // No mobile, esconde a lista ao selecionar um chat
                    if (window.innerWidth < 768) {
                      setShowConversationsList(false);
                    }
                    setSearchTerm('');
                  }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {contact.avatar_url ? (
                      <img
                        className="h-12 w-12 rounded-full object-cover"
                        src={contact.avatar_url}
                        alt={contact.full_name || 'Contato'}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center">
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">
                        {contact.full_name || contact.email || 'Sem nome'}
                      </p>
                      <div className="flex items-center gap-2 ml-2">
                        {contact.lastMessage && (
                          <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                            {(() => {
                              const time = formatDistanceToNow(new Date(contact.lastMessage.created_at), {
                                addSuffix: true,
                                locale: ptBR
                              });
                              const timeStr = time.replace('há ', '').replace(' atrás', '');
                              if (timeStr.includes('alguns segundos') || timeStr.includes('segundos')) {
                                return 'agora';
                              }
                              if (timeStr.includes('minuto')) {
                                return timeStr.replace('minutos', 'min').replace('minuto', 'min');
                              }
                              if (timeStr.includes('hora')) {
                                return timeStr.replace('horas', 'h').replace('hora', 'h');
                              }
                              if (timeStr.includes('dia')) {
                                return timeStr.replace('dias', 'd').replace('dia', 'd');
                              }
                              return timeStr;
                            })()}
                          </span>
                        )}
                        {contact.hasUnread && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      {contact.lastMessage ? (
                        <p className="text-sm text-gray-400 truncate flex-1 pr-2">
                          {contact.lastMessage.user_id === user?.id ? (
                            <span className="text-gray-500">Você: </span>
                          ) : null}
                          {contact.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Nenhuma mensagem ainda
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Área principal do chat (estilo Instagram) */}
      <div className="flex-1 flex flex-col bg-black">
        {/* Cabeçalho simplificado do chat */}
        {isChatSelected && (
          <div className="bg-black border-b border-gray-800 text-white px-4 py-3 flex items-center">
            <button 
              onClick={() => {
                setCurrentEvent(null);
                setSelectedUserId(null);
                setShowConversationsList(true);
              }}
              className="p-1.5 rounded-full hover:bg-gray-800 transition-colors mr-3 md:hidden"
              aria-label="Voltar"
            >
              <ArrowLeftIcon className="h-6 w-6 text-white" />
            </button>
            <div className="flex-1">
              {currentEventId ? (
                (() => {
                  const contact = allContacts.find(c => c.chatId === currentEventId);
                  return contact ? (
                    <>
                      <h2 className="text-base font-semibold text-white">
                        {contact.full_name || contact.email || 'Contato'}
                      </h2>
                      <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${
                        isUserOnline(contact.id) ? 'text-green-500' : 'text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isUserOnline(contact.id) ? 'bg-green-500' : 'bg-gray-500'
                        }`}></span>
                        {isUserOnline(contact.id) ? 'Online' : 'Offline'}
                      </p>
                    </>
                  ) : null;
                })()
              ) : selectedUserId ? (
                (() => {
                  const contact = allContacts.find(c => c.id === selectedUserId);
                  return contact ? (
                    <>
                      <h2 className="text-base font-semibold text-white">
                        {contact.full_name || contact.email || 'Contato'}
                      </h2>
                      <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${
                        isUserOnline(selectedUserId) ? 'text-green-500' : 'text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isUserOnline(selectedUserId) ? 'bg-green-500' : 'bg-gray-500'
                        }`}></span>
                        {isUserOnline(selectedUserId) ? 'Online' : 'Offline'}
                      </p>
                    </>
                  ) : null;
                })()
              ) : null}
            </div>
          </div>
        )}

        {/* Área de mensagens */}
      {showUserList ? (
        <div className="flex-1 bg-black">
          <div className="p-4 border-b border-gray-800">
            <button
              onClick={() => setShowUserList(false)}
              className="flex items-center gap-2 text-white hover:text-gray-300"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="font-semibold">Nova mensagem</span>
            </button>
          </div>
          <UserList 
            onSelectUser={handleSelectUser} 
            currentUserId={user?.id || ''} 
          />
        </div>
      ) : !isChatSelected ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black">
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center mx-auto mb-4">
              <PaperAirplaneIcon className="h-12 w-12 text-white/60 transform rotate-45" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-2">Suas mensagens</h3>
          <p className="text-gray-400 mb-6 max-w-md text-sm">Envie fotos e mensagens privadas para um amigo ou grupo</p>
          <button
            onClick={() => setShowUserList(true)}
            className="px-6 py-2.5 bg-[#0095F6] text-white rounded-lg hover:bg-[#0084d4] transition-colors font-semibold text-sm"
          >
            Enviar mensagem
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col bg-black">
          {/* Lista de mensagens */}
          <div 
            ref={messagesContainerRef}
            onScroll={() => {
              if (!messagesContainerRef.current) return;
              const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
              // Carrega mais mensagens quando está perto do topo (mensagens antigas)
              if (scrollTop < 100 && hasMore && !loading) {
                loadMoreMessages();
              }
            }}
            className="flex-1 overflow-y-auto px-4 py-3 scroll-smooth"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #000' }}
          >
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mb-3" />
                  <p className="text-sm text-gray-400">Carregando mensagens...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-600 mb-3" />
                <p className="text-base font-medium mb-1 text-white">Nenhuma mensagem ainda</p>
                <p className="text-sm">Envie uma mensagem para começar</p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message, index) => {
                  const isOwn = message.user_id === user.id;
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                  const showAvatar = !prevMessage || prevMessage.user_id !== message.user_id;
                  const showTime = !nextMessage || nextMessage.user_id !== message.user_id || 
                    new Date(message.created_at).getTime() - new Date(nextMessage.created_at).getTime() > 300000; // 5 minutos
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-1.5 group ${isOwn ? 'justify-end' : 'justify-start'} ${
                        showAvatar ? 'mt-4' : 'mt-0.5'
                      }`}
                      onContextMenu={(e) => handleContextMenu(e, message.id)}
                    >
                      {!isOwn && (
                        <div className={`flex-shrink-0 ${showAvatar ? 'w-7 h-7' : 'w-0'}`}>
                          {showAvatar && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-medium text-xs">
                              {message.user?.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col max-w-[75%]">
                        {!isOwn && showAvatar && (
                          <span className="text-xs text-gray-400 mb-1 px-1">
                            {message.user?.full_name || 'Usuário'}
                          </span>
                        )}
                        <div 
                          className={`rounded-2xl px-3 py-2 ${
                            isOwn 
                              ? 'bg-[#0095F6] text-white rounded-tr-sm' 
                              : 'bg-gray-800 text-white rounded-tl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words text-white">
                            {message.content}
                          </p>
                        </div>
                        {showTime && (
                          <span className={`text-[10px] mt-0.5 px-1 ${
                            isOwn ? 'text-right text-gray-500' : 'text-left text-gray-500'
                          }`}>
                            {message.created_at 
                              ? formatDistanceToNow(new Date(message.created_at), { 
                                  addSuffix: true,
                                  locale: ptBR 
                                })
                              : 'Agora mesmo'}
                          </span>
                        )}
                      </div>
                      {isOwn && (
                        <div className={`flex-shrink-0 ${showAvatar ? 'w-7 h-7' : 'w-0'}`}>
                          {showAvatar && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-medium text-xs">
                              {user?.email?.[0]?.toUpperCase() || 'V'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de entrada de mensagem */}
          <div className="border-t border-gray-800 bg-black px-4 py-3">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  id="message-input"
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mensagem..."
                  className="w-full rounded-full px-4 py-2.5 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-sm border border-gray-800 focus:border-gray-700"
                  disabled={!isChatSelected}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || !isChatSelected}
                className="p-2 bg-[#0095F6] text-white rounded-full hover:bg-[#0084d4] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 disabled:bg-gray-700"
                aria-label="Enviar mensagem"
              >
                <PaperAirplaneIcon className="h-5 w-5 transform rotate-90" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Menu de contexto para mensagens */}
      {messageMenu && (
        <div 
          className="fixed bg-white dark:bg-gray-800 shadow-2xl rounded-xl py-2 z-50 border border-gray-200 dark:border-gray-700 min-w-[150px]"
          style={{
            top: `${messageMenu.y}px`,
            left: `${messageMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const message = messages.find(m => m.id === messageMenu.messageId);
              if (message) {
                handleEditClick(message.id, message.content);
              }
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-lg mx-1"
          >
            Editar
          </button>
          <button
            onClick={() => messageMenu && handleDeleteClick(messageMenu.messageId)}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 rounded-lg mx-1"
          >
            Excluir
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default ChatInterface;
