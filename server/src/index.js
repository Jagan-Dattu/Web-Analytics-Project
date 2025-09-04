// Final, synchronized index.js

const express = require("express");
const cors = require("cors");
const { Table } = require("./table");
const { logEvent } = require("./logger");

const app = express();
app.use(cors());
app.use(express.json());

let table = null;
const delay = ms => new Promise(res => setTimeout(res, ms));

async function runBotTurns() {
  if (!table) return;
  while (table && !table.players[table.turnIndex].isHero) {
    if (table.street === 'showdown') break;
    const bot = table.players[table.turnIndex];
    if (bot.folded) { table.nextTurn(); continue; }
    await delay(1500);
    const toCall = Math.max(0, table.currentBet - bot.roundPut);
    try {
      const r = await fetch("http://127.0.0.1:8001/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: bot.hand, board: table.board, pot: table.pot, to_call: toCall, street: table.street
        })
      });
      const j = await r.json();
      table.applyAction(bot, j.action || "check", Number(j.amount) || 0);
    } catch (e) {
      if (toCall > 0) table.applyAction(bot, "call", toCall);
      else table.applyAction(bot, "check", 0);
    }
    if (table.roundClosed()) {
      table.dealNextStreet();
      if (table.street === 'showdown') break;
    } else {
      table.nextTurn();
    }
  }
}

app.post("/api/table", (req, res) => {
  const { numBots = 3 } = req.body || {};
  table = new Table(numBots + 1);
  table.addPlayer("Hero", false);
  for (let i = 1; i <= numBots; i++) { table.addPlayer(`Bot${i}`, true); }
  return res.json(table.visibleState());
});

app.post("/api/deal", async (req, res) => {
  if (!table) return res.status(400).json({ error: "create table first" });
  table.dealNewHand();
  await runBotTurns();
  return res.json(table.visibleState());
});

app.post("/api/suggest", async (req, res) => { // CHANGED TO POST
  if (!table) return res.status(400).json({ error: "no table" });
  const hero = table.players[0];
  try {
    const r = await fetch("http://127.0.0.1:8001/suggest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // This body now correctly matches the AI server's expectation
        hero: hero.hand,
        board: table.board,
        pot: table.pot,
        to_call: Math.max(0, table.currentBet - hero.roundPut),
        street: table.street
      })
    });
    const suggestion = await r.json();
    return res.json(suggestion);
  } catch (e) {
    return res.status(500).json({ error: "ML service error", detail: e.message });
  }
});

app.post("/api/action", async (req, res) => {
  if (!table) return res.status(400).json({ error: "no table" });
  const { action, amount = 0 } = req.body || {};
  const hero = table.players[table.turnIndex];
  if (!hero || !hero.isHero) return res.status(400).json({ error: "not hero's turn" });
  if (action === "check" && Math.max(0, table.currentBet - hero.roundPut) > 0) {
    return res.status(400).json({ error: "cannot check facing a bet" });
  }
  table.applyAction(hero, action, Number(amount) || 0);
  if (table.roundClosed()) {
    table.dealNextStreet();
  } else {
    table.nextTurn();
  }
  await runBotTurns();
  return res.json({ state: table.visibleState() });
});

app.get("/api/state", (req, res) => {
  if (!table) return res.json({});
  return res.json(table.visibleState());
});

app.listen(8000, () => console.log("Game server running on :8000"));