// index.js for Bingo Caller main page and card HTML auto-export

const baseSayings = [
  "Kelly’s eye", "One little duck", "Cup of tea", "Knock at the door", "Man alive",
  "Tom Mix/Half a dozen", "Lucky seven", "Garden gate", "Doctor’s orders", "[Prime Minister’s name]’s den",
  "Legs eleven", "One dozen", "Unlucky for some", "Valentine’s Day", "Young and keen",
  "Sweet 16 and never been kissed", "Dancing queen", "Coming of age", "Goodbye teens", "One score",
  "Royal salute/Key of the door", "Two little ducks", "Thee and me", "Two dozen", "Duck and dive",
  "Pick and mix", "Gateway to heaven", "In a state/Over weight", "Rise and shine", "Dirty Gertie",
  "Get up and run", "Buckle my shoe", "Dirty knee/All the threes/Fish, chips & peas", "Ask for more", "Jump and jive",
  "Three dozen", "More than eleven", "Christmas cake", "39 steps", "Life begins",
  "Time for fun", "Winnie the Pooh", "Down on your knees", "Droopy drawers", "Halfway there",
  "Up to tricks", "Four and seven", "Four dozen", "PC", "Half a century",
  "Tweak of the thumb", "Danny La Rue", "Here comes Herbie/Stuck in a tree", "Clean the floor", "Snakes alive",
  "Shotts Bus", "Heinz varieties", "Make them wait", "Brighton Line", "Five dozen",
  "Baker’s bun", "Turn the screw/Tickety-boo", "Tickle me 63", "Red raw", "Old age pension",
  "Clickety click", "Stairway to heaven", "Saving Grace", "Favourite of mine", "Three score and ten",
  "Bang on the drum", "Six dozen", "Queen bee", "Hit the floor", "Strive and strive"
];
const sayings = {}; for (let n = 1; n <= 75; n++) sayings[`${n}`] = baseSayings[n-1] || "";

let bingoPool, calledNumbers, allCards = [], cardIdCounter = 1, lastBingoHighlights = {}, pendingBingoConfirms = {};
const bingoPoints = { horizontal: 1, vertical: 1, diagonal: 3, full: 5 };
const syncKey = "bingo_shared_state_v1";

function syncState() {
  localStorage.setItem(syncKey, JSON.stringify({
    calledNumbers, allCards, lastBingoHighlights, pendingBingoConfirms
  }));
  window.dispatchEvent(new Event('storage'));
}
function loadSyncState() {
  let data = localStorage.getItem(syncKey);
  if (data) {
    let obj = JSON.parse(data);
    calledNumbers = obj.calledNumbers || [];
    allCards = obj.allCards || [];
    lastBingoHighlights = obj.lastBingoHighlights || {};
    pendingBingoConfirms = obj.pendingBingoConfirms || {};
    cardIdCounter = (allCards.map(c=>c.id).reduce((a,b)=>Math.max(a,b),0) || 0) + 1;
  }
}
window.addEventListener("storage", function(e) {
  if (e.key === syncKey || !e.key) {
    if (!window.isCardsPopout) {
      loadSyncState();
      updateCalledList();
      updateScoreTable();
    }
  }
});

