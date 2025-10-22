import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  const userId = session.user.id;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Fetch user statistics
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        plan: true,
        createdAt: true,
      },
    });

    // Total renders by type and status
    const renderStats = await prisma.render.groupBy({
      by: ["type", "status"],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Credit usage over time
    const creditTransactions = await prisma.creditTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        amount: true,
        type: true,
        reason: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group credit transactions by day
    const creditsByDay = creditTransactions.reduce((acc: any[], transaction) => {
      const date = transaction.createdAt.toISOString().split("T")[0];
      const existing = acc.find(item => item.date === date);

      if (existing) {
        if (transaction.type === "DEBIT") {
          existing.spent += Math.abs(transaction.amount);
        } else {
          existing.earned += transaction.amount;
        }
      } else {
        acc.push({
          date,
          spent: transaction.type === "DEBIT" ? Math.abs(transaction.amount) : 0,
          earned: transaction.type === "CREDIT" ? transaction.amount : 0,
        });
      }

      return acc;
    }, []);

    // Render activity by day
    const rendersByDay = await prisma.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT
        DATE(\"createdAt\") as date,
        COUNT(*)::int as count
      FROM \"Render\"
      WHERE \"userId\" = ${userId}
        AND \"createdAt\" >= ${startDate}
      GROUP BY DATE(\"createdAt\")
      ORDER BY date ASC
    `;

    // Project statistics
    const projectStats = await prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            renders: true,
          },
        },
      },
      orderBy: {
        renders: {
          _count: "desc",
        },
      },
      take: 5,
    });

    // Success rate
    const totalRenders = await prisma.render.count({
      where: { userId, createdAt: { gte: startDate } },
    });

    const successfulRenders = await prisma.render.count({
      where: {
        userId,
        status: "SUCCEEDED",
        createdAt: { gte: startDate },
      },
    });

    const successRate = totalRenders > 0
      ? ((successfulRenders / totalRenders) * 100).toFixed(1)
      : "0";

    // Total credits spent
    const totalCreditsSpent = await prisma.creditTransaction.aggregate({
      where: {
        userId,
        type: "DEBIT",
        createdAt: { gte: startDate },
      },
      _sum: {
        amount: true,
      },
    });

    // Usage events summary
    const usageEvents = await prisma.usageLog.groupBy({
      by: ["type"],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    return NextResponse.json({
      user: {
        currentCredits: user?.credits || 0,
        plan: user?.plan || "STARTER",
        memberSince: user?.createdAt,
      },
      summary: {
        totalRenders,
        successfulRenders,
        successRate: parseFloat(successRate),
        totalCreditsSpent: Math.abs(totalCreditsSpent._sum.amount || 0),
      },
      renderStats,
      creditsByDay,
      rendersByDay: rendersByDay.map(r => ({
        date: r.date,
        count: r.count,
      })),
      topProjects: projectStats.map(p => ({
        id: p.id,
        name: p.name,
        renderCount: p._count.renders,
      })),
      usageEvents: usageEvents.map(e => ({
        type: e.type,
        count: e._count,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
