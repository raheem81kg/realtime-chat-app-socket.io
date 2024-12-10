const { RateLimiterMemory } = require("rate-limiter-flexible");

const addMessageLimit = new RateLimiterMemory({
   points: 2,
   duration: 1,
});

const addMemberLimit = new RateLimiterMemory({
   points: 2,
   duration: 1,
});

module.exports = {
   addMessageLimit,
   addMemberLimit,
};
