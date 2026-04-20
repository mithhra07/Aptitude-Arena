const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const dbDir = path.join(__dirname, "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "aptitude_arena.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite:", err.message);
  } else {
    console.log(`Connected to SQLite DB at ${dbPath}`);
  }
});

db.serialize(() => {
  // ALWAYS ensure users table exists FIRST
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  // OPTIONAL: migration (only if needed)
  db.all(`PRAGMA table_info(users)`, [], (_err, cols) => {
    const colNames = (cols || []).map((c) => c.name);

    if (colNames.includes("email") && !colNames.includes("username")) {
      db.run(`
        CREATE TABLE IF NOT EXISTS users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT
        )
      `);

      db.run(`
        INSERT OR IGNORE INTO users_new (username, password)
        SELECT LOWER(email), password FROM users
      `);

      db.run(`DROP TABLE users`);
      db.run(`ALTER TABLE users_new RENAME TO users`);
    }
  });

  // Other tables (keep as is)
  db.run(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      team_a_name TEXT NOT NULL,
      team_b_name TEXT NOT NULL,
      team_c_name TEXT NOT NULL,
      team_a_avatar TEXT NOT NULL,
      team_b_avatar TEXT NOT NULL,
      team_c_avatar TEXT NOT NULL,
      score_a INTEGER DEFAULT 0,
      score_b INTEGER DEFAULT 0,
      score_c INTEGER DEFAULT 0,
      winner TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamA TEXT,
      teamB TEXT,
      teamC TEXT,
      scoreA INTEGER,
      scoreB INTEGER,
      scoreC INTEGER,
      winner TEXT,
      created_by TEXT,
      team_count INTEGER,
      team_names TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Migration: add dashboard metadata columns and reset legacy rows once.
  db.all(`PRAGMA table_info(results)`, [], (err, cols) => {
    if (err) {
      console.error("Failed to inspect results table:", err.message);
      return;
    }

    const colNames = (cols || []).map((c) => c.name);
    const hasCreatedBy = colNames.includes("created_by");
    const hasTeamCount = colNames.includes("team_count");
    const hasTeamNames = colNames.includes("team_names");

    let migrationHappened = false;
    if (!hasCreatedBy) {
      migrationHappened = true;
      db.run(`ALTER TABLE results ADD COLUMN created_by TEXT`);
    }
    if (!hasTeamCount) {
      migrationHappened = true;
      db.run(`ALTER TABLE results ADD COLUMN team_count INTEGER`);
    }
    if (!hasTeamNames) {
      migrationHappened = true;
      db.run(`ALTER TABLE results ADD COLUMN team_names TEXT`);
    }

    // Requirement: clear old/dummy result rows once and keep only fresh matches.
    const purgeLegacy = () => {
      db.run(
        `
          DELETE FROM results
          WHERE COALESCE(TRIM(created_by), '') = ''
             OR COALESCE(team_count, 0) <= 0
             OR COALESCE(TRIM(team_names), '') = ''
        `,
        [],
        (deleteErr) => {
          if (deleteErr) {
            console.error("Failed to clear old results:", deleteErr.message);
          } else {
            console.log("Old/dummy results cleared.");
          }
        }
      );
      db.run(
        `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('results_cleanup_v2', 'done')`
      );
    };

    if (migrationHappened) {
      purgeLegacy();
      return;
    }

    db.get(
      `SELECT value FROM app_meta WHERE key = 'results_cleanup_v2'`,
      [],
      (metaErr, row) => {
        if (metaErr) {
          console.error("Failed to inspect app_meta:", metaErr.message);
          return;
        }
        if (!row || row.value !== "done") {
          purgeLegacy();
        }
      }
    );

    // Remove invalid dashboard rows (null winner, zero teams, missing names).
    db.run(
      `
        DELETE FROM results
        WHERE winner IS NULL
           OR TRIM(COALESCE(winner, '')) = ''
           OR COALESCE(team_count, 0) = 0
           OR team_names IS NULL
           OR TRIM(COALESCE(team_names, '')) = ''
           OR created_by IS NULL
           OR TRIM(COALESCE(created_by, '')) = ''
      `,
      [],
      (purgeErr) => {
        if (purgeErr) {
          console.error("Failed to purge invalid results:", purgeErr.message);
        }
      }
    );
  });
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post("/signup", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  const normalizedUsername = String(username).trim().toLowerCase();
  if (!normalizedUsername) {
    return res.status(400).json({ success: false, message: "Please provide a valid username." });
  }

  const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
  db.run(sql, [normalizedUsername, String(password)], function onInsert(err) {
    if (err) {
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ success: false, message: "Username already registered." });
      }
      console.error("Signup failed:", err.message);
      return res.status(500).json({ success: false, message: "Could not create account." });
    }

    return res.status(201).json({ success: true, message: "Registration successful. Please login." });
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  const normalizedUsername = String(username).trim().toLowerCase();
  const sql = `SELECT * FROM users WHERE username = ?`;

  db.get(sql, [normalizedUsername], (err, row) => {
    if (err) {
      console.error("Login failed:", err.message);
      return res.status(500).json({ success: false, message: "Could not login right now." });
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "User hasn't registered"
      });
    }

    if (row.password !== String(password)) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    return res.json({
      success: true,
      message: "Login successful"
    });
  });
});

