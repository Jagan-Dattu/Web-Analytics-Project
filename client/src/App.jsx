import { useEffect, useState } from "react";

const API = "http://localhost:8000/api";

export default function App() {
  const [state, setState] = useState(null);
  const [suggest, setSuggest] = useState(null);
  const [raiseAmt, setRaiseAmt] = useState(50);
  const [numBots, setNumBots] = useState(3);

  const [prevBoard, setPrevBoard] = useState([]);
  const [actionLogKey, setActionLogKey] = useState(0);
  const [prevPot, setPrevPot] = useState(0);
  const [chipAnim, setChipAnim] = useState(false);

  useEffect(() => {
    if (!state || state.street === 'pre-deal' || state.street === 'showdown') return;
    const id = setInterval(async () => {
      const r = await fetch(`${API}/state`);
      const j = await r.json();
      if (j && j.players) {
        if (j.pot > prevPot) {
          setChipAnim(true);
          setTimeout(() => setChipAnim(false), 600);
        }
        setPrevPot(j.pot);
        setState(j);
      }
    }, 1500);
    return () => clearInterval(id);
  }, [state, prevPot]);

  const createTable = async () => {
    const r = await fetch(`${API}/table`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numBots })
    });
    const j = await r.json();
    setState(j); setSuggest(null); setPrevBoard([]); setPrevPot(0);
  };

  const deal = async () => {
    const r = await fetch(`${API}/deal`, { method: "POST" });
    const j = await r.json();
    setPrevBoard(state?.board || []);
    setState(j); setSuggest(null); 
  };

  const getSuggest = async () => {
    const r = await fetch(`${API}/suggest`, { method: "POST" });
    setSuggest(await r.json());
  };

  const doAction = async (action, amount = 0) => {
    const r = await fetch(`${API}/action`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, amount: Number(amount) || 0 })
    });
    const j = await r.json();
    if (j.state) { 
      setPrevBoard(state?.board || []);
      if (j.state.pot > prevPot) {
        setChipAnim(true);
        setTimeout(() => setChipAnim(false), 600);
      }
      setPrevPot(j.state.pot);
      setState(j.state); 
      setSuggest(null); 
      setActionLogKey(prev => prev + 1);
    } else if (j.error) { alert(j.error); }
  };

  const maxStack = state?.players?.reduce((max, p) => Math.max(max, p.stack), 0) || 1;

  return (
    <div style={styles.felt}>
      {/* Animation keyframes */}
      <style>
        {`
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideFadeIn {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes chipJump {
          0% { transform: translateY(0); opacity:1; }
          50% { transform: translateY(-20px); opacity:1; }
          100% { transform: translateY(0); opacity:1; }
        }
        `}
      </style>

      <div style={styles.container}>
        <h1 style={styles.title}>Poker Assist (Playable)</h1>

        <div style={styles.controlsRow}>
          <div style={styles.inline}>
            <label style={styles.label}>Bots:</label>
            <select value={numBots} onChange={(e) => setNumBots(parseInt(e.target.value))} style={styles.select}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button style={styles.btn} onClick={createTable}>Create Table</button>
          <button style={styles.btn} onClick={deal}>Deal</button>
          <button style={styles.btn} onClick={getSuggest}>Get Suggestion</button>
        </div>

        {state && (
          <div style={styles.grid}>
            <div>
              <h3 style={styles.section}>Board <small>({state.street})</small></h3>
              <div style={styles.cardsRow}>
                {state.board?.map((c, i) => (
                  <Card 
                    key={i} 
                    txt={c} 
                    newCard={prevBoard[i] !== c} 
                  />
                ))}
                {Array.from({ length: 5 - (state.board?.length || 0) }).map((_, i) => (
                  <div key={"b" + i} style={styles.cardEmpty}></div>
                ))}
              </div>

              <h3 style={styles.section}>Players</h3>
              <ul style={{ lineHeight: 1.8 }}>
                {state.players?.map((p) => (
                  <li key={p.id} style={{
                    fontWeight: p.name === state.toAct ? 700 : 500,
                    color: p.folded ? '#999' : '#000',
                    background: p.name === state.toAct ? 'rgba(12,123,54,0.2)' : 'transparent',
                    padding: '4px 8px',
                    borderRadius: 6,
                    marginBottom: 4,
                    position: 'relative'
                  }}>
                    <b>{p.name}</b> • stack: {p.stack} • hand: {p.hand.join(" ")} {p.folded ? " (folded)" : ""}
                    <div style={styles.stackBarContainer}>
                      <div style={{ ...styles.stackBar, width: `${(p.stack / maxStack) * 100}%` }}></div>
                    </div>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 12, fontSize: 18, position:'relative' }}>
                <b>Pot:</b> {state.pot} | <b>Bet:</b> {state.currentBet} | <b>To act:</b> {state.toAct}
                {chipAnim && <div style={styles.chipAnim}>💰</div>}
              </div>

              <div style={styles.actionsBar}>
                <button style={styles.btnAlt} onClick={() => doAction("fold")}>Fold</button>
                <button style={styles.btnAlt} onClick={() => doAction("check")}>Check</button>
                <button style={styles.btnAlt} onClick={() => doAction("call")}>Call</button>
                <input style={styles.input} type="number" value={raiseAmt} onChange={(e) => setRaiseAmt(e.target.value)} />
                <button style={styles.btnPrimary} onClick={() => doAction("raise", raiseAmt)}>Raise</button>
              </div>

              <h3 style={styles.section}>Action Log</h3>
              <div style={styles.logBox}>
                {state.actionLog?.slice(-10).map((ln, i) => (
                  <div key={`${i}-${actionLogKey}`} style={styles.logItem}>{ln}</div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={styles.section}>Suggestion</h3>
              {suggest ? (
                <div style={styles.panel}>
                  {suggest.error ? <p style={{color:'red'}}><b>Error:</b> {suggest.error}</p> : (
                    <>
                      <p><b>Advice:</b> {suggest.advice}</p>
                      <p><b>Prediction:</b> You'll likely finish with a {suggest.prediction}.</p>
                      <hr style={{margin: '12px 0', border: 'none', borderTop: '1px solid #eee'}} />
                      <p><b>Detailed Chances:</b></p>
                      <ul style={{ padding: 0, listStyle: 'none' }}>
                        {suggest.detailed_chances && Object.entries(suggest.detailed_chances).map(([hand, chance]) => (
                          <li key={hand} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                              <span>{hand}</span>
                              <span>{chance}</span>
                            </div>
                            <div style={styles.probBarContainer}>
                              <div style={{ ...styles.probBar, width: chance }}></div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : <div style={styles.panelMuted}>Click “Get Suggestion”.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ txt, newCard }) {
  const red = txt.endsWith("h") || txt.endsWith("d");
  return (
    <div style={{ 
      ...styles.card, 
      color: red ? "#d33" : "#111", 
      transform: newCard ? "scale(1.2)" : "scale(1)", 
      opacity: newCard ? 0 : 1,
      animation: newCard ? "fadeInScale 0.5s forwards" : "none"
    }}>
      {txt}
    </div>
  );
}

const styles = {
  felt: {
    minHeight: "100vh",
    width: "100vw",
    background: "radial-gradient(circle at 50% 30%, #116530 0%, #07421e 60%, #02240f 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "system-ui, sans-serif"
  },
  container: {
    width: "90vw",
    maxWidth: "1400px",
    background: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 30,
    boxShadow: "0 25px 60px rgba(0,0,0,0.45)",
  },
  title: { margin: "6px 0 20px 0", letterSpacing: 0.5, fontSize: 28 },
  controlsRow: { display: "flex", gap: 12, alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginBottom: 20 },
  inline: { display: "flex", alignItems: "center", gap: 8 },
  label: { fontWeight: 600 },
  select: { padding: "6px 10px", borderRadius: 10, border: "1px solid #bbb" },
  grid: { display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28, alignItems: "start" },
  section: { margin: "12px 0 10px 0", fontSize: 20 },
  cardsRow: { display: "flex", gap: 10, minHeight: 80 },
  card: { border: "2px solid #ccc", borderRadius: 12, padding: "12px 14px", width: 50, height: 70, textAlign: "center", fontWeight: 700, fontSize: 18, display: "flex", justifyContent: "center", alignItems: "center", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" },
  cardEmpty: { border: "2px dashed #ccc", borderRadius: 12, width: 50, height: 70, background: "#f0f0f0" },
  actionsBar: { display: "flex", gap: 10, alignItems: "center", marginTop: 14, justifyContent: "center" },
  btn: { padding: "10px 16px", borderRadius: 14, border: "1px solid #bbb", background: "#fff", cursor: "pointer", fontWeight: 600, transition: "0.2s" },
  btnAlt: { padding: "10px 16px", borderRadius: 14, border: "1px solid #bbb", background: "#fff", cursor: "pointer", fontWeight: 600, minWidth: 80, transition: "0.2s" },
  btnPrimary: { padding: "12px 18px", borderRadius: 16, border: "none", background: "#0c7b36", color: "#fff", fontWeight: 700, cursor: "pointer", minWidth: 100, boxShadow: "0 6px 20px rgba(12,123,54,0.35)", transition: "0.2s" },
  input: { width: 90, padding: "8px 10px", borderRadius: 10, border: "1px solid #bbb" },
  panel: { border: "1px solid #ddd", borderRadius: 14, padding: 14, background: "#fdfdfd", boxShadow: "0 3px 8px rgba(0,0,0,0.1)" },
  panelMuted: { border: "1px dashed #ddd", borderRadius: 14, padding: 14, color: "#666", background: "#f9f9f9" },
  logBox: { padding: 12, border: "1px solid #eee", borderRadius: 12, minHeight: 160, maxHeight: 220, background: "#fafafa", fontSize: 14, overflowY: 'auto' },
  logItem: { transform: 'translateX(20px)', opacity: 0, animation: 'slideFadeIn 0.4s forwards' },
  stackBarContainer: { height: 8, background: "#ddd", borderRadius: 4, marginTop: 4 },
  stackBar: { height: "100%", background: "#0c7b36", borderRadius: 4 },
  probBarContainer: { height: 10, background: "#eee", borderRadius: 5, marginTop: 2 },
  probBar: { height: "100%", background: "#0c7b36", borderRadius: 5, transition: "width 0.8s ease-in-out" },
  chipAnim: { position:'absolute', top:-24, left:'50%', transform:'translateX(-50%)', fontSize:24, animation:'chipJump 0.6s ease-in-out' }
};
