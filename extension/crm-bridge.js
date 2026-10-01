// Liga o CRM aberto pelo site (Vercel) ou pelo arquivo à extensão: abre conversas na aba do WhatsApp Web
// que já existe, abre o WhatsApp Desktop e confere números. Só age em páginas do CRM (<meta name="koda-crm">).
(() => {
  if (!document.querySelector('meta[name="koda-crm"]')) return;
  const ALLOWED = ['koda-wa-open', 'koda-wa-check', 'koda-protocol'];
  document.documentElement.dataset.kodaBridge = '1';
  window.addEventListener('message', e => {
    if (e.source !== window || e.data?.src !== 'koda-page' || !ALLOWED.includes(e.data.msg?.type)) return;
    const { id, msg } = e.data;
    const reply = r => window.postMessage({ src: 'koda-bridge', id, ...r }, '*');
    try { chrome.runtime.sendMessage(msg).then(r => reply(r || { ok: false }), () => reply({ ok: false, reason: 'bridge' })); }
    catch (err) { reply({ ok: false, reason: 'bridge' }); }
  });
})();
