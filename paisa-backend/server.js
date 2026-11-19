const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const { MONGODB_URI="mongodb+srv://thestevesmith49_db_user:ZkCG2Q0XRDB43dHo@paisa.i8cyot5.mongodb.net", APP_PASSWORD="ZkCG2Q0XRDB43dHo", FRONTEND_URL="https://paisa-expense-tracker-paisa-fronten-tau.vercel.app/", DB_NAME = "paise", PORT = 3000 } = process.env;
if (!MONGODB_URI || !APP_PASSWORD) {
  console.error("Missing MONGODB_URI or APP_PASSWORD environment variable.");
  process.exit(1);
}

const app = express();
app.use(cors({
  origin: FRONTEND_URL ? FRONTEND_URL.split(",").map(s => s.trim().replace(/\/$/, "")) : true,
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-api-key"],
}));
app.use(express.json({ limit: "5mb" }));

const sha = s => crypto.createHash("sha256").update(String(s)).digest();
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api", (req, res, next) => {
  if (crypto.timingSafeEqual(sha(req.get("x-api-key") || ""), sha(APP_PASSWORD))) return next();
  res.status(401).json({ error: "unauthorized" });
});

let tx, settings;
const wrap = f => (req, res) => f(req, res).catch(e => { console.error(e); res.status(500).json({ error: "server error" }); });

function clean(t, id) {
  const amount = Number(t && t.amount);
  if (!t || !Number.isFinite(id) || !(amount > 0)) return null;
  if (!["in", "out"].includes(t.type) || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return null;
  return {
    _id: id, id, type: t.type, amount,
    cat: String(t.cat || "Other").slice(0, 40), pay: String(t.pay || "Cash").slice(0, 20),
    date: t.date, note: String(t.note || "").slice(0, 60),
  };
}
const strip = ({ _id, ...rest }) => rest;
const cleanSettings = s => ({ budget: Math.max(0, Number(s && s.budget) || 0), theme: ["auto", "light", "dark"].includes(s && s.theme) ? s.theme : "auto" });

app.get("/api/data", wrap(async (req, res) => {
  const [list, s] = await Promise.all([tx.find().toArray(), settings.findOne({ _id: "main" })]);
  res.json({ tx: list.map(strip), settings: s ? { budget: s.budget, theme: s.theme } : null });
}));

app.put("/api/tx/:id", wrap(async (req, res) => {
  const id = Number(req.params.id), doc = clean(req.body, id);
  if (!doc) return res.status(400).json({ error: "invalid transaction" });
  await tx.replaceOne({ _id: id }, doc, { upsert: true });
  res.json({ ok: true });
}));

app.delete("/api/tx/:id", wrap(async (req, res) => {
  await tx.deleteOne({ _id: Number(req.params.id) });
  res.json({ ok: true });
}));

app.put("/api/settings", wrap(async (req, res) => {
  await settings.replaceOne({ _id: "main" }, { _id: "main", ...cleanSettings(req.body) }, { upsert: true });
  res.json({ ok: true });
}));

app.delete("/api/all", wrap(async (req, res) => {
  await Promise.all([tx.deleteMany({}), settings.deleteMany({})]);
  res.json({ ok: true });
}));

MongoClient.connect(MONGODB_URI).then(client => {
  const db = client.db(DB_NAME);
  tx = db.collection("transactions");
  settings = db.collection("settings");
  app.listen(PORT, () => console.log("Paise API listening on " + PORT));
}).catch(e => { console.error("MongoDB connection failed:", e.message); process.exit(1); });
