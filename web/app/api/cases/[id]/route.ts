import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) return NextResponse.json({ detail: "case not found" }, { status: 404 });
  return NextResponse.json(c);
}
