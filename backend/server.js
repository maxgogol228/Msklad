const app = require("./app");
const { initDB } = require("./db/db");

const PORT = process.env.PORT || 5000;

initDB();

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
