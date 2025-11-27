-- ============================================
-- Meeting Logger Database Schema - SQLite
-- ============================================

-- Users table (for future authentication)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  meeting_type TEXT,
  template_id INTEGER,
  raw_content TEXT NOT NULL,
  summary TEXT,
  overview TEXT,
  discussion TEXT,
  decisions TEXT,
  next_steps TEXT,
  status TEXT DEFAULT 'completed',
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  markdown_file_path TEXT,
  FOREIGN KEY (template_id) REFERENCES meeting_templates(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type);

-- Meeting versions (for edit history)
CREATE TABLE IF NOT EXISTS meeting_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  raw_content TEXT,
  summary TEXT,
  overview TEXT,
  discussion TEXT,
  decisions TEXT,
  next_steps TEXT,
  changed_by INTEGER,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  change_summary TEXT,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id),
  UNIQUE(meeting_id, version_number)
);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  department TEXT,
  job_title TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meeting participants (join table)
CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  role TEXT,
  attended BOOLEAN DEFAULT 1,
  PRIMARY KEY (meeting_id, participant_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id)
);

-- Action items
CREATE TABLE IF NOT EXISTS action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  assignee_id INTEGER,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  completion_date DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES participants(id)
);

CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON action_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON action_items(due_date);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  description TEXT,
  is_ai_suggested BOOLEAN DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meeting tags (join table)
CREATE TABLE IF NOT EXISTS meeting_tags (
  meeting_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  confidence REAL,
  PRIMARY KEY (meeting_id, tag_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meeting projects (join table)
CREATE TABLE IF NOT EXISTS meeting_projects (
  meeting_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  PRIMARY KEY (meeting_id, project_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Meeting relationships
CREATE TABLE IF NOT EXISTS meeting_relationships (
  parent_meeting_id INTEGER NOT NULL,
  child_meeting_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (parent_meeting_id, child_meeting_id),
  FOREIGN KEY (parent_meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (child_meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Templates
CREATE TABLE IF NOT EXISTS meeting_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  meeting_type TEXT,
  template_content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT 0,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- AI insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence REAL,
  related_meeting_ids TEXT,
  related_keywords TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_dismissed BOOLEAN DEFAULT 0,
  dismissed_at DATETIME
);

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  related_meeting_id INTEGER,
  related_action_item_id INTEGER,
  scheduled_for DATETIME,
  sent_at DATETIME,
  status TEXT DEFAULT 'pending',
  channel TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_meeting_id) REFERENCES meetings(id),
  FOREIGN KEY (related_action_item_id) REFERENCES action_items(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER UNIQUE,
  calendar_provider TEXT,
  external_event_id TEXT,
  sync_status TEXT DEFAULT 'synced',
  last_synced DATETIME,
  error_message TEXT,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Slack integrations
CREATE TABLE IF NOT EXISTS slack_integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER,
  channel_id TEXT,
  message_ts TEXT,
  posted_at DATETIME,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

-- Recordings
CREATE TABLE IF NOT EXISTS recordings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  duration INTEGER,
  format TEXT,
  source TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Transcriptions
CREATE TABLE IF NOT EXISTS transcriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recording_id INTEGER NOT NULL,
  full_text TEXT NOT NULL,
  language TEXT DEFAULT 'ko',
  transcription_service TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

-- Transcription segments
CREATE TABLE IF NOT EXISTS transcription_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transcription_id INTEGER NOT NULL,
  speaker_id INTEGER,
  speaker_name TEXT,
  start_time REAL,
  end_time REAL,
  text TEXT NOT NULL,
  confidence REAL,
  FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (speaker_id) REFERENCES participants(id)
);

-- Exports
CREATE TABLE IF NOT EXISTS exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  format TEXT NOT NULL,
  file_path TEXT NOT NULL,
  generated_by INTEGER,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  user_id INTEGER,
  related_meeting_id INTEGER,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_meeting_id) REFERENCES meetings(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY,
  timezone TEXT DEFAULT 'Asia/Seoul',
  language TEXT DEFAULT 'ko',
  email_notifications BOOLEAN DEFAULT 1,
  slack_notifications BOOLEAN DEFAULT 0,
  digest_frequency TEXT DEFAULT 'weekly',
  default_meeting_duration INTEGER DEFAULT 60,
  theme TEXT DEFAULT 'light',
  preferences_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
