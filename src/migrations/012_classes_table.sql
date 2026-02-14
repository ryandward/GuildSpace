-- Normalized classes table: one row per class with standard abbreviation.
-- class_definitions still holds title progression (multiple rows per class).

CREATE TABLE IF NOT EXISTS classes (
  character_class TEXT PRIMARY KEY,
  abbreviation TEXT NOT NULL
);

INSERT INTO classes (character_class, abbreviation) VALUES
  ('Bard',          'BRD'),
  ('Cleric',        'CLR'),
  ('Druid',         'DRU'),
  ('Enchanter',     'ENC'),
  ('Magician',      'MAG'),
  ('Monk',          'MNK'),
  ('Necromancer',   'NEC'),
  ('Paladin',       'PAL'),
  ('Ranger',        'RNG'),
  ('Rogue',         'ROG'),
  ('Shadow Knight', 'SK'),
  ('Shaman',        'SHM'),
  ('Warrior',       'WAR'),
  ('Wizard',        'WIZ')
ON CONFLICT DO NOTHING;

-- FK constraints on existing tables (idempotent)
DO $$ BEGIN
  ALTER TABLE class_definitions ADD CONSTRAINT fk_classdefs_class
    FOREIGN KEY (character_class) REFERENCES classes(character_class);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE census ADD CONSTRAINT fk_census_class
    FOREIGN KEY (character_class) REFERENCES classes(character_class);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE class_lore ADD CONSTRAINT fk_classlore_class
    FOREIGN KEY (character_class) REFERENCES classes(character_class);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE class_roles ADD CONSTRAINT fk_classroles_class
    FOREIGN KEY (character_class) REFERENCES classes(character_class);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
