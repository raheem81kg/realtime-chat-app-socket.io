const express = require("express");
const colors = require("colors");
require("dotenv").config();
const cors = require("cors");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./schema/schema");
const connectDb = require("./config/db");

const app = express();

// connect to Database
connectDb();

app.use(cors());

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
