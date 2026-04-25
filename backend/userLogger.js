
const db = require("../models/db");

module.exports = async function(req,res,next){
  const user = req.headers["x-user"] || "unknown";
  await db.query(
    "INSERT INTO logs(action) VALUES($1)",
    [user + " -> " + req.method + " " + req.url]
  );
  req.user = user;
  next();
};
