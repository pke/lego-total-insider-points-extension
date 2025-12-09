// This runs in ISOLATED world and has access to chrome.storage.
// This is the only way to manage storage in Manifest V3 extensions from content scripts.
// Also used for Firefox, which still does direct storage access in content scripts just to stay DRY.
(function() {
  'use strict';

  // DRY up the args used for getting settings to quickly change the default symbol
  const getArgs = { symbol: 'Σ', showMoney: false };

  async function getAndPost() {
    const result = await chrome.storage.sync.get(getArgs);
    // Send to MAIN world
    window.postMessage({
      type: 'SETTINGS_UPDATE',
       ...result
    }, '*');
    return result
  };

  // Load initial settings
  const getInitialResult = getAndPost();
  getInitialResult.then((result) => {
    console.log('[LEGO Total Insider Points Extension] Initial settings from storage:', result);
  });

  // Listen for settings changes and forward to MAIN world
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      console.log('[LEGO Total Insider Points Extension] Settings changed in storage:', changes);
      getAndPost();
    }
  });

  // Listen for requests from MAIN world
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data.type === 'REQUEST_SETTINGS') {
      getAndPost();
    }
  });
})();
