/*
  # Educação Conectada - Chat Fields Migration

  ## Overview
  Adiciona campos necessários para suporte a chat direto na tabela events

  ## Changes

  ### Add columns to events table
  - `is_direct_message` (boolean, default false) - Indica se é um chat direto
  - `participants` (uuid[], default array[]) - Array de IDs dos participantes (para consultas rápidas)
  
  ## Notes
  - O campo `creator_id` já existe, mas vamos adicionar `created_by` como alias ou manter apenas creator_id
  - O campo `participants` é usado para consultas rápidas, mas a tabela event_participants é a fonte de verdade
*/

-- Add chat-related columns to events table
DO $$
BEGIN
  -- Add is_direct_message column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'is_direct_message'
  ) THEN
    ALTER TABLE events ADD COLUMN is_direct_message boolean DEFAULT false;
  END IF;

  -- Add participants array column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'participants'
  ) THEN
    ALTER TABLE events ADD COLUMN participants uuid[] DEFAULT ARRAY[]::uuid[];
  END IF;

  -- Add created_by column (alias for creator_id for compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE events ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE CASCADE;
    
    -- Populate created_by with creator_id values for existing records
    UPDATE events SET created_by = creator_id WHERE created_by IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE events ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;

-- Create index for is_direct_message for faster queries
CREATE INDEX IF NOT EXISTS idx_events_is_direct_message ON events(is_direct_message) WHERE is_direct_message = true;

-- Create GIN index for participants array for faster contains queries
CREATE INDEX IF NOT EXISTS idx_events_participants ON events USING GIN(participants);

