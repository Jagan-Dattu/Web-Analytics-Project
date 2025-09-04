const fs = require("fs");
const path = require("path");
const LOGDIR = path.join(__dirname, "..", "..", "logs");
if (!fs.existsSync(LOGDIR)) fs.mkdirSync(LOGDIR, { recursive: true });

function logEvent(type, payload) {
  const line = JSON.stringify({ ts: new Date().toISOString(), type, ...payload }) + "\n";
  fs.appendFileSync(path.join(LOGDIR, "events.jsonl"), line, "utf8");
}

module.exports = { logEvent };
