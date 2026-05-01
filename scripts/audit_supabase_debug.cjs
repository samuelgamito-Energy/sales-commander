const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = 'https://imcjrteafzifqobyxihy.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltY2pydGVhZnppZnFvYnl4aWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTcyOTksImV4cCI6MjA4ODYzMzI5OX0.ram1mS3fommE3Dw61sbG61p2tSkd-TqgY_2PB_J1fd4';
const supabase = createClient(url, key);

async function audit() {
    console.log('--- AUDITORÍA DE TABLAS ---');
    
    // 1. Verificar Tabla Personal
    const { data: personal, error: e1 } = await supabase.from('tasks').select('id, title').limit(3);
    console.log(`\nTABLA [tasks] (Personal): ${personal ? personal.length : 0} filas encontradas.`);
    if (personal) personal.forEach(t => console.log(` - [${t.id}] ${t.title}`));

    // 2. Verificar Tabla Sales
    const { data: sales, error: e2 } = await supabase.from('tasks_sales').select('id, title').limit(3);
    console.log(`\nTABLA [tasks_sales] (Comercial): ${sales ? sales.length : 0} filas encontradas.`);
    if (sales) sales.forEach(t => console.log(` - [${t.id}] ${t.title}`));
}

audit();
