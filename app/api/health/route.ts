import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ app: "srs-tracker", status: "ok" });
}
