/* 
  SCRIPT SQL PARA SUPABASE (v2 Idempotente)
  Copia y pega este código en el SQL Editor de tu proyecto en Supabase
*/

-- 1. Crear la tabla de tareas si no existe
CREATE TABLE IF NOT EXISTS public.tasks (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'To Do',
    priority TEXT DEFAULT 'Media',
    owner TEXT,
    created DATE DEFAULT CURRENT_DATE,
    deadline DATE,
    tags TEXT[] DEFAULT '{}'::TEXT[]
);

-- 2. Limpiar políticas previas para evitar el error 42710
DROP POLICY IF EXISTS "Permitir todo a usuarios con anon key" ON public.tasks;

-- 3. Habilitar fila de seguridad (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 4. Crear la política de acceso público (ANON)
CREATE POLICY "Permitir todo a usuarios con anon key" 
ON public.tasks FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. Insertar las 14 tareas iniciales (solo si no existen por su ID)
INSERT INTO public.tasks (id, title, notes, status, priority, owner, created, deadline, tags)
VALUES 
(1, 'Productos de precio fijo en campaña', 'Definir tabla de precios para la nueva campaña comercial.', 'To Do', 'Alta', 'Fernando Nieto', '2026-03-09', '2026-03-16', ARRAY['Comercial', 'Producto']),
(2, 'Pricing automatizado Gran Cuenta', 'Integrar con el sistema de mercado master para ofertas instantáneas.', 'To Do', 'Alta', 'Marcos (IT)', '2026-03-09', '2026-03-23', ARRAY['IT', 'Ventas']),
(3, 'Lanzamiento de producto GAS', 'Definir márgenes y estrategia de entrada en mercado gasista.', 'To Do', 'Media', 'Josep Novellas', '2026-03-09', '2026-04-01', ARRAY['Producto']),
(4, 'Negocio de CAEs', 'Certificados Ahorro Energético: Estudiar normativa y partners.', 'To Do', 'Media', 'Jesús Guerrero', '2026-03-09', '2026-03-30', ARRAY['Estrategia', 'Net Zero']),
(5, 'Producto de Baterías', 'Behind-the-meter para sector doméstico/industrial.', 'To Do', 'Alta', 'David Cañete', '2026-03-09', '2026-03-20', ARRAY['Renovables', 'Producto']),
(6, 'Rebajar documentación AAFF', 'Ya no pedir CIF ni factura para agilizar el alta.', 'To Do', 'Alta', 'Esther Peirat', '2026-03-09', '2026-03-13', ARRAY['Legal', 'Procesos']),
(7, 'Rebajar documentación Pyme', 'Asegurarnos de qué es lo mínimo estrictamente necesario.', 'To Do', 'Alta', 'Caroll Orduz', '2026-03-09', '2026-03-13', ARRAY['Operaciones', 'Pyme']),
(8, 'Eliminar documentación clientes EVAMA', 'Confianza plena en el canal EVAMA para omitir trámites.', 'To Do', 'Alta', 'Eva Maria Noya', '2026-03-09', '2026-03-12', ARRAY['Estrategia']),
(9, 'Automatización 100% Scoring', 'Eliminar el "botón" manual. El proceso debe ser automático.', 'To Do', 'Crítica', 'Marcos (IT)', '2026-03-09', '2026-03-18', ARRAY['IT', 'Operaciones']),
(10, 'Carga de costes Scoring', 'Cargar 1€/pedido a quien solicita el scoring.', 'To Do', 'Media', 'Alberto Ferrer', '2026-03-09', '2026-03-31', ARRAY['Finanzas']),
(11, 'Estudio Comercializadora Puente', 'Evaluar viabilidad y riesgos del proyecto.', 'To Do', 'Media', 'Samuel Gamito', '2026-03-09', '2026-04-15', ARRAY['Estrategia']),
(12, 'Compra de Leads', 'Revisar opciones con el equipo de Fernando.', 'To Do', 'Media', 'Fernando Nieto', '2026-03-09', '2026-03-20', ARRAY['Marketing', 'Ventas']),
(13, 'SLA ATR: 2-4 días', 'Requerimiento interno 2 días, máx 4 antes de protesta.', 'To Do', 'Media', 'Caroll Orduz', '2026-03-09', '2026-03-15', ARRAY['Operaciones']),
(14, 'IA Auditoría de llamadas', 'Evitar escucha manual de llamadas de WASABI.', 'To Do', 'Alta', 'Antigravity / IT', '2026-03-09', '2026-04-10', ARRAY['IA', 'IT'])
ON CONFLICT (id) DO NOTHING;
