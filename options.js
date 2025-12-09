// Browser API compatibility
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

// Get localized message
function getMessage(key) {
  return browserAPI.i18n.getMessage(key);
}

// Localize all elements with data-i18n attribute
function localizeHtmlPage() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });
}

// Symbol definitions with i18n keys
const SYMBOL_SETS = [
  {
    titleKey: 'categoryMostCommon',
    symbols: [ 'Σ', '∑', '⌀', '∞' ]
  },
  {
    titleKey: 'categoryTrophy',
    symbols: [ '🏆', '⭐', '★', '💯']
  },
  {
    titleKey: 'categoryOther',
    symbols: ['⊕', '◈', '⧮']
  }
];

const DEFAULT_SYMBOL = SYMBOL_SETS[0].symbols[0];

// Load saved symbol
async function loadSymbol() {
  try {
    const { symbol } = await browserAPI.storage.sync.get({ symbol: DEFAULT_SYMBOL });
    return symbol;
  } catch (err) {
    console.error('[LEGO Total Insider Points Extension] Error loading symbol:', err);
    return DEFAULT_SYMBOL;
  }
}

// Save symbol
async function saveSymbol(symbol) {
  try {
    await browserAPI.storage.sync.set({ symbol });
    showStatus(getMessage('settingsSaved'));
    updatePreview(symbol);
  } catch (err) {
    console.error('[LEGO Total Insider Points Extension] Error saving symbol:', err);
    showStatus('Error saving settings');
  }
}

// Show status message
function showStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status success';
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 2000);
}

// Create symbol option element
function createSymbolOption(symbol, isSelected) {
  const label = document.createElement('label');
  label.className = 'symbol-option';// + (isSelected ? ' selected' : '');

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'symbol';
  radio.value = symbol;
  radio.checked = isSelected;

  const display = document.createElement('div');
  display.className = 'symbol-display';
  display.textContent = symbol;

  label.appendChild(radio);
  label.appendChild(display);

  label.addEventListener('click', () => {
    /* document.querySelectorAll('.symbol-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    label.classList.add('selected'); */
    saveSymbol(symbol);
  });

  return label;
}

function getRandomShowMoneyMessage() {
  // Pick a random category (1-5)
  const categoryNum = Math.floor(Math.random() * 5) + 1;
  const categoryKey = `showMoneySpent${categoryNum}`;

  // Get the message (pipe-separated options)
  const message = getMessage(categoryKey);

  if (!message) {
    return 'Show estimated money spent'; // Fallback
  }

  // Split by pipe and pick a random option
  const options = message.split('|');
  const randomIndex = Math.floor(Math.random() * options.length);

  return options[randomIndex].trim();
}

// Add after symbol sets rendering
async function renderSymbols() {
  const container = document.getElementById('symbols-container');
  const currentSymbol = await loadSymbol();
  const currentShowMoney = await loadShowMoney();

  SYMBOL_SETS.forEach(set => {
    const section = document.createElement('div');
    section.className = 'section';

    const title = document.createElement('h2');
    title.textContent = getMessage(set.titleKey);
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'symbol-grid';

    set.symbols.forEach(symbolChar => {
      const isSelected = symbolChar === currentSymbol;
      grid.appendChild(createSymbolOption(symbolChar, isSelected));
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  // Add Display Options section
  const settingsSection = document.createElement('div');
  settingsSection.className = 'section';

  const settingsTitle = document.createElement('h2');
  settingsTitle.textContent = getMessage('displayOptions') || 'Display Options';
  settingsSection.appendChild(settingsTitle);

  const moneyToggle = document.createElement('label');
  moneyToggle.style.cssText = `
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 10px;
    background: #f9f9f9;
    border-radius: 4px;
    transition: background 0.2s;
  `;

  moneyToggle.addEventListener('mouseenter', () => {
    moneyToggle.style.background = '#f0f7ff';
  });

  moneyToggle.addEventListener('mouseleave', () => {
    moneyToggle.style.background = '#f9f9f9';
  });

  const checkbox = document.createElement('input');
  checkbox.id = "showMoney"
  checkbox.type = 'checkbox';
  checkbox.checked = currentShowMoney;
  checkbox.style.cssText = 'margin-right: 10px; width: 18px; height: 18px; cursor: pointer;';
  checkbox.addEventListener('change', async (e) => {
    await saveShowMoney(e.target.checked);
  });

  const label = document.createElement('span');
  label.textContent = getRandomShowMoneyMessage();
  label.style.fontSize = '14px';

  moneyToggle.appendChild(checkbox);
  moneyToggle.appendChild(label);
  settingsSection.appendChild(moneyToggle);

  container.appendChild(settingsSection);

  updatePreview(currentSymbol);
}

async function loadShowMoney() {
  try {
    const { showMoney } = await browserAPI.storage.sync.get({ showMoney: false });
    return showMoney;
  } catch (err) {
    console.error('[LEGO Total Insider Points Extension] Error loading showMoney:', err);
    return false;
  }
}

async function saveShowMoney(showMoney) {
  try {
    await browserAPI.storage.sync.set({ showMoney });
    showStatus(getMessage('settingsSaved'));
    const currentSymbol = await loadSymbol();
    updatePreview(currentSymbol);
  } catch (err) {
    console.error('[LEGO Total Insider Points Extension] Error saving showMoney:', err);
  }
}

// Update preview function
function updatePreview(symbol) {
  const preview = document.getElementById('preview');
  const showMoney = document.getElementById("showMoney")?.checked
  // FIXME: make this share the same source as content script
  const points = window.totalInsiderPoints.totalPoints || 47264
  let text = `${symbol} ${points.toLocaleString("DE")}`;
  if (showMoney) {
    text += ` (≈${window.totalInsiderPoints.calculateMoneySpent(points, "DE")})`;
  }
  preview.textContent = text;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  localizeHtmlPage();
  renderSymbols();
});
