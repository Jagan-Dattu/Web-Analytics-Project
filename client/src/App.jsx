// Final, synchronized App.jsx

import { useEffect, useState } from "react";

const API = "http://localhost:8000/api";

export default function App() {
  const [state, setState] = useState(null);
  const [suggest, setSuggest] = useState(null);
  const [raiseAmt, setRaiseAmt] = useState(50);
  const [numBots, setNumBots] = useState(3);

  useEffect(() => {
    if (!state || state.street === 'pre-deal' || state.street === 'showdown') return;
    const id = setInterval(async () => {
      const r = await fetch(`${API}/state`);
      const j = await r.json();
      if (j && j.players) setState(j);
    }, 1500);
    return () => clearInterval(id);
  }, [state]);

  const createTable = async () => {
    const r = await fetch(`${API}/table`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numBots })
    });
    setState(await r.json()); setSuggest(null);
  };

  const deal = async () => {
    const r = await fetch(`${API}/deal`, { method: "POST" });
    setState(await r.json()); setSuggest(null);
  };

  const getSuggest = async () => {
    // This is now a POST request to match the server
    const r = await fetch(`${API}/suggest`, { method: "POST" });
    setSuggest(await r.json());
  };

  const doAction = async (action, amount = 0) => {
    const r = await fetch(`${API}/action`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, amount: Number(amount) || 0 })
    });
    const j = await r.json();
    if (j.state) { setState(j.state); setSuggest(null); }
    else if (j.error) { alert(j.error); }
  };

  return (
    <div style={styles.felt}>
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
                {state.board?.map((c, i) => <Card key={i} txt={c} />)}
                {Array.from({ length: 5 - (state.board?.length || 0) }).map((_, i) => (
                  <div key={"b" + i} style={styles.cardEmpty}></div>
                ))}
              </div>
              <h3 style={styles.section}>Players</h3>
              <ul style={{ lineHeight: 1.8 }}>
                {state.players?.map((p) => (
                  <li key={p.id} style={{ fontWeight: p.name === state.toAct ? 700 : 500, color: p.folded ? '#999' : '#000' }}>
                    <b>{p.name}</b> • stack: {p.stack} • hand: {p.hand.join(" ")} {p.folded ? " (folded)" : ""}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 12, fontSize: 18 }}>
                <b>Pot:</b> {state.pot} | <b>Bet:</b> {state.currentBet} | <b>To act:</b> {state.toAct}
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
                {state.actionLog?.slice(-10).map((ln, i) => <div key={i}>{ln}</div>)}
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
                      <ul>
                        {suggest.detailed_chances && Object.entries(suggest.detailed_chances).map(([hand, chance]) => (
                          <li key={hand}>{hand}: {chance}</li>
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

function Card({ txt }) {
  const red = txt.endsWith("h") || txt.endsWith("d");
  return <div style={{ ...styles.card, color: red ? "#d33" : "#111" }}>{txt}</div>;
}

//const styles = { /* Your styles object from before, no changes needed */ };
const styles = {
  felt: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 50% 30%, #0a5d2f 0%, #063d1f 60%, #032a16 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "system-ui, sans-serif"
  },
  container: {
    width: "min(1100px, 95vw)",
    background: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)"
  },
  title: { margin: "6px 0 14px 0", letterSpacing: 0.2 },
  controlsRow: { display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginBottom: 14 },
  inline: { display: "flex", alignItems: "center", gap: 6 },
  label: { fontWeight: 600 },
  select: { padding: "6px 8px", borderRadius: 10, border: "1px solid #bbb" },
  grid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, alignItems: "start" },
  section: { margin: "12px 0 8px 0" },
  cardsRow: { display: "flex", gap: 8, minHeight: 52 },
  card: { border: "1px solid #ccc", borderRadius: 10, padding: "8px 10px", width: 40, textAlign: "center", background: "#fff", fontWeight: 600 },
  cardEmpty: { border: "1px dashed #ccc", borderRadius: 10, padding: "8px 10px", width: 40, height: 36, background: "#fafafa" },
  actionsBar: { display: "flex", gap: 8, alignItems: "center", marginTop: 12, justifyContent: "center" },
  btn: { padding: "8px 12px", borderRadius: 12, border: "1px solid #bbb", background: "#fff", cursor: "pointer" },
  btnAlt: { padding: "8px 14px", borderRadius: 14, border: "1px solid #bbb", background: "#fff", cursor: "pointer", minWidth: 72 },
  btnPrimary: { padding: "10px 16px", borderRadius: 16, border: "none", background: "#0c7b36", color: "#fff", fontWeight: 700, cursor: "pointer", minWidth: 90, boxShadow: "0 6px 18px rgba(12,123,54,0.35)" },
  input: { width: 90, padding: "8px 10px", borderRadius: 10, border: "1px solid #bbb" },
  panel: { border: "1px solid #ddd", borderRadius: 12, padding: 12, background: "#fdfdfd" },
  panelMuted: { border: "1px dashed #ddd", borderRadius: 12, padding: 12, color: "#666", background: "#fafafa" },
  logBox: { padding: 10, border: "1px solid #eee", borderRadius: 10, minHeight: 120, background: "#fff", fontSize: 14, overflowY: 'auto' }
};