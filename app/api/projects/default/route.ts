import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getOrCreateDefaultProject } from "@/lib/projects";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const project = await getOrCreateDefaultProject(session.user.id);
    return NextResponse.json({ project });
  } catch (error) {
    console.error("Failed to get default project:", error);
    return NextResponse.json(
      { error: "Failed to get default project" },
      { status: 500 }
    );
  }
}
