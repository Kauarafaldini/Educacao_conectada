/*
  # Educação Conectada - Database Schema

  ## Overview
  Complete schema for an academic event and study management platform connecting professors and students.

  ## New Tables

  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text, not null)
  - `role` (text, not null) - 'professor' or 'student'
  - `avatar_url` (text, optional)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### 2. `events`
  Academic events (classes, seminars, meetings)
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `description` (text, optional)
  - `event_type` (text, not null) - 'aula', 'seminario', 'reuniao'
  - `start_date` (timestamptz, not null)
  - `end_date` (timestamptz, not null)
  - `location` (text, optional)
  - `creator_id` (uuid, references profiles, not null)
  - `is_cancelled` (boolean, default false)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### 3. `event_participants`
  Junction table for event participants
  - `id` (uuid, primary key)
  - `event_id` (uuid, references events, not null)
  - `user_id` (uuid, references profiles, not null)
  - `invitation_status` (text, default 'pending') - 'pending', 'accepted', 'declined'
  - `notified_at` (timestamptz, optional)
  - `created_at` (timestamptz, default now())
  - Unique constraint on (event_id, user_id)

  ### 4. `notifications`
  System notifications for users
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles, not null)
  - `event_id` (uuid, references events, optional)
  - `type` (text, not null) - 'event_created', 'event_updated', 'event_cancelled', 'invitation'
  - `title` (text, not null)
  - `message` (text, not null)
  - `read` (boolean, default false)
  - `created_at` (timestamptz, default now())

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with policies for:
  - Authenticated users can read their own data
  - Users can update their own profiles
  - Professors can create events
  - Event creators can manage their events
  - Participants can view events they're invited to
  - Users can manage their own notifications

  ## Indexes
  - Events indexed by creator_id, start_date, event_type
  - Event participants indexed by event_id and user_id
  - Notifications indexed by user_id and read status

  ## Important Notes
  1. All timestamps use UTC timezone
  2. Event dates are validated to ensure end_date > start_date
  3. Profiles are automatically created via trigger when user signs up
  4. Soft delete for events using is_cancelled flag
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('professor', 'student')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('aula', 'seminario', 'reuniao')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  location text,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_cancelled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_event_dates CHECK (end_date > start_date)
);

-- Create event_participants junction table
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitation_status text DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  notified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('event_created', 'event_updated', 'event_cancelled', 'invitation')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Users can view events they created or are invited to"
  ON events FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR id IN (
      SELECT event_id FROM event_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Professors can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'professor'
    )
  );

CREATE POLICY "Event creators can update their events"
  ON events FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Event creators can delete their events"
  ON events FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Event participants policies
CREATE POLICY "Users can view participants of events they're involved with"
  ON event_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = event_participants.event_id
      AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "Event creators can add participants"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Event creators can update participants"
  ON event_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.creator_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update their own status"
  ON event_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Event creators can delete participants"
  ON event_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.creator_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_events ON events;
CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
