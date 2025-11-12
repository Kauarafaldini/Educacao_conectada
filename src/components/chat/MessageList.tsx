import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../../types/chat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  hasMore,
  onLoadMore,
  onEditMessage,
  onDeleteMessage,
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Rola para a última mensagem quando novas mensagens são adicionadas
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = (messageId: string) => {
    if (editContent.trim()) {
      onEditMessage(messageId, editContent);
      setEditingMessageId(null);
      setEditContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, messageId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(messageId);
    } else if (e.key === 'Escape') {
      setEditingMessageId(null);
      setEditContent('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {hasMore && (
        <div className="flex justify-center mb-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {loading ? 'Carregando...' : 'Carregar mensagens anteriores'}
          </button>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              message.user_id === user?.id
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
            }`}
          >
            {message.user_id !== user?.id && (
              <div className="font-semibold text-sm mb-1">
                {message.user?.full_name || 'Usuário'}
              </div>
            )}

            {editingMessageId === message.id ? (
              <div className="relative">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, message.id)}
                  className="w-full p-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  rows={Math.min(editContent.split('\n').length + 1, 5)}
                />
                <div className="flex justify-end mt-1 space-x-2">
                  <button
                    onClick={() => handleSaveEdit(message.id)}
                    className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingMessageId(null)}
                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="whitespace-pre-wrap break-words">
                  {message.is_deleted ? (
                    <span className="italic text-gray-500 dark:text-gray-400">
                      Mensagem excluída
                    </span>
                  ) : (
                    message.content
                  )}
                </p>
                <div className="flex items-center justify-end mt-1 space-x-2">
                  <span className="text-xs opacity-70">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                  {message.is_edited && !message.is_deleted && (
                    <span className="text-xs opacity-50">(editado)</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {message.user_id === user?.id && !message.is_deleted && (
            <div className="flex items-start ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(message)}
                className="p-1 text-gray-500 hover:text-blue-500"
                title="Editar mensagem"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="p-1 text-gray-500 hover:text-red-500"
                title="Excluir mensagem"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
