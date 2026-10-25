CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'want',
  total_pages INTEGER,
  current_page INTEGER NOT NULL DEFAULT 0,
  started_on TEXT,
  finished_on TEXT,
  rating REAL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS reading_sessions (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  session_date TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS reading_notes (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  note_date TEXT NOT NULL,
  chapter TEXT NOT NULL DEFAULT '',
  page_number INTEGER,
  quote TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_books_status ON books(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(session_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book ON reading_sessions(book_id, session_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reading_notes_book ON reading_notes(book_id, note_date) WHERE deleted_at IS NULL;
