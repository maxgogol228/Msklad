const router = require("express").Router();

router.get("/ping", (req,res)=>{
  res.json({message:"API работает"});
});

module.exports = router;
