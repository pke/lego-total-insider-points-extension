(function () {
  'use strict';

  // Default symbol
  let selectedSymbol = 'Σ';
  let cachedTotalPoints = null;
  let userCountry = null;
  let showMoneySpent = false;

  // Get current locale from URL for number formatting
  function getNumberFormat() {
    const localeMatch = window.location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/i);
    return localeMatch ? localeMatch[1] : 'en-GB';
  }

  // Parse response and extract total points
  function parseUserQueryResponse(responseText) {
    try {
      const data = typeof responseText === 'string'
        ? JSON.parse(responseText)
        : responseText;
      const totalPoints = data?.data?.me?.vip?.totalPoints;
      const country = data?.data?.me?.country;

      if (country) {
        userCountry = country;
        console.log('[LEGO Total Insider Points Extension] User country:', userCountry);
      }
      return totalPoints;
    } catch (e) {
      console.error('[LEGO Total Insider Points Extension] Error parsing UserQuery response:', e);
      return null;
    }
  }

  const { calculateMoneySpent } = window.totalInsiderPoints;

  // Update the points display
  function updatePointsDisplay(totalPoints) {
    if (totalPoints === null || totalPoints === undefined) return;

    cachedTotalPoints = totalPoints;

    const span = document.querySelector('span[data-test="insiders-points"]');
    if (!span) {
      console.log('[LEGO Total Insider Points Extension] Span not found yet, waiting...');
      return;
    }

    const numberFormat = userCountry || getNumberFormat();
    const formattedPoints = totalPoints.toLocaleString(numberFormat);

    // Build display text
    let displayText = `${selectedSymbol} ${formattedPoints}`;

    // Add money spent if enabled and country is known
    if (showMoneySpent && userCountry) {
      const moneySpent = calculateMoneySpent(totalPoints, userCountry);
      if (moneySpent) {
        displayText += ` (≈${moneySpent})`;
      }
    }

    // Add/update CSS custom property for the content
    span.style.setProperty('--total-points', `"\\A${displayText}"`);

    // Add styles only once
    if (!document.getElementById('lego-points-style')) {
      const style = document.createElement('style');
      style.id = 'lego-points-style';
      style.textContent = `
        span[data-test="insiders-points"]::after {
          content: var(--total-points, "");
          white-space: pre;
        }
      `;
      document.head.appendChild(style);
    }

    console.log('[LEGO Total Insider Points Extension] Total points displayed:', displayText);
  }

  // Handle response for both fetch and XHR
  function handleUserQueryResponse(responseData) {
    const totalPoints = parseUserQueryResponse(responseData);
    if (totalPoints !== null) {
      console.log('[LEGO Total Insider Points Extension] Total Insider Points:', totalPoints);
      updatePointsDisplay(totalPoints);
    }
  }

  // Watch for the span element to appear
  function waitForElement() {
    const existingSpan = document.querySelector('span[data-test="insiders-points"]');
    if (existingSpan && cachedTotalPoints !== null) {
      updatePointsDisplay(cachedTotalPoints);
    }

    const observer = new MutationObserver((_mutations) => {
      const span = document.querySelector('span[data-test="insiders-points"]');
      const displayElement = document.getElementById('total-points-display');

      if (span && !displayElement && cachedTotalPoints !== null) {
        console.log('[LEGO Total Insider Points Extension] Span found!');
        updatePointsDisplay(cachedTotalPoints);
      }
    });

    // Might optimise later by observing a more specific parent element
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start watching for element when DOM is ready
  if (document.body) {
    waitForElement();
  } else {
    document.addEventListener('DOMContentLoaded', waitForElement);
  }

  // Listen for updates from storage bridge
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'SETTINGS_UPDATE') {
      if (event.data.symbol !== undefined) {
        selectedSymbol = event.data.symbol;
        console.log('[LEGO Total Insider Points Extension] Symbol updated to:', selectedSymbol);
      }

      if (event.data.showMoney !== undefined) {
        showMoneySpent = event.data.showMoney;
        console.log('[LEGO Total Insider Points Extension] Show money updated to:', showMoneySpent);
      }

      // Re-render display if we have cached points
      if (cachedTotalPoints !== null) {
        updatePointsDisplay(cachedTotalPoints);
      }
    }
  });

  // Request initial settings
  window.postMessage({ type: 'REQUEST_SETTINGS' }, '*');

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    // Fix for cases where fetch is called with a Request object
    const url = args[0]?.url || args[0];

    return originalFetch.apply(this, args).then(response => {
      if (url.includes('/api/graphql/UserQuery')) {
        console.log('[LEGO Total Insider Points Extension] UserQuery detected!');
        response.clone().json()
          .then(handleUserQueryResponse)
          .catch(err => console.error('[LEGO Total Insider Points Extension] Error reading fetch response:', err));
      }
      return response;
    });
  };

  // Intercept XMLHttpRequest in the rare case it's used
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (_method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this._url?.includes('/api/graphql/UserQuery')) {
      console.log('[LEGO Total Insider Points Extension] UserQuery XHR detected!');
      this.addEventListener('load', function () {
        handleUserQueryResponse(this.responseText);
      });
    }
    return originalSend.apply(this, arguments);
  };

  console.log('[LEGO Total Insider Points Extension] Interceptors installed (direct)');
})();
