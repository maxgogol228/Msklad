const express = require("express");
const cors = require("cors");

const systemRoutes = require("./routes/systemRoutes");
const userLogger = require("./middleware/userLogger");

const app = express();

app.use(cors());
app.use(express.json());
app.use(userLogger);

app.use("/api/system", systemRoutes);

module.exports = app;
