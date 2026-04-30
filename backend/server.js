const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// роуты
app.use("/items", require("./routes/items"));
app.use("/consumables", require("./routes/consumables"));
app.use("/devices", require("./routes/devices"));
app.use("/snapshots", require("./routes/snapshots"));
app.use("/logs", require("./routes/logs"));

app.get("/", (req, res) => {
  res.send("API работает");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
