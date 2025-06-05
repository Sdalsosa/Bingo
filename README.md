# Bingo Caller & Cards Project

This project includes:

- **index.html** – Main bingo caller page
- **cards.html** – Pop-out window for interactive cards & bingo confirmation
- **index.css** – Dark mode/main styling for index.html
- **index.js** – Main logic for index.html (add cards, caller, sync, auto HTML card download)
- **cards.css** – Styling for cards.html
- **cards.js** – Logic for cards.html (marking, confirmations)
- **/cards/** – Standalone, interactive HTML files for each player's card (auto-generated, example included)

## Usage

1. **index.html** is the main interface for the bingo caller and card management.
2. **cards.html** is opened from index.html to display all cards, allow stamping, and bingo confirmation.
3. When you add a card in index.html, it will auto-download a standalone HTML file for the new card in `/cards/` (see `index.js`).
4. Players can open their card HTML in any browser, mark numbers, and the marked state is saved locally.

---

## To Generate Standalone Card Files

The function in `index.js` called `downloadStandaloneCardHTML(cardName, cardData)` automatically creates a new interactive bingo card HTML file for each player.

---