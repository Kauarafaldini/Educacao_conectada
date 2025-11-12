import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'professor' | 'student';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  title: string;
  description?: string;
  event_type: 'aula' | 'seminario' | 'reuniao';
  start_date: string;
  end_date: string;
  location?: string;
  creator_id: string;
  is_cancelled: boolean;
  is_online?: boolean;
  meeting_link?: string;
  meeting_platform?: 'google_meet' | 'zoom' | 'teams' | 'other';
  created_at: string;
  updated_at: string;
  creator?: Profile;
};

export type EventParticipant = {
  id: string;
  event_id: string;
  user_id: string;
  invitation_status: 'pending' | 'accepted' | 'declined';
  notified_at?: string;
  created_at: string;
  user?: Profile;
};

export type Notification = {
  id: string;
  user_id: string;
  event_id?: string;
  type: 'event_created' | 'event_updated' | 'event_cancelled' | 'invitation';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  event?: Event;
};

export type Material = {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_type: 'pdf' | 'video' | 'link' | 'document' | 'image' | 'other';
  file_size?: number;
  uploaded_by: string;
  created_at: string;
  uploader?: Profile;
};

export type Attendance = {
  id: string;
  event_id: string;
  user_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  qr_code?: string;
  created_at: string;
  user?: Profile;
};

export type Task = {
  id: string;
  event_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  max_grade: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: Profile;
};

export type TaskSubmission = {
  id: string;
  task_id: string;
  student_id: string;
  content?: string;
  file_url?: string;
  grade?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  student?: Profile;
  task?: Task;
};

export type Message = {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
};

export type ForumTopic = {
  id: string;
  title: string;
  category?: string;
  created_by: string;
  pinned: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  post_count?: number;
};

export type ForumPost = {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  parent_post_id?: string;
  created_at: string;
  user?: Profile;
  replies?: ForumPost[];
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  published_at: string;
  expires_at?: string;
  creator?: Profile;
};

export type ActivityFeed = {
  id: string;
  user_id: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  created_at: string;
};

export type UserPreferences = {
  user_id: string;
  theme: 'light' | 'dark';
  font_size: 'small' | 'medium' | 'large';
  high_contrast: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
};
