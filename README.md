# 🧩 AI Text Probability API & Chrome Extension  

This project provides an **API** built with FastAPI to analyze text and estimate whether it is AI-generated, and a **Chrome extension** that sends user-inputted text to the API and displays the probability score in the browser.  

## 🚀 Tech Stack  
- **Backend**: FastAPI, Uvicorn  
- **Model**: `Hello-SimpleAI/chatgpt-detector-roberta` (Hugging Face Transformers)  
- **Frontend**: Chrome Extension (Manifest V3, React + Vite)  
- **Testing**: Pytest, TestClient  
- **Environment Management**: Python virtual environment (`venv` or `myenv`)  
- **Other**: CORS middleware for frontend-backend communication  

---

## 📂 Project Structure  

```bash
project-root/
│
├── api/                    # Backend API logic
│   ├── __init__.py
│   ├── app.py              # FastAPI application setup (routes, middleware, CORS)
│   ├── config.py           # Configuration (CORS settings, environment variables)
│   ├── inference.py        # Model inference logic (loads Hugging Face model, predicts probability)
│   └── schemas.py          # Pydantic models for request/response validation
│
├── tests/                  # Unit and integration tests
│   ├── __init__.py
│   └── test_app.py         # Pytest-based tests for endpoints (/healthz, /score)
│
├── extension/              # Chrome extension frontend
│   ├── manifest.config.js  # Manifest V3 configuration
│   ├── src/                # React + Vite source files
│   │   ├── background.js
│   │   ├── content.js
│   │   └── popup/          
│   │       ├── App.jsx     # Frontend UI for results
│   │       └── index.jsx
│   └── public/             # Static assets
│
├── myenv/                  # Python virtual environment (excluded from Git)
│
├── requirements.txt        # Python dependencies
├── README.md               # Project documentation (this file)
└── .gitignore              # Ignore venv, cache, logs, etc.