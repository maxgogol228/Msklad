const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// rate limit
const map = new Map();
app.use((req,res,next)=>{
  const ip=req.ip, now=Date.now();
  if(!map.has(ip)) map.set(ip,[]);
  const arr=map.get(ip).filter(t=>now-t<60000);
  arr.push(now);
  map.set(ip,arr);
  if(arr.length>100) return res.status(429).json({error:"Too many requests"});
  next();
});

// init
(async()=>{
await pool.query("CREATE TABLE IF NOT EXISTS items(id SERIAL PRIMARY KEY,name TEXT,quantity INT,image TEXT)");
await pool.query("CREATE TABLE IF NOT EXISTS devices(id SERIAL PRIMARY KEY,name TEXT)");
await pool.query("CREATE TABLE IF NOT EXISTS device_components(id SERIAL PRIMARY KEY,device_id INT,item_id INT,quantity INT)");
})();

app.get("/api/items", async(req,res)=>{
  const r=await pool.query("SELECT * FROM items");
  res.json(r.rows);
});

app.post("/api/items", async(req,res)=>{
  const {name,quantity,image}=req.body;
  await pool.query("INSERT INTO items(name,quantity,image) VALUES($1,$2,$3)",[name,quantity,image]);
  res.json({ok:true});
});

app.put("/api/items/:id", async(req,res)=>{
  const {name,quantity,image}=req.body;
  await pool.query("UPDATE items SET name=$1,quantity=$2,image=$3 WHERE id=$4",[name,quantity,image,req.params.id]);
  res.json({ok:true});
});

app.get("/api/devices", async(req,res)=>{
  const r=await pool.query("SELECT * FROM devices");
  res.json(r.rows);
});

app.post("/api/devices", async(req,res)=>{
  const {name,components}=req.body;
  const d=await pool.query("INSERT INTO devices(name) VALUES($1) RETURNING id",[name]);
  for(const c of components){
    await pool.query("INSERT INTO device_components(device_id,item_id,quantity) VALUES($1,$2,$3)",[d.rows[0].id,c.item_id,c.quantity]);
  }
  res.json({ok:true});
});

app.get("/api/device-components/:id", async(req,res)=>{
  const r=await pool.query("SELECT * FROM device_components WHERE device_id=$1",[req.params.id]);
  res.json(r.rows);
});

app.post("/api/devices/:id/assemble", async(req,res)=>{
  const comps=await pool.query("SELECT * FROM device_components WHERE device_id=$1",[req.params.id]);
  for(const c of comps.rows){
    await pool.query("UPDATE items SET quantity=quantity-$1 WHERE id=$2",[c.quantity,c.item_id]);
  }
  res.json({ok:true});
});

app.listen(process.env.PORT||10000);
