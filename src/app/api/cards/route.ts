import { NextRequest, NextResponse } from "next/server";
import { getCardsBySubmission, createCard } from "@/lib/queries/cards";
import { CreateCardInput } from "@/types";

export async function GET(request: NextRequest) {
  const submissionId = request.nextUrl.searchParams.get("submissionId");
  if (!submissionId) {
    return NextResponse.json(
      { error: "submissionId query parameter is required" },
      { status: 400 }
    );
  }
  const cards = getCardsBySubmission(submissionId);
  return NextResponse.json(cards);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateCardInput;

  if (!body.submissionId || !body.subject) {
    return NextResponse.json(
      { error: "submissionId and subject are required" },
      { status: 400 }
    );
  }

  const card = createCard(body);
  return NextResponse.json(card, { status: 201 });
}
