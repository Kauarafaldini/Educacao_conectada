import { Profile } from '../lib/supabase';

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export type Message = {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
  is_edited?: boolean;
  is_deleted?: boolean;
};

export interface ChatEvent {
  id: string;
  title: string;
  description?: string;
  is_direct_message: boolean;
  participants: string[];
  created_by: string;
  created_at: string;
  updated_at?: string;
  last_message?: Message;
  unread_count: number;
  other_participant?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export type SendMessageParams = {
  content: string;
  eventId: string;
  recipientId?: string;
};

export type ChatContextType = {
  currentEventId: string | null;
  messages: Message[];
  events: ChatEvent[];
  allContacts: any[];
  loading: boolean;
  error: string | null;
  sendMessage: (params: { content: string; eventId?: string; recipientId?: string }) => Promise<Message | undefined>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  setCurrentEvent: (eventId: string | null) => void;
  loadMoreMessages: () => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  loadChatEvents: () => Promise<void>;
  hasMore: boolean;
};
