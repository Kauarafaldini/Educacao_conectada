import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface UserListProps {
  onSelectUser: (userId: string) => void;
  currentUserId: string;
}

const UserList: React.FC<UserListProps> = ({ onSelectUser, currentUserId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Busca todos os usuários exceto o usuário atual
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .neq('id', currentUserId)
          .order('full_name', { ascending: true });

        if (error) throw error;
        
        setUsers(data || []);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [currentUserId, user]);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-black">
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-800 rounded-md leading-5 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-gray-700 sm:text-sm"
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Nenhum usuário encontrado
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {filteredUsers.map((user) => (
              <li key={user.id}>
                <button
                  onClick={() => onSelectUser(user.id)}
                  className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-900 transition-colors"
                >
                  {user.avatar_url ? (
                    <img
                      className="h-10 w-10 rounded-full object-cover"
                      src={user.avatar_url}
                      alt={user.full_name || 'Usuário'}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">
                      {user.full_name || 'Usuário sem nome'}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserList;
