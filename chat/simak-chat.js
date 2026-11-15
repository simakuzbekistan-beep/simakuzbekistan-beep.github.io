/* SIMAK sayt chati.
   Ulanish: sahifaga simak-chat.css va simak-chat.js qo'shiladi.
   window.SIMAK_CHAT = { api: "https://...workers.dev" }  -> haqiqiy rejim (operatorlar Telegramdan javob beradi)
   api berilmasa -> NAMUNA rejimi (hech narsa hech qayerga yuborilmaydi). */
(function () {
  var CFG = window.SIMAK_CHAT || {};
  var API = CFG.api || null;
  var TG = 'https://t.me/simak_admin';

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- oyna ---------- */
  var btn = el('button', 'sc-btn');
  btn.type = 'button';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span>Savol berish</span>';
  var box = el('div', 'sc-box');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'SIMAK chat');
  box.innerHTML =
    '<div class="sc-head"><div class="sc-ava">S</div><div class="sc-ttl"><b>SIMAK maslahatchisi</b><span><i></i>Odatda bir necha daqiqada javob beramiz</span></div><button class="sc-x" type="button" aria-label="Yopish">×</button></div>' +
    '<div class="sc-log" aria-live="polite"></div>' +
    '<form class="sc-form"><textarea rows="1" placeholder="Xabaringizni yozing..." aria-label="Xabar"></textarea><button type="submit" aria-label="Yuborish"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>' +
    '<div class="sc-foot">Telegram qulayroqmi? <a href="' + TG + '" target="_blank" rel="noopener">Telegramda yozish</a></div>';
  document.body.appendChild(btn);
  document.body.appendChild(box);

  var log = box.querySelector('.sc-log'), form = box.querySelector('.sc-form'), ta = box.querySelector('textarea');
  var typing = el('div', 'sc-typing'); typing.innerHTML = '<i></i><i></i><i></i>';
  log.appendChild(typing);

  function scroll() { log.scrollTop = log.scrollHeight; }
  function add(kind, text) {
    var m = el('div', 'sc-m sc-' + kind);
    if (kind === 'op') m.appendChild(el('small', '', 'Mutaxassis'));
    if (kind === 'bot') m.appendChild(el('small', '', 'SIMAK yordamchisi'));
    m.appendChild(document.createTextNode(text));
    if (kind === 'sys') m.className = 'sc-sys';
    log.insertBefore(m, typing); scroll();
  }
  function quick(opts) {
    clearQuick();
    var q = el('div', 'sc-qr');
    opts.forEach(function (o) {
      var b = el('button', '', o); b.type = 'button';
      b.addEventListener('click', function () { clearQuick(); userSays(o); });
      q.appendChild(b);
    });
    log.insertBefore(q, typing); scroll();
  }
  function clearQuick() { log.querySelectorAll('.sc-qr').forEach(function (q) { q.remove(); }); }
  function botSays(text, opts, cb) {
    typing.classList.add('on'); scroll();
    setTimeout(function () {
      typing.classList.remove('on'); add('bot', text);
      if (opts) quick(opts);
      if (cb) cb();
    }, 650 + Math.min(text.length * 8, 900));
  }

  /* ---------- savollar (bot bilan bir xil bo'lishi kerak — AI Sotuvchi loyihasidan tasdiqlanadi) ---------- */
  var S = { model: '', step: 0, a: {}, started: false, handed: false };
  var STEPS = [
    { k: 'uskuna', q: 'Qaysi uskuna kerak? Masalan: go\'sht qiymalagich, pech, xamir qoruvchi.', skipIfModel: true },
    { k: 'joy', q: 'Uskunani qayerda ishlatasiz?', o: ['Qassobxona', 'Nonvoyxona', 'Kafe yoki restoran', 'Fast-food', 'Ishlab chiqarish', 'Boshqa'] },
    { k: 'hajm', q: 'Kuniga taxminan qancha mahsulot tayyorlaysiz? (masalan: 50 kg go\'sht, 300 ta non)' },
    { k: 'tok', q: 'Ish joyingizda tok qanday?', o: ['220V', '380V', 'Bilmayman'] },
    { k: 'aloqa', q: 'Mutaxassisimiz narx va mos modelni aytishi uchun ismingiz va telefon raqamingizni yozing.' }
  ];

  function nextStep() {
    while (S.step < STEPS.length && STEPS[S.step].skipIfModel && S.model) S.step++;
    if (S.step < STEPS.length) { var st = STEPS[S.step]; botSays(st.q, st.o); return; }
    handOff();
  }
  function handOff() {
    if (S.handed) return; S.handed = true;
    var sum = 'Yangi murojaat (sayt)\n' + (S.model ? 'Model: ' + S.model + '\n' : '') +
      Object.keys(S.a).map(function (k) { return k + ': ' + S.a[k]; }).join('\n');
    send({ type: 'lead', text: sum });
    botSays('Rahmat! Ma\'lumotlaringiz mutaxassisga yuborildi. U shu oynada javob yozadi — sahifani yopmasangiz bo\'ldi. Savolingiz bo\'lsa, bemalol yozing.', null, function () {
      add('sys', 'Mutaxassis ulanmoqda...');
      if (!API) setTimeout(function () {
        add('op', 'NAMUNA: bu yerda operator Telegram guruhidan yozgan javob ko\'rinadi. Mijoz saytdan chiqmaydi.');
      }, 2500);
    });
  }
  function userSays(text) {
    text = String(text || '').trim(); if (!text) return;
    add('me', text); send({ type: 'msg', text: text });
    if (S.handed) return;                       // endi operator bilan suhbat
    var st = STEPS[S.step];
    if (st && st.k === 'aloqa' && (text.replace(/\D/g, '').length < 9)) {
      botSays('Telefon raqamingizni ham yozing, iltimos (masalan: 90 123 45 67).'); return;
    }
    if (st) { S.a[st.k] = text; S.step++; }
    nextStep();
  }

  function start(model) {
    if (model && !S.model && !S.started) S.model = model;
    if (S.started) { if (model && model !== S.model) { S.model = model; add('sys', 'Model: ' + model); send({ type: 'msg', text: '[Model tanlandi] ' + model }); } return; }
    S.started = true;
    var hi = 'Assalomu alaykum! Men SIMAK yordamchisiman.' +
      (S.model ? '\n«' + S.model + '» bo\'yicha aniq narx va sizga mos variantni mutaxassisimiz aytadi.' : '') +
      '\nTo\'g\'ri uskuna tanlash uchun bir-ikki savol beraman.';
    botSays(hi, null, nextStep);
  }

  /* ---------- server bilan aloqa (haqiqiy rejim) ---------- */
  var sid = store('simak_chat_sid');
  if (!sid) { sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); store('simak_chat_sid', sid); }
  var after = 0, timer = null;
  function send(p) {
    if (!API) return;
    p.sid = sid; p.page = location.pathname; p.model = S.model;
    fetch(API + '/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
      .catch(function () { add('sys', 'Xabar yuborilmadi. Internetni tekshiring yoki Telegramda yozing.'); });
  }
  function poll() {
    if (!API) return;
    fetch(API + '/poll?sid=' + encodeURIComponent(sid) + '&after=' + after)
      .then(function (r) { return r.json(); })
      .then(function (d) { (d.m || []).forEach(function (m) { after = Math.max(after, m.id); add('op', m.text); }); })
      .catch(function () {});
  }

  /* ---------- ochish / yopish ---------- */
  function openBox(model) {
    box.classList.add('sc-open'); btn.classList.add('sc-hide');
    start(model);
    if (API && !timer) { poll(); timer = setInterval(poll, 4000); }
    setTimeout(function () { ta.focus(); }, 50);
  }
  function closeBox() {
    box.classList.remove('sc-open'); btn.classList.remove('sc-hide');
    if (timer && !S.handed) { clearInterval(timer); timer = null; }
  }
  btn.addEventListener('click', function () { openBox(''); });
  box.querySelector('.sc-x').addEventListener('click', closeBox);
  form.addEventListener('submit', function (e) { e.preventDefault(); var t = ta.value; ta.value = ''; clearQuick(); userSays(t); });
  ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); } });

  /* "Narx so'rash" tugmalari Telegram o'rniga chatni ochadi va model nomini oladi */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a || a.href.indexOf('t.me/simak_admin') < 0 || a.textContent.indexOf("Narx so'rash") < 0) return;
    e.preventDefault();
    var card = a.closest('.mi-t'), cat = a.closest('article');
    var model = card && card.querySelector('b') ? card.querySelector('b').textContent :
      (cat && cat.querySelector('h3') ? cat.querySelector('h3').textContent : '');
    openBox(model.trim());
  }, true);
})();
