import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const AGENTS = {
  "secretaria": {
    token: Deno.env.get('TELEGRAM_TOKEN_SECRETARIA'),
    name: "Secretaria Personal",
    instruction: `Eres la Secretaria Personal de Samuel. Eficiente, amable y resolutiva.`
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

async function callGemini(prompt, systemInstruction) {
  try {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurado");
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini no devolvió respuesta."
  } catch (e) {
    return `Error Gemini: ${e.message}`
  }
}

async function sendMessage(botToken, chatId, text) {
  try {
    if (!botToken) throw new Error("TOKEN de bot no configurado");
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text })
    })
    const data = await res.json()
    if (!data.ok) console.error("Error Telegram API:", data.description)
  } catch (e) {
    console.error("Excepción enviando mensaje:", e.message)
  }
}

Deno.serve(async (req) => {
  try {
    const { message } = await req.json()
    if (!message || !message.text) return new Response('OK', { status: 200 })

    console.log(`Mensaje recibido: "${message.text}" para bot en URL: ${req.url}`)

    const text = message.text.trim()
    const chatId = message.chat.id
    const url = new URL(req.url)
    const agentKey = url.searchParams.get('agent') || 'secretaria'
    const agent = AGENTS[agentKey]

    if (!agent || !agent.token) {
      console.error(`Agente no encontrado o token vacío para key: ${agentKey}`)
      return new Response('Agent mismatch/Token empty', { status: 200 })
    }

    // Comprobar si es un comando de Commander
    const TRIGGER = "Mete esto en commander"
    if (text.toLowerCase().includes(TRIGGER.toLowerCase())) {
        const content = text.slice(text.toLowerCase().indexOf(TRIGGER.toLowerCase()) + TRIGGER.length).trim()
        const lines = content.split('\n')
        const title = lines[0].trim() || 'Tarea desde Telegram'
        const notes = lines.slice(1).join('\n').trim() || 'Importado vía Cloud'

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const { error } = await supabase.from('tasks').insert([{
            id: Date.now(), title, notes, status: 'To Do', priority: 'Media', owner: 'Samuel Gamito', tags: [agent.name, 'Cloud']
        }])

        if (error) {
            await sendMessage(agent.token, chatId, `❌ Error DB: ${error.message}`)
        } else {
            await sendMessage(agent.token, chatId, `✅ Inyectado en Commander: "${title}" 🚀`)
        }
        return new Response('OK', { status: 200 })
    }

    // Si es "hola", dar una señal de vida rápida antes de Gemini
    if (text.toLowerCase() === 'hola') {
        await sendMessage(agent.token, chatId, `👋 ¡Conectado! Estoy procesando tu mensaje con Gemini...`)
    }

    const aiResponse = await callGemini(text, agent.instruction)
    await sendMessage(agent.token, chatId, aiResponse)

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error("Fallo crítico en función:", err.message)
    return new Response('ERR', { status: 200 }) // Return 200 to Telegram to stop retries
  }
})
