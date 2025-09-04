// The new, complete table.js file with turn order fix

const { newDeck } = require("./deck");
const { getHandRank } = require("./evaluator");

class Table {
  constructor(maxPlayers = 6) {
    this.players = [];
    this.dealerIndex = -1;
    this.maxPlayers = maxPlayers;
    this.resetHand();
  }

  resetHand() {
    this.deck = newDeck();
    this.board = [];
    this.pot = 0;
    this.street = "pre-deal";
    this.actionLog = [];
    this.turnIndex = -1;
    this.currentBet = 0;
  }

  addPlayer(name, isBot = true) {
    if (this.players.length >= this.maxPlayers) return;
    const player = {
      id: isBot ? `B${this.players.length}` : "HERO",
      name: name,
      stack: 1000,
      hand: [],
      folded: false,
      isHero: !isBot,
      roundPut: 0,
      hasActedThisRound: false,
    };
    this.players.push(player);
    return player;
  }

  dealNewHand() {
    this.resetHand();
    const numPlayers = this.players.length;
    const smallBlind = 10;
    const bigBlind = 20;

    this.street = "preflop";
    this.actionLog.push("--- New Hand ---");

    this.players.forEach((p) => {
      p.hand = this.deck.splice(0, 2);
      p.folded = false;
      p.roundPut = 0;
      p.hasActedThisRound = false; // <-- FIX IS HERE
    });

    this.dealerIndex = (this.dealerIndex + 1) % numPlayers;
    const sbIndex = (this.dealerIndex + 1) % numPlayers;
    const bbIndex = (this.dealerIndex + 2) % numPlayers;

    const sbPlayer = this.players[sbIndex];
    const sbAmount = Math.min(sbPlayer.stack, smallBlind);
    sbPlayer.stack -= sbAmount;
    sbPlayer.roundPut = sbAmount;
    this.pot += sbAmount;
    this.actionLog.push(`${sbPlayer.name} posts small blind of ${sbAmount}`);

    const bbPlayer = this.players[bbIndex];
    const bbAmount = Math.min(bbPlayer.stack, bigBlind);
    bbPlayer.stack -= bbAmount;
    bbPlayer.roundPut = bbAmount;
    this.pot += bbAmount;
    this.actionLog.push(`${bbPlayer.name} posts big blind of ${bbAmount}`);

    this.currentBet = bigBlind;
    this.turnIndex = (bbIndex + 1) % numPlayers;
  }

  applyAction(p, action, amount) {
    p.hasActedThisRound = true; // <-- FIX IS HERE
    const name = p.name;
    if (action === "fold") { p.folded = true; this.actionLog.push(`${name} folds`); }
    else if (action === "check") { this.actionLog.push(`${name} checks`); }
    else if (action === "call") {
      const toPay = Math.max(0, this.currentBet - p.roundPut);
      const paid = Math.min(p.stack, toPay);
      p.stack -= paid; p.roundPut += paid; this.pot += paid;
      this.actionLog.push(`${name} calls ${paid}`);
    } else if (action === "raise") {
      const toPay = Math.max(0, amount - p.roundPut);
      const paid = Math.min(p.stack, toPay);
      p.stack -= paid; p.roundPut += paid; this.pot += paid;
      this.currentBet = p.roundPut;
      // After a raise, everyone else needs to act again
      this.players.forEach(player => {
          if (!player.folded && player.id !== p.id) {
              player.hasActedThisRound = false;
          }
      });
      this.actionLog.push(`${name} raises to ${p.roundPut}`);
    }
  }
  
  // <-- REPLACED FUNCTION
  roundClosed() {
    const active = this.players.filter((p) => !p.folded);
    if (active.length <= 1) return true;

    // Everyone who hasn't folded must have acted
    const allHaveActed = active.every((p) => p.hasActedThisRound);
    // And everyone's bet must match the current bet
    const allBetsMatch = active.every((p) => p.roundPut === this.currentBet);

    return allHaveActed && allBetsMatch;
  }

  dealNextStreet() {
    const active = this.players.filter((p) => !p.folded);
    if (active.length <= 1) { this.handleShowdown(); return; }

    if (this.street === "preflop") {
      this.board.push(...this.deck.splice(0, 3));
      this.street = "flop";
      this.actionLog.push(`--- FLOP --- ${this.board.join(" ")}`);
    } else if (this.street === "flop") {
      this.board.push(...this.deck.splice(0, 1));
      this.street = "turn";
      this.actionLog.push(`--- TURN --- ${this.board[3]}`);
    } else if (this.street === "turn") {
      this.board.push(...this.deck.splice(0, 1));
      this.street = "river";
      this.actionLog.push(`--- RIVER --- ${this.board[4]}`);
    } else if (this.street === "river") {
      this.street = "showdown";
      this.handleShowdown();
      return;
    }

    // Reset for next betting round
    this.players.forEach(p => {
        if (!p.folded) {
            p.roundPut = 0;
            p.hasActedThisRound = false; // <-- FIX IS HERE
        }
    });
    this.currentBet = 0;
    
    let firstToAct = (this.dealerIndex + 1) % this.players.length;
    while (this.players[firstToAct].folded) {
      firstToAct = (firstToAct + 1) % this.players.length;
    }
    this.turnIndex = firstToAct;
  }
  
  handleShowdown() {
    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      winner.stack += this.pot;
      this.actionLog.push(`${winner.name} wins ${this.pot}.`);
      this.pot = 0;
      this.street = "showdown";
      return;
    }

    let bestScore = [-1];
    let winners = [];

    activePlayers.forEach(p => {
      const score = getHandRank(p.hand.concat(this.board));
      let isNewBest = false, isTie = true;
      for (let i = 0; i < Math.max(bestScore.length, score.length); i++) {
        const s_val = score[i] ?? -1, b_val = bestScore[i] ?? -1;
        if (s_val > b_val) { isNewBest = true; isTie = false; break; }
        if (s_val < b_val) { isTie = false; break; }
      }
      if (isNewBest) { bestScore = score; winners = [p]; }
      else if (isTie) { winners.push(p); }
    });

    const potShare = Math.floor(this.pot / winners.length);
    winners.forEach(winner => {
      winner.stack += potShare;
      this.actionLog.push(`${winner.name} wins ${potShare}.`);
    });
    
    this.street = "showdown";
    this.pot = 0;
  }

  nextTurn() {
    if (this.players.filter(p => !p.folded).length <= 1) return;
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const j = (this.turnIndex + i) % n;
      if (!this.players[j].folded) {
        this.turnIndex = j;
        return;
      }
    }
  }

  visibleState() {
    return {
      street: this.street,
      board: this.board,
      pot: this.pot,
      currentBet: this.currentBet,
      toAct: this.players[this.turnIndex]?.name || "Game Over",
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        stack: p.stack,
        folded: p.folded,
        hand: p.isHero || this.street === 'showdown' ? p.hand : ["??", "??"]
      })),
      actionLog: this.actionLog,
    };
  }
}

module.exports = { Table };