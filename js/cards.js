window.isCardsPopout = true;
const syncKey = "bingo_shared_state_v1";
let bingoPoints = { horizontal: 1, vertical: 2, diagonal: 3, full: 5 };

function escapeHTML(str) {
  return String(str||"").replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[m];
  });
}
function bingoTypeString(type) {
  return {
    horizontal: "Horizontal (+1)",
    vertical: "Vertical (+2)",
    diagonal: "Diagonal (+3)",
    full: "Full Card (+5)"
  }[type] || type;
}

// --- AUTO-HIGHLIGHT (NO INTERACTION) ---
function getAutoMarks(cardObj, calledNumbers) {
  let marks = Array(5).fill(null).map(()=>Array(5).fill(false));
  marks[2][2] = true; // Free space
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) continue; // Free
      const val = cardObj.card[row][col];
      if (calledNumbers.includes(val)) marks[row][col] = true;
    }
  }
  return marks;
}

function renderCards(allCards=[], lastBingoHighlights={}, pendingBingoConfirms={}, calledNumbers=[]) {
  const cardsDiv = document.getElementById('cards');
  cardsDiv.innerHTML = '';
  allCards.forEach(cardObj => {
    const marks = getAutoMarks(cardObj, calledNumbers);
    const cardDiv = document.createElement('div');
    cardDiv.className = 'bingo-card';
    cardDiv.innerHTML = `
      <div class="card-title">${escapeHTML(cardObj.name)}</div>
      <div class="card-grid">
        ${renderCardGrid(cardObj, marks)}
      </div>
      ${renderBingoConfirmUI(cardObj, pendingBingoConfirms)}
    `;
    cardsDiv.appendChild(cardDiv);
  });
}
function renderCardGrid(cardObj, marks) {
  let html = '';
  const header = ['B', 'I', 'N', 'G', 'O'];
  header.forEach(h => html += `<div class="cell" style="background:none;font-weight:bold;color:#6ea8fe;">${h}</div>`);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      let val = cardObj.card[row][col];
      let classes = "cell";
      if (val === 'FREE') classes += " free";
      if (marks && marks[row][col]) classes += " marked";
      html += `<div class="${classes}">${val}</div>`;
    }
  }
  return html;
}
function renderBingoConfirmUI(cardObj, pendingBingoConfirms) {
  const bingos = pendingBingoConfirms[cardObj.id];
  if (!bingos || !bingos.length) return '';
  const bingo = bingos[0];
  const bingoStr = bingoTypeString(bingo.type);
  const nums = bingo.numbers.filter(n => n !== 'FREE').join(', ');
  return `
    <div class="bingo-confirm-container" id="bingo-confirm-${cardObj.id}">
      <div class="bingo-confirm-msg">
        Confirm <span class="bingo-type">${bingoStr}</span> bingo? <br>
        ${nums ? 'Numbers: ' + nums : "(center free)"}
      </div>
      <button class="bingo-confirm-btn" onclick="window.confirmBingo(${cardObj.id})">Confirm Bingo</button>
    </div>
  `;
}
window.confirmBingo = function(cardId) {
  let data = JSON.parse(localStorage.getItem(syncKey));
  let card = (data.allCards||[]).find(c=>c.id===cardId);
  let pending = data.pendingBingoConfirms || {};
  if (!card || !pending[cardId] || !pending[cardId].length) return;
  const bingo = pending[cardId].shift();
  card.bingoHistory.push(bingo);
  card.bingos = card.bingoHistory.length;
  card.points = card.bingoHistory.reduce((sum, b) => sum + bingoPoints[b.type], 0);
  if (pending[cardId].length === 0) {
    delete pending[cardId];
    (data.lastBingoHighlights||{})[cardId] = [];
  } else {
    (data.lastBingoHighlights||{})[cardId] = pending[cardId][0].cells;
  }
  localStorage.setItem(syncKey, JSON.stringify(data));
  renderCards(data.allCards, data.lastBingoHighlights, data.pendingBingoConfirms, data.calledNumbers);
};
function syncFromStorage() {
  let data = localStorage.getItem(syncKey);
  if (data) {
    let obj = JSON.parse(data);
    renderCards(obj.allCards||[], obj.lastBingoHighlights||{}, obj.pendingBingoConfirms||{}, obj.calledNumbers||[]);
  }
}
window.addEventListener("storage", syncFromStorage);
window.onload = syncFromStorage;