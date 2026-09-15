import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { DATA_VERSION } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, db: "up", data_version: DATA_VERSION });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, db: "down", error: msg.slice(0, 300) },
      { status: 503 }
    );
  }
}
