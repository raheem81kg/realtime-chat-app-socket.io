const express = require("express");
const colors = require("colors");
const cors = require("cors");
require("dotenv").config({ path: "../.env" });
const { graphqlHTTP } = require("express-graphql");
const schema = require("./schema/schema");
const connectDb = require("./config/db");
const rateLimit = require("express-rate-limit");

const app = express();

// connect to Database
connectDb();

app.use(cors());

// Apply rate limiting middleware
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
});

app.use(limiter);

app.use(
    "/graphql",
    graphqlHTTP({
        schema,
        graphiql: process.env.NODE_ENV === "development",
    })
);

const PORT = process.env.API_PORT || 5000;
app.listen(PORT, console.log(`Server running on port ${PORT}`));

module.exports = app;
