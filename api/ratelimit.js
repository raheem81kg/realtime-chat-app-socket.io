import { RateLimiterMemory } from require("rate-limiter-flexible");

export const addMessageLimit = new RateLimiterMemory({
   points: 2,
   duration: 1,
});

export const addChat = new RateLimiterMemory({
   points: 2,
   duration: 1,
});
