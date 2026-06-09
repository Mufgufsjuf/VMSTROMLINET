const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "data", "db.json");

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

function ensureDb() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const salesId = uid();
    const accountingId = uid();
    const marketingId = uid();

    const defaultDb = {
      settings: {
        groupDeadline: "",
        knockoutDeadline: "",
        knockoutEnabled: false
      },
      departments: [
        { id: salesId, name: "Salg" },
        { id: accountingId, name: "Bogholderi" },
        { id: marketingId, name: "Marketing" }
      ],
      users: [
        {
          id: uid(),
          name: "Administrator",
          email: "admin",
          password: "JeasV.19.J",
          departmentId: salesId,
          role: "admin",
          avatar: "",
          createdAt: new Date().toISOString()
        }
      ],
      groupMatches: [],
      knockoutMatches: [],
      quizQuestions: [],
      predictions: {
        group: {},
        knockout: {},
        quiz: {}
      },
      results: {
        group: {},
        knockout: {},
        quiz: {}
      }
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function getUserFromHeader(db, req) {
  const userId = req.headers["x-user-id"];
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}

function requireUser(req, res, next) {
  const db = readDb();
  const user = getUserFromHeader(db, req);
  if (!user) return res.status(401).json({ error: "Ikke logget ind" });
  req.db = db;
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const db = readDb();
  const user = getUserFromHeader(db, req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Kun admin har adgang" });
  }
  req.db = db;
  req.user = user;
  next();
}

app.get("/api/bootstrap", (req, res) => {
  const db = readDb();
  res.json({
    settings: db.settings,
    departments: db.departments,
    users: db.users.map(sanitizeUser),
    groupMatches: db.groupMatches,
    knockoutMatches: db.knockoutMatches,
    quizQuestions: db.quizQuestions,
    predictions: db.predictions,
    results: db.results
  });
});

app.post("/api/login", (req, res) => {
  const db = readDb();
  const { identifier, password } = req.body;

  const user = db.users.find(
    (u) =>
      (u.email.toLowerCase() === String(identifier).toLowerCase() || u.email === identifier) &&
      u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Forkert login" });
  }

  res.json({ user: sanitizeUser(user) });
});

app.post("/api/register", (req, res) => {
  const db = readDb();
  const { name, email, password, departmentId } = req.body;

  if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).json({ error: "E-mail findes allerede" });
  }

  const user = {
    id: uid(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    password: String(password),
    departmentId: String(departmentId),
    role: "user",
    avatar: "",
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeDb(db);
  res.json({ user: sanitizeUser(user) });
});

app.put("/api/profile", requireUser, (req, res) => {
  const db = req.db;
  const user = db.users.find((u) => u.id === req.user.id);
  const { name, email, password, departmentId, avatar } = req.body;

  if (
    email &&
    db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === String(email).toLowerCase())
  ) {
    return res.status(400).json({ error: "E-mail bruges allerede" });
  }

  user.name = String(name || user.name).trim();
  user.email = String(email || user.email).trim().toLowerCase();
  user.departmentId = String(departmentId || user.departmentId);
  if (String(password || "").trim()) user.password = String(password);
  if (avatar) user.avatar = avatar;

  writeDb(db);
  res.json({ user: sanitizeUser(user) });
});

app.post("/api/admin/settings", requireAdmin, (req, res) => {
  req.db.settings = {
    groupDeadline: req.body.groupDeadline || "",
    knockoutDeadline: req.body.knockoutDeadline || "",
    knockoutEnabled: !!req.body.knockoutEnabled
  };
  writeDb(req.db);
  res.json({ ok: true });
});

app.post("/api/admin/departments", requireAdmin, (req, res) => {
  req.db.departments.push({ id: uid(), name: String(req.body.name).trim() });
  writeDb(req.db);
  res.json(req.db.departments);
});

app.delete("/api/admin/departments/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  if (req.db.users.some((u) => u.departmentId === id)) {
    return res.status(400).json({ error: "Afdelingen bruges af en bruger" });
  }
  req.db.departments = req.db.departments.filter((d) => d.id !== id);
  writeDb(req.db);
  res.json(req.db.departments);
});

