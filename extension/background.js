// Clicar no ícone da extensão abre o painel lateral com o CRM.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Abre conversas sempre na MESMA aba do WhatsApp Web (sem abrir abas novas).
// Pedidos vêm do CRM da extensão (painel/aba) e do CRM do site, via crm-bridge.js.
async function waTab() {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  return tabs.find(t => t.active) || tabs[0] || null;
}

// Se a aba do WhatsApp foi aberta antes de a extensão ser instalada/recarregada, instala os scripts nela agora.
async function ensureScripts(tabId) {
  try { const r = await chrome.tabs.sendMessage(tabId, { type: 'koda-ping' }); if (r?.ok) return true; } catch (e) {}
  try {
    const [{ result: hasWPP }] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: () => !!window.WPP });
    if (!hasWPP) await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['wa-config.js', 'vendor/wppconnect-wa.js'] });
    await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['wa-main.js'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['wa.js'] });
    return true;
  } catch (e) { return false; }
}

async function focus(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

async function openInWhatsApp({ phone, text, focus: doFocus = true, insertOnly = false }) {
  const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text || '')}`;
  const tab = await waTab();
  if (!tab) {
    if (insertOnly) return { ok: false, reason: 'no-tab' };
    await chrome.tabs.create({ url });
    return { ok: true, via: 'new-tab' };
  }
  const ready = await ensureScripts(tab.id);
  if (ready) {
    try {
      const r = await chrome.tabs.sendMessage(tab.id, insertOnly ? { type: 'koda-insert', text } : { type: 'koda-open', phone, text });
      if (r?.ok) { if (doFocus) await focus(tab); return { ok: true, via: 'fast' }; }
      if (r?.reason === 'no-whatsapp') return r;
    } catch (e) {}
  }
  if (insertOnly) return { ok: false, reason: 'insert-failed' };
  // plano B: mesma aba, abrindo pelo link (a página recarrega)
  await chrome.tabs.update(tab.id, { url });
  if (doFocus) await focus(tab);
  return { ok: true, via: 'reload' };
}

// Confere se o número tem WhatsApp usando a aba do WhatsApp Web (precisa estar aberta e conectada).
let lastCheck = 0;
async function checkNumber({ phone }) {
  if (!/^\d{10,13}$/.test(String(phone))) return { ok: false, reason: 'bad-phone' };
  // no máximo uma consulta a cada 2 s, para não sobrecarregar a conta do WhatsApp
  const wait = lastCheck + 2000 - Date.now();
  lastCheck = Math.max(Date.now(), lastCheck + 2000);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  const tab = await waTab();
  if (!tab) return { ok: false, reason: 'no-tab' };
  if (!(await ensureScripts(tab.id))) return { ok: false, reason: 'no-scripts' };
  try { return await chrome.tabs.sendMessage(tab.id, { type: 'koda-check', phone }); }
  catch (e) { return { ok: false, reason: 'no-scripts' }; }
}

// Abre o WhatsApp Desktop (link whatsapp://). Páginas da extensão não conseguem abrir apps sozinhas,
// então o link é aberto na aba atual: o Chrome mostra "Abrir WhatsApp?" e a página continua onde estava.
async function openProtocol({ url }, sender) {
  if (!/^whatsapp:\/\/send\?phone=\d+(&text=[^\s]*)?$/.test(String(url))) return { ok: false, reason: 'bad-url' };
  let tabId = sender.tab?.id;
  if (!tabId) { const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); tabId = t?.id; }
  try { if (tabId) { await chrome.tabs.update(tabId, { url }); return { ok: true }; } } catch (e) {}
  await chrome.tabs.create({ url });
  return { ok: true };
}

const HANDLERS = { 'koda-wa-open': openInWhatsApp, 'koda-wa-check': checkNumber, 'koda-protocol': openProtocol };
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const h = HANDLERS[msg?.type];
  if (!h) return;
  h(msg, sender).then(reply, err => reply({ ok: false, reason: String(err?.message || err) }));
  return true;
});