// =========================
// ADMIN ENDPOINTS
// =========================
app.get("/admin/users", (_req, res) => {
  db.all(`SELECT username FROM users ORDER BY username ASC`, [], (err, rows) => {
    if (err) {
      console.error("Failed to fetch users:", err.message);
      return res.status(500).json({ success: false, message: "Could not fetch users." });
    }
    return res.json(rows.map((r) => r.username));
  });
});

app.get("/admin/results", (req, res) => {
  const usernameFilter = String(req.query.username || "").trim().toLowerCase();

  if (!usernameFilter) {
    return res.status(400).json({ success: false, message: "username query parameter is required." });
  }

  const sql = `
    SELECT id, winner, created_at, created_by, team_count, team_names
    FROM results
    WHERE created_by = ?
    ORDER BY id DESC
  `;

  db.all(sql, [usernameFilter], (err, rows) => {
    if (err) {
      console.error("Failed to fetch admin results:", err.message);
      return res.status(500).json({ success: false, message: "Could not fetch results." });
    }

    console.log("[/admin/results] rows for", usernameFilter, rows);
    return res.json(rows);
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "aptitude-arena-backend" });
});

app.get("/results", (_req, res) => {
  db.all(
    `
      SELECT id, teamA, teamB, teamC, scoreA, scoreB, scoreC, winner, created_at
      FROM results
      ORDER BY id DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Failed to fetch results:", err.message);
        return res.status(500).json({ error: "Could not fetch results." });
      }

      return res.json(rows);
    }
  );
});

app.post("/save-result", (req, res) => {
  console.log("[/save-result] req.body", req.body);

  const body = req.body || {};
  const created_by = String(body.created_by ?? body.createdBy ?? "").trim().toLowerCase();
  const team_count = Number(body.team_count ?? body.teamCount);
  const team_names_raw = body.team_names ?? body.teamNames;
  const winnerRaw = body.winner;
  const scoreAIn = body.scoreA ?? body.score_a;
  const scoreBIn = body.scoreB ?? body.score_b;
  const scoreCIn = body.scoreC ?? body.score_c;
  const teamA = body.teamA ?? body.team_a;
  const teamB = body.teamB ?? body.team_b;
  const teamC = body.teamC ?? body.team_c;
  const clientCreatedAt = body.created_at ?? body.createdAt;

  const parsedScoreA = Number(scoreAIn ?? 0);
  const parsedScoreB = Number(scoreBIn ?? 0);
  const parsedScoreC = Number(scoreCIn ?? 0);

  let team_names_str = "";
  if (typeof team_names_raw === "string") {
    team_names_str = team_names_raw.trim();
  } else if (Array.isArray(team_names_raw)) {
    team_names_str = team_names_raw.map((n) => String(n).trim()).filter(Boolean).join(", ");
  }

  const resolvedFromLegacy = [teamA, teamB, teamC].map((n) => String(n || "").trim()).filter(Boolean);
  if (!team_names_str && resolvedFromLegacy.length) {
    team_names_str = resolvedFromLegacy.join(", ");
  }

  const nameParts = team_names_str
    ? team_names_str.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let parsedTeamCount = Number.isFinite(team_count) && team_count > 0 ? Math.round(team_count) : nameParts.length;
  if (!parsedTeamCount && nameParts.length) {
    parsedTeamCount = nameParts.length;
  }

  const winner = String(winnerRaw ?? "").trim();
  const storedAt =
    typeof clientCreatedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(clientCreatedAt.trim())
      ? clientCreatedAt.trim()
      : new Date().toISOString();

  if (!created_by) {
    return res.status(400).json({ error: "created_by is required (logged-in username)." });
  }
  if (!parsedTeamCount || parsedTeamCount < 1) {
    return res.status(400).json({ error: "team_count must be a positive number." });
  }
  if (!team_names_str) {
    return res.status(400).json({ error: "team_names is required (comma-separated or array)." });
  }
  if (nameParts.length > 0 && parsedTeamCount !== nameParts.length) {
    return res.status(400).json({ error: "team_count must match the number of entries in team_names." });
  }
  if (!winner) {
    return res.status(400).json({ error: "winner is required (use team name or TIE)." });
  }
  if (Number.isNaN(parsedScoreA) || Number.isNaN(parsedScoreB) || Number.isNaN(parsedScoreC)) {
    return res.status(400).json({ error: "scoreA, scoreB, scoreC must be valid numbers." });
  }

  const colA = nameParts[0] || null;
  const colB = nameParts[1] || null;
  const colC = nameParts[2] || null;

  const sql = `
    INSERT INTO results (
      teamA, teamB, teamC, scoreA, scoreB, scoreC, winner, created_by, team_count, team_names, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      colA,
      colB,
      colC,
      parsedScoreA,
      parsedScoreB,
      parsedScoreC,
      winner,
      created_by,
      parsedTeamCount,
      team_names_str,
      storedAt
    ],
    function onInsert(err) {
      if (err) {
        console.error("Failed to save result:", err.message);
        return res.status(500).json({ error: "Could not save result." });
      }

      console.log("[/save-result] inserted id", this.lastID);
      return res.status(201).json({ resultId: this.lastID });
    }
  );
});

