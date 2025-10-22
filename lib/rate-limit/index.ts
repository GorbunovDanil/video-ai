import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// In-memory fallback for development
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export type RateLimitConfig = {
  /**
   * Unique identifier for this rate limit (e.g., "image-generation", "api-general")
   */
  id: string;

  /**
   * Maximum number of requests allowed
   */
  limit: number;

  /**
   * Time window in seconds
   */
  window: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Image generation: 10 per hour per user
  IMAGE_GENERATION: {
    id: "image-gen",
    limit: 10,
    window: 3600, // 1 hour
  },

  // Video generation: 5 per hour per user (more expensive)
  VIDEO_GENERATION: {
    id: "video-gen",
    limit: 5,
    window: 3600, // 1 hour
  },

  // API calls: 100 per minute per user
  API_GENERAL: {
    id: "api-general",
    limit: 100,
    window: 60, // 1 minute
  },

  // Account actions: 20 per minute per user
  ACCOUNT_ACTIONS: {
    id: "account",
    limit: 20,
    window: 60, // 1 minute
  },
} as const;

/**
 * Check if a request should be rate limited
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `ratelimit:${config.id}:${identifier}`;
  const now = Date.now();
  const windowMs = config.window * 1000;

  try {
    if (redis) {
      // Use Redis for production
      const multi = redis.multi();
      multi.incr(key);
      multi.pexpire(key, windowMs);

      const results = await multi.exec();
      const count = results[0] as number;

      const remaining = Math.max(0, config.limit - count);
      const reset = Math.floor((now + windowMs) / 1000);

      return {
        success: count <= config.limit,
        limit: config.limit,
        remaining,
        reset,
      };
    } else {
      // Fallback to in-memory for development
      const stored = inMemoryStore.get(key);

      if (stored && stored.resetAt > now) {
        // Within window
        stored.count++;
        inMemoryStore.set(key, stored);

        const remaining = Math.max(0, config.limit - stored.count);

        return {
          success: stored.count <= config.limit,
          limit: config.limit,
          remaining,
          reset: Math.floor(stored.resetAt / 1000),
        };
      } else {
        // New window
        const resetAt = now + windowMs;
        inMemoryStore.set(key, { count: 1, resetAt });

        return {
          success: true,
          limit: config.limit,
          remaining: config.limit - 1,
          reset: Math.floor(resetAt / 1000),
        };
      }
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Math.floor((now + windowMs) / 1000),
    };
  }
}

/**
 * Helper to create rate limit headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

/**
 * Clean up old in-memory entries (for development)
 */
if (!redis) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of inMemoryStore.entries()) {
      if (value.resetAt < now) {
        inMemoryStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}
