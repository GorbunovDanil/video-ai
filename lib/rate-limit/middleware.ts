import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getRateLimitHeaders, type RateLimitConfig } from "./index";

/**
 * Rate limit middleware for API routes
 * Usage: await rateLimit(request, RATE_LIMITS.IMAGE_GENERATION)
 */
export async function rateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<{ success: true } | NextResponse> {
  // Get user identifier (prefer user ID, fallback to IP)
  let identifier: string;

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    identifier = session.user.id;
  } else {
    // Use IP address for unauthenticated requests
    const ip = request.headers.get("x-forwarded-for") ||
               request.headers.get("x-real-ip") ||
               "anonymous";
    identifier = `ip:${ip}`;
  }

  const result = await checkRateLimit(identifier, config);
  const headers = getRateLimitHeaders(result);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  // Success - return headers to be added to response
  return { success: true };
}

/**
 * Apply rate limit headers to a successful response
 */
export async function withRateLimitHeaders(
  response: NextResponse,
  identifier: string,
  config: RateLimitConfig
): Promise<NextResponse> {
  try {
    const result = await checkRateLimit(identifier, config);
    const headers = getRateLimitHeaders(result);

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  } catch (error) {
    console.error("Failed to add rate limit headers:", error);
  }

  return response;
}
