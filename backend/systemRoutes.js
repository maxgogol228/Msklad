
const router = require("express").Router();
const db = require("../models/db");

router.post("/save", async (req,res)=>{
  const data = {
    items: (await db.query("SELECT * FROM items")).rows,
    devices: (await db.query("SELECT * FROM devices")).rows,
    components: (await db.query("SELECT * FROM device_components")).rows
  };

  await db.query(
    "INSERT INTO snapshots(data, created_at) VALUES($1, NOW())",
    [data]
  );

  await db.query(
    "INSERT INTO logs(action) VALUES($1)",
    [req.user + " saved snapshot"]
  );

  res.json({ok:true});
});

router.get("/snapshots", async (req,res)=>{
  const r = await db.query("SELECT * FROM snapshots ORDER BY id DESC");
  res.json(r.rows);
});

module.exports = router;
