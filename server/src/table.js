const { getHandRank, handRankToName } = require("./evaluator");

const SMALL_BLIND=10;
const BIG_BLIND=20;
function chip(x){ return Math.max(0,Math.floor(x)); }
function newDeck(){
  const ranks="23456789TJQKA", suits=["h","d","c","s"], deck=[];
  for(const r of ranks) for(const s of suits) deck.push(r+s);
  for(let i=deck.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
  return deck;
}

class Table{
  constructor(maxPlayers=6){
    this.players=[]; this.maxPlayers=maxPlayers; this.dealerIndex=-1;
    this.resetHand();
  }
  resetHand(){
    this.deck=newDeck(); this.board=[]; this.pot=0; this.street="pre-deal";
    this.actionLog=[]; this.turnIndex=-1; this.currentBet=0; this.minRaise=BIG_BLIND;
    this.lastAggressorIndex=null; this.lastAggressorStreet=null; this.lastSummary=null;
  }
  addPlayer(name,isBot=true){
    if(this.players.length>=this.maxPlayers) return;
    const player={
      id:isBot?`B${this.players.length}`:"HERO",
      name,stack:1000,hand:[],folded:false,isHero:!isBot,roundPut:0,totalPut:0,hasActedThisRound:false,allIn:false,position:"NA"
    };
    this.players.push(player); return player;
  }
  positionName(idx){
    const n=this.players.length, d=(idx-this.dealerIndex+n)%n;
    const labelsByN={
      2:["BTN","BB"],3:["BTN","SB","BB"],4:["BTN","SB","BB","UTG"],
      5:["BTN","SB","BB","UTG","CO"],6:["BTN","SB","BB","UTG","HJ","CO"]
    };
    return labelsByN[Math.min(6,Math.max(2,n))][d]||"Seat";
  }
  dealNewHand(){
    this.deck=newDeck(); this.board=[]; this.pot=0; this.street="preflop"; this.lastSummary=null;
    if(this.players.length<2){ this.actionLog.push("Waiting for players..."); return; }
    this.players.forEach(p=>{ p.hand=this.deck.splice(0,2); p.folded=false; p.roundPut=0; p.totalPut=0; p.hasActedThisRound=false; p.allIn=false; });
    this.dealerIndex=(this.dealerIndex+1)%this.players.length;
    this.players.forEach((p,i)=>p.position=this.positionName(i));
    const sbIndex=(this.dealerIndex+1)%this.players.length;
    const bbIndex=(this.dealerIndex+2)%this.players.length;
    const sbPlayer=this.players[sbIndex], bbPlayer=this.players[bbIndex];
    const sbAmount=chip(Math.min(sbPlayer.stack,SMALL_BLIND));
    sbPlayer.stack-=sbAmount; sbPlayer.roundPut+=sbAmount; sbPlayer.totalPut+=sbAmount; this.pot+=sbAmount;
    this.actionLog.push(`${sbPlayer.name} posts small blind ${sbAmount}`);
    const bbAmount=chip(Math.min(bbPlayer.stack,BIG_BLIND));
    bbPlayer.stack-=bbAmount; bbPlayer.roundPut+=bbAmount; bbPlayer.totalPut+=bbAmount; this.pot+=bbAmount;
    this.actionLog.push(`${bbPlayer.name} posts big blind ${bbAmount}`);
    this.currentBet=BIG_BLIND; this.minRaise=BIG_BLIND; this.lastAggressorIndex=bbIndex; this.lastAggressorStreet="preflop";
    this.turnIndex=(bbIndex+1)%this.players.length;
    while(this.players[this.turnIndex].folded||this.players[this.turnIndex].allIn) this.turnIndex=(this.turnIndex+1)%this.players.length;
    this.actionLog.push("--- New Hand ---");
  }
  toCall(p){ return Math.max(0,this.currentBet-p.roundPut); }
  applyAction(p,action,amount=0){
    if(this.street==="showdown") return;
    const idx=this.players.indexOf(p), name=p.name, prevBet=this.currentBet;
    const take=(need)=>{ const c=chip(Math.min(p.stack,Math.max(0,need))); if(c<=0) return 0; p.stack-=c; p.roundPut+=c; p.totalPut+=c; this.pot+=c; if(p.stack===0) p.allIn=true; return c; };
    if(p.folded||p.allIn) return;

    if(action==="fold"){ p.folded=true; p.hasActedThisRound=true; this.actionLog.push(`${name} folds`); }
    else if(action==="check"){
      if(this.toCall(p)>0){ const paid=take(this.toCall(p)); p.hasActedThisRound=true; this.actionLog.push(`${name} forced-call ${paid} (illegal check)`); }
      else{ p.hasActedThisRound=true; this.actionLog.push(`${name} checks`); }
    }
    else if(action==="call"){ const paid=take(this.toCall(p)); p.hasActedThisRound=true; this.actionLog.push(`${name} calls ${paid}${p.allIn?" (all-in)":""}`); }
    else if(action==="raise"){
      let target=chip(amount); if(target<prevBet) target=prevBet;
      const inc=target-prevBet;
      if(prevBet>0&&inc<this.minRaise){ const neededToMin=prevBet+this.minRaise; if(p.roundPut+p.stack>=neededToMin) target=neededToMin; }
      const paid=take(Math.max(0,target-p.roundPut)); p.hasActedThisRound=true;
      if(p.roundPut>prevBet){ const newBet=p.roundPut, increase=newBet-prevBet; this.currentBet=newBet;
        if(increase>=this.minRaise||!p.allIn){ this.minRaise=Math.max(this.minRaise,increase); this.lastAggressorIndex=idx; this.lastAggressorStreet=this.street;
          this.players.forEach(pl=>{ if(!pl.folded&&!pl.allIn&&pl.id!==p.id) pl.hasActedThisRound=false; });
        }
        const label=prevBet===0?"bets":"raises to";
        this.actionLog.push(`${name} ${label} ${newBet}${p.allIn?" (all-in)":""}`);
      } else this.actionLog.push(`${name} calls ${paid}${p.allIn?" (all-in)":""}`);
    }

    if(this.players.filter(x=>!x.folded).length<=1) this.handleShowdown();
  }
  roundClosed(){
    const active=this.players.filter(p=>!p.folded);
    if(active.length<=1) return true;
    const allBetsMatch=active.every(p=>p.allIn||p.roundPut===this.currentBet);
    const allHaveActed=active.every(p=>p.allIn||p.hasActedThisRound);
    if(this.currentBet===0) return active.every(p=>p.allIn||p.hasActedThisRound);
    return allBetsMatch&&allHaveActed;
  }
  dealNextStreet(){
    const active=this.players.filter(p=>!p.folded); if(active.length<=1){ this.handleShowdown(); return; }
    if(this.street==="preflop"){ this.board.push(...this.deck.splice(0,3)); this.street="flop"; this.actionLog.push(`--- FLOP --- ${this.board.join(" ")}`); }
    else if(this.street==="flop"){ this.board.push(...this.deck.splice(0,1)); this.street="turn"; this.actionLog.push(`--- TURN --- ${this.board[3]}`); }
    else if(this.street==="turn"){ this.board.push(...this.deck.splice(0,1)); this.street="river"; this.actionLog.push(`--- RIVER --- ${this.board[4]}`); }
    else{ this.street="showdown"; this.handleShowdown(); return; }

    this.players.forEach(p=>{ p.roundPut=0; p.hasActedThisRound=p.allIn; });
    this.currentBet=0; this.minRaise=BIG_BLIND; this.lastAggressorIndex=null; this.lastAggressorStreet=null;
    let first=(this.dealerIndex+1)%this.players.length;
    while(this.players[first].folded||this.players[first].allIn) first=(first+1)%this.players.length;
    this.turnIndex=first;
  }
  buildSidePots(){
    const contrib=this.players.map(p=>p.totalPut);
    const levels=[...new Set(contrib.filter(x=>x>0))].sort((a,b)=>a-b);
    let prev=0, pots=[];
    for(const L of levels){
      const layerSize=L-prev; if(layerSize<=0){ prev=L; continue; }
      let potAmount=0;
      for(let i=0;i<this.players.length;i++){ const paid=Math.min(contrib[i],L)-prev; if(paid>0) potAmount+=paid; }
      const eligible=this.players.filter((p,i)=>!p.folded&&contrib[i]>=L);
      pots.push({amount:chip(potAmount), eligible}); prev=L;
    }
    return pots;
  }
  bestAmong(playersArr){
    let bestScore=[-1], winners=[];
    for(const p of playersArr){
      const score=getHandRank(p.hand.concat(this.board));
      let isNewBest=false, isTie=true;
      for(let i=0;i<Math.max(bestScore.length,score.length);i++){
        const s_val=score[i]??-1, b_val=bestScore[i]??-1;
        if(s_val>b_val){ isNewBest=true; isTie=false; break; }
        if(s_val<b_val){ isTie=false; break; }
      }
      if(isNewBest){ bestScore=score; winners=[p]; }
      else if(isTie) winners.push(p);
    }
    return winners;
  }
  handleShowdown(){
    this.street="showdown";
    const active=this.players.filter(p=>!p.folded);
    const summary={winners:[], losers:[], board:this.board};
    if(active.length===1){
      const w=active[0]; w.stack+=this.pot;
      const handRank=handRankToName(getHandRank(w.hand.concat(this.board)));
      this.actionLog.push(`${w.name} wins ${this.pot}.`);
      summary.winners.push({name:w.name, hand:w.hand, rank:handRank, pot:this.pot}); this.pot=0;
    } else{
      const pots=this.buildSidePots();
      if(pots.length===0){
        const winners=this.bestAmong(active);
        const share=chip(this.pot/winners.length);
        winners.forEach(w=>{ w.stack+=share; const rank=handRankToName(getHandRank(w.hand.concat(this.board))); this.actionLog.push(`${w.name} wins ${share}.`); summary.winners.push({name:w.name,hand:w.hand,rank,pot:share}); });
        this.pot=0;
      } else{
        for(const pot of pots){ if(pot.amount<=0||pot.eligible.length===0) continue;
          const winners=this.bestAmong(pot.eligible);
          const share=chip(pot.amount/winners.length);
          winners.forEach(w=>{ w.stack+=share; const rank=handRankToName(getHandRank(w.hand.concat(this.board))); this.actionLog.push(`${w.name} wins ${share} from side pot.`); summary.winners.push({name:w.name,hand:w.hand,rank,pot:share}); });
        } this.pot=0;
      }
      active.forEach(p=>{ if(!summary.winners.find(w=>w.name===p.name)){ const rank=handRankToName(getHandRank(p.hand.concat(this.board))); summary.losers.push({name:p.name,hand:p.hand,rank}); }});
    }
    this.lastSummary=summary;
  }
  nextTurn(){ if(this.street==="showdown") return;
    const n=this.players.length;
    for(let i=1;i<=n;i++){ const j=(this.turnIndex+i)%n; const pl=this.players[j]; if(!pl.folded&&!pl.allIn){ this.turnIndex=j; return; } }
  }
  visibleState(){ return {
    street:this.street,
    board:this.board,
    pot:this.pot,
    currentBet:this.currentBet,
    minRaise:this.minRaise,
    toAct:this.players[this.turnIndex]?.name||"Game Over",
    players:this.players.map(p=>({id:p.id,name:p.name,stack:p.stack,folded:p.folded,position:p.position,allIn:p.allIn,hand:(p.isHero||this.street==="showdown")?p.hand:["??","??"]})),
    actionLog:this.actionLog,
    summary:this.lastSummary
  }; }
}

module.exports={Table, SMALL_BLIND, BIG_BLIND};
