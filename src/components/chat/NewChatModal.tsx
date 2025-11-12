import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';

interface Contact {
  id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { setCurrentEvent, loadChatEvents } = useChat();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Busca todos os usuários exceto o atual
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .neq('id', user.id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      
      setContacts(data || []);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (contact: Contact) => {
    console.log('Iniciando criação de chat com:', contact);
    if (!user || isCreatingChat) {
      console.log('Usuário não autenticado ou já criando chat');
      return;
    }
    
    setIsCreatingChat(true);
    
    try {
      console.log('Buscando chats existentes com o contato:', contact.id);
      // Primeiro, verifica se já existe um chat direto com este contato
      const { data: existingChats, error: findError } = await supabase
        .from('event_participants')
        .select(`
          event:events!inner(
            id,
            title,
            is_direct_message,
            participants
          )
        `)
        .eq('user_id', user.id)
        .eq('events.is_direct_message', true);
      
      if (findError) {
        console.error('Erro ao buscar chats existentes:', findError);
        throw findError;
      }
      
      console.log('Chats existentes encontrados:', existingChats);
      
      // Encontra um chat existente com o contato
      const existingChat = existingChats?.find(chat => {
        const event = chat.event as any; // Fazendo type assertion para evitar erros de tipagem
        return (
          event?.is_direct_message && 
          Array.isArray(event.participants) && 
          event.participants.includes(contact.id)
        );
      });
      
      // Se já existir um chat direto, apenas o seleciona
      if (existingChat?.event) {
        const event = existingChat.event as any; // Fazendo type assertion
        console.log('Chat direto existente encontrado. ID do evento:', event.id);
        console.log('Fechando modal e definindo evento atual...');
        onClose();
        try {
          await setCurrentEvent(event.id);
          console.log('Evento definido com sucesso');
        } catch (error) {
          console.error('Erro ao definir evento atual:', error);
          throw error;
        }
        return;
      }
      
      // Se não existir, cria um novo chat direto
      console.log('Nenhum chat existente encontrado. Criando novo chat direto com:', contact.full_name);
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora depois
      
      // Cria um novo chat direto
      const { data: newEvent, error: createError } = await supabase
        .from('events')
        .insert({
          title: `${user.user_metadata?.full_name || 'Usuário'} e ${contact.full_name || 'Contato'}`,
          description: 'Conversa direta',
          event_type: 'reuniao', // Usando 'reuniao' que é um tipo válido
          start_date: now.toISOString(),
          end_date: oneHourLater.toISOString(),
          location: 'Chat direto',
          is_direct_message: true,
          participants: [user.id, contact.id],
          creator_id: user.id,
          created_by: user.id
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Erro ao criar evento de chat:', createError);
        throw createError;
      }
      
      console.log('Novo evento de chat criado com sucesso. ID:', newEvent.id);
      
      // Adiciona os participantes à tabela event_participants
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert([
          { event_id: newEvent.id, user_id: user.id },
          { event_id: newEvent.id, user_id: contact.id }
        ]);
      
      if (participantError) {
        console.error('Erro ao adicionar participantes:', participantError);
        throw participantError;
      }
      
      console.log('Participantes adicionados com sucesso');
      
      console.log('Chat direto criado com sucesso:', newEvent.id);
      
      console.log('Fechando modal...');
      onClose();
      
      // Atualiza a lista de eventos
      if (loadChatEvents) {
        console.log('Atualizando lista de eventos...');
        try {
          await loadChatEvents();
          console.log('Lista de eventos atualizada com sucesso');
        } catch (error) {
          console.error('Erro ao atualizar lista de eventos:', error);
          // Não interrompe o fluxo se falhar, pois podemos tentar definir o evento mesmo assim
        }
      }
      
      // Define o novo chat como ativo
      console.log('Definindo novo chat como ativo. ID:', newEvent.id);
      try {
        await setCurrentEvent(newEvent.id);
        console.log('Novo chat definido como ativo com sucesso');
      } catch (error) {
        console.error('Erro ao definir novo chat como ativo:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      alert('Ocorreu um erro ao iniciar a conversa. Tente novamente.');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Nova conversa
                </h3>
                
                <div className="mt-2 mb-4">
                  <input
                    type="text"
                    placeholder="Buscar contatos..."
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="mt-4 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato disponível'}
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredContacts.map((contact) => (
                        <li key={contact.id} className="py-1">
                          <button
                            onClick={() => handleStartChat(contact)}
                            disabled={isCreatingChat}
                            className="w-full flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md transition-colors disabled:opacity-50"
                          >
                            {contact.avatar_url ? (
                              <img
                                src={contact.avatar_url}
                                alt={contact.full_name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                                  {contact.full_name?.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {contact.full_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {contact.email}
                              </p>
                            </div>
                            {isCreatingChat && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              onClick={onClose}
              disabled={isCreatingChat}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
