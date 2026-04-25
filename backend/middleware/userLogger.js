module.exports = (req,res,next)=>{
  const user = req.headers["x-user"] || "unknown";
  console.log(user + " -> " + req.method + " " + req.url);
  next();
};
