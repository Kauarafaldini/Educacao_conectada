import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ChatContainer from './ChatContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';

const ChatButton: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();
  const { currentEventId, setCurrentEvent } = useChat();

  // Efeito para fechar o chat quando o usuário fizer logout ou quando o evento atual mudar
  useEffect(() => {
    if (!user) {
      setIsChatOpen(false);
      setCurrentEvent(null);
    }
  }, [user, setCurrentEvent]);

  // Efeito para fechar o chat ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Limpa o evento atual ao fechar o chat com a tecla Escape
        setCurrentEvent(null);
        setIsChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentEvent]);

  if (!user) return null;

  return (
    <>
      {/* Botão flutuante do chat - só mostra quando o chat estiver fechado */}
      <div className={`fixed bottom-6 right-6 z-50 transition-opacity duration-300 ${isChatOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Elemento vazio para manter o espaço quando invisível */}
        <div className="invisible">
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        </div>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`relative p-4 rounded-full shadow-lg transition-all duration-300 transform ${
            isChatOpen 
              ? 'bg-blue-700 scale-110' 
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
          }`}
          aria-label="Abrir chat"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
          {false && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              0
            </span>
          )}
        </button>
      </div>

      {/* Modal do chat */}
      {isChatOpen && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          {/* Overlay de fundo */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
            onClick={() => {
              // Limpa o evento atual ao fechar o chat
              setCurrentEvent(null);
              setIsChatOpen(false);
            }}
          />
          
          {/* Conteúdo do chat */}
          <div className="absolute bottom-6 right-6 w-full max-w-md h-[80vh] max-h-[700px] flex flex-col bg-white dark:bg-gray-900 rounded-t-xl shadow-2xl overflow-hidden transform transition-all duration-300">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <div className="flex items-center space-x-3">
                <UserGroupIcon className="h-6 w-6" />
                <h2 className="text-lg font-semibold">Conversas</h2>
              </div>
              <button
                onClick={() => {
                  // Limpa o evento atual ao fechar o chat
                  setCurrentEvent(null);
                  setIsChatOpen(false);
                }}
                className="p-1 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Conteúdo */}
            <div className="flex-1 overflow-hidden">
              <ChatContainer />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatButton;
