import { createClient } from '@supabase/supabase-js'

// Valores hardcodeados como fallback garantizado (anon key es pública por diseño)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://imcjrteafzifqobyxihy.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltY2pydGVhZnppZnFvYnl4aWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTcyOTksImV4cCI6MjA4ODYzMzI5OX0.ram1mS3fommE3Dw61sbG61p2tSkd-TqgY_2PB_J1fd4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
