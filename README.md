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



