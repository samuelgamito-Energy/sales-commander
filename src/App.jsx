import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient.js';
import './index.css';

const INITIAL_TASKS = [
  { id: 1, title: 'Productos de precio fijo en campaña', notes: 'Definir tabla de precios para la nueva campaña comercial.', status: 'To Do', priority: 'Alta', owner: 'Fernando Nieto', created: '2026-03-09', deadline: '2026-03-16', tags: ['Comercial', 'Producto'] },
  { id: 2, title: 'Pricing automatizado Gran Cuenta', notes: 'Integrar con el sistema de mercado master para ofertas instantáneas.', status: 'To Do', priority: 'Alta', owner: 'Marcos (IT)', created: '2026-03-09', deadline: '2026-03-23', tags: ['IT', 'Ventas'] },
  { id: 3, title: 'Lanzamiento de producto GAS', notes: 'Definir márgenes y estrategia de entrada en mercado gasista.', status: 'To Do', priority: 'Media', owner: 'Josep Novellas', created: '2026-03-09', deadline: '2026-04-01', tags: ['Producto'] },
  { id: 4, title: 'Negocio de CAEs', notes: 'Certificados Ahorro Energético: Estudiar normativa y partners.', status: 'To Do', priority: 'Media', owner: 'Jesús Guerrero', created: '2026-03-09', deadline: '2026-03-30', tags: ['Estrategia', 'Net Zero'] },
  { id: 5, title: 'Producto de Baterías', notes: 'Behind-the-meter para sector doméstico/industrial.', status: 'To Do', priority: 'Alta', owner: 'David Cañete', created: '2026-03-09', deadline: '2026-03-20', tags: ['Renovables', 'Producto'] },
  { id: 6, title: 'Rebajar documentación AAFF', notes: 'Ya no pedir CIF ni factura para agilizar el alta.', status: 'To Do', priority: 'Alta', owner: 'Esther Peirat', created: '2026-03-09', deadline: '2026-03-13', tags: ['Legal', 'Procesos'] },
  { id: 7, title: 'Rebajar documentación Pyme', notes: 'Asegurarnos de qué es lo mínimo estrictamente necesario.', status: 'To Do', priority: 'Alta', owner: 'Caroll Orduz', created: '2026-03-09', deadline: '2026-03-13', tags: ['Operaciones', 'Pyme'] },
  { id: 8, title: 'Eliminar documentación clientes EVAMA', notes: 'Confianza plena en el canal EVAMA para omitir trámites.', status: 'To Do', priority: 'Alta', owner: 'Eva Maria Noya', created: '2026-03-09', deadline: '2026-03-12', tags: ['Estrategia'] },
  { id: 9, title: 'Automatización 100% Scoring', notes: 'Eliminar el "botón" manual. El proceso debe ser automático.', status: 'To Do', priority: 'Crítica', owner: 'Marcos (IT)', created: '2026-03-09', deadline: '2026-03-18', tags: ['IT', 'Operaciones'] },
  { id: 10, title: 'Carga de costes Scoring', notes: 'Cargar 1€/pedido a quien solicita el scoring.', status: 'To Do', priority: 'Media', owner: 'Alberto Ferrer', created: '2026-03-09', deadline: '2026-03-31', tags: ['Finanzas'] },
  { id: 11, title: 'Estudio Comercializadora Puente', notes: 'Evaluar viabilidad y riesgos del proyecto.', status: 'To Do', priority: 'Media', owner: 'Samuel Gamito', created: '2026-03-09', deadline: '2026-04-15', tags: ['Estrategia'] },
  { id: 12, title: 'Compra de Leads', notes: 'Revisar opciones con el equipo de Fernando.', status: 'To Do', priority: 'Media', owner: 'Fernando Nieto', created: '2026-03-09', deadline: '2026-03-20', tags: ['Marketing', 'Ventas'] },
  { id: 13, title: 'SLA ATR: 2-4 días', notes: 'Requerimiento interno 2 días, máx 4 antes de protesta.', status: 'To Do', priority: 'Media', owner: 'Caroll Orduz', created: '2026-03-09', deadline: '2026-03-15', tags: ['Operaciones'] },
  { id: 14, title: 'IA Auditoría de llamadas', notes: 'Evitar escucha manual de llamadas de WASABI.', status: 'To Do', priority: 'Alta', owner: 'Antigravity / IT', created: '2026-03-09', deadline: '2026-04-10', tags: ['IA', 'IT'] }
];

