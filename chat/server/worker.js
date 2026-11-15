// SIMAK sayt chati — server (Cloudflare Worker, bepul tarif).
// Mijoz saytda yozadi -> xabar operatorlar Telegram guruhida alohida "mavzu" (topic) bo'lib chiqadi.
// Operator o'sha mavzuda javob yozadi -> mijoz saytdagi oynada ko'radi.
// "/" yoki "#" bilan boshlangan operator xabari ichki izoh hisoblanadi, mijozga ketmaydi.

const MAX_LEN = 1000;

function cors(env, req) {
  const origin = req.headers.get('Origin') || '';
  const ok = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}
const json = (obj, h, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...h, 'Content-Type': 'application/json' } });

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json();
}

async function topicFor(env, sid, model) {
  const row = await env.DB.prepare('SELECT topic_id FROM sessions WHERE sid=?').bind(sid).first();
  if (row && row.topic_id) return row.topic_id;
  const n = await env.DB.prepare('SELECT COUNT(*) AS c FROM sessions').first();
  const name = `Sayt #${(n?.c || 0) + 1}` + (model ? ` · ${model}` : '');
  const t = await tg(env, 'createForumTopic', { chat_id: env.GROUP_ID, name: name.slice(0, 120) });
  if (!t.ok) throw new Error('topic: ' + t.description);
  await env.DB.prepare('INSERT OR REPLACE INTO sessions (sid, topic_id, model, created) VALUES (?,?,?,?)')
    .bind(sid, t.result.message_thread_id, model || '', Date.now()).run();
  return t.result.message_thread_id;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(env, req);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });

    // 1) Saytdan mijoz xabari
    if (url.pathname === '/send' && req.method === 'POST') {
      if (h['Access-Control-Allow-Origin'] === 'null') return json({ ok: false }, h, 403);
      const p = await req.json().catch(() => ({}));
      const sid = String(p.sid || '').slice(0, 40);
      const text = String(p.text || '').trim().slice(0, MAX_LEN);
      if (!/^s[a-z0-9]{6,}$/.test(sid) || !text) return json({ ok: false }, h, 400);
      const model = String(p.model || '').slice(0, 100);
      const topic = await topicFor(env, sid, model);
      const head = p.type === 'lead' ? '🟥 ' : '💬 Mijoz: ';
      await tg(env, 'sendMessage', { chat_id: env.GROUP_ID, message_thread_id: topic, text: head + text });
      return json({ ok: true }, h);
    }

    // 2) Sayt operator javoblarini so'raydi (har 4 soniyada)
    if (url.pathname === '/poll' && req.method === 'GET') {
      const sid = String(url.searchParams.get('sid') || '');
      const after = parseInt(url.searchParams.get('after') || '0', 10) || 0;
      const r = await env.DB.prepare('SELECT id, text FROM msgs WHERE sid=? AND id>? ORDER BY id LIMIT 50')
        .bind(sid, after).all();
      return json({ m: r.results || [] }, h);
    }

    // 3) Telegram webhook: operator mavzuda javob yozdi
    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TG_SECRET) return new Response('no', { status: 403 });
      const u = await req.json().catch(() => ({}));
      const m = u.message;
      if (!m || String(m.chat?.id) !== String(env.GROUP_ID) || !m.message_thread_id || m.from?.is_bot) return new Response('ok');
      const text = (m.text || m.caption || '').trim();
      if (!text || text.startsWith('/') || text.startsWith('#')) return new Response('ok');
      const s = await env.DB.prepare('SELECT sid FROM sessions WHERE topic_id=?').bind(m.message_thread_id).first();
      if (s) await env.DB.prepare('INSERT INTO msgs (sid, text, created) VALUES (?,?,?)')
        .bind(s.sid, text.slice(0, 2000), Date.now()).run();
      return new Response('ok');
    }

    return new Response('SIMAK chat', { headers: h });
  },
};
