# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sentience** — An AI sentiment tracking system that monitors public perception of AI companies (OpenAI, Anthropic, Google, xAI, DeepSeek, Microsoft, Alibaba) through Reddit data, analyzes sentiment using FinBERT, and predicts future trends using LSTM. Tracks interdependencies between AI companies and hardware suppliers (NVIDIA, AMD, etc.) to predict market impacts.

## Architecture

Three-tier system: React frontend → Express backend → Python ML pipeline, all backed by MongoDB (`pulse` database on localhost:27017).

- **client/** — React 19 + Vite 7 frontend (currently boilerplate, dashboard UI planned)
- **server/** — Express 5 backend with Mongoose 9. API stubs in `DB/fake_server.js`, MongoDB connection in `DB/mongo.js`
- **scraper/** — Python data pipeline: Reddit scraper → FinBERT scoring → feature extraction → daily aggregation → LSTM training → sentiment projection
- **storage/** — Static HTML pages (landing, login, signup, profile)

## Build & Run Commands

### Frontend
```bash
cd client
npm install
npm run dev        # Vite dev server (default port 5173)
npm run build      # Production build to dist/
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend
```bash
cd server
npm install
node index.js
```

### Full Stack (from server/)
```bash
npm start          # Runs server + client concurrently
```

### Python ML Pipeline
Each stage runs independently via CLI argument:
```bash
cd scraper
python ml_pipeline.py install     # Install Python deps
python ml_pipeline.py score       # FinBERT sentiment scoring
python ml_pipeline.py features    # Extract behavioral signals
python ml_pipeline.py aggregate   # Daily bucketing
python ml_pipeline.py train       # Train LSTM (100 epochs)
python ml_pipeline.py predict     # Generate 14-day projections
```

### Data Loading
```bash
cd scraper
python load_mongo.py              # Load scraped JSON into MongoDB
python scraper.py                 # Scrape Reddit (needs internet)
```

## Key Technical Details

- **Server uses CommonJS** (`require`/`module.exports`), client uses ES modules
- **ML pipeline stages must run in order**: score → features → aggregate → train → predict
- **FinBERT scoring**: 70% post sentiment + 30% VADER comment sentiment
- **LSTM architecture**: 2-layer, 64 hidden units, 7-day input sequences → predict next day's weighted_score
- **ML artifacts**: `scraper/pulse_lstm.pt` (model weights), `scraper/pulse_scalers.pkl` (feature scalers)
- **MongoDB collections**: `{brand}` (raw posts), `daily_sentiment` (aggregated), `sentiment_graph` (CSS scores + projections)

## API Endpoints (stubbed in DB/fake_server.js)

- `GET /api/sentiment?brand=<brand>` — Sentiment graph data
- `GET /api/brands` — List available brands
- `GET /api/posts?brand=<brand>` — Raw posts for a brand
- `GET /api/daily?brand=<brand>` — Daily sentiment buckets

## Environment

- Requires MongoDB running on `localhost:27017`
- Server `.env` file goes in `server/` (see `server/.env.example`)
- Python 3.8+ with: transformers, torch, vaderSentiment, scikit-learn, pandas, numpy, pymongo
