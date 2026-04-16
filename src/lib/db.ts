import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "psa-tracker.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      orderNumber TEXT NOT NULL,
      submissionNumber TEXT,
      serviceLevel TEXT NOT NULL DEFAULT 'regular',
      status TEXT NOT NULL DEFAULT 'preparing',
      submittedDate TEXT NOT NULL,
      receivedDate TEXT,
      expectedReturnDate TEXT,
      actualReturnDate TEXT,
      shipTrackingNumber TEXT,
      shipCarrier TEXT,
      totalCards INTEGER NOT NULL DEFAULT 0,
      totalDeclaredValue REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      lastApiSync TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      submissionId TEXT NOT NULL,
      certNumber TEXT,
      lineNumber INTEGER NOT NULL DEFAULT 0,
      year TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      cardNumber TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      variety TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      grade TEXT,
      gradeDescription TEXT,
      declaredValue REAL NOT NULL DEFAULT 0,
      purchasePrice REAL,
      estimatedGradedValue REAL,
      frontImageUrl TEXT,
      notes TEXT NOT NULL DEFAULT '',
      lastApiSync TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (submissionId) REFERENCES submissions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cards_submissionId ON cards(submissionId);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_submissions_orderNumber ON submissions(orderNumber);
  `);
}
