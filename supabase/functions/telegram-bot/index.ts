import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { message } = await req.json()

    if (!message || !message.text) {
      return new Response('No message found', { status: 200 })
    }

    const text = message.text.trim()
    const TRIGGER = "Mete esto en commander"
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

    // DEBUG: Siempre responde a "hola" o similar para ver que está viva
    if (text.toLowerCase() === 'hola' || text.toLowerCase() === 'test') {
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: `👋 ¡Hola Samuel! El cerebro de Alumbra Commander está VIVO y conectado. 🧠⚡`
          })
        })
      }
      return new Response('Debug response sent', { status: 200 })
    }

    if (text.toLowerCase().includes(TRIGGER.toLowerCase())) {
      const content = text.slice(text.toLowerCase().indexOf(TRIGGER.toLowerCase()) + TRIGGER.length).trim()
      
      if (!content) {
        return new Response('No content to add', { status: 200 })
      }

      const lines = content.split('\n')
      const title = lines[0].trim()
      const notes = lines.slice(1).join('\n').trim() || 'Importado desde Telegram'

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const newTask = {
        id: Date.now(),
        title: title || 'Nueva Tarea sin título',
        notes: notes,
        status: 'To Do',
        priority: 'Media',
        owner: 'Samuel Gamito',
        created: new Date().toISOString().split('T')[0],
        deadline: null,
        tags: ['Telegram', 'Cloud']
      }

      const { error } = await supabase
        .from('tasks')
        .insert([newTask])

      if (error) {
        console.error('Error inyectando tarea:', error.message)
        // Responder con el error para debuggear
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: message.chat.id,
              text: `❌ Error de base de datos: ${error.message}`
            })
          })
        }
        return new Response('Error saving task', { status: 500 })
      }

      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: `✅ ¡Entendido! He inyectado la misión "${title}" en el Commander. 🚀`
          })
        })
      }

      return new Response('Task saved', { status: 200 })
    }

    return new Response('Message ignored (no trigger)', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Internal error', { status: 500 })
  }
})
