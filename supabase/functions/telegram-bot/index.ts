import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Agent {
  token: string | undefined;
  name: string;
  instruction: string;
}

// Configuración de Agentes (Sincronizado con contexto_secretaria.md)
const AGENTS: Record<string, Agent> = {
  "secretaria": {
    token: Deno.env.get('TELEGRAM_TOKEN_SECRETARIA'),
    name: "Secretaria Personal",
    instruction: `Eres la Secretaria Personal de Samuel. Eficiente, amable y resolutiva. 
    Tu misión es gestionar archivos y tareas en 'Alumbra Commander'. 
    - Puedes crear misiones con 'crear_tarea_commander'.
    - Puedes EDITAR misiones existentes con 'editar_tarea_commander' (primero busca el ID con 'listar_tareas_commander').
    - Puedes borrar misiones con 'borrar_tarea_commander'.
    - Sé breve en respuestas de seguimiento basadas en el historial reciente.`
  },
  "alumbra": {
    token: Deno.env.get('TELEGRAM_TOKEN_ALUMBRA'),
    name: "Agente Alumbra",
    instruction: `Eres el Agente Alumbra ("Energía verde y con actitud").`
  },
  "powertrader": {
    token: Deno.env.get('TELEGRAM_TOKEN_POWERTRADER'),
    name: "Agente PowerTrader",
    instruction: `Eres el Agente PowerTrader. Profesional, analítico y directo.`
  }
}

const TOOLS = [
  {
    function_declarations: [
      {
        name: "crear_tarea_commander",
        description: "Crea una nueva tarea.",
        parameters: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            notas: { type: "string" },
            prioridad: { type: "string", enum: ["Baja", "Media", "Alta", "Crítica"] },
            responsable: { type: "string" },
            tags: { type: "string" }
          },
          required: ["titulo"]
        }
      },
      {
        name: "listar_tareas_commander",
        description: "Lista las últimas tareas para buscar IDs o ver estado.",
        parameters: {
          type: "object",
          properties: {
            responsable: { type: "string", description: "Opcional: Filtrar por responsable." }
          }
        }
      },
      {
        name: "editar_tarea_commander",
        description: "Edita una tarea existente por su ID.",
        parameters: {
          type: "object",
          properties: {
            id: { type: "number" },
            titulo: { type: "string" },
            notas: { type: "string" },
            prioridad: { type: "string" },
            responsable: { type: "string" }
          },
          required: ["id"]
        }
      },
      {
        name: "borrar_tarea_commander",
        description: "Borra una tarea por ID o coincidencia de título.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" }
          },
          required: ["query"]
        }
      }
    ]
  }
]

async function handleAgentRequest(agent: Agent, agentKey: string, chatId: number, text: string) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // 1. Cargar Historial
  const { data: historyData } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('chat_id', chatId)
    .eq('agent', agentKey)
    .order('created_at', { ascending: true })
    .limit(15)

  const history = historyData || []
  const currentMsg = { role: 'user', parts: [{ text: text }] }

  // 2. Llamada a Gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`
  const payload = {
    contents: [...history, currentMsg],
    system_instruction: { parts: [{ text: agent.instruction }] },
    tools: TOOLS
  }

  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const result = await response.json()
  const candidate = result.candidates?.[0]?.content
  let aiResponse = candidate?.parts?.[0]?.text || "Recibido."

  // 3. Procesar Tool Calls (si hay)
  if (candidate?.parts?.[0]?.functionCall) {
    const { name, args } = candidate.parts[0].functionCall
    let toolResult = ""
    
    if (name === "crear_tarea_commander") toolResult = await executeCreateTask(supabase, args as any, agent.name)
    else if (name === "listar_tareas_commander") toolResult = await executeListTasks(supabase, args as any)
    else if (name === "editar_tarea_commander") toolResult = await executeUpdateTask(supabase, args as any)
    else if (name === "borrar_tarea_commander") toolResult = await executeDeleteTask(supabase, args as any)
    
    // Si hubo herramienta, reportamos el resultado
    aiResponse = toolResult
  }

  // 4. Guardar en Historial (Usuario y Modelo)
  await supabase.from('chat_history').insert([
    { chat_id: chatId, agent: agentKey, role: 'user', content: currentMsg },
    { chat_id: chatId, agent: agentKey, role: 'model', content: { role: 'model', parts: [{ text: aiResponse }] } }
  ])

  if (agent.token) await sendMessage(agent.token, chatId, aiResponse)
}

// --- UTILIDADES ---

async function executeCreateTask(supabase: any, args: any, agentName: string) {
  const { error } = await supabase.from('tasks').insert([{
    id: Date.now(), title: args.titulo, notes: args.notas || '', status: 'To Do',
    priority: args.prioridad || 'Media', owner: args.responsable || 'Samuel Gamito',
    created: new Date().toISOString().split('T')[0], tags: [agentName, 'Cloud']
  }])
  return error ? `❌ Error: ${error.message}` : `✅ Inyectada: "${args.titulo}" 🚀`
}

async function executeListTasks(supabase: any, args: any) {
  let query = supabase.from('tasks').select('id, title, status, owner').order('created', { ascending: false }).limit(10)
  if (args.responsable) query = query.ilike('owner', `%${args.responsable}%`)
  const { data } = await query
  if (!data || data.length === 0) return "🔍 No he encontrado tareas pendientes."
  return "📋 **Tareas Recientes:**\n" + data.map((t: any) => `- [${t.id}] ${t.title} (${t.owner})`).join('\n')
}

async function executeUpdateTask(supabase: any, args: any) {
  const updateData: any = {}
  if (args.titulo) updateData.title = args.titulo
  if (args.notas) updateData.notes = args.notas
  if (args.prioridad) updateData.priority = args.prioridad
  if (args.responsable) updateData.owner = args.responsable
  const { error } = await supabase.from('tasks').update(updateData).eq('id', args.id)
  return error ? `❌ Error editando: ${error.message}` : `✅ Tarea ID ${args.id} actualizada.`
}

async function executeDeleteTask(supabase: any, args: any) {
  const { data } = await supabase.from('tasks').select('id, title').ilike('title', `%${args.query}%`)
  if (!data?.length) return `🔍 No existe nada parecido a "${args.query}".`
  if (data.length > 1) return `⚠️ Hay varias coincidencias para "${args.query}", por favor sé más específico.`
  const { error } = await supabase.from('tasks').delete().eq('id', data[0].id)
  return error ? `❌ Error: ${error.message}` : `🗑️ Tarea "${data[0].title}" eliminada.`
}

async function sendMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  })
}

Deno.serve(async (req) => {
  const payload = await req.json()
  const agentKey = new URL(req.url).searchParams.get('agent') || 'secretaria'
  if (payload.message?.text) {
    await handleAgentRequest(AGENTS[agentKey], agentKey, payload.message.chat.id, payload.message.text)
  }
  return new Response('OK')
})
