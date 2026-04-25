app.use(require("./middleware/userLogger"));
app.use("/api/devices", deviceRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/logs", logRoutes);