app.post("/api/admin/group-matches", requireAdmin, (req, res) => {
  req.db.groupMatches.push({
    id: uid(),
    homeTeam: String(req.body.homeTeam).trim(),
    awayTeam: String(req.body.awayTeam).trim(),
    kickoff: String(req.body.kickoff),
    stage: String(req.body.stage).trim()
  });
  writeDb(req.db);
  res.json(req.db.groupMatches);
});

app.delete("/api/admin/group-matches/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  req.db.groupMatches = req.db.groupMatches.filter((m) => m.id !== id);
  delete req.db.results.group[id];
  writeDb(req.db);
  res.json(req.db.groupMatches);
});

app.post("/api/admin/group-results/:id", requireAdmin, (req, res) => {
  req.db.results.group[req.params.id] = {
    home: req.body.home,
    away: req.body.away
  };
  writeDb(req.db);
  res.json({ ok: true });
});

app.post("/api/admin/knockout-matches", requireAdmin, (req, res) => {
  req.db.knockoutMatches.push({
    id: uid(),
    slot: String(req.body.slot).trim(),
    round: String(req.body.round).trim(),
    labelA: String(req.body.labelA).trim(),
    labelB: String(req.body.labelB).trim()
  });
  writeDb(req.db);
  res.json(req.db.knockoutMatches);
});

app.delete("/api/admin/knockout-matches/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  req.db.knockoutMatches = req.db.knockoutMatches.filter((m) => m.id !== id);
  delete req.db.results.knockout[id];
  writeDb(req.db);
  res.json(req.db.knockoutMatches);
});

app.post("/api/admin/knockout-results/:id", requireAdmin, (req, res) => {
  req.db.results.knockout[req.params.id] = String(req.body.winner || "").trim();
  writeDb(req.db);
  res.json({ ok: true });
});

app.post("/api/admin/knockout-winner", requireAdmin, (req, res) => {
  req.db.results.knockout.__winner = String(req.body.winner || "").trim();
  writeDb(req.db);
  res.json({ ok: true });
});

app.post("/api/admin/quiz-questions", requireAdmin, (req, res) => {
  if (req.db.quizQuestions.length >= 13) {
    return res.status(400).json({ error: "Der kan højst være 13 spørgsmål" });
  }

  req.db.quizQuestions.push({
    id: uid(),
    question: String(req.body.question).trim(),
    options: req.body.options.map((o) => String(o).trim())
  });
  writeDb(req.db);
  res.json(req.db.quizQuestions);
});

app.delete("/api/admin/quiz-questions/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  req.db.quizQuestions = req.db.quizQuestions.filter((q) => q.id !== id);
  delete req.db.results.quiz[id];
  writeDb(req.db);
  res.json(req.db.quizQuestions);
});

app.post("/api/admin/quiz-results/:id", requireAdmin, (req, res) => {
  req.db.results.quiz[req.params.id] = String(req.body.answer || "").trim();
  writeDb(req.db);
  res.json({ ok: true });
});

app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  req.db.users = req.db.users.filter((u) => !(u.id === id && u.role !== "admin"));
  delete req.db.predictions.group[id];
  delete req.db.predictions.knockout[id];
  delete req.db.predictions.quiz[id];
  writeDb(req.db);
  res.json(req.db.users.map(sanitizeUser));
});

app.post("/api/admin/users/:id/reset-password", requireAdmin, (req, res) => {
  const user = req.db.users.find((u) => u.id === req.params.id);
  if (!user || user.role === "admin") {
    return res.status(404).json({ error: "Bruger ikke fundet" });
  }
  user.password = String(req.body.password || "");
  writeDb(req.db);
  res.json({ ok: true });
});

app.post("/api/predictions/group", requireUser, (req, res) => {
  req.db.predictions.group[req.user.id] = req.body || {};
  writeDb(req.db);
  res.json({ ok: true });
});

app.post("/api/predictions/knockout", requireUser, (req, res) => {
  req.db.predictions.knockout[req.user.id] = req.body || {};
  writeDb(req.db);
  res.json({ ok: true });
});

app.post("/api/predictions/quiz", requireUser, (req, res) => {
  req.db.predictions.quiz[req.user.id] = req.body || {};
  writeDb(req.db);
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureDb();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`VMSTRØMLINET kører på http://localhost:${PORT}`);
});
