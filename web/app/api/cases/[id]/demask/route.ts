import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { appendAudit } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = checkApiKey(req);
  if (authError) return authError;

  await appendAudit(params.id, "api_gateway", "PII_DEMASK", { case_id: params.id, actor: "analyst" });
  return NextResponse.json({ case_id: params.id, demasked: true, note: "Full de-masking against KYC Document Store would occur here." });
}