app.post("/api/sessions", (req, res) => {
  const { teamA, teamB, teamC, avatarA, avatarB, avatarC } = req.body || {};

  if (!teamA || !teamB || !teamC || !avatarA || !avatarB || !avatarC) {
    return res.status(400).json({ error: "Missing team or avatar details." });
  }

  const startedAt = new Date().toISOString();
  const sql = `
    INSERT INTO game_sessions (
      started_at, team_a_name, team_b_name, team_c_name, team_a_avatar, team_b_avatar, team_c_avatar
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [startedAt, teamA, teamB, teamC, avatarA, avatarB, avatarC], function onInsert(err) {
    if (err) {
      console.error("Failed to create session:", err.message);
      return res.status(500).json({ error: "Could not create game session." });
    }

    return res.status(201).json({ sessionId: this.lastID });
  });
});

app.post("/api/sessions/:id/events", (req, res) => {
  const sessionId = Number(req.params.id);
  if (!sessionId) {
    return res.status(400).json({ error: "Invalid session id." });
  }

  const {
    eventType,
    questionIndex = null,
    questionText = null,
    selectedOption = null,
    correctOption = null,
    awardedTeam = null
  } = req.body || {};

  if (!eventType) {
    return res.status(400).json({ error: "eventType is required." });
  }

  const createdAt = new Date().toISOString();
  const sql = `
    INSERT INTO game_events (
      session_id, event_type, question_index, question_text,
      selected_option, correct_option, awarded_team, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [sessionId, eventType, questionIndex, questionText, selectedOption, correctOption, awardedTeam, createdAt],
    function onInsert(err) {
      if (err) {
        console.error("Failed to store event:", err.message);
        return res.status(500).json({ error: "Could not save event." });
      }

      return res.status(201).json({ eventId: this.lastID });
    }
  );
});

app.patch("/api/sessions/:id/score", (req, res) => {
  const sessionId = Number(req.params.id);
  const { scoreA, scoreB, scoreC } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: "Invalid session id." });
  }

  if (
    typeof scoreA !== "number" ||
    typeof scoreB !== "number" ||
    typeof scoreC !== "number"
  ) {
    return res.status(400).json({ error: "scoreA, scoreB, scoreC must be numbers." });
  }

  const sql = `
    UPDATE game_sessions
    SET score_a = ?, score_b = ?, score_c = ?
    WHERE id = ?
  `;

  db.run(sql, [scoreA, scoreB, scoreC, sessionId], function onUpdate(err) {
    if (err) {
      console.error("Failed to update score:", err.message);
      return res.status(500).json({ error: "Could not update score." });
    }

    return res.json({ updated: this.changes > 0 });
  });
});

app.patch("/api/sessions/:id/complete", (req, res) => {
  const sessionId = Number(req.params.id);
  const { winner = null, scoreA, scoreB, scoreC } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: "Invalid session id." });
  }

  const endedAt = new Date().toISOString();
  const sql = `
    UPDATE game_sessions
    SET ended_at = ?, winner = ?, score_a = ?, score_b = ?, score_c = ?
    WHERE id = ?
  `;

  db.run(sql, [endedAt, winner, scoreA ?? 0, scoreB ?? 0, scoreC ?? 0, sessionId], function onUpdate(err) {
    if (err) {
      console.error("Failed to complete session:", err.message);
      return res.status(500).json({ error: "Could not close game session." });
    }

    return res.json({ updated: this.changes > 0 });
  });
});

app.get("/api/sessions", (_req, res) => {
  db.all(
    `
      SELECT *
      FROM game_sessions
      ORDER BY id DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Failed to fetch sessions:", err.message);
        return res.status(500).json({ error: "Could not fetch sessions." });
      }

      return res.json(rows);
    }
  );
});

app.get("/api/sessions/:id/events", (req, res) => {
  const sessionId = Number(req.params.id);
  if (!sessionId) {
    return res.status(400).json({ error: "Invalid session id." });
  }

  db.all(
    `
      SELECT *
      FROM game_events
      WHERE session_id = ?
      ORDER BY id ASC
    `,
    [sessionId],
    (err, rows) => {
      if (err) {
        console.error("Failed to fetch events:", err.message);
        return res.status(500).json({ error: "Could not fetch events." });
      }

      return res.json(rows);
    }
  );
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
