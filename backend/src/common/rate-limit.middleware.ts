import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
});

const WINDOW_SECONDS = 60;
const LIMIT = 100;

export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || req.ip || "unknown";
    const key = `rate:${ip}`;

    const ttl = await redis.ttl(key);
    const count = await redis.incr(key);
    if (ttl === -1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    const remaining = Math.max(0, LIMIT - count);

    res.setHeader("X-RateLimit-Limit", String(LIMIT));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (count > LIMIT) {
      const retryAfter = await redis.ttl(key);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ message: "Too many requests" });
      return;
    }

    return next();
  } catch (err) {
    // on error, allow request to proceed
    return next();
  }
}
