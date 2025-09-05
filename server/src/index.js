// index.js (Game server, uses ML advisor at http://127.0.0.1:8001)
const express = require("express");
const cors = require("cors");
const { Table } = require("./table");

const fetchFn = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

let table = null;
const ML_URL = "http://127.0.0.1:8001";
const delay = ms => new Promise(res => setTimeout(res, ms));

async function runBotTurns() {
  if (!table) return;

  // Loop while it's a bot's turn
  while (table && table.players[table.turnIndex] && !table.players[table.turnIndex].isHero) {
    if (table.street === 'showdown') break;
    const bot = table.players[table.turnIndex];
    if (bot.folded || bot.allIn) { table.nextTurn(); continue; }

    // small delay to feel natural
    await delay(300 + Math.random() * 900);

    const toCall = Math.max(0, table.currentBet - bot.roundPut);

    // First ask ML for suggestion (to get strong_chance & advice)
    try {
      const r = await fetchFn(`${ML_URL}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: bot.hand,
          board: table.board,
          pot: table.pot,
          to_call: toCall,
          street: table.street,
          position: bot.position || ""
        })
      });
      const s = await r.json();
      const strong = Number(s.strong_chance || 0);

      // Safety threshold: if very weak (<20%) and there is a bet to call, fold.
      if (strong < 0.20 && toCall > 0) {
        table.applyAction(bot, "fold");
      } else {
        // Ask ML to convert advice -> discrete action
        try {
          const ra = await fetchFn(`${ML_URL}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hero: bot.hand,
              board: table.board,
              pot: table.pot,
              to_call: toCall,
              street: table.street,
              position: bot.position || ""
            })
          });
          const ja = await ra.json();
          const act = (ja.action || "call");
          const amt = Number(ja.amount) || 0;
          table.applyAction(bot, act, amt);
        } catch (e) {
          // ML action endpoint failed: fallback to tiered policy using strong
          if (strong >= 0.75) {
            const raiseAmt = Math.max(table.pot, toCall + Math.min(bot.stack, Math.floor(table.pot * 0.8)));
            table.applyAction(bot, "raise", raiseAmt);
          } else if (strong >= 0.5) {
            const raiseAmt = Math.max(toCall + 20, Math.min(bot.stack, Math.floor(table.pot * 0.5)));
            table.applyAction(bot, "raise", raiseAmt);
          } else if (toCall > 0) {
            table.applyAction(bot, "call", toCall);
          } else {
            table.applyAction(bot, "check", 0);
          }
        }
      }
    } catch (err) {
      // ML down: fallback simple but less aggressive policy
      const toPay = Math.max(0, table.currentBet - bot.roundPut);
      if (toPay > 0) {
        // call small or fold randomly based on stack
        if (toPay > bot.stack * 0.7) {
          table.applyAction(bot, "fold");
        } else {
          table.applyAction(bot, "call", toPay);
        }
      } else {
        table.applyAction(bot, "check", 0);
      }
    }

    // If betting round closed -> advance street
    if (table.roundClosed()) {
      table.dealNextStreet();
      if (table.street === 'showdown') break;
    } else {
      table.nextTurn();
    }
  }
}

app.post("/api/table", (req, res) => {
  const numBots = Number(req.body?.numBots || 3);
  table = new Table(numBots + 1); // +1 to count Hero as a seat
  // add hero then bots
  table.addPlayer("Hero", false);
  for (let i = 1; i <= numBots; i++) table.addPlayer(`Bot${i}`, true);
  res.json(table.visibleState());
});

app.post("/api/deal", async (req, res) => {
  if (!table) return res.status(400).json({ error: "create table first" });
  table.dealNewHand();
  await runBotTurns();
  return res.json(table.visibleState());
});

app.post("/api/suggest", async (req, res) => {
  if (!table) return res.status(400).json({ error: "no table" });
  const hero = table.players[table.turnIndex];
  if (!hero) return res.status(400).json({ error: "no active hero" });
  try {
    const r = await fetchFn(`${ML_URL}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hero: hero.hand,
        board: table.board,
        pot: table.pot,
        to_call: Math.max(0, table.currentBet - hero.roundPut),
        street: table.street,
        position: hero.position || ""
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

  if (table.roundClosed()) table.dealNextStreet();
  else table.nextTurn();

  // let bots act if it's their turn
  await runBotTurns();

  return res.json({ state: table.visibleState() });
});

app.get("/api/state", (req, res) => {
  if (!table) return res.json({});
  return res.json(table.visibleState());
});

app.listen(8000, () => console.log("Game server running on :8000"));
