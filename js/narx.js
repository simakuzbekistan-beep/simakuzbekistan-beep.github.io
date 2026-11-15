/* "Narx so'rash" tugmalari: Telegram (@simak_admin) ochilganda xabar oynasiga tayyor matn qo'yiladi:
   saytdan yozayotgani va qaysi bo'lim/model ekani. Matnni mijoz o'zgartirishi yoki o'chirishi mumkin. */
(function () {
  var BASE = 'https://t.me/simak_admin';
  var HI = 'Assalomu alaykum, saytdan yozyapman.';
  function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function msg(a) {
    var card = a.closest('.mi-t');
    if (card) {                                   // model kartasi (bo'lim oynasi ichida)
      var sec = txt(document.getElementById('ms-t'));
      var model = txt(card.querySelector('b'));
      return HI + (sec ? ' ' + sec + ' bo\'limidan.' : '') + (model ? ' «' + model + '» narxi qancha?' : ' Narxini bilmoqchiman.');
    }
    var fc = a.closest('.fc');                    // "Uskunalar" bo'limidagi tur kartasi
    if (fc && fc.querySelector('b'))
      return HI + ' ' + txt(fc.querySelector('b')) + ' bo\'yicha narx bilmoqchiman.';
    var cat = a.closest('article');
    if (cat && cat.querySelector('h3'))           // bo'lim kartasi
      return HI + ' ' + txt(cat.querySelector('h3')) + ' bo\'yicha narx bilmoqchiman.';
    return HI + ' Uskuna narxini bilmoqchiman.';  // boshqa joylar
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a || a.href.indexOf('t.me/simak_admin') < 0 || a.textContent.indexOf("Narx so'rash") < 0) return;
    a.href = BASE + '?text=' + encodeURIComponent(msg(a));
  }, true);
})();
