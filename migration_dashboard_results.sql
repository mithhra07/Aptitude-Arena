-- Dashboard results migration (run once)
-- Ensures results schema for personal dashboard and drops legacy dummy rows.

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS results_new (
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
);

INSERT INTO results_new (
  id, teamA, teamB, teamC, scoreA, scoreB, scoreC, winner, created_by, team_count, team_names, created_at
)
SELECT
  id,
  teamA,
  teamB,
  teamC,
  scoreA,
  scoreB,
  scoreC,
  winner,
  COALESCE(created_by, ''),
  COALESCE(team_count, 0),
  COALESCE(team_names, ''),
  COALESCE(created_at, CURRENT_TIMESTAMP)
FROM results
WHERE COALESCE(TRIM(created_by), '') <> ''
  AND COALESCE(team_count, 0) > 0
  AND COALESCE(TRIM(team_names), '') <> '';

DROP TABLE results;
ALTER TABLE results_new RENAME TO results;

COMMIT;
PRAGMA foreign_keys = ON;

-- One-off cleanup: remove rows that break the dashboard (run manually if needed).
-- DELETE FROM results
-- WHERE winner IS NULL
--    OR team_count = 0
--    OR team_names IS NULL;
