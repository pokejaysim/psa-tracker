import { NextRequest, NextResponse } from "next/server";
import { getAllSubmissions, createSubmission } from "@/lib/queries/submissions";
import { SubmissionStatus, CreateSubmissionInput } from "@/types";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") as SubmissionStatus | null;
  const submissions = getAllSubmissions(status ?? undefined);
  return NextResponse.json(submissions);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateSubmissionInput;

  if (!body.orderNumber || !body.serviceLevel || !body.submittedDate) {
    return NextResponse.json(
      { error: "orderNumber, serviceLevel, and submittedDate are required" },
      { status: 400 }
    );
  }

  const submission = createSubmission(body);
  return NextResponse.json(submission, { status: 201 });
}
