// Liga o CRM aberto pelo site (Vercel) ou pelo arquivo à extensão, para ele reaproveitar a aba do WhatsApp Web
// em vez de abrir uma aba nova a cada envio. Só age em páginas do CRM (<meta name="koda-crm">).
(() => {
  if (!document.querySelector('meta[name="koda-crm"]')) return;
  document.documentElement.dataset.kodaBridge = '1';
  window.addEventListener('message', e => {
    if (e.source !== window || e.data?.src !== 'koda-page' || e.data.type !== 'open') return;
    const { id, phone, text } = e.data;
    const reply = r => window.postMessage({ src: 'koda-bridge', id, ...r }, '*');
    try {
      chrome.runtime.sendMessage({ type: 'koda-wa-open', phone, text, focus: true }).then(reply, () => reply({ ok: false, reason: 'bridge' }));
    } catch (err) { reply({ ok: false, reason: 'bridge' }); }
  });
})();
