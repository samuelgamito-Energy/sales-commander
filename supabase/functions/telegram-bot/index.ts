import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const AGENTS = {
  "secretaria": {
    token: Deno.env.get('TELEGRAM_TOKEN_SECRETARIA'),
    name: "Secretaria Personal",
    instruction: `Eres la Secretaria Personal de Samuel. Eficiente, amable y resolutiva. 
    Puedes crear misiones con 'crear_tarea_commander' y borrarlas con 'borrar_tarea_commander'.`
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

const tools = [
  {
    function_declarations: [
      {
        name: "crear_tarea_commander",
        description: "Crea una nueva tarea en Alumbra Commander.",
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
        name: "borrar_tarea_commander",
        description: "Borra una tarea existente buscando por similitud en el título.",
        parameters: {
          type: "object",
          properties: {
            query_titulo: { type: "string", description: "Palabra clave o título de la tarea a borrar." }
          },
          required: ["query_titulo"]
        }
      }
    ]
  }
]

async function handleAgentRequest(agent, chatId, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  const payload = {
    contents: [{ parts: [{ text: text }] }],
    system_instruction: { parts: [{ text: agent.instruction }] },
    tools: tools
  }

  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const data = await response.json()
  const part = data.candidates?.[0]?.content?.parts?.[0]

  if (part?.functionCall) {
    const { name, args } = part.functionCall
    if (name === "crear_tarea_commander") {
      const res = await executeCreateTask(args, agent.name)
      await sendMessage(agent.token, chatId, res)
      return
    }
    if (name === "borrar_tarea_commander") {
      const res = await executeDeleteTask(args)
      await sendMessage(agent.token, chatId, res)
      return
    }
  }

  const aiText = part?.text || "Recibido. ¿En qué más puedo ayudarte?"
  await sendMessage(agent.token, chatId, aiText)
}

async function executeCreateTask(args, agentName) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const tagsArray = args.tags ? args.tags.split(',').map(t => t.trim()) : []
  tagsArray.push(agentName, 'Cloud')
  const { error } = await supabase.from('tasks').insert([{
    id: Date.now(), title: args.titulo, notes: args.notas || '', status: 'To Do',
    priority: args.prioridad || 'Media', owner: args.responsable || 'Samuel Gamito',
    created: new Date().toISOString().split('T')[0], tags: tagsArray
  }])
  return error ? `❌ Error: ${error.message}` : `✅ Inyectada: "${args.titulo}" 🚀`
}

async function executeDeleteTask(args) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  // 1. Buscar coincidencia
  const { data, error: searchError } = await supabase
    .from('tasks')
    .select('id, title')
    .ilike('title', `%${args.query_titulo}%`)

  if (searchError) return `❌ Error buscando tarea: ${searchError.message}`
  if (!data || data.length === 0) return `🔍 No he encontrado ninguna tarea que coincida con "${args.query_titulo}".`
  if (data.length > 1) {
    const matches = data.map(t => `- ${t.title}`).join('\n')
    return `⚠️ He encontrado varias coincidencias. ¿Cuál quieres borrar?\n${matches}`
  }

  // 2. Borrar la única coincidencia
  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('id', data[0].id)

  return deleteError ? `❌ Error borrando: ${deleteError.message}` : `🗑️ Tarea "${data[0].title}" eliminada del tablero.`
}

async function sendMessage(botToken, chatId, text) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  })
}

Deno.serve(async (req) => {
  try {
    const { message } = await req.json()
    if (!message || !message.text) return new Response('OK', { status: 200 })
    const url = new URL(req.url)
    const agentKey = url.searchParams.get('agent') || 'secretaria'
    const agent = AGENTS[agentKey]
    if (!agent) return new Response('Bot error', { status: 200 })
    await handleAgentRequest(agent, message.chat.id, message.text)
    return new Response('OK', { status: 200 })
  } catch (err) {
    return new Response('ERR', { status: 200 })
  }
})
