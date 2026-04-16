import { NextRequest, NextResponse } from "next/server";
import {
  getSubmissionByOrderNumber,
  createSubmission,
  updateSubmission,
} from "@/lib/queries/submissions";
import {
  getCardsBySubmission,
  createCard,
  getNextLineNumber,
} from "@/lib/queries/cards";
import { SubmissionStatus, ServiceLevel } from "@/types";

interface ImportedCard {
  year?: string;
  brand?: string;
  cardNumber?: string;
  subject?: string;
  lineNumber?: number;
  declaredValue?: number;
}

interface ImportedSubmission {
  orderNumber: string;
  submissionNumber?: string;
  serviceLevel?: string;
  status?: string;
  submittedDate?: string;
  receivedDate?: string;
  expectedReturnDate?: string;
  totalCards?: number;
  totalDeclaredValue?: number;
  cards?: ImportedCard[];
}

function mapServiceLevel(raw?: string): ServiceLevel {
  if (!raw) return "regular";
  const lower = raw.toLowerCase().replace(/[^a-z_]/g, "");
  if (lower.includes("valuebulk") || lower === "value_bulk") return "value_bulk";
  if (lower.includes("valueplus")) return "value_plus";
  if (lower.includes("valuemax")) return "value_max";
  if (lower.includes("value")) return "value";
  if (lower.includes("walkthrough") || lower.includes("walk")) return "walk_through";
  if (lower.includes("superexpress") || lower.includes("super")) return "super_express";
  if (lower.includes("express")) return "express";
  return "regular";
}

function mapStatus(raw?: string): SubmissionStatus {
  if (!raw) return "submitted";
  const lower = raw.toLowerCase();
  if (lower.includes("preparing") || lower.includes("prep")) return "preparing";
  if (lower.includes("arrived") || lower.includes("received")) return "arrived";
  if (lower.includes("research") || lower.includes("identification")) return "research_id";
  if (lower.includes("grading")) return "grading";
  if (lower.includes("assembly")) return "assembly";
  if (lower.includes("grades ready") || lower.includes("grade")) return "grades_ready";
  if (lower.includes("qa") || lower.includes("quality")) return "qa_checks";
  if (lower.includes("processing") || lower.includes("completing") || lower.includes("packaging")) return "processing";
  if (lower.includes("shipped") || lower.includes("ship")) return "shipped";
  if (lower.includes("delivered") || lower.includes("complete")) return "delivered";
  if (lower.includes("submitted")) return "submitted";
  return "submitted";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const submissions: ImportedSubmission[] = Array.isArray(body) ? body : body.submissions;

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ error: "No submissions provided" }, { status: 400 });
    }

    const results: { orderNumber: string; action: "created" | "updated" | "skipped"; id: string; cardsAdded: number }[] = [];

    for (const sub of submissions) {
      if (!sub.orderNumber) continue;

      const existing = getSubmissionByOrderNumber(sub.orderNumber);

      if (existing) {
        const updates: Record<string, unknown> = {};
        if (sub.status) {
          updates.status = mapStatus(sub.status);
        }
        if (sub.submissionNumber && !existing.submissionNumber) {
          updates.submissionNumber = sub.submissionNumber;
        }
        if (sub.receivedDate && !existing.receivedDate) {
          updates.receivedDate = sub.receivedDate;
        }
        if (sub.expectedReturnDate && !existing.expectedReturnDate) {
          updates.expectedReturnDate = sub.expectedReturnDate;
        }
        if (sub.submittedDate && !existing.submittedDate) {
          updates.submittedDate = sub.submittedDate;
        }
        if (sub.totalCards && (!existing.totalCards || existing.totalCards === 0)) {
          updates.totalCards = sub.totalCards;
        }
        if (sub.serviceLevel) {
          updates.serviceLevel = mapServiceLevel(sub.serviceLevel);
        }

        // Import cards if provided and submission has none yet
        let cardsAdded = 0;
        if (sub.cards && sub.cards.length > 0) {
          const existingCards = getCardsBySubmission(existing.id);
          if (existingCards.length === 0) {
            cardsAdded = importCards(existing.id, sub.cards);
          }
        }

        if (Object.keys(updates).length > 0 || cardsAdded > 0) {
          if (Object.keys(updates).length > 0) {
            updateSubmission(existing.id, updates);
          }
          results.push({ orderNumber: sub.orderNumber, action: "updated", id: existing.id, cardsAdded });
        } else {
          results.push({ orderNumber: sub.orderNumber, action: "skipped", id: existing.id, cardsAdded: 0 });
        }
      } else {
        const created = createSubmission({
          orderNumber: sub.orderNumber,
          submissionNumber: sub.submissionNumber,
          serviceLevel: mapServiceLevel(sub.serviceLevel),
          status: mapStatus(sub.status),
          submittedDate: sub.submittedDate || sub.receivedDate || "",
          receivedDate: sub.receivedDate,
          expectedReturnDate: sub.expectedReturnDate,
          totalCards: sub.totalCards,
          totalDeclaredValue: sub.totalDeclaredValue ?? 0,
        });

        // Import cards
        let cardsAdded = 0;
        if (sub.cards && sub.cards.length > 0) {
          cardsAdded = importCards(created.id, sub.cards);
        }

        results.push({ orderNumber: sub.orderNumber, action: "created", id: created.id, cardsAdded });
      }
    }

    const created = results.filter((r) => r.action === "created").length;
    const updated = results.filter((r) => r.action === "updated").length;
    const totalCards = results.reduce((sum, r) => sum + r.cardsAdded, 0);

    return NextResponse.json({
      message: `Imported ${created} new, updated ${updated} existing, ${totalCards} cards added`,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function importCards(submissionId: string, cards: ImportedCard[]): number {
  let added = 0;
  for (const card of cards) {
    if (!card.year && !card.brand && !card.subject) continue;

    const lineNumber = card.lineNumber || getNextLineNumber(submissionId);

    createCard({
      submissionId,
      lineNumber,
      year: card.year || "",
      brand: card.brand || "",
      cardNumber: card.cardNumber || "",
      subject: card.subject || "",
      declaredValue: card.declaredValue ?? 0,
    });
    added++;
  }
  return added;
}
