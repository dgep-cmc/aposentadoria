var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_promises = __toESM(require("fs/promises"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var DB_FILE = import_path.default.join(process.cwd(), "simulations_db.json");
var SETTINGS_DB_FILE = import_path.default.join(process.cwd(), "settings_db.json");
async function initDb() {
  try {
    await import_promises.default.access(DB_FILE);
  } catch {
    await import_promises.default.writeFile(DB_FILE, JSON.stringify([]));
  }
  try {
    await import_promises.default.access(SETTINGS_DB_FILE);
  } catch {
    await import_promises.default.writeFile(SETTINGS_DB_FILE, JSON.stringify({}));
  }
}
initDb();
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/settings", async (req, res) => {
  try {
    const data = await import_promises.default.readFile(SETTINGS_DB_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read database" });
  }
});
app.post("/api/settings", async (req, res) => {
  try {
    const newSettings = req.body;
    await import_promises.default.writeFile(SETTINGS_DB_FILE, JSON.stringify(newSettings, null, 2));
    res.json(newSettings);
  } catch (error) {
    res.status(500).json({ error: "Failed to write database" });
  }
});
app.get("/api/simulations", async (req, res) => {
  try {
    const data = await import_promises.default.readFile(DB_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read database" });
  }
});
app.post("/api/simulations", async (req, res) => {
  try {
    const newSim = req.body;
    const data = await import_promises.default.readFile(DB_FILE, "utf-8");
    const sims = JSON.parse(data);
    newSim.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const index = sims.findIndex((s) => s.id === newSim.id);
    if (index >= 0) {
      sims[index] = newSim;
    } else {
      sims.push(newSim);
    }
    await import_promises.default.writeFile(DB_FILE, JSON.stringify(sims, null, 2));
    res.json(newSim);
  } catch (error) {
    res.status(500).json({ error: "Failed to write database" });
  }
});
app.delete("/api/simulations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await import_promises.default.readFile(DB_FILE, "utf-8");
    let sims = JSON.parse(data);
    sims = sims.filter((s) => s.id !== id);
    await import_promises.default.writeFile(DB_FILE, JSON.stringify(sims, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete from database" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
