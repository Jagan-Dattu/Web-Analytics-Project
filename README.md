# ♠️ Poker Assist Project

A full-stack, playable Texas Hold'em poker application that provides real-time, data-driven suggestions to the player. This project integrates a Node.js game server, a Python/FastAPI machine learning service, and a React frontend to create a comprehensive and interactive experience.

The core feature is an AI suggestion engine trained on a large dataset of historical poker hands. It predicts the player's most likely final hand strength and provides situational advice on whether to bet, check, call, raise, or fold based on poker fundamentals like pot odds.

---

## ✨ Features

* **Playable Game:** Play Texas Hold'em against multiple AI bots with a clean, interactive web interface.
* **Modular Backend:** The game logic is handled by a multi-file Node.js/Express server that manages the game state.
* **AI Suggestion Engine:** A separate Python FastAPI server hosts a trained Random Forest model to provide intelligent suggestions.
* **Data-Driven Predictions:** The model is trained on a real-world poker dataset to predict the final outcome of a hand based on the current situation.
* **Actionable Advice:** A rules engine translates the model's prediction into clear, situational advice (e.g., "Bet for value," "Fold, the odds are not good enough.").
* **Complete Data Pipeline:** Includes a standalone Python script (`process_data.py`) for data cleaning, advanced feature engineering, and model training.

---

## 🛠️ Tech Stack

* **Frontend:** React.js
* **Game Server:** Node.js, Express.js
* **AI/ML Server:** Python, FastAPI
* **Data Science:** Pandas, Scikit-learn, Joblib
* **Hand Evaluation:** `treys` library

---
=== PROJECT STRUCTURE ===
poker-assist-project/
   
    
    
    
    ├─ client/              >> REACT FRONTEND <<
    ├─ server/              >> NODE.JS + EXPRESS GAME SERVER <<
    ├─ ml/                  >> FASTAPI ML SERVICE + PIPELINE <<
    │   ├─ app.py           >> FASTAPI ENTRYPOINT <<
    │   ├─ process_data.py  >> DATA CLEANING & MODEL TRAINING <<
    │   ├─ poker_model.pkl  >> TRAINED MODEL (GENERATED) <<
    │   └─ requirements.txt >> PYTHON DEPENDENCIES <<
    └─ README.md
    Architecture (keep it simple & clean) poker-assist/ 
   ├─ server/ # Node.js (Express) game API │
   ├─ package.json │
   ├─ src/ │ 
   │ ├─ index.js # Express server │ 
   │ ├─ deck.js # 52-card deck helpers │ 
   │ ├─ table.js # in-memory table state + dealing │ 
   │ ├─ logger.js # action+hand logs (JSONL/CSV) │ 
   │ └─ config.js ├─ ml/ # Python FastAPI microservice │ 
   ├─ requirements.txt │ 
   └─ app.py # equity, range inference, suggestion API 
   ├─ client/ # React frontend │
   ├─ package.json │
   └─ src/ │ 
   ├─ main.jsx │ 
   ├─ App.jsx │
   └─ components/ │
   └─ export_logs.py # ETL: server logs -> CSV for analytics └─ README.md
  
## 📁 Project Structure

The project is organized into distinct services:
---

## 🚀 Local Setup and Installation

To run this project on your own computer, please follow these steps.

### Prerequisites

