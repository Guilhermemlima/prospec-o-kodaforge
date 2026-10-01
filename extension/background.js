// Clicar no ícone da extensão abre o painel lateral com o CRM.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
