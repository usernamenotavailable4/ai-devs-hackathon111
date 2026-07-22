import { NextResponse } from "next/server";
import { listCases } from "@/lib/db";

export async function GET() {
  const cases = await listCases();
  return NextResponse.json({ cases });
}
