import React, { useState, useEffect } from "react";

const API = "http://localhost:8000/api";

const AVATARS = [
  "🦁","🦊","🐼","🐵","🐯","🐷","🐻","🐵","🦁","🐶"
];

const THEMES = [
  { label: "Classic", bg: "#eaf6ef", felt: "#35654d", accent: "#0c7b36" },
  { label: "Night", bg: "#181C23", felt: "#252850", accent: "#5BFFD0" },
  { label: "Retro", bg: "#FFFBEC", felt: "#D1C145", accent: "#F45B6A" },
];

function randomDelay(min=500, max=1600) {
  return Math.floor(Math.random() * (max-min)) + min;
}

function App() {
  const [state, setState] = useState(null);
  const [suggest, setSuggest] = useState(null);
  const [raiseAmt, setRaiseAmt] = useState(50);
  const [numBots, setNumBots] = useState(3);
  const [prevBoard, setPrevBoard] = useState([]);
  const [prevPot, setPrevPot] = useState(0);
  const [chipAnim, setChipAnim] = useState(false);
  const [handLogs, setHandLogs] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winnersPanel, setWinnersPanel] = useState(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [showHandHistory, setShowHandHistory] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [currentActionLog, setCurrentActionLog] = useState([]);

  const theme = THEMES[themeIdx];

  useEffect(() => {
    if (!state || state.street === "pre-deal" || gameOver) return;

    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API}/state`);
        const j = await r.json();
        if (j && j.players) {
          if (j.pot > prevPot) {
            setChipAnim(true);
            setTimeout(() => setChipAnim(false), 600);
          }
          setPrevPot(j.pot);
          setState(j);

          // Update current action log
          if (j.actionLog) {
            setCurrentActionLog(j.actionLog);
          }

          if (j.handOver && !showSummary) {
            // Save to hand history
            setHandLogs(prev => [...prev, { 
              handNum: prev.length+1, 
              logs: j.actionLog || [],
              winners: j.summary ? j.summary.filter(s => s.winner) : []
            }]);
            
            setShowSummary(true);
            if (j.summary) {
              setWinnersPanel(j.summary.map((s, idx) => ({
                name: s.name,
                hand: s.hand,
                type: s.rank,
                winner: s.winner,
                winnings: s.winnings,
                avatar: AVATARS[idx % AVATARS.length],
              })));
            }
            const hero = j.players.find(p => p.name === "Hero");
            if (hero?.stack <= 0) setGameOver(true);
            
            // Clear current action log for next hand
            setTimeout(() => setCurrentActionLog([]), 2000);
          }

          if (j.toAct !== "Hero" && !j.handOver && !showSummary) {
            setBotThinking(true);
            setBotInfo(`${j.toAct} is thinking...`);
            setTimeout(() => setBotThinking(false), randomDelay(700, 1800));
          }
        }
      } catch (err) {
        console.error("State fetch error:", err);
      }
    }, 1250);

    return () => clearInterval(id);
  }, [prevPot, showSummary, gameOver, state?.toAct]);

  const createTable = async () => {
    try {
      const r = await fetch(`${API}/table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numBots }),
      });
      if (!r.ok) throw new Error(`HTTP error! Status: ${r.status}`);
      const j = await r.json();
      console.log("Create Table Response:", j);
      if (!j || !j.players) {
        alert("Error: Invalid table data from server!");
        return;
      }
      setState(j);
      setSuggest(null);
      setPrevBoard([]);
      setPrevPot(0);
      setHandLogs([]);
      setShowSummary(false);
      setGameOver(false);
      setWinnersPanel(null);
      setBotThinking(false);
      setBotInfo(null);
      setCurrentActionLog([]);
    } catch (err) {
      console.error("Create Table error:", err);
      alert("Failed to create table. See console for details.");
    }
  };

  const deal = async () => {
    if (gameOver) return;
    try {
      const r = await fetch(`${API}/deal`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP error! Status: ${r.status}`);
      const j = await r.json();
      console.log("Deal Response:", j);
      setPrevBoard(state?.board || []);
      setState(j);
      setSuggest(null);
      setShowSummary(false);
      setWinnersPanel(null);
      setBotThinking(false);
      setBotInfo(null);
      setCurrentActionLog(j.actionLog || []);

      setHandLogs(logs => {
        if (logs.length > 15) return logs.slice(-14);
        return logs;
      });
    } catch (err) {
      console.error("Deal error:", err);
      alert("Failed to deal. See console for details.");
    }
  };

  const getSuggest = async () => {
    try {
      const r = await fetch(`${API}/suggest`, { method: "POST" });
      const j = await r.json();
      setSuggest(j);
    } catch (err) {
      console.error("Suggest error:", err);
      alert("Failed to get suggestion.");
    }
  };

  const doAction = async (action, amount = 0) => {
    try {
      const r = await fetch(`${API}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount: Number(amount) || 0 }),
      });
      const j = await r.json();
      if (j.state) {
        const newState = j.state;
        setPrevBoard(state?.board || []);
        if (newState.pot > prevPot) {
          setChipAnim(true);
          setTimeout(() => setChipAnim(false), 600);
        }
        setPrevPot(newState.pot);
        setState(newState);
        setSuggest(null);
        setCurrentActionLog(newState.actionLog || []);
        
        if (newState.handOver) {
          setShowSummary(true);
          if (newState.summary && newState.summary.length > 0) {
            setWinnersPanel(newState.summary.map((s, idx) => ({
              name: s.name,
              hand: s.hand,
              type: s.rank,
              winner: s.winner,
              winnings: s.winnings,
              avatar: AVATARS[idx % AVATARS.length]
            })));
          }
          const hero = newState.players.find(p => p.name === "Hero");
          if (hero?.stack <= 0) setGameOver(true);
        }
      } else if (j.error) {
        alert(j.error);
      }
    } catch (err) {
      console.error("Action error:", err);
      alert("Failed to perform action.");
    }
  };

  function WinnerPanel({ winners, show }) {
    if (!winners) return null;
    return (
      <div style={{
        ...styles.panel,
        marginTop: 18,
        background: "#f7ffef",
        boxShadow: "0 2px 12px #d0ffbc55",
        transition: "transform 0.6s cubic-bezier(.32,1.56,.75,1.14)",
        transform: show ? "scale(1.10) rotate(-1deg)" : "scale(0.95)"
      }}>
        <h3 style={{color: "#3c9a2e", letterSpacing:1}}>🏆 Winners</h3>
        {winners.map((w, i) => (
          <div key={w.name+i}
            style={{
              background: w.winner ? "#b9f7b5" : "#eedaf4",
              padding: 9, borderRadius: 9,
              marginBottom: 3,
              display: "flex", alignItems: "center", fontWeight: 500
            }}>
            <span style={{fontSize:"1.7em", marginRight: 8}}>{w.avatar}</span>
            <b>{w.name}</b> — {w.type} — [{w.hand.join(" ")}] {w.winner && <span style={{color:"#378"}}>+<b>{w.winnings}</b></span>}
          </div>
        ))}
      </div>
    );
  }

  function AdvicePanel() {
    if (!suggest)
      return <div style={styles.panelMuted}>Click <b>Get Suggestion</b> to receive expert AI poker advice.</div>;
    return (
      <div style={{...styles.panel, background: "#f8fff9", border:'2px solid #e6fbe0'}}>
        <div style={{fontWeight: 700, marginBottom: 6, fontSize: 17, color: theme.accent}}>AI Suggestion</div>
        <div style={{ padding: 5 }}>
          <p style={{margin:"4px 0"}}><b>Advice: </b>
            <span style={{fontFamily:'monospace', fontWeight:500}}>{suggest.advice}</span>
          </p>
          {suggest.reason && <p style={{fontSize:14, color:"#396"}}><b>Why?</b> {suggest.reason}</p>}
        </div>
        <div style={{marginTop:8, fontSize:14}}>
          <b>Hand Strength:</b> <span style={{color:"#166"}}>{suggest.current_strength}</span>
        </div>
        <div style={{marginTop:4, color:'#533'}}>
          <b>Prediction:</b> <span>{suggest.prediction}</span>
        </div>
        {suggest.detailed_chances && (
        <>
          <hr style={{ margin: "10px 0" }} />
          <div style={{fontSize:15}}><b>Chances:</b></div>
          <ul style={{ padding: 0, listStyle: "none" }}>
            {Object.entries(suggest.detailed_chances).map(([hand, chance]) => (
              <li key={hand} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>{hand}</span>
                  <span>{chance}</span>
                </div>
                <div style={styles.probBarContainer}>
                  <div style={{ ...styles.probBar, width: chance }} />
                </div>
              </li>
            ))}
          </ul>
        </>
        )}
      </div>
    );
  }

  const maxStack = state?.players?.reduce((max, p) => Math.max(max, p.stack), 1) || 1;

  return (
    <div style={{minHeight:"100vh", background:theme.bg, padding:0, margin:0, fontFamily:"system-ui,sans-serif"}}>
      <div style={{
        width:"100vw", minHeight:"100vh",
        background:theme.felt,
        display:'flex', alignItems:'flex-start', justifyContent:'center', padding: 20}}
      >
        <div style={{width:"min(1400px,95vw)", background:"#fff", borderRadius:20, padding:18, boxShadow:"0 8px 44px #1112"}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', marginBottom:8}}>
            <h1 style={styles.title}>Poker Assist <span style={{fontSize:18, color:"#a88343"}}>♠️ Playable</span></h1>
            <div>
              <label style={{marginRight:12, fontWeight:500}}>Theme:</label>
              <select value={themeIdx} onChange={e=>setThemeIdx(+e.target.value)} style={styles.select}>
                {THEMES.map((t,i)=><option value={i} key={t.label}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div style={styles.controlsRow}>
            <div style={styles.inline}>
              <label style={styles.label}>Bots:</label>
              <select value={numBots} onChange={e=>setNumBots(+e.target.value)} style={styles.select}>
                {[1,2,3,4,5].map(n =><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button style={styles.btn} onClick={createTable}>Create Table</button>
            <button style={styles.btn} onClick={deal}>Deal</button>
            <button style={styles.btnAccent} onClick={getSuggest}>Get Suggestion</button>
            <button style={styles.btnAlt} onClick={()=>setShowHandHistory(s=>!s)}>
              {showHandHistory?'Hide':'Show'} History
            </button>
          </div>

          <div style={styles.grid}>
            {/* LEFT PANEL - Game State */}
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display: 'flex', gap: 20}}>
                {/* Main Game Area */}
                <div style={{flex: 1}}>
                  <h3 style={styles.section}>
                    Board <small>({state?.street})</small>
                  </h3>
                  <div style={styles.cardsRow}>
                    {state?.board?.map((c, i) => <Card key={i} txt={c} newCard={prevBoard[i] !== c} />)}
                    {Array.from({ length: 5 - (state?.board?.length || 0) }).map((_, i) => (
                      <div key={"b"+i} style={styles.cardEmpty}></div>
                    ))}
                  </div>

                  <h3 style={styles.section}>Players</h3>
                  <ul style={{ lineHeight: 1.8 }}>
                    {state?.players?.map((p, idx) => (
                      <li key={p.id} style={{
                        fontWeight: p.name === state.toAct ? 700 : 500,
                        color: p.folded ? "#999" : "#000",
                        background: p.name === state.toAct ? "rgba(12,123,54,0.08)" : "transparent",
                        padding: "6px 8px",
                        borderRadius: 6,
                        marginBottom: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <div>
                          <span style={{fontSize:"1.5em",marginRight:5}}>{AVATARS[idx]}</span>
                          <b>{p.name}</b> • stack: {p.stack} • {p.hand.join(" ")} {p.folded ? " (folded)" : ""}
                          <div style={styles.stackBarContainer}>
                            <div style={{ ...styles.stackBar, width: `${(p.stack / maxStack) * 100}%` }}></div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          {p.position}{p.allIn ? " • ALL-IN" : ""}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div style={{ marginTop: 12, fontSize: 18, position: "relative" }}>
                    <b>Pot:</b> {state?.pot} | <b>Bet:</b> {state?.currentBet} | <b>To act:</b> <b>{state?.toAct}</b>
                    {chipAnim && <div style={styles.chipAnim}>💰</div>}
                  </div>

                  {botThinking && (
                    <div style={{
                      background:"#eef8ee", borderRadius:12, padding:"8px 24px", marginTop:12,
                      boxShadow:"0 2px 8px #befad473", fontSize:16, color:"#1d8f45", fontWeight:600, display:'inline-block'}}>
                      🤖 {botInfo}
                    </div>
                  )}

                  {state?.toAct === "Hero" && !showSummary && !gameOver && (
                    <div style={styles.actionsBar}>
                      <button style={styles.btn} onClick={() => doAction("fold")}>Fold</button>
                      <button style={styles.btn} onClick={() => doAction("check")}>Check</button>
                      <button
                        style={styles.btn}
                        onClick={() => doAction("call", Math.max(0, state.currentBet - (state.players.find(p => p.name === "Hero")?.roundPut || 0)))}>
                        Call
                      </button>
                      <input type="number" value={raiseAmt} onChange={e => setRaiseAmt(Number(e.target.value))} style={styles.input} />
                      <button style={styles.btnAccent} onClick={() => doAction("raise", raiseAmt)}>Raise</button>
                    </div>
                  )}

                  <WinnerPanel winners={winnersPanel} show={showSummary||gameOver}/>

                  {showSummary && state?.summary && !gameOver && (
                    <div style={styles.summaryBox}>
                      <button style={styles.btnAccent} onClick={deal}>Next Hand →</button>
                    </div>
                  )}

                  {gameOver && (
                    <div style={{ ...styles.panel, marginTop: 16, background: "#ffe4e1" }}>
                      <h3>💀 Game Over</h3>
                      <p>Hero has no chips left. Create a new table to start again.</p>
                      <button style={styles.btnAccent} onClick={createTable}>Create New Table</button>
                    </div>
                  )}
                </div>

                {/* Right Sidebar - Action Log */}
                <div style={{width: 250}}>
                  <h3 style={styles.section}>Action Log</h3>
                  <div style={{...styles.logBox, minHeight: 70, maxHeight: 400, overflowY: 'auto'}}>
                    {currentActionLog && currentActionLog.length > 0 ? (
                      currentActionLog.map((log, idx) => (
                        <div key={idx} style={styles.logItem}>
                          <span style={{color:"#0e6"}}>• </span>{log}
                        </div>
                      ))
                    ) : (
                      <p style={{color:"#999", fontStyle:"italic"}}>No actions yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL - Advice and History */}
            <div style={{width:350, marginLeft:20}}>
              <AdvicePanel/>
              
              {showHandHistory && (
                <div style={{marginTop:14, maxHeight:400, overflowY:"auto"}}>
                  <h3 style={{marginBottom:8}}>Past Hands</h3>
                  {handLogs.slice().reverse().map(h => (
                    <div key={h.handNum} style={{marginBottom:12, padding: 8, background: '#f9f9f9', borderRadius: 8}}>
                      <b style={{fontSize: 16}}>Hand {h.handNum}</b>
                      
                      {/* Show winners if available */}
                      {h.winners && h.winners.length > 0 && (
                        <div style={{margin: '6px 0', padding: 6, background: '#e8f5e9', borderRadius: 4}}>
                          <div style={{fontWeight: 'bold', color: '#2e7d32'}}>Winner{h.winners.length > 1 ? 's' : ''}:</div>
                          {h.winners.map((winner, idx) => (
                            <div key={idx} style={{fontSize: 14}}>
                              {winner.name} - {winner.rank} with {winner.hand.join(' ')}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <ul style={{paddingLeft:12, marginTop:4, fontSize: 13}}>
                        {h.logs.map((l,i)=><li key={i} style={{marginBottom: 3}}>{l}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Card Component ---
function Card({ txt, newCard }) {
  return (
    <div style={{
      width:42, height:60, marginRight:4,
      borderRadius:6, background:'#fff', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontWeight:600, fontSize:18, boxShadow: newCard ? "0 0 8px #0f0" : "0 0 2px #0003",
      transition:"all 0.4s ease"
    }}>{txt || ""}</div>
  );
}

const styles = {
  title:{fontSize:28, margin:0, color:"#222"},
  select:{padding:6, borderRadius:6, border:'1px solid #ccc'},
  btn:{padding:"6px 14px", marginRight:6, borderRadius:6, cursor:'pointer', border:'1px solid #888', background:'#eee'},
  btnAccent:{padding:"6px 14px", marginRight:6, borderRadius:6, cursor:'pointer', border:'1px solid #4a7', background:'#8f8', fontWeight:600},
  btnAlt:{padding:"6px 14px", marginRight:6, borderRadius:6, cursor:'pointer', border:'1px solid #44f', background:'#ccf', fontWeight:500},
  label:{marginRight:4, fontWeight:500},
  controlsRow:{display:'flex', alignItems:'center', marginBottom:14, flexWrap:'wrap'},
  inline:{display:'flex', alignItems:'center', marginRight:12},
  grid:{display:'flex', alignItems:'flex-start', gap: 20},
  section:{margin:'8px 0 4px', fontSize:16, fontWeight:600, color:'#333'},
  cardsRow:{display:'flex', marginBottom:12},
  cardEmpty:{width:42,height:60,marginRight:4},
  actionsBar:{marginTop:12, display:'flex', gap:6, flexWrap:'wrap'},
  input:{width:64, padding:4, borderRadius:4, border:'1px solid #aaa'},
  logBox:{background:'#fafafa', border:'1px solid #ddd', borderRadius:6, padding:6, fontSize:13},
  logItem:{marginBottom:4},
  panel:{padding:12,borderRadius:12, marginBottom:12},
  panelMuted:{padding:12,borderRadius:12, marginBottom:12, background:'#f5f5f5', color:'#888', fontStyle:'italic'},
  stackBarContainer:{width:100, height:6, background:'#ddd', borderRadius:3, marginTop:2},
  stackBar:{height:'100%', background:'#7bc'},
  chipAnim:{position:'absolute', top:-10, right:10, fontSize:28, animation:'float 0.6s ease-in-out'},
  summaryBox:{marginTop:12, textAlign:'center', padding:8},
  probBarContainer:{width:'100%', height:8, background:'#eee', borderRadius:6, marginTop:2},
  probBar:{height:'100%', background:'#4b7', borderRadius:6},
};

export default App;
