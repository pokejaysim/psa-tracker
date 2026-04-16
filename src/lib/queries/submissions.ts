import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import {
  Submission,
  SubmissionWithCards,
  Card,
  CreateSubmissionInput,
  SubmissionStatus,
} from "@/types";

export function getAllSubmissions(status?: SubmissionStatus): Submission[] {
  const db = getDb();
  if (status) {
    return db
      .prepare("SELECT * FROM submissions WHERE status = ? ORDER BY updatedAt DESC")
      .all(status) as Submission[];
  }
  return db
    .prepare("SELECT * FROM submissions ORDER BY updatedAt DESC")
    .all() as Submission[];
}

export function getSubmissionById(id: string): SubmissionWithCards | null {
  const db = getDb();
  const submission = db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(id) as Submission | undefined;
  if (!submission) return null;

  const cards = db
    .prepare("SELECT * FROM cards WHERE submissionId = ? ORDER BY lineNumber ASC")
    .all(id) as Card[];

  return { ...submission, cards };
}

export function getSubmissionByOrderNumber(orderNumber: string): Submission | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM submissions WHERE orderNumber = ?")
      .get(orderNumber) as Submission | undefined) ?? null
  );
}

export function createSubmission(input: CreateSubmissionInput): Submission {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO submissions (id, orderNumber, submissionNumber, serviceLevel, status, submittedDate, receivedDate, expectedReturnDate, totalDeclaredValue, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.orderNumber,
    input.submissionNumber ?? null,
    input.serviceLevel,
    input.status ?? "preparing",
    input.submittedDate,
    input.receivedDate ?? null,
    input.expectedReturnDate ?? null,
    input.totalDeclaredValue ?? 0,
    input.notes ?? "",
    now,
    now
  );

  return getSubmissionById(id) as Submission;
}

export function updateSubmission(
  id: string,
  data: Partial<Omit<Submission, "id" | "createdAt">>
): Submission | null {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(id) as Submission | undefined;
  if (!existing) return null;

  const fields = Object.keys(data).filter((k) => k !== "id" && k !== "createdAt");
  if (fields.length === 0) return existing;

  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);

  db.prepare(
    `UPDATE submissions SET ${sets}, updatedAt = datetime('now') WHERE id = ?`
  ).run(...values, id);

  return db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(id) as Submission;
}

export function deleteSubmission(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM submissions WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getActiveSubmissions(): Submission[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM submissions WHERE status NOT IN ('delivered', 'preparing') ORDER BY updatedAt DESC`
    )
    .all() as Submission[];
}

export function updateSubmissionCardCount(submissionId: string) {
  const db = getDb();
  const result = db
    .prepare("SELECT COUNT(*) as count, COALESCE(SUM(declaredValue), 0) as total FROM cards WHERE submissionId = ?")
    .get(submissionId) as { count: number; total: number };

  db.prepare(
    "UPDATE submissions SET totalCards = ?, totalDeclaredValue = ?, updatedAt = datetime('now') WHERE id = ?"
  ).run(result.count, result.total, submissionId);
}
