const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "scores.json");

async function readScores() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    // si no existe, crea carpeta/archivo
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, "[]", "utf8");
    return [];
  }
}

async function writeScores(arr) {
  await fs.writeFile(FILE, JSON.stringify(arr, null, 2), "utf8");
}

app.get("/scores", async (req, res) => {
  try {
    const arr = await readScores();
    arr.sort((a,b) => b.score - a.score);
    res.json(arr.slice(0, 100));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "error reading scores" });
  }
});

app.post("/scores", async (req, res) => {
  try {
    const { name, score, level, date } = req.body;
    // validations
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "invalid name" });
    }
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0) {
      return res.status(400).json({ error: "invalid score" });
    }
    const newEntry = {
      name: String(name).trim().slice(0, 40),
      score: Math.floor(score),
      level: typeof level === "number" ? Math.floor(level) : 1,
      date: date || new Date().toISOString()
    };
    const arr = await readScores();
    arr.push(newEntry);
    // optional: keep only latest N or sort
    arr.sort((a,b) => b.score - a.score);
    await writeScores(arr);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RunnerJS API listening on http://localhost:${PORT}`);
});
