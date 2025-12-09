const buildCountryRates = (groups) => {
    return Object.entries(groups).reduce((rates, [countries, config]) => {
      countries.split(',').forEach(code => {
        rates[code] = config;
      });
      return rates;
    }, {});
  };

  // Points per currency unit by country code
  const countryRates = buildCountryRates({
    'DE,AT,FR,BE,IT,ES,NL,PT,GR,IE,LU,FI': { rate: 7.5, currency: 'EUR' },
    'CH': { rate: 6.5, currency: 'CHF' },
    'DK': { rate: 1, currency: 'DKK' },
    'SE': { rate: 0.75, currency: 'SEK' },
    'NO': { rate: 0.75, currency: 'NOK' },
    'PL': { rate: 1.5, currency: 'PLN' },
    'CZ': { rate: 0.3, currency: 'CZK' },
    'HU': { rate: 0.02, currency: 'HUF' },
    'US': { rate: 6.5, currency: 'USD' },
    'CA': { rate: 5.0, currency: 'CAD' },
    'MX': { rate: 0.35, currency: 'MXN' },
    'GB': { rate: 8.0, currency: 'GBP' },
    'AU': { rate: 4.5, currency: 'AUD' },
    'NZ': { rate: 4.0, currency: 'NZD' },
    'JP': { rate: 0.055, currency: 'JPY' },
    'KR': { rate: 0.0055, currency: 'KRW' },
    'CN': { rate: 7.5, currency: 'CNY' },
    'HK': { rate: 7.5, currency: 'HKD' },
    'SG': { rate: 7.5, currency: 'SGD' },
    'TW': { rate: 7.5, currency: 'TWD' },
    'MY': { rate: 7.5, currency: 'MYR' },
    'TH': { rate: 7.5, currency: 'THB' },
    'IN': { rate: 7.5, currency: 'INR' },
    'AE': { rate: 7.5, currency: 'AED' },
    'SA': { rate: 7.5, currency: 'SAR' },
    'ZA': { rate: 7.5, currency: 'ZAR' }
  });

  /**
   * Calculate and format money spent with locale support
   * @param {number} points - Total VIP/Insider points
   * @param {string} locale - Locale code
   * @returns {string} Formatted money spent string
   */
  function calculateMoneySpent(points, country = "US") {
    if (!country) {
      return ''; // No country data available
    }

    const countryCode = country.toUpperCase();
    const config = countryRates[countryCode];

    if (!config) {
      console.log('[LEGO Total Insider Points Extension] Unknown country code:', countryCode);
      return ''; // Unknown country
    }

    const moneyAmount = points / config.rate;
    const formattedAmount = moneyAmount.toLocaleString(countryCode, {
      style: "currency",
      currency: config.currency,
      maximumFractionDigits: 0,
    });

    return formattedAmount;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      calculateMoneySpent,
    };
  } else if (typeof window !== "undefined") {
    window.totalInsiderPoints = {
      calculateMoneySpent,
    };
  };
