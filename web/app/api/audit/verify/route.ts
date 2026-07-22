import { NextResponse } from "next/server";
import { verifyAuditChain } from "@/lib/db";

export async function GET() {
  const result = await verifyAuditChain();
  return NextResponse.json(result);
}
