# Database Setup Guide

## Applying the Migration

To set up the database for the Educação Conectada platform, you need to apply the migration file located at:

```
supabase/migrations/20250101000000_create_education_platform_schema.sql
```

### Steps to Apply Migration:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Paste and execute the SQL in the editor

OR

If you have the Supabase CLI installed:

```bash
supabase db push
```

## Database Schema Overview

### Tables Created:

1. **profiles** - User profiles (professors and students)
2. **events** - Academic events (classes, seminars, meetings)
3. **event_participants** - Junction table for event participants
4. **notifications** - System notifications for users

### Security:

- Row Level Security (RLS) is enabled on all tables
- Comprehensive policies ensure users can only access appropriate data
- Professors can create and manage events
- Students can view events they're invited to
- All users can manage their own profiles and notifications

### Features:

- Automatic profile creation on user signup via trigger
- Updated_at timestamps automatically managed
- Event date validation
- Soft delete for events (is_cancelled flag)
- Indexes for optimized queries