Make sure you have the following software installed on your machine:
* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/en/) (v16 or higher)
* [Python](https://www.python.org/downloads/) (v3.9 or higher)

### 1. Clone the Repository
Open your terminal or command prompt, navigate to where you want to store the project, and run:
```bash
git clone [https://github.com/Jagan_Dattu/poker-assist-project.git]
cd poker-assist-project

### 2. Set Up the Game Server & Frontend
This command will install all the necessary packages for both the Node.js server and the React frontend from the package.json file.
# Run this from the main project folder (poker-assist/)
npm install

### 3. Set Up the AI/ML Server
This service requires its own Python environment.
# Navigate into the ml folder
cd ml
# Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\activate
# Install the required Python packages
pip install -r requirements.txt


### 4. The Data Pipeline (One-Time Setup)
You only need to do this once. This step trains the machine learning model.

Download the Dataset: Download the CSV from this Kaggle link.

Place the File: Unzip the download and place the poker_hand_histories.csv file inside the ml folder. You may need to rename the file you download to match this name exactly.

Run the Script: From your activated terminal (.venv) inside the ml folder, run the processing script. This may take a few minutes.


python process_data.py
This will create the necessary model files (poker_model.pkl, processed_data.csv, etc.) inside the ml folder.
▶️ Running the Application
You will need to open three separate terminals to run the full application. Make sure you run them in order.

before this check eveyrthing, ur python code working , csv file in correct path, check codes in all (app.py,index.py,......), 

Terminal 1: Start the AI Server
# Navigate to the ml folder
cd D:\projects\poker-assist\ml
.venv\Scripts\activate   # activates virtual environment
uvicorn app:app --reload --port 8001

Terminal 2: Start the Game Server
# Navigate to the main project folder
cd D:\projects\poker-assist\server
node src/index.js

Terminal 3: Start the Frontend

# Navigate to the main project folder
cd D:\projects\poker-assist\client
npm run dev

Your web browser should automatically open (usually to http://localhost:3000 or http://localhost:5173) where you can create a table, deal cards, and start playing!

**INDEPTH STEPS:**
Step 1: Create project folder
Open your Command Prompt (Windows) or Terminal (Linux/Mac) and type:
mkdir poker-assist
cd poker-assist
Now you’re inside the root folder poker-assist/.
🧠 Folder structure we’ll build
poker-assist/
├─ server/       (Node backend)
├─ ml/           (Python ML service)
├─ client/       (React frontend)
├─ etl/          (ETL scripts for analytics)
└─ logs/         (game event logs auto-saved)

🐍 Step 2: Set up ML (Python) microservice

📍 In the same terminal (still inside poker-assist/):
mkdir ml
cd ml
👉 Now you’re in poker-assist/ml/
Create a Python virtual environment:
python -m venv .venv
Activate it:
Windows:
.venv\Scripts\activate

Linux/Mac:
source .venv/bin/activate

Create requirements.txt:
echo fastapi==0.110.0 >> requirements.txt
echo uvicorn==0.29.0 >> requirements.txt
echo pydantic==2.7.1 >> requirements.txt
echo numpy==1.26.4 >> requirements.txt
echo treys==0.1.8 >> requirements.txt

Install dependencies:
pip install -r requirements.txt

Create the app file:
notepad app.py   # (Windows, opens Notepad)
# or
nano app.py      # (Linux/Mac, opens Nano editor)
Paste the app.py code I gave earlier (ML service). Save it.
Run ML server:
uvicorn app:app --reload --port 8001

Keep this terminal open and running.
🖥 Step 3: Set up Backend (Node/Express)

📍 Open a new terminal (don’t close the Python one).
Navigate to root:
cd poker-assist
mkdir server
cd server

👉 Now you’re in poker-assist/server/
Initialize Node project:
npm init -y
Install dependencies:
npm install express cors axios nanoid
Create folder src:
mkdir src
cd src
👉 Inside server/src/, create these files:
config.js
deck.js
table.js
logger.js
index.js
evaluator.js
(Use notepad <filename> on Windows, or nano <filename> on Linux/Mac. Paste the code from earlier.)

Run backend server:
cd ..
node src/index.js
You’ll see: Server running on :8000
Keep this terminal open too.
🌐 Step 4: Set up Frontend (React)

📍 Open a third terminal. Go back to root:
cd poker-assist
Create React app with Vite:
npm create vite@latest client -- --template react
Follow prompts:
Project name: client
Framework: React
Variant: JavaScript
Then:
cd client
npm install

Open file client/src/App.jsx and replace with the code I gave earlier.
Run it:
npm run dev
It will show something like http://localhost:5173 — open in your browser.
📜 Step 5: Set up ETL (Analytics logs)
📍 In the root folder (poker-assist/):
mkdir etl
cd etl
notepad export_logs.py
Paste the export_logs.py code. Save it.
When you want to export logs:
python export_logs.py
This generates etl/events_export.csv → open in Excel / Power BI.
🚦 How to run everything (summary)
Terminal 1 → Python ML
cd poker-assist/ml
.venv\Scripts\activate  # (Windows)
uvicorn app:app --reload --port 8001

Terminal 2 → Node server
cd poker-assist/server
node src/index.js

Terminal 3 → React frontend
cd poker-assist/client
npm run dev

Terminal 4 (optional) → ETL
cd poker-assist/etl
python export_logs.py
👉 This way you’ll have:
ML microservice running (Python, port 8001)
Game server running (Node, port 8000)
UI running (React, port 5173)
Logs in /logs/ folder
Analytics export via ETL
