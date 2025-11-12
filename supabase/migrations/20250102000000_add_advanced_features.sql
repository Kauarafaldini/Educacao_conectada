/*
  # Educação Conectada V2 - Advanced Features Migration

  ## Overview
  This migration extends the platform with advanced academic features while maintaining
  full compatibility with existing data.

  ## New Tables

  ### 1. `materials`
  Educational materials attached to events
  - `id` (uuid, primary key)
  - `event_id` (uuid, references events)
  - `title` (text, not null)
  - `description` (text)
  - `file_url` (text)
  - `file_type` (text) - 'pdf', 'video', 'link', 'document'
  - `file_size` (bigint)
  - `uploaded_by` (uuid, references profiles)
  - `created_at` (timestamptz, default now())

  ### 2. `attendance`
  Digital attendance tracking
  - `id` (uuid, primary key)
  - `event_id` (uuid, references events)
  - `user_id` (uuid, references profiles)
  - `status` (text) - 'present', 'absent', 'late', 'excused'
  - `check_in_time` (timestamptz)
  - `qr_code` (text, unique)
  - `created_at` (timestamptz, default now())

  ### 3. `tasks`
  Assignments and activities
  - `id` (uuid, primary key)
  - `event_id` (uuid, references events)
  - `title` (text, not null)
  - `description` (text)
  - `due_date` (timestamptz)
  - `max_grade` (numeric, default 100)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz, default now())

  ### 4. `task_submissions`
  Student submissions for tasks
  - `id` (uuid, primary key)
  - `task_id` (uuid, references tasks)
  - `student_id` (uuid, references profiles)
  - `content` (text)
  - `file_url` (text)
  - `grade` (numeric)
  - `feedback` (text)
  - `submitted_at` (timestamptz, default now())
  - `graded_at` (timestamptz)

  ### 5. `messages`
  Chat messages for events
  - `id` (uuid, primary key)
  - `event_id` (uuid, references events)
  - `user_id` (uuid, references profiles)
  - `content` (text, not null)
  - `created_at` (timestamptz, default now())

  ### 6. `forum_topics`
  Forum discussion topics
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `category` (text)
  - `created_by` (uuid, references profiles)
  - `pinned` (boolean, default false)
  - `locked` (boolean, default false)
  - `created_at` (timestamptz, default now())

  ### 7. `forum_posts`
  Forum posts and replies
  - `id` (uuid, primary key)
  - `topic_id` (uuid, references forum_topics)
  - `user_id` (uuid, references profiles)
  - `content` (text, not null)
  - `parent_post_id` (uuid, references forum_posts)
  - `created_at` (timestamptz, default now())

  ### 8. `announcements`
  Institutional announcements
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `content` (text, not null)
  - `priority` (text, default 'normal') - 'low', 'normal', 'high', 'urgent'
  - `created_by` (uuid, references profiles)
  - `published_at` (timestamptz, default now())
  - `expires_at` (timestamptz)

  ### 9. `activity_feed`
  System activity log
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `action_type` (text, not null)
  - `entity_type` (text)
  - `entity_id` (uuid)
  - `description` (text)
  - `created_at` (timestamptz, default now())

  ### 10. `user_preferences`
  User settings and preferences
  - `user_id` (uuid, primary key, references profiles)
  - `theme` (text, default 'light') - 'light', 'dark'
  - `font_size` (text, default 'medium') - 'small', 'medium', 'large'
  - `high_contrast` (boolean, default false)
  - `email_notifications` (boolean, default true)
  - `push_notifications` (boolean, default true)
  - `updated_at` (timestamptz, default now())

  ### 11. `audit_logs`
  Security and audit tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `action` (text, not null)
  - `entity_type` (text)
  - `entity_id` (uuid)
  - `ip_address` (text)
  - `user_agent` (text)
  - `created_at` (timestamptz, default now())

  ## Extended Columns

  ### events table extensions
  - `is_online` (boolean, default false)
  - `meeting_link` (text)
  - `meeting_platform` (text) - 'google_meet', 'zoom', 'teams'

  ## Security
  All new tables have RLS enabled with appropriate policies

  ## Indexes
  Optimized indexes for performance on frequently queried columns
*/

-- Add new columns to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE events ADD COLUMN is_online boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE events ADD COLUMN meeting_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'meeting_platform'
  ) THEN
    ALTER TABLE events ADD COLUMN meeting_platform text CHECK (meeting_platform IN ('google_meet', 'zoom', 'teams', 'other'));
  END IF;
END $$;

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'video', 'link', 'document', 'image', 'other')),
  file_size bigint,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  check_in_time timestamptz,
  qr_code text UNIQUE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  max_grade numeric DEFAULT 100,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_submissions table
CREATE TABLE IF NOT EXISTS task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  file_url text,
  grade numeric,
  feedback text,
  submitted_at timestamptz DEFAULT now(),
  graded_at timestamptz,
  UNIQUE(task_id, student_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create forum_topics table
CREATE TABLE IF NOT EXISTS forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pinned boolean DEFAULT false,
  locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forum_posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create activity_feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  font_size text DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  high_contrast boolean DEFAULT false,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_materials_event ON materials(event_id);
CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by ON materials(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_student ON task_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_event ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic ON forum_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent ON forum_posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Materials policies
CREATE POLICY "Users can view materials for events they participate in"
  ON materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
      AND (
        e.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM event_participants ep
          WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Event creators can add materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Material uploaders can delete their materials"
  ON materials FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Attendance policies
CREATE POLICY "Users can view attendance for their events"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Event creators can manage attendance"
  ON attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Students can check in"
  ON attendance FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tasks policies
CREATE POLICY "Users can view tasks for their events"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE (e.id = event_id OR event_id IS NULL)
      AND (
        e.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM event_participants ep
          WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Professors can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );

CREATE POLICY "Task creators can update their tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Task creators can delete their tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Task submissions policies
CREATE POLICY "Students can view their own submissions"
  ON task_submissions FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_id AND tasks.created_by = auth.uid()
    )
  );

CREATE POLICY "Students can submit tasks"
  ON task_submissions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their submissions"
  ON task_submissions FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Professors can grade submissions"
  ON task_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_id AND tasks.created_by = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Event participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
      AND (
        e.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM event_participants ep
          WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Event participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
      AND (
        e.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM event_participants ep
          WHERE ep.event_id = e.id AND ep.user_id = auth.uid()
        )
      )
    )
  );

-- Forum policies
CREATE POLICY "All users can view forum topics"
  ON forum_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All users can create topics"
  ON forum_topics FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Topic creators can update their topics"
  ON forum_topics FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "All users can view forum posts"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All users can create posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Post authors can update their posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Announcements policies
CREATE POLICY "All users can view announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    published_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Professors can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );

CREATE POLICY "Announcement creators can update their announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Activity feed policies
CREATE POLICY "Users can view their own activity feed"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create activity feed entries"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User preferences policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Audit logs policies (read-only for most users)
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at_tasks ON tasks;
CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_forum_topics ON forum_topics;
CREATE TRIGGER set_updated_at_forum_topics
  BEFORE UPDATE ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_preferences ON user_preferences;
CREATE TRIGGER set_updated_at_user_preferences
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create default user preferences
CREATE OR REPLACE FUNCTION public.create_default_preferences()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on profile creation
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_preferences();
