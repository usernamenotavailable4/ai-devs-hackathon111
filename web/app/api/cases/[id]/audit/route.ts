import { NextRequest, NextResponse } from "next/server";
import { getAuditForCase } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const entries = await getAuditForCase(params.id);
  return NextResponse.json({ entries });
}
