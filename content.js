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

  /**
   * Format total points display text with optional money spent
   * @param {number} totalPoints - Total VIP points
   * @returns {string} Formatted display text
   */
  function formatTotalPointsText(totalPoints) {
    if (totalPoints === null || totalPoints === undefined) return '';

    const numberFormat = userCountry || getNumberFormat();
    const formattedPoints = totalPoints.toLocaleString(numberFormat);

    let displayText = `${selectedSymbol} ${formattedPoints}`;

    // Add money spent if enabled and country is known
    if (showMoneySpent && userCountry) {
      const moneySpent = calculateMoneySpent(totalPoints, userCountry);
      if (moneySpent) {
        displayText += ` (≈${moneySpent})`;
      }
    }

    return displayText;
  }

  /**
   * Update the points display in the header
   * @param {number} totalPoints - Total VIP points
   */
  function updatePointsDisplay(totalPoints) {
    if (totalPoints === null || totalPoints === undefined) return;

    cachedTotalPoints = totalPoints;

    const span = document.querySelector('span[data-test="insiders-points"]');
    if (!span) {
      console.log('[LEGO Total Insider Points Extension] Header span not found yet, waiting...');
      return;
    }

    const displayText = formatTotalPointsText(totalPoints);

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

    console.log('[LEGO Total Insider Points Extension] Header total points displayed:', displayText);
  }

  /**
 * Update the member profile page card with total points
 * @param {number} totalPoints - Total VIP points
 */
function updateMemberPageCard(totalPoints) {
  if (totalPoints === null || totalPoints === undefined) return;

  // Find the profile card by class pattern (handles dynamic class names)
  const profileCard = document.querySelector('[class*="InsidersProfileCard_points__"]');
  if (!profileCard) {
    console.log('[LEGO Total Insider Points Extension] Member page card not found yet, waiting...');
    return;
  }


  // Check if we already added the element
  const existingElement = profileCard.querySelector('.total-points-extension');
  if (existingElement) {
    // Update existing element
    existingElement.textContent = formatTotalPointsText(totalPoints);
    return;
  }

  // Create new paragraph element
  const totalPointsElement = document.createElement('p');
  totalPointsElement.className = 'total-points-extension';
  totalPointsElement.textContent = formatTotalPointsText(totalPoints);

  // Append to the container (after the existing p elements)
  profileCard.appendChild(totalPointsElement);

  console.log('[LEGO Total Insider Points Extension] Member page card updated:', formatTotalPointsText(totalPoints));
}

  /**
   * Update all displays with total points
   * @param {number} totalPoints - Total VIP points
   */
  function updateAllDisplays(totalPoints) {
    updatePointsDisplay(totalPoints);
    updateMemberPageCard(totalPoints);
  }

  // Handle response for both fetch and XHR
  function handleUserQueryResponse(responseData) {
    const totalPoints = parseUserQueryResponse(responseData);
    if (totalPoints !== null) {
      console.log('[LEGO Total Insider Points Extension] Total Insider Points:', totalPoints);
      cachedTotalPoints = totalPoints;
      updateAllDisplays(totalPoints);
    }
  }

  /**
   * Watch for elements to appear
   */
  function waitForElements() {
    // Check for existing elements
    if (cachedTotalPoints !== null) {
      updateAllDisplays(cachedTotalPoints);
    }

    const observer = new MutationObserver((_mutations) => {
      if (cachedTotalPoints !== null) {
        // Check header span
        const span = document.querySelector('span[data-test="insiders-points"]');
        if (span && !span.style.getPropertyValue('--total-points')) {
          console.log('[LEGO Total Insider Points Extension] Header span found!');
          updatePointsDisplay(cachedTotalPoints);
        }

        // Check member page card
        const profileCard = document.querySelector('[class*="InsidersProfileCard_points__"]');
        if (profileCard) {
          if (profileCard && !profileCard.querySelector('.total-points-extension')) {
            console.log('[LEGO Total Insider Points Extension] Member page card found!');
            updateMemberPageCard(cachedTotalPoints);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start watching for elements when DOM is ready
  if (document.body) {
    waitForElements();
  } else {
    document.addEventListener('DOMContentLoaded', waitForElements);
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

      // Re-render all displays if we have cached points
      if (cachedTotalPoints !== null) {
        updateAllDisplays(cachedTotalPoints);
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
