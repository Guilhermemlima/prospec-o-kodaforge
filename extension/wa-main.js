// Roda no contexto da página do WhatsApp Web, junto com a biblioteca WPPConnect (vendor/wppconnect-wa.js).
// Abre a conversa sem recarregar a página e coloca o texto na caixa de mensagem. Nunca envia nada.
(() => {
  if (window.__kodaMain) return; // já instalado nesta aba
  window.__kodaMain = true;
  const ready = () => new Promise(res => {
    if (window.WPP?.isFullReady) return res(true);
    const t = setInterval(() => { if (window.WPP?.isFullReady) { clearInterval(t); res(true); } }, 200);
    setTimeout(() => { clearInterval(t); res(!!window.WPP?.isFullReady); }, 20000);
  });

  window.addEventListener('message', async e => {
    if (e.source !== window || e.data?.src !== 'koda-iso' || e.data.type !== 'open') return;
    const { id, phone, text } = e.data;
    const reply = r => window.postMessage({ src: 'koda-main', id, ...r }, '*');
    try {
      if (!(await ready())) return reply({ ok: false, reason: 'not-ready' });
      const found = await WPP.contact.queryWidExists(phone + '@c.us');
      if (!found) return reply({ ok: false, reason: 'no-whatsapp' });
      await WPP.chat.openChatBottom(found.wid);
      let typed = false;
      if (text) { try { await WPP.chat.setInputText(text, found.wid); typed = true; } catch (err) { /* o wa.js cola o texto */ } }
      reply({ ok: true, typed });
    } catch (err) {
      reply({ ok: false, reason: String(err?.message || err) });
    }
  });
})();
