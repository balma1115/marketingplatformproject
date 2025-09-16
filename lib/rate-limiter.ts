/**
 * Rate limiting implementation for API routes
 * Uses in-memory storage (can be replaced with Redis for production)
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface LoginAttemptStore {
  [email: string]: {
    attempts: number;
    lockedUntil?: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private loginAttempts: LoginAttemptStore = {};

  // General rate limiting
  private windowMs: number = 60 * 1000; // 1 minute window
  private maxRequests: number = 60; // 60 requests per minute

  // Login specific settings
  private maxLoginAttempts: number = 5;
  private loginLockoutDuration: number = 15 * 60 * 1000; // 15 minutes

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   */
  public async checkRateLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const record = this.store[identifier];

    if (!record || record.resetTime < now) {
      // Create new record or reset expired one
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return false; // Not rate limited
    }

    if (record.count >= this.maxRequests) {
      return true; // Rate limited
    }

    // Increment counter
    record.count++;
    return false; // Not rate limited
  }

  /**
   * Check login attempts for specific email
   */
  public async checkLoginAttempt(email: string): Promise<{
    allowed: boolean;
    remainingAttempts?: number;
    lockedUntil?: Date;
  }> {
    const now = Date.now();
    const record = this.loginAttempts[email];

    // Check if account is locked
    if (record?.lockedUntil && record.lockedUntil > now) {
      return {
        allowed: false,
        lockedUntil: new Date(record.lockedUntil),
      };
    }

    // Initialize or reset if lock expired
    if (!record || (record.lockedUntil && record.lockedUntil <= now)) {
      this.loginAttempts[email] = {
        attempts: 0,
      };
    }

    const attempts = this.loginAttempts[email].attempts;

    if (attempts >= this.maxLoginAttempts) {
      // Lock the account
      this.loginAttempts[email].lockedUntil = now + this.loginLockoutDuration;
      return {
        allowed: false,
        lockedUntil: new Date(now + this.loginLockoutDuration),
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.maxLoginAttempts - attempts,
    };
  }

  /**
   * Record a failed login attempt
   */
  public async recordFailedLogin(email: string): Promise<void> {
    if (!this.loginAttempts[email]) {
      this.loginAttempts[email] = { attempts: 0 };
    }
    this.loginAttempts[email].attempts++;
  }

  /**
   * Clear login attempts on successful login
   */
  public async clearLoginAttempts(email: string): Promise<void> {
    delete this.loginAttempts[email];
  }

  /**
   * Get remaining requests in current window
   */
  public getRemainingRequests(identifier: string): number {
    const record = this.store[identifier];
    if (!record || record.resetTime < Date.now()) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - record.count);
  }

  /**
   * Get reset time for rate limit
   */
  public getResetTime(identifier: string): Date | null {
    const record = this.store[identifier];
    if (!record || record.resetTime < Date.now()) {
      return null;
    }
    return new Date(record.resetTime);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean rate limit store
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });

    // Clean login attempts
    Object.keys(this.loginAttempts).forEach(email => {
      const record = this.loginAttempts[email];
      if (record.lockedUntil && record.lockedUntil < now) {
        delete this.loginAttempts[email];
      }
    });
  }

  /**
   * Reset rate limiter (for testing)
   */
  public reset(): void {
    this.store = {};
    this.loginAttempts = {};
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;

/**
 * Middleware helper for API routes
 */
export async function withRateLimit(
  request: Request,
  identifier?: string
): Promise<Response | null> {
  // Use IP address or custom identifier
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const id = identifier || ip;

  const isLimited = await rateLimiter.checkRateLimit(id);

  if (isLimited) {
    const resetTime = rateLimiter.getResetTime(id);
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter: resetTime?.toISOString()
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime?.toISOString() || '',
          'Retry-After': '60',
        },
      }
    );
  }

  // Add rate limit headers to response
  const remaining = rateLimiter.getRemainingRequests(id);
  const resetTime = rateLimiter.getResetTime(id);

  // Return null to indicate request should proceed
  // Headers will be added in the actual route handler
  return null;
}