function initCaller() {
  bingoPool = [];
  calledNumbers = [];
  for (let n = 1; n <= 75; n++) bingoPool.push(n);
  shuffle(bingoPool);
  document.getElementById('current-call').innerText = '-';
  document.getElementById('current-saying').innerText = '';
  document.getElementById('called-list').innerHTML = '';
  lastBingoHighlights = {};
  pendingBingoConfirms = {};
  allCards.forEach(card => {
    card.bingos = 0;
    card.points = 0;
    card.bingoHistory = [];
  });
  updateScoreTable();
  syncState();
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
function drawNumber() {
  if (bingoPool.length === 0) { alert('All numbers have been called!'); return; }
  const next = bingoPool.shift();
  calledNumbers.push(next);
  document.getElementById('current-call').innerText = next;
  document.getElementById('current-saying').innerText = sayings[`${next}`] || '';
  updateCalledList();
  checkAllForBingo(next);
  updateScoreTable();
  syncState();
}
function updateCalledList() {
  document.getElementById('called-list').innerHTML =
    (calledNumbers||[]).map(num => `<span class="called-number">${num}</span>`).join('');
}
function resetCaller() {
  if (confirm('Reset all called numbers and scores?')) {
    initCaller();
    syncState();
  }
}
function addCard(event) {
  event.preventDefault();
  const nameInput = document.getElementById('card-name');
  const name = nameInput.value.trim();
  if (!name) return;
  const card = generateBingoCard();
  const cardObj = {
    id: cardIdCounter++,
    name,
    card,
    marks: createInitialMarks(),
    bingos: 0,
    points: 0,
    bingoHistory: []
  };
  allCards.push(cardObj);
  syncState();
  updateScoreTable();
  // Download interactive HTML for the player
  downloadStandaloneCardHTML(name, card);
  nameInput.value = '';
}
function generateBingoCard() {
  const card = [];
  ['B','I','N','G','O'].forEach((letter, col) => {
    let numbers = [];
    for (let n = 1 + col*15; n <= (col+1)*15; n++) numbers.push(n);
    shuffle(numbers);
    for (let row = 0; row < 5; row++) {
      if (!card[row]) card[row] = [];
      card[row][col] = numbers[row];
    }
  });
  card[2][2] = 'FREE';
  return card;
}
function createInitialMarks() {
  let marks = Array(5).fill(null).map(()=>Array(5).fill(false));
  marks[2][2] = true;
  return marks;
}
function checkAllForBingo(currentCallNum = null) {
  lastBingoHighlights = {};
  pendingBingoConfirms = {};
  allCards.forEach(card => {
    updateCardMarks(card);
    let bingoResults = detectNewBingos(card, currentCallNum);
    if (bingoResults.length > 0) {
      pendingBingoConfirms[card.id] = bingoResults;
      lastBingoHighlights[card.id] = bingoResults.flatMap(b => b.cells);
    }
  });
  syncState();
}
function updateCardMarks(cardObj) {
  let marks = createInitialMarks();
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) continue;
      const val = cardObj.card[row][col];
      if (calledNumbers.includes(val)) marks[row][col] = true;
    }
  }
  cardObj.marks = marks;
}
function detectNewBingos(card, currentCallNum) {
  let marks = card.marks;
  let newBingos = [];
  let existing = new Set(card.bingoHistory.map(b => b.key));
  for (let i = 0; i < 5; i++) {
    if (marks[i].every(Boolean)) {
      let key = `row${i}`;
      if (!existing.has(key)) {
        let cells = [];
        for (let c = 0; c < 5; c++) if (isBingoCell(card, i, c, currentCallNum)) cells.push([i, c]);
        newBingos.push({type: "horizontal", key, cells, numbers: cells.map(([r,c]) => card.card[r][c])});
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    if ([0,1,2,3,4].every(j => marks[j][i])) {
      let key = `col${i}`;
      if (!existing.has(key)) {
        let cells = [];
        for (let r = 0; r < 5; r++) if (isBingoCell(card, r, i, currentCallNum)) cells.push([r, i]);
        newBingos.push({type: "vertical", key, cells, numbers: cells.map(([r,c]) => card.card[r][c])});
      }
    }
  }
  if ([0,1,2,3,4].every(i => marks[i][i])) {
    let key = "diag1";
    if (!existing.has(key)) {
      let cells = [];
      for (let i = 0; i < 5; i++) if (isBingoCell(card, i, i, currentCallNum)) cells.push([i, i]);
      newBingos.push({type: "diagonal", key, cells, numbers: cells.map(([r,c]) => card.card[r][c])});
    }
  }
  if ([0,1,2,3,4].every(i => marks[i][4-i])) {
    let key = "diag2";
    if (!existing.has(key)) {
      let cells = [];
      for (let i = 0; i < 5; i++) if (isBingoCell(card, i, 4-i, currentCallNum)) cells.push([i, 4-i]);
      newBingos.push({type: "diagonal", key, cells, numbers: cells.map(([r,c]) => card.card[r][c])});
    }
  }
  if ([0,1,2,3,4].every(r => marks[r].every(Boolean))) {
    let key = "full";
    if (!existing.has(key)) {
      let cells = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (isBingoCell(card, r, c, currentCallNum)) cells.push([r,c]);
      newBingos.push({type: "full", key, cells, numbers: cells.map(([r,c]) => card.card[r][c])});
    }
  }
  return newBingos;
}
function isBingoCell(card, row, col, currentCallNum) {
  if (row === 2 && col === 2) return false;
  const val = card.card[row][col];
  return (val === currentCallNum);
}
function updateScoreTable() {
  const tbody = document.querySelector("#bingo-score-table tbody");
  tbody.innerHTML = "";
  (allCards||[]).forEach(card => {
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHTML(card.name)}</td>
      <td>${card.bingoHistory.reduce((sum, b) => sum + bingoPoints[b.type], 0)}</td>
    `;
    tbody.appendChild(tr);
  });
}
function openCardsPage() {
  window.open('cards.html', 'bingo_cards', 'width=1100,height=800');
}
function escapeHTML(str) {
  return String(str||"").replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[m];
  });
}

// --- AUTO-GENERATE STANDALONE CARD HTML FILE ---
function downloadStandaloneCardHTML(cardName, cardData) {
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
      return ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
      })[m];
    });
  }
  const cardNameSafe = cardName.replace(/[^a-z0-9\-_]/gi, "_");
  const jsonCardName = JSON.stringify(cardName);
  const jsonCardData = JSON.stringify(cardData);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bingo Card - ${escapeHTML(cardName)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --primary: #6ea8fe;
      --card-bg: #23263a;
      --border-radius: 18px;
      --shadow: 0 4px 24px #0008;
      --cell-border: #a3c4f3;
      --cell-bg: #27293f;
      --cell-mark: #2d6a4f;
      --cell-mark-bg: #52b78820;
      --cell-free-bg: #444054;
      --cell-free-txt: #e63946;
      --text-main: #e9eaf3;
    }
    body {
      background: var(--card-bg);
      min-height: 100vh;
      margin: 0;
      font-family: "Segoe UI", "Roboto", Arial, sans-serif;
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }
    .bingo-card {
      min-width: 260px;
      max-width: 320px;
      padding: 18px 16px 16px 16px;
      background: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow);
      margin: 48px auto 18px auto;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 0;
      cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="red" fill-opacity="0.6"/><circle cx="16" cy="16" r="6" fill="red" fill-opacity="0.9"/></svg>') 16 16, pointer;
    }
    .card-title {
      font-size: 1.33em;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--primary);
      width: 100%;
      text-align: center;
      letter-spacing: 1px;
      text-shadow: 0 2px 8px #0008;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(5, 60px);
      grid-gap: 4px;
      margin-bottom: 10px;
    }
    .cell {
      width: 50px;
      height: 50px;
      background: var(--cell-bg);
      border: 2px solid var(--cell-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.18em;
      border-radius: 7px;
      box-shadow: 0 1px 3px #0002;
      color: var(--text-main);
      cursor: inherit;
      user-select: none;
      transition: background 0.16s, color 0.16s, box-shadow 0.16s;
      position: relative;
      margin-bottom: 5px;
    }
    .cell.clickable:not(.free) {
      cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="red" fill-opacity="0.6"/><circle cx="16" cy="16" r="6" fill="red" fill-opacity="0.9"/></svg>') 16 16, pointer;
    }
    .cell.free {
      background: var(--cell-free-bg);
      color: var(--cell-free-txt);
      font-weight: 700;
      border: 2px dashed #f0b;
    }
    .cell.marked {
      background: #e63946 !important;
      color: #fff !important;
      box-shadow: 0 0 0 4px #e6394633;
      border: 2px solid #fff;
      position: relative;
    }
    .cell .stamp {
      position: absolute;
      left: 50%; top: 50%;
      transform: translate(-50%,-50%);
      pointer-events: none;
      z-index: 2;
      border-radius: 50%;
      width: 28px; height: 28px;
      background: radial-gradient(circle, #e63946 85%, #fff0 100%);
      opacity: 0.7;
      box-shadow: 0 0 8px #e63946;
    }
    .reset-btn {
      margin: 16px auto 0 auto;
      background: #6ea8fe;
      color: #23263a;
      font-weight: 700;
      border: none;
      border-radius: 7px;
      font-size: 1em;
      padding: 8px 20px;
      cursor: pointer;
      box-shadow: 0 2px 8px #0006;
      letter-spacing: 1px;
      transition: background 0.16s;
    }
    .reset-btn:hover {
      background: #FBBF24;
      color: #23263a;
    }
  </style>
</head>
<body>
  <div class="bingo-card">
    <div class="card-title">${escapeHTML(cardName)}</div>
    <div class="card-grid" id="card-grid"></div>
    <button class="reset-btn" onclick="resetStamps()">Reset Stamps</button>
  </div>
  <script>
    const card = ${jsonCardData};
    const storageKey = "bingo_marks_" + encodeURIComponent(${jsonCardName});
    function getMarks() {
      let s = localStorage.getItem(storageKey);
      if (s) return JSON.parse(s);
      let arr = Array(5).fill(0).map(()=>Array(5).fill(false));
      arr[2][2] = true;
      return arr;
    }
    function saveMarks(arr) {
      localStorage.setItem(storageKey, JSON.stringify(arr));
    }
    function resetStamps() {
      let arr = Array(5).fill(0).map(()=>Array(5).fill(false));
      arr[2][2] = true;
      saveMarks(arr);
      renderCard();
    }
    function renderCard() {
      let marks = getMarks();
      let grid = document.getElementById('card-grid');
      let html = '';
      const header = ['B','I','N','G','O'];
      header.forEach(h => html += '<div class="cell" style="background:none;font-weight:bold;color:#6ea8fe;">'+h+'</div>');
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          let val = card[row][col];
          let classes = "cell";
          if (val === 'FREE') classes += " free";
          else classes += " clickable";
          if (marks && marks[row][col]) classes += " marked";
          html += '<div class="'+classes+'" data-row="'+row+'" data-col="'+col+'">'+val+(marks && marks[row][col] && val !== 'FREE' ? '<span class="stamp"></span>' : '')+'</div>';
        }
      }
      grid.innerHTML = html;
      grid.querySelectorAll('.cell.clickable').forEach(cell => {
        cell.onclick = function() {
          const r = +this.getAttribute('data-row');
          const c = +this.getAttribute('data-col');
          marks[r][c] = !marks[r][c];
          saveMarks(marks);
          renderCard();
        };
      });
    }
    renderCard();
  </script>
</body>
</html>`;
  // Now create a Blob and trigger download
  const blob = new Blob([html], {type: "text/html"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bingo-card-${cardNameSafe}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
// --end card export function--

window.openCardsPage = openCardsPage;
window.onload = function() {
  loadSyncState();
  if (!calledNumbers) calledNumbers = [];
  if (!allCards) allCards = [];
  updateCalledList();
  updateScoreTable();
  syncState();
};

function resetEverything() {
  // Remove the localStorage key
  localStorage.removeItem("bingo_shared_state_v1");
  // Optionally remove all per-card stamp data as well:
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("bingo_marks_")) localStorage.removeItem(key);
  });
  // Clear in-memory variables
  bingoPool = [];
  calledNumbers = [];
  allCards = [];
  cardIdCounter = 1;
  lastBingoHighlights = {};
  pendingBingoConfirms = {};
  // Update UI
  document.getElementById('current-call').innerText = '-';
  document.getElementById('current-saying').innerText = '';
  document.getElementById('called-list').innerHTML = '';
  updateScoreTable();
  syncState();
  resetCaller();
}