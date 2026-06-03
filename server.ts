import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_FILE = path.join(process.cwd(), "simulations_db.json");
const SETTINGS_DB_FILE = path.join(process.cwd(), "settings_db.json");

// Initialize DB file if not exists
async function initDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify([]));
  }
  try {
    await fs.access(SETTINGS_DB_FILE);
  } catch {
    await fs.writeFile(SETTINGS_DB_FILE, JSON.stringify({}));
  }
}
initDb();

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/settings", async (req, res) => {
  try {
    const data = await fs.readFile(SETTINGS_DB_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read database" });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const newSettings = req.body;
    await fs.writeFile(SETTINGS_DB_FILE, JSON.stringify(newSettings, null, 2));
    res.json(newSettings);
  } catch (error) {
    res.status(500).json({ error: "Failed to write database" });
  }
});


app.get("/api/simulations", async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read database" });
  }
});

app.post("/api/simulations", async (req, res) => {
  try {
    const newSim = req.body;
    const data = await fs.readFile(DB_FILE, "utf-8");
    const sims = JSON.parse(data);
    
    newSim.updatedAt = new Date().toISOString();
    
    // Check if exists
    const index = sims.findIndex((s: any) => s.id === newSim.id);
    if (index >= 0) {
      sims[index] = newSim;
    } else {
      sims.push(newSim);
    }
    
    await fs.writeFile(DB_FILE, JSON.stringify(sims, null, 2));
    res.json(newSim);
  } catch (error) {
    res.status(500).json({ error: "Failed to write database" });
  }
});

app.delete("/api/simulations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DB_FILE, "utf-8");
    let sims = JSON.parse(data);
    
    sims = sims.filter((s: any) => s.id !== id);
    
    await fs.writeFile(DB_FILE, JSON.stringify(sims, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete from database" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
