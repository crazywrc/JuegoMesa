// Escuchar cuando se hace clic en el icono de la extensión
chrome.action.onClicked.addListener((tab) => {
  // Abrir la extensión en una nueva pestaña
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});