function App() {
  const [session, setSession] = useState(null);
  const [tasks, setTasks] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('conectando'); 
  const table = import.meta.env.VITE_SUPABASE_TABLE || 'tasks';
  const appTitle = import.meta.env.VITE_APP_TITLE || 'Alumbra Commander';

  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para los filtros
  const [filterPriority, setFilterPriority] = useState('Todas');
  const [filterOwner, setFilterOwner] = useState('Todos');
  const [filterTag, setFilterTag] = useState('Todas');

  // Manejo de Sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // Carga de Tareas desde Supabase (Siempre al arrancar)
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setTasks(data);
        setDbStatus('online');
      } else {
        // Si la DB está vacía, intentamos poblarla con los iniciales automáticamente
        console.log('Base de datos vacía, poblando con INITIAL_TASKS...');
        const { error: seedError } = await supabase.from('tasks').upsert(INITIAL_TASKS);
        if (seedError) throw seedError;
        setTasks(INITIAL_TASKS);
        setDbStatus('online');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error.message);
      setDbStatus('error');
      // En caso de error total de conexión, mostramos los iniciales como fallback visual
      setTasks(INITIAL_TASKS); 
    } finally {
      setLoading(false);
    }
  };

  // Cálculo dinámico de opciones para los filtros
  const owners = useMemo(() => ['Todos', ...new Set(tasks.map(t => t.owner).filter(Boolean))], [tasks]);
  const tags = useMemo(() => ['Todas', ...new Set(tasks.flatMap(t => t.tags).filter(Boolean))], [tasks]);
  const priorities = ['Todas', 'Baja', 'Media', 'Alta', 'Crítica'];

  // Lógica de filtrado
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchPriority = filterPriority === 'Todas' || task.priority === filterPriority;
      const matchOwner = matchOwnerInternal(task.owner, filterOwner);
      const matchTag = filterTag === 'Todas' || (task.tags && task.tags.includes(filterTag));
      return matchPriority && matchOwner && matchTag;
    });
  }, [tasks, filterPriority, filterOwner, filterTag]);

  function matchOwnerInternal(taskOwner, filter) {
    if (filter === 'Todos') return true;
    return taskOwner === filter;
  }

  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      // Intentar guardar en Supabase primero
      const { error } = await supabase
        .from(table)
        .upsert(editingTask);
      
      if (error) {
        console.warn('Error persistiendo en Supabase, guardando localmente:', error.message);
        // Fallback local si falla la red o permisos
        const exists = tasks.find(t => t.id === editingTask.id);
        if (exists) {
          setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t));
        } else {
          setTasks([...tasks, editingTask]);
        }
      } else {
        fetchTasks();
      }
    } catch (error) {
      alert('Error crítico al guardar: ' + error.message);
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleUpdateStatus = async (task, newStatus) => {
    const updatedTask = { ...task, status: newStatus };
    
    // Actualización optimista de la UI
    setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));

    // Actualización en Supabase
    try {
      // Forzamos el upsert con referencia explícita al ID
      const { data: updatedData, error } = await supabase
        .from(table)
        .upsert(updatedTask, { onConflict: 'id' })
        .select();
      
      if (error) throw error;
      console.log('✅ Cambio persistido en Supabase:', updatedData);
    } catch (error) {
      console.error('❌ Error persistiendo en Supabase:', error.message);
      alert('¡ERROR DE PERSISTENCIA! El cambio NO se ha guardado en la nube: ' + error.message);
      // Revertir a la versión "oficial" del servidor
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta misión? Esta acción no se puede deshacer.')) return;

    // Actualización optimista
    setTasks(tasks.filter(t => t.id !== taskId));

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      console.log('✅ Tarea eliminada de Supabase');
    } catch (error) {
      console.error('❌ Error eliminando de Supabase:', error.message);
      alert('Error al eliminar: ' + error.message);
      fetchTasks();
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  if (!session && !loading && import.meta.env.PROD) {
    return (
      <div className="login-screen">
        <form className="login-card" onSubmit={handleLogin}>
          <img src="/logo.svg" alt="Alumbra" style={{ height: '60px', marginBottom: '2rem' }} />
          <h2>Acceso DG</h2>
          <input name="email" type="email" placeholder="Email corporativo" required />
          <input name="password" type="password" placeholder="Contraseña" required />
          <button type="submit" className="btn btn-primary">Entrar en Command Center</button>
          <p style={{ fontSize: '0.7rem', marginTop: '1rem', color: '#888' }}>Acceso restringido a Dirección General. v0.1.7</p>
        </form>
      </div>
    );
  }

  const COLUMNS = ['To Do', 'In Progress', 'Done'];

  return (
    <div className="app">
      <header>
        <div className="logo-container">
          <img src="/logo.svg" alt="Alumbra Logo" />
          <h1 className="app-main-title">{appTitle}</h1>
          <div className="db-indicator" title={`Estado DB: ${dbStatus}`}>
            <span className={`dot ${dbStatus}`}></span>
            <span className="db-text">{dbStatus === 'online' ? 'NUBE OK' : dbStatus === 'error' ? 'MODO LOCAL' : 'CONECTANDO...'} (v0.1.7)</span>
          </div>
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <label>Prioridad</label>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Responsable</label>
            <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Etiqueta</label>
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)}>
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => {
            setEditingTask({ id: Date.now(), title: '', notes: '', status: 'To Do', priority: 'Media', owner: 'Samuel Gamito', created: new Date().toISOString().split('T')[0], deadline: '', tags: [] });
            setIsModalOpen(true);
          }}>+ Nueva Tarea</button>
          <div className="owner-avatar">SG</div>
          {session && <button onClick={() => supabase.auth.signOut()} style={{ fontSize: '0.6rem', color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Salir</button>}
        </div>
      </header>

      <main className="main-container">
        {COLUMNS.map(col => (
          <div key={col} className="kanban-col">
            <div className="col-header">
              <h2>{col}</h2>
              <span className="count-badge">{filteredTasks.filter(t => t.status === col).length}</span>
            </div>
            <div className="task-scroll">
              {filteredTasks.filter(t => t.status === col).map(task => (
                <div key={task.id} className="task-card" onClick={() => { setEditingTask(task); setIsModalOpen(true); }}>
                  <button className="delete-btn-card" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} title="Eliminar tarea">×</button>
                  <div className="task-header">
                    <span className={`tag tag-priority-${task.priority}`}>{task.priority}</span>
                    <div className="tags-list">
                      {task.tags && task.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                  </div>
                  <h3 className="task-title">{task.title}</h3>
                  {task.notes && <p className="task-notes">{task.notes}</p>}
                  <div className="task-dates">
                    <div className="date-row">
                      <span>Inicio: {task.created}</span>
                      {task.deadline && <span className="deadline-urgent">Fin: {task.deadline}</span>}
                    </div>
                  </div>
                  <div className="task-footer">
                    <div className="move-buttons">
                      {col !== 'To Do' && <button className="btn-small" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task, 'To Do') }}>TODO</button>}
                      {col !== 'In Progress' && <button className="btn-small" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task, 'In Progress') }}>DOING</button>}
                      {col !== 'Done' && <button className="btn-small btn-done" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task, 'Done') }}>HECHO</button>}
                    </div>
                    <div className="owner-avatar small" title={task.owner}>
                      {task.owner ? task.owner.split(' ').map(n => n[0]).join('') : '?'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {isModalOpen && (
        <div className="modal">
          <form className="modal-content simpler-form" onSubmit={handleSaveTask}>
            <h2 className="modal-title">Gestión de Tarea</h2>
            <div className="form-group"><label>Título</label><input autoFocus required value={editingTask.title} onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} /></div>
            <div className="form-group"><label>Notas</label><textarea rows="2" value={editingTask.notes} onChange={e => setEditingTask({ ...editingTask, notes: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>Prioridad</label><select value={editingTask.priority} onChange={e => setEditingTask({ ...editingTask, priority: e.target.value })}><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></div>
              <div className="form-group"><label>Estado</label><select value={editingTask.status} onChange={e => setEditingTask({ ...editingTask, status: e.target.value })}><option>To Do</option><option>In Progress</option><option>Done</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Deadline</label><input type="date" value={editingTask.deadline} onChange={e => setEditingTask({ ...editingTask, deadline: e.target.value })} /></div>
              <div className="form-group"><label>Responsable</label><input value={editingTask.owner} onChange={e => setEditingTask({ ...editingTask, owner: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Tags</label><input value={editingTask.tags ? editingTask.tags.join(', ') : ''} onChange={e => setEditingTask({ ...editingTask, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '') })} /></div>
            <div className="modal-footer">
              {editingTask.id && <button type="button" className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => handleDeleteTask(editingTask.id)}>Eliminar</button>}
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
