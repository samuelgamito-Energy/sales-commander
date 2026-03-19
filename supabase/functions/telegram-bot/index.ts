import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const AGENTS = {
  "secretaria": {
    token: Deno.env.get('TELEGRAM_TOKEN_SECRETARIA'),
    name: "Secretaria Personal",
    instruction: `# Misión: Secretaria Personal de Samuel
    Eres ultra eficiente, amable, organizada y resolutiva. 
    Ayudas en la gestión de tareas enviándolas directamente a 'Alumbra Commander'.
    - Si detectas una tarea, instas a Samuel a usar el comando "Mete esto en commander" o la inyectas tú si el mensaje es claro.
    - Responsables sugeridos: Contratos -> Caroll, Ventas -> Fernando, Legal -> Esther, Baterías -> David Cañete.
    - Tono: Asistente ejecutiva de primer nivel.`
  },
  "alumbra": {
    token: Deno.env.get('TELEGRAM_TOKEN_ALUMBRA'),
    name: "Agente Alumbra",
    instruction: `# Misión: Agente Alumbra ("Energía verde y con actitud")
    Tono: Sincero, humano, cercano y con actitud. Branding: Granate (#5d1550).
    Conoces: BESS (baterías), BRP, Cierre 2025, Proyectos IT con Marcos.
    Ayudas a Samuel con la visión estratégica de la empresa Alumbra Energía.`
  },
  "powertrader": {
    token: Deno.env.get('TELEGRAM_TOKEN_POWERTRADER'),
    name: "Agente PowerTrader",
    instruction: `# Misión: Agente PowerTrader
    Tono: Trader profesional, analítico, directo y rebelde.
    Usas semáforos 🚦 y unidades en MWh. Enfoque: Mercado energético, EnergyFlash y SEO.
    Ayudas a Samuel a dominar el mercado con datos precisos y rapidez de ejecución.`
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No he podido conectar con mi cerebro central (Gemini)."
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
    const url = new URL(req.url)
    const agentKey = url.searchParams.get('agent') || 'secretaria'
    const agent = AGENTS[agentKey]

    if (!agent) return new Response('Agent mismatch', { status: 404 })

    // Gatillo Commander
    const TRIGGER = "Mete esto en commander"
    if (text.toLowerCase().includes(TRIGGER.toLowerCase())) {
      const content = text.slice(text.toLowerCase().indexOf(TRIGGER.toLowerCase()) + TRIGGER.length).trim()
      const lines = content.split('\n')
      const title = lines[0].trim() || 'Tarea desde Telegram'
      const notes = lines.slice(1).join('\n').trim() || 'Importado vía Cloud'

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { error } = await supabase.from('tasks').insert([{
        id: Date.now(),
        title: title,
        notes: notes,
        status: 'To Do',
        priority: 'Media',
        owner: 'Samuel Gamito',
        tags: [agent.name, 'Cloud']
      }])

      if (error) {
        await sendMessage(agent.token, chatId, `❌ Error: ${error.message}`)
      } else {
        await sendMessage(agent.token, chatId, `✅ Inyectado en Commander: "${title}" 🚀`)
      }
      return new Response('OK', { status: 200 })
    }

    // Respuesta IA
    const aiResponse = await callGemini(text, agent.instruction)
    await sendMessage(agent.token, chatId, aiResponse)

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('ERR', { status: 500 })
  }
})
