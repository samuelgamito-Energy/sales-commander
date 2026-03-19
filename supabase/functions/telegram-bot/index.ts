import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const AGENTS = {
  "secretaria": {
    token: Deno.env.get('TELEGRAM_TOKEN_SECRETARIA'),
    name: "Secretaria Personal",
    instruction: `Eres la Secretaria Personal de Samuel. Eres eficiente, amable y organizada. 
    Tu misión principal es ayudar a Samuel con la gestión de tareas enviándolas directamente a 'Alumbra Commander'.
    Tienes la herramienta 'crear_tarea_commander' para inyectar misiones. Úsala siempre que Samuel te pida recordar algo o crear una tarea.`
  },
  "alumbra": {
    token: Deno.env.get('TELEGRAM_TOKEN_ALUMBRA'),
    name: "Agente Alumbra",
    instruction: `Eres el Agente Alumbra ("Energía verde y con actitud"). Tono: Sincero, humano, cercano y con actitud. 
    Ayudas con la visión estratégica. Si detectas una acción necesaria, usa 'crear_tarea_commander'.`
  },
  "powertrader": {
    token: Deno.env.get('TELEGRAM_TOKEN_POWERTRADER'),
    name: "Agente PowerTrader",
    instruction: `Eres el Agente PowerTrader. Trader profesional, analítico y directo. 
    Si hay algo que Samuel deba revisar en el mercado, usa 'crear_tarea_commander' para dejarle la tarea.`
  }
}

// Definición de la herramienta para Gemini
const tools = [
  {
    function_declarations: [
      {
        name: "crear_tarea_commander",
        description: "Crea una nueva tarea en la aplicación Alumbra Commander.",
        parameters: {
          type: "object",
          properties: {
            titulo: { type: "string", description: "Título de la tarea." },
            notas: { type: "string", description: "Detalles adicionales." },
            prioridad: { type: "string", enum: ["Baja", "Media", "Alta", "Crítica"], description: "Urgencia de la tarea." },
            responsable: { type: "string", description: "Persona a cargo (ej: Fernando, Caroll, Alberto)." },
            tags: { type: "string", description: "Etiquetas separadas por comas (ej: IT, Ventas)." }
          },
          required: ["titulo"]
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const data = await response.json()
  const part = data.candidates?.[0]?.content?.parts?.[0]

  if (part?.functionCall) {
    const { name, args } = part.functionCall
    if (name === "crear_tarea_commander") {
      const result = await executeCreateTask(args, agent.name)
      // Confirmar a Telegram
      await sendMessage(agent.token, chatId, result)
      // Opcional: Podríamos volver a llamar a Gemini con el resultado, 
      // pero por simplicidad para Telegram devolvemos la respuesta directa.
      return
    }
  }

  const aiText = part?.text || "He recibido tu mensaje, pero no he podido generar una respuesta clara."
  await sendMessage(agent.token, chatId, aiText)
}

async function executeCreateTask(args, agentName) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const tagsArray = args.tags ? args.tags.split(',').map(t => t.trim()) : []
  tagsArray.push(agentName, 'Gemini')

  const { error } = await supabase.from('tasks').insert([{
    id: Date.now(),
    title: args.titulo,
    notes: args.notas || '',
    status: 'To Do',
    priority: args.prioridad || 'Media',
    owner: args.responsable || 'Samuel Gamito',
    created: new Date().toISOString().split('T')[0],
    tags: tagsArray
  }])

  if (error) return `❌ Error al crear la tarea: ${error.message}`
  return `✅ Tarea "${args.titulo}" inyectada con éxito en el Commander. 🚀`
}

async function sendMessage(botToken, chatId, text) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

    if (!agent || !agent.token) return new Response('Missing Agent Config', { status: 200 })

    await handleAgentRequest(agent, message.chat.id, message.text)

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('ERR', { status: 200 })
  }
})
