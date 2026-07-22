import { NextRequest, NextResponse } from "next/server";

export function checkApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.API_GATEWAY_KEY || "demo-key-change-me";
  const provided = req.headers.get("x-api-key");
  if (provided !== expected) {
    return NextResponse.json({ detail: "invalid or missing X-API-Key" }, { status: 401 });
  }
  return null;
}
