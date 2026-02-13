INSERT INTO raids (raid, modifier) VALUES
  ('Halls of Testing Hourly', 5),
  ('Belijor', 3),
  ('Nelaarn', 3),
  ('Ajorek', 3),
  ('Yendilor', 3)
ON CONFLICT (raid) DO NOTHING;
