import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { Card, CreateCardInput } from "@/types";
import { updateSubmissionCardCount } from "./submissions";

export function getCardsBySubmission(submissionId: string): Card[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM cards WHERE submissionId = ? ORDER BY lineNumber ASC")
    .all(submissionId) as Card[];
}

export function getCardById(id: string): Card | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM cards WHERE id = ?").get(id) as Card | undefined) ??
    null
  );
}

export function getCardByCertNumber(certNumber: string): Card | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM cards WHERE certNumber = ?")
      .get(certNumber) as Card | undefined) ?? null
  );
}

export function createCard(input: CreateCardInput): Card {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO cards (id, submissionId, certNumber, lineNumber, year, brand, cardNumber, subject, variety, category, declaredValue, purchasePrice, estimatedGradedValue, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.submissionId,
    input.certNumber ?? null,
    input.lineNumber,
    input.year,
    input.brand,
    input.cardNumber,
    input.subject,
    input.variety ?? "",
    input.category ?? "",
    input.declaredValue ?? 0,
    input.purchasePrice ?? null,
    input.estimatedGradedValue ?? null,
    input.notes ?? "",
    now,
    now
  );

  updateSubmissionCardCount(input.submissionId);
  return db.prepare("SELECT * FROM cards WHERE id = ?").get(id) as Card;
}

export function updateCard(
  id: string,
  data: Partial<Omit<Card, "id" | "createdAt">>
): Card | null {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .get(id) as Card | undefined;
  if (!existing) return null;

  const fields = Object.keys(data).filter((k) => k !== "id" && k !== "createdAt");
  if (fields.length === 0) return existing;

  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);

  db.prepare(
    `UPDATE cards SET ${sets}, updatedAt = datetime('now') WHERE id = ?`
  ).run(...values, id);

  if ("declaredValue" in data) {
    updateSubmissionCardCount(existing.submissionId);
  }

  return db.prepare("SELECT * FROM cards WHERE id = ?").get(id) as Card;
}

export function deleteCard(id: string): boolean {
  const db = getDb();
  const card = db
    .prepare("SELECT submissionId FROM cards WHERE id = ?")
    .get(id) as { submissionId: string } | undefined;
  const result = db.prepare("DELETE FROM cards WHERE id = ?").run(id);
  if (result.changes > 0 && card) {
    updateSubmissionCardCount(card.submissionId);
  }
  return result.changes > 0;
}

export function getNextLineNumber(submissionId: string): number {
  const db = getDb();
  const result = db
    .prepare("SELECT MAX(lineNumber) as maxLine FROM cards WHERE submissionId = ?")
    .get(submissionId) as { maxLine: number | null };
  return (result.maxLine ?? 0) + 1;
}
