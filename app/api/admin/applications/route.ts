import { NextResponse } from "next/server";
import { listApplications } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "ADMIN_PASSWORD is not configured." }, { status: 500 });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
    }

    const applications = await listApplications();
    return NextResponse.json({ applications });
  } catch {
    return NextResponse.json({ error: "Could not load applications." }, { status: 500 });
  }
}
