// Configuração da biblioteca WPPConnect, carregada antes dela.
// Desliga estatísticas (Google Analytics) e servidores externos de prévia de link: nada sai do WhatsApp Web.
window.WPPConfig = {
  deviceName: false,
  disableGoogleAnalytics: true,
  googleAnalyticsId: null,
  linkPreviewApiServers: [],
  poweredBy: null,
  syncAllStatus: false,
};
