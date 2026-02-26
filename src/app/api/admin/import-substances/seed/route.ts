import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { isAdminAuthenticated } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const seedPath = path.join(process.cwd(), "data", "substance-seed.json");
  const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as unknown[];

  return NextResponse.json({ ok: true, items: seedData, count: seedData.length });
}
