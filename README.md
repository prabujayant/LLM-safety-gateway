# PromptShield – Real-Time LLM Safety Gateway

PromptShield is a lightweight pre-processing security gateway that analyzes user prompts **before** they reach an LLM.  
It uses **CPU-only** fast detection layers to block or sanitize jailbreak attempts in under **30ms**.

---

## 🚀 Features

### 🔍 Three-Layer Detection Engine (CPU-only)
1. **Regex Pattern Matching (<5ms)**  
   Detects direct prompt injection patterns like:  
   - "ignore previous instructions"  
   - "[SYSTEM]"  
   - "reveal the system prompt"

2. **Entropy Analysis (<3ms)**  
   Uses Shannon entropy to detect:  
   - Base64 payloads  
   - Obfuscated or encoded attacks

3. **IsolationForest Anomaly Detection (<15ms)**  
   A lightweight ML model (scikit-learn) detecting abnormal prompt structures.

### 🛡 Risk Scoring & Actions
| Score | Action      |
|-------|-------------|
| 0–30  | pass        |
| 31–70 | sanitize    |
| 71–100| block       |

### 🌀 Polymorphic Prompt Assembling (PPA)
Wraps prompts using random templates from a large pool to break universal jailbreaks.

### 📊 Dashboard (React)
- Real-time analysis
- Processing time display
- Risk breakdown
- PPA wrapper preview
- Attack history (SQLite)

---

## How to set it up

### Backend
- cd backend
- pip install -r requirements.txt
- uvicorn app:app --reload

### Frontend
- cd frontend
- npm install
- npm run dev