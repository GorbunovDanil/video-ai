import prisma from "./prisma";
import { logUsageEvent } from "./usage";
import { UsageEventType } from "@prisma/client";

/**
 * Check for suspicious activity patterns
 */
export async function detectSuspiciousActivity(userId: string): Promise<{
  isSuspicious: boolean;
  reason?: string;
}> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Check 1: Excessive failed renders in past hour
    const recentFailures = await prisma.render.count({
      where: {
        userId,
        status: "FAILED",
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentFailures > 10) {
      return {
        isSuspicious: true,
        reason: "Excessive failed renders detected",
      };
    }

    // Check 2: Suspicious credit activity (many refunds)
    const refunds = await prisma.creditTransaction.count({
      where: {
        userId,
        type: "CREDIT",
        reason: { contains: "refund" },
        createdAt: { gte: oneDayAgo },
      },
    });

    if (refunds > 5) {
      return {
        isSuspicious: true,
        reason: "Unusual refund pattern detected",
      };
    }

    // Check 3: Too many renders in short time (potential bot)
    const recentRenders = await prisma.render.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRenders > 50) {
      return {
        isSuspicious: true,
        reason: "Unusually high render rate detected",
      };
    }

    // Check 4: Duplicate prompts (potential spam)
    const recentPrompts = await prisma.render.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
      select: { prompt: true },
      take: 20,
    });

    const promptSet = new Set(recentPrompts.map(r => r.prompt));
    if (recentPrompts.length > 5 && promptSet.size < recentPrompts.length * 0.3) {
      return {
        isSuspicious: true,
        reason: "Duplicate prompt pattern detected",
      };
    }

    return { isSuspicious: false };
  } catch (error) {
    console.error("Suspicious activity detection failed:", error);
    // Fail open - don't block users if detection fails
    return { isSuspicious: false };
  }
}

/**
 * Check if user has sufficient credits and is not suspended
 */
export async function validateUserStatus(userId: string): Promise<{
  valid: boolean;
  reason?: string;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      return { valid: false, reason: "User not found" };
    }

    if (user.credits <= 0) {
      return { valid: false, reason: "Insufficient credits" };
    }

    return { valid: true };
  } catch (error) {
    console.error("User validation failed:", error);
    return { valid: false, reason: "Validation failed" };
  }
}

/**
 * Detect if a prompt might contain harmful content
 * This is a basic implementation - in production, use a proper content moderation API
 */
export function detectHarmfulContent(prompt: string): {
  harmful: boolean;
  reason?: string;
} {
  const lowerPrompt = prompt.toLowerCase();

  // List of prohibited patterns (basic implementation)
  const prohibitedPatterns = [
    /\b(nude|naked|nsfw|xxx|porn|sex)\b/i,
    /\b(violence|gore|blood|kill|death|murder)\b/i,
    /\b(hate|racist|nazi|terrorism)\b/i,
    /\b(child|minor|underage)\b.*\b(nude|sex|explicit)\b/i,
  ];

  for (const pattern of prohibitedPatterns) {
    if (pattern.test(lowerPrompt)) {
      return {
        harmful: true,
        reason: "Content policy violation detected",
      };
    }
  }

  return { harmful: false };
}

/**
 * Log suspicious activity for monitoring
 */
export async function logSuspiciousActivity(
  userId: string,
  reason: string,
  metadata?: any
): Promise<void> {
  try {
    await logUsageEvent(
      userId,
      UsageEventType.PROMPT_FILTERED, // Reuse existing event type
      {
        suspicious: true,
        reason,
        ...metadata,
      }
    );
  } catch (error) {
    console.error("Failed to log suspicious activity:", error);
  }
}

/**
 * Comprehensive abuse check before allowing render
 */
export async function performAbuseChecks(
  userId: string,
  prompt: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check 1: User status
  const userStatus = await validateUserStatus(userId);
  if (!userStatus.valid) {
    return { allowed: false, reason: userStatus.reason };
  }

  // Check 2: Content moderation
  const contentCheck = detectHarmfulContent(prompt);
  if (contentCheck.harmful) {
    await logSuspiciousActivity(userId, "Harmful content detected", { prompt });
    return { allowed: false, reason: contentCheck.reason };
  }

  // Check 3: Suspicious activity
  const activityCheck = await detectSuspiciousActivity(userId);
  if (activityCheck.isSuspicious) {
    await logSuspiciousActivity(userId, activityCheck.reason || "Suspicious activity");
    return { allowed: false, reason: activityCheck.reason };
  }

  return { allowed: true };
}
