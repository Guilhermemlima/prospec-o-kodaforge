// Roda dentro do WhatsApp Web. Só lê a tela (conversa aberta e lista de conversas)
// e, quando você pede, coloca o texto na caixa de mensagem. Nunca aperta "Enviar".
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  function chatInfo() {
    const main = $('#main');
    if (!main) return { open: false };
    const header = $('header', main);
    let title = '';
    if (header) {
      const el = header.querySelector('span[title]') || header.querySelector('[dir="auto"]');
      title = (el?.getAttribute('title') || el?.textContent || '').trim();
    }
    const msgs = main.querySelectorAll('.message-in, .message-out');
    const last = msgs[msgs.length - 1];
    return {
      open: true,
      title,
      headerText: (header?.innerText || '').slice(0, 300),
      incoming: !!main.querySelector('.message-in'),
      lastFromThem: !!last && last.classList.contains('message-in'),
    };
  }

  function chatList() {
    const pane = $('#pane-side');
    if (!pane) return [];
    const out = [];
    pane.querySelectorAll('[role="listitem"], [role="row"]').forEach(row => {
      const t = row.querySelector('span[title]');
      if (!t) return;
      const unread = !!row.querySelector('[aria-label*="não lida" i], [aria-label*="unread" i], [aria-label*="no leído" i]');
      out.push({ title: t.getAttribute('title'), unread });
    });
    return out.slice(0, 80);
  }

  const snapshot = () => ({ type: 'koda-wa', info: chatInfo(), chats: chatList() });

  let last = '';
  function push() {
    const snap = snapshot();
    const key = JSON.stringify(snap);
    if (key === last) return;
    last = key;
    try { chrome.runtime.sendMessage(snap).catch(() => {}); } catch (e) { /* extensão recarregada */ }
  }

  let timer = null;
  new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; push(); }, 800);
  }).observe(document.body, { childList: true, subtree: true });
  setTimeout(push, 1500);

  function insertText(text, done) {
    const box = $('#main footer [contenteditable="true"]');
    if (!box) return done({ ok: false, reason: 'Caixa de mensagem não encontrada' });
    box.focus();
    document.execCommand('selectAll', false);
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    const start = text.trim().slice(0, 12);
    setTimeout(() => {
      if (!box.innerText.includes(start)) {
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, text);
      }
      setTimeout(() => done({ ok: box.innerText.includes(start) }), 150);
    }, 200);
  }

  // Abre a conversa sem recarregar a página, via wa-main.js (que roda no contexto do WhatsApp Web).
  function openChat(phone, text, done) {
    const id = Math.random().toString(36).slice(2);
    const before = chatInfo().title;
    let finished = false;
    const finish = r => { if (finished) return; finished = true; window.removeEventListener('message', onMsg); done(r); };
    const onMsg = e => {
      if (e.source !== window || e.data?.src !== 'koda-main' || e.data.id !== id) return;
      const r = e.data;
      if (!r.ok) return finish({ ok: false, reason: r.reason });
      // espera a conversa aparecer na tela; se a biblioteca não preencheu o texto, cola aqui
      let tries = 0;
      const wait = setInterval(() => {
        const box = $('#main footer [contenteditable="true"]');
        if (box && (chatInfo().title !== before || tries > 6)) {
          clearInterval(wait);
          if (r.typed && box.innerText.trim()) return finish({ ok: true });
          insertText(text, res => finish({ ok: true, typed: res.ok }));
        } else if (++tries > 25) { clearInterval(wait); finish({ ok: false, reason: 'timeout' }); }
      }, 200);
    };
    window.addEventListener('message', onMsg);
    window.postMessage({ src: 'koda-iso', type: 'open', id, phone, text }, '*');
    setTimeout(() => finish({ ok: false, reason: 'timeout' }), 25000);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === 'koda-get') { reply(snapshot()); return; }
    if (msg?.type === 'koda-insert') { insertText(msg.text, reply); return true; }
    if (msg?.type === 'koda-open') { openChat(msg.phone, msg.text, reply); return true; }
  });
})();
