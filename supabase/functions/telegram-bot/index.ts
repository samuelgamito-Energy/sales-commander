import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Configuraciones de los Agentes
const AGENTS = {
  "secretaria": {
    token: Deno.env.get('TELEGRAM_TOKEN_SECRETARIA'),
    name: "Secretaria Personal",
    instruction: `Eres la Secretaria Personal de Samuel. Eres eficiente, amable y organizada. 
    Tu misión principal es ayudar a Samuel con la gestión de tareas en Alumbra Commander.
    Si Samuel menciona una tarea, usa el formato: "Mete esto en commander: [Título] \n [Notas]".
    Conoces el organigrama de Alumbra y asignas responsables proactivamente.`
  },
  "alumbra": {
    token: Deno.env.get('TELEGRAM_TOKEN_ALUMBRA'),
    name: "Agente Alumbra",
    instruction: `Eres el Agente Alumbra ("Energía verde y con actitud"). 
    Tu tono es sincero, humano y profesional. 
    Conoces el Universo Alumbra (BESS, contratos BRP, cierres 2025). 
    Ayudas a Samuel con la estrategia corporativa.`
  },
  "powertrader": {
    token: Deno.env.get('TELEGRAM_TOKEN_POWERTRADER'),
    name: "Agente PowerTrader",
    instruction: `Eres el Agente PowerTrader. Tono: Trader profesional, analítico y directo.
    Usas semáforos para análisis y unidades en MWh. 
    Te enfocas en EnergyFlash, SEO y el mercado energético.`
  }
}

async function callGemini(prompt, systemInstruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    system_instruction: { parts: [{ text: systemInstruction }] }
  }
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No he podido procesar tu mensaje."
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

    const text = message.text.trim()
    const chatId = message.chat.id
    
    // Identificar qué bot está recibiendo el mensaje
    // Nota: Telegram no envía el token en el webhook, 
    // así que usamos un parámetro en la URL o verificamos por el ID del bot si fuera necesario.
    // Para simplificar, esta función detecta el bot por la URL param ?agent=...
    const url = new URL(req.url)
    const agentKey = url.searchParams.get('agent') || 'secretaria'
    const agent = AGENTS[agentKey]

    if (!agent) return new Response('Agent not found', { status: 404 })

    // Lógica especial: "Mete esto en commander"
    const TRIGGER = "Mete esto en commander"
    if (text.toLowerCase().includes(TRIGGER.toLowerCase())) {
      const content = text.slice(text.toLowerCase().indexOf(TRIGGER.toLowerCase()) + TRIGGER.length).trim()
      const lines = content.split('\n')
      const title = lines[0].trim() || 'Nueva Tarea'
      const notes = lines.slice(1).join('\n').trim() || 'Importado desde Telegram'

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { error } = await supabase.from('tasks').insert([{
        id: Date.now(),
        title: title,
        notes: notes,
        status: 'To Do',
        priority: 'Media',
        owner: 'Samuel Gamito',
        created: new Date().toISOString().split('T')[0],
        tags: [agent.name, 'Cloud']
      }])

      if (error) {
        await sendMessage(agent.token, chatId, `❌ Error inyectando tarea: ${error.message}`)
      } else {
        await sendMessage(agent.token, chatId, `✅ ¡Entendido! He inyectado "${title}" en el Commander desde la nube. 🚀`)
      }
      return new Response('OK', { status: 200 })
    }

    // Respuesta IA con Gemini
    const aiResponse = await callGemini(text, agent.instruction)
    await sendMessage(agent.token, chatId, aiResponse)

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 500 })
  }
})
