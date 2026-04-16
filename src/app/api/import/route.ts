import { NextRequest, NextResponse } from "next/server";
import {
  getSubmissionByOrderNumber,
  createSubmission,
  updateSubmission,
} from "@/lib/queries/submissions";
import { SubmissionStatus, ServiceLevel } from "@/types";

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
}

function mapServiceLevel(raw?: string): ServiceLevel {
  if (!raw) return "regular";
  const lower = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.includes("valuebulk") || lower.includes("bulk")) return "value_bulk";
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

    const results: { orderNumber: string; action: "created" | "updated" | "skipped"; id: string }[] = [];

    for (const sub of submissions) {
      if (!sub.orderNumber) continue;

      const existing = getSubmissionByOrderNumber(sub.orderNumber);

      if (existing) {
        // Update with any new data from the import
        const updates: Record<string, unknown> = {};
        if (sub.status) {
          const mapped = mapStatus(sub.status);
          updates.status = mapped;
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

        if (Object.keys(updates).length > 0) {
          updateSubmission(existing.id, updates);
          results.push({ orderNumber: sub.orderNumber, action: "updated", id: existing.id });
        } else {
          results.push({ orderNumber: sub.orderNumber, action: "skipped", id: existing.id });
        }
      } else {
        const created = createSubmission({
          orderNumber: sub.orderNumber,
          submissionNumber: sub.submissionNumber,
          serviceLevel: mapServiceLevel(sub.serviceLevel),
          status: mapStatus(sub.status),
          submittedDate: sub.submittedDate || new Date().toISOString().split("T")[0],
          receivedDate: sub.receivedDate,
          expectedReturnDate: sub.expectedReturnDate,
          totalDeclaredValue: sub.totalDeclaredValue ?? 0,
        });
        results.push({ orderNumber: sub.orderNumber, action: "created", id: created.id });
      }
    }

    const created = results.filter((r) => r.action === "created").length;
    const updated = results.filter((r) => r.action === "updated").length;

    return NextResponse.json({
      message: `Imported ${created} new, updated ${updated} existing`,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
