-- 1. Crear la nueva tabla para el equipo
CREATE TABLE IF NOT EXISTS tasks_team (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'To Do',
  priority TEXT DEFAULT 'Media',
  owner TEXT,
  created DATE DEFAULT CURRENT_DATE,
  deadline DATE,
  tags TEXT[]
);

-- 2. Asegurar que los datos iniciales existan en la tabla del equipo (opcional)
-- INSERT INTO tasks_team SELECT * FROM tasks;

-- 3. Habilitar acceso anónimo (si lo tenías en la otra tabla)
ALTER TABLE tasks_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access on team table" ON tasks_team FOR ALL USING (true);
