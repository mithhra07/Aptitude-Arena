const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "data", "aptitude_arena.db");
const targetTables = ["users", "results", "game_sessions", "game_events"];

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

async function tableExists(db, tableName) {
  const row = await get(
    db,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [tableName]
  );
  return Boolean(row);
}

async function countRows(db, tableName) {
  const row = await get(db, `SELECT COUNT(*) AS count FROM ${tableName}`);
  return Number(row?.count || 0);
}

async function resetDatabase() {
  const db = new sqlite3.Database(dbPath);

  try {
    await run(db, "BEGIN TRANSACTION");

    for (const table of targetTables) {
      const exists = await tableExists(db, table);
      if (!exists) {
        console.log(`Skipped ${table} (table not found).`);
        continue;
      }

      await run(db, `DELETE FROM ${table}`);
      console.log(`Cleared table: ${table}`);
    }

    const sequenceExists = await tableExists(db, "sqlite_sequence");
    if (sequenceExists) {
      await run(
        db,
        `DELETE FROM sqlite_sequence WHERE name IN (${targetTables.map(() => "?").join(", ")})`,
        targetTables
      );
      console.log("Reset AUTOINCREMENT counters for target tables.");
    } else {
      console.log("No sqlite_sequence table found; AUTOINCREMENT reset not required.");
    }

    await run(db, "COMMIT");

    console.log("\nPost-reset row counts:");
    for (const table of targetTables) {
      const exists = await tableExists(db, table);
      if (!exists) {
        console.log(`- ${table}: table not found`);
        continue;
      }
      const count = await countRows(db, table);
      console.log(`- ${table}: ${count}`);
    }

    console.log(`\nDatabase reset complete: ${dbPath}`);
  } catch (err) {
    try {
      await run(db, "ROLLBACK");
    } catch (_) {
      // Ignore rollback errors.
    }
    console.error("Database reset failed:", err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

resetDatabase();
