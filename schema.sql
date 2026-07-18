CREATE TABLE IF NOT EXISTS characters (
  player_id TEXT PRIMARY KEY,
  display_name TEXT,
  level INTEGER,
  gold INTEGER,
  current_chunk TEXT,
  last_sync DATETIME,
  custom_color TEXT,
  custom_scale REAL,
  torso_visible BOOLEAN,
  morph_targets TEXT,
  head_style INTEGER
);

CREATE TABLE IF NOT EXISTS terrain_regions (
  region_id TEXT PRIMARY KEY,
  data TEXT,
  last_updated DATETIME
);
