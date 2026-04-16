import { NextResponse } from "next/server";
import { getActiveSubmissions, updateSubmission } from "@/lib/queries/submissions";
import { getOrderProgress, getSubmissionProgress } from "@/lib/psa-api";
import { PSA_STEP_MAP, getStatusIndex } from "@/lib/constants";
import { SubmissionStatus } from "@/types";

export async function POST() {
  try {
    const activeSubmissions = getActiveSubmissions();
    const results: { id: string; orderNumber: string; status: string; synced: boolean; error?: string }[] = [];

    for (const sub of activeSubmissions) {
      try {
        let progress = null;

        if (sub.orderNumber) {
          progress = await getOrderProgress(sub.orderNumber);
        }
        if (!progress && sub.submissionNumber) {
          progress = await getSubmissionProgress(sub.submissionNumber);
        }

        if (!progress) {
          results.push({
            id: sub.id,
            orderNumber: sub.orderNumber,
            status: sub.status,
            synced: false,
            error: "No progress data from PSA",
          });
          continue;
        }

        // Find highest completed step
        const completedSteps = (progress.orderProgressSteps || [])
          .filter((s) => s.completed)
          .map((s) => s.step);

        const highestStep = completedSteps.length > 0 ? Math.max(...completedSteps) : -1;
        const newStatus: SubmissionStatus | undefined = PSA_STEP_MAP[highestStep];

        const updates: Record<string, unknown> = {
          lastApiSync: new Date().toISOString(),
        };

        // Only advance status forward, never regress
        if (newStatus && getStatusIndex(newStatus) > getStatusIndex(sub.status)) {
          updates.status = newStatus;
        }

        if (progress.shipTrackingNumber) {
          updates.shipTrackingNumber = progress.shipTrackingNumber;
        }
        if (progress.shipCarrier) {
          updates.shipCarrier = progress.shipCarrier;
        }

        // Set receivedDate from the arrived step if not already set
        if (!sub.receivedDate) {
          const arrivedStep = (progress.orderProgressSteps || []).find(
            (s) => s.step === 0 && s.completed && s.completedDate
          );
          if (arrivedStep?.completedDate) {
            updates.receivedDate = arrivedStep.completedDate;
          }
        }

        updateSubmission(sub.id, updates);

        results.push({
          id: sub.id,
          orderNumber: sub.orderNumber,
          status: (updates.status as string) ?? sub.status,
          synced: true,
        });
      } catch (error) {
        results.push({
          id: sub.id,
          orderNumber: sub.orderNumber,
          status: sub.status,
          synced: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ results, syncedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
