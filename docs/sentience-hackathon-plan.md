# Sentience — Revised Hackathon Plan

## The Pitch

**One-liner:** Sentience maps the AI ecosystem's sentiment landscape — tracking how public perception of AI companies ripples through their hardware supply chain and predicting where sentiment is heading next.

**Demo story:** "DeepSeek drops a new open-source model. Reddit explodes. Sentience catches the sentiment spike in real time, traces the interdependency to NVIDIA (their GPU supplier), and our LSTM predicts elevated positive sentiment will hold for 48 hours. Meanwhile, NVIDIA's stock ticks up 3%. Sentience saw it coming."

**Why this angle wins:** You're not just doing sentiment analysis on isolated brands. You're modeling the *relationships* between AI companies and the hardware they depend on, then showing how sentiment in one node propagates through the network. That interdependency graph is your differentiator — nobody else at the hackathon is doing that.

---

## Mapping to Sponsor Objectives

This is critical. Every feature maps to a required deliverable.

### Required (must hit all 5)

| Objective | Your Implementation |
|-----------|-------------------|
| 1. Consume a timestamped text feed | Ingest your own scraped Reddit data as a timestamped text feed for the 7 AI entities. Data is pre-collected and loaded into MongoDB. |
| 2. Create a signal | Two signals: (a) FinBERT sentiment score per entity per time window, (b) LSTM-predicted future sentiment trajectory. Both are numeric, time-series signals. |
| 3. Define a decision rule | "If predicted sentiment for an AI company drops below -0.3 AND that company has a dependency on a public hardware company, flag a potential stock impact alert." Threshold-based alert system. |
| 4. Show it works | Backtest against historical stock data. Show examples where sentiment shift preceded stock movement. Compare LSTM prediction vs actual sentiment. |
| 5. Demo | End-to-end: raw Reddit text → FinBERT scores → LSTM prediction → alert fired → stock overlay confirms the signal was real. |

### Bonus objectives to target (pick 2-3)

| Bonus | Your Approach |
|-------|--------------|
| Baseline comparison | Compare FinBERT + LSTM against plain VADER sentiment. Show precision/recall improvement. Easy win — VADER will be noticeably worse on financial/tech text. |
| Signal decay | Plot correlation between sentiment anomaly and stock movement at 6h, 12h, 24h, 48h, 72h lags. Show where the signal stops being predictive. |
| More advanced NLP | FinBERT (domain-specific transformer) + LSTM (temporal modeling) + Gemini API summaries (LLM hybrid). This checks the "embeddings, LLM hybrids" box. |
| Formal evaluation metrics | Precision/recall on anomaly detection, MAE on LSTM predictions, correlation coefficients on sentiment-to-stock lag analysis. |

---

## Entities to Track

### AI Companies (sentiment targets)
- **OpenAI** — r/OpenAI, r/ChatGPT
- **Anthropic** — r/AnthropicAI, r/ClaudeAI
- **Google (DeepMind/Gemini)** — r/Google, r/Bard, r/GoogleGeminiAI
- **xAI** — r/xai, r/Grok
- **DeepSeek** — r/DeepSeek, r/LocalLLaMA (heavy DeepSeek discussion)

### Hardware/Infra Companies (stock tracking only — no Reddit scraping)
- **NVIDIA** ($NVDA)
- **AMD** ($AMD)
- **Amazon** ($AMZN)
- **Broadcom** ($AVGO)
- **Intel** ($INTC)
- **Meta** ($META)
- **Micron** ($MU)
- **Qualcomm** ($QCOM)
- **Samsung** ($005930.KS)
- **TSMC** ($TSM)

### Interdependency Map
```
OpenAI ──────→ NVIDIA (H100/B200 clusters)
             → Microsoft/Azure (exclusive partnership)
Anthropic ───→ NVIDIA + AMD (Google Cloud, AWS GPUs)
             → Amazon (AWS strategic investor)
Google ──────→ NVIDIA + AMD (GPU clusters)
             → Broadcom (custom TPU silicon)
             → Samsung + TSMC (chip fabrication)
xAI ─────────→ NVIDIA (Memphis supercluster)
DeepSeek ────→ NVIDIA + AMD (training infrastructure)

Cross-cutting:
NVIDIA ──────→ TSMC (fab), Micron (HBM memory), Broadcom (networking)
AMD ─────────→ TSMC (fab), Samsung (fab)
Meta ─────────→ NVIDIA + AMD (GPU clusters for Llama training)
Qualcomm ────→ On-device AI inference (edge deployment)
Intel ───────→ TSMC (outsourced fab), competing foundry
```

This network is what powers the interdependency graph on the dashboard. When sentiment shifts for an AI company, you trace the edge to its hardware dependency and check for stock correlation.

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                    REACT FRONTEND                      │
│  Sentiment Trajectory · Drivers Feed · Network Graph   │
│  Stock Overlay · Forecast View · Gemini Summaries      │
├───────────────────────────────────────────────────────┤
│               EXPRESS / NODE BACKEND                   │
│  /api/sentiment — scores by entity + time range        │
│  /api/anomalies — flagged events + Gemini summaries    │
│  /api/network — interdependency graph data             │
│  /api/market — stock data + correlation stats          │
│  /api/forecast — LSTM predictions                      │
├───────────────────────────────────────────────────────┤
│             PYTHON ML SERVICE (FastAPI)                 │
│                                                         │
│  1. Preprocess — clean Reddit text                      │
│  2. FinBERT — sentiment scoring                         │
│  3. Aggregate — rolling window scores per entity        │
│  4. LSTM — predict future sentiment trajectory          │
│  5. Anomaly — z-score detection on sentiment shifts     │
│  6. Correlation — sentiment delta vs stock delta        │
├───────────────────────────────────────────────────────┤
│           EXTERNAL SERVICES                             │
│  Gemini API — natural language summaries of anomalies   │
│  yfinance — stock data for 10 hardware/infra companies  │
│  Reddit data — already scraped via custom Python scraper │
├───────────────────────────────────────────────────────┤
│                    MONGODB                              │
│  Collections: posts, sentiment_scores, anomalies,       │
│               market_data, entities, predictions,       │
│               interdependencies                         │
└───────────────────────────────────────────────────────┘
```

---

## ML Pipeline

### Stage 1: Preprocessing (Python)

Clean Reddit text: strip URLs, normalize mentions, handle emoji, English-only filter, deduplicate crossposts. Combine post title + body. Tag each post with its target entity (match by subreddit + keyword rules).

### Stage 2: FinBERT Sentiment Scoring

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
nlp = pipeline("sentiment-analysis", model=model, tokenizer=tokenizer)
```

Per post, get positive/negative/neutral probabilities. Store the compound score (-1 to +1). FinBERT is critical here because tech/finance text has domain-specific sentiment patterns that generic models miss.

### Stage 3: Temporal Aggregation

Bucket into 6-hour windows per entity. Per bucket compute:
- Mean sentiment score
- Standard deviation
- Post volume (count)
- Volume-weighted sentiment (higher-engagement posts weighted more)
- Rolling 30-day baseline (mean + std)

### Stage 4: LSTM Sentiment Prediction

This is the forecast component. Feed the time-series of aggregated sentiment scores into an LSTM to predict the next N windows (e.g., next 24-48 hours of sentiment).

```python
import torch
import torch.nn as nn

class SentimentLSTM(nn.Module):
    def __init__(self, input_size=4, hidden_size=64, num_layers=2, output_size=8):
        super().__init__()
        # input: [sentiment_mean, sentiment_std, volume, volume_weighted_sentiment]
        # output: next 8 windows (48 hours at 6h buckets)
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        return self.fc(lstm_out[:, -1, :])
```

**Training data:** Your historical aggregated sentiment time-series. Use a sliding window approach — input is the last 30 days of 6-hour buckets (120 windows), output is the next 8 windows (48 hours).

**Realistic expectations:** The LSTM won't be super accurate with limited training data in a hackathon. That's fine. Frame it as "directional forecast" — the predicted trend matters more than exact values. Show the predicted trajectory line extending past "today" on the sentiment chart (the dashed line on the right side of the Sentience Terminal screenshot).

### Stage 5: Anomaly Detection

Z-score based, same as before:

```
anomaly_score = (current_sentiment - rolling_mean) / rolling_std
```

Flag when `anomaly_score < -2.0` or `> 2.0` (catch both positive and negative spikes) AND volume is elevated above 1.5x rolling average.

### Stage 6: Gemini Summaries

When an anomaly fires, batch the posts from that window and send to Gemini API:

```javascript
// Express route
const prompt = `Summarize the key themes from these ${posts.length} Reddit posts 
about ${entity} from the last 6 hours. Focus on what's driving sentiment. 
Be concise — 2-3 sentences max.\n\n${postTexts.join('\n---\n')}`;
```

This powers the "Real-time Sentiment Drivers" cards on the dashboard. Each card shows: entity tag, bullish/bearish badge, timestamp, Gemini-generated summary, and relevant hashtags.

### Stage 7: Stock Correlation

Pull stock data for all 10 hardware/infra companies via yfinance. Compute correlation between AI company sentiment deltas and dependent hardware company price deltas at multiple lag windows. Display as the stock overlay on the sentiment trajectory chart.

---

## Dashboard (React)

Based on the Sentience Terminal mockup, four main views:

### Analytics (main view)
- **Sentiment Trajectory** — area chart with time on x-axis, sentiment score on y-axis. Left half is historical data (solid line), right half is LSTM forecast (dashed line). Entity selector to filter. Stock price overlay toggle (secondary y-axis).
- **Real-time Sentiment Drivers** — horizontal card feed with live badge. Each card: bullish/bearish tag, Gemini summary, entity hashtags, timestamp. Filter by "All News" or "High Impact" (anomalies only).
- **Interdependency Network** — force-directed graph (use d3-force or react-force-graph). Nodes are the 7 entities, edges show dependency relationships. Node color = current sentiment (green positive, red negative). Node size = post volume. Clicking a node filters the trajectory chart.

### Network (dedicated view)
Expanded interdependency graph with more detail. Edge thickness = strength of correlation between connected entities' sentiment. Click an edge to see the correlation breakdown.

### Drivers (dedicated view)
Full feed of all sentiment drivers, filterable by entity and time range. Each entry expandable to show source posts.

### Forecast (dedicated view)
LSTM predictions per entity. Show predicted trajectory with confidence bands. Overlay stock data. Show signal decay chart (correlation strength vs lag time).

---

## Tech Stack

### Frontend
- React (Vite or CRA)
- Tailwind CSS
- Recharts (sentiment timeline, stock overlay, dual-axis charts)
- d3-force or react-force-graph (interdependency network)
- shadcn/ui or similar component library

### Backend
- Express + Node.js
- Mongoose (MongoDB ODM)

### ML Service
- FastAPI (Python)
- transformers (FinBERT)
- PyTorch (LSTM)
- scikit-learn (stats, preprocessing)
- pandas, numpy
- yfinance (stock data)

### External APIs
- Gemini API (summaries)

### Database
- MongoDB (flexible schema, good for varied post data + time-series sentiment scores)

---

## Data Collection

### Reddit data (done)
Already scraped via custom Python scraper. Data covers target subreddits for all 7 entities. Load into MongoDB at the start of the hackathon.

### Stock data
```python
import yfinance as yf
tickers = ["NVDA", "AMD", "AMZN", "AVGO", "INTC", "META", "MU", "QCOM", "005930.KS", "TSM"]
data = yf.download(tickers, start="2025-12-01", end="2026-03-07")
```

---

## Signal Definition (Sponsor Requirement)

### Primary signal: Sentiment Momentum Score (SMS)
A numeric score per entity per time window combining:
- Current FinBERT sentiment (weighted 0.4)
- Sentiment velocity — rate of change over last 3 windows (weighted 0.3)
- Volume anomaly factor — current volume vs rolling average (weighted 0.2)
- LSTM predicted direction for next window (weighted 0.1)

```
SMS = 0.4 * current_sentiment 
    + 0.3 * sentiment_velocity 
    + 0.2 * volume_factor 
    + 0.1 * lstm_direction
```

### Decision rule
```
IF SMS < -0.3 for an AI company:
    AND that company has hardware dependency:
        → ALERT: "Potential negative stock impact on {hardware_company}"
        → Confidence: based on historical correlation strength

IF SMS > 0.5 for an AI company:
    AND sustained for 2+ windows:
        → SIGNAL: "Sustained positive momentum, check {hardware_company} position"
```

### Validation approach
1. Backtest: run the pipeline on historical data, check how many alerts preceded actual stock moves within 48h
2. Baseline comparison: same decision rule but with VADER instead of FinBERT. Show precision/recall improvement.
3. Cherry-pick 3-4 compelling examples for the demo walkthrough

---

## Team Roles (24 Hours)

### Person 1: ML Lead
FinBERT pipeline end-to-end, temporal aggregation, anomaly detection. Owns the core sentiment scoring that everything else depends on.

### Person 2: ML + LSTM
LSTM model: architecture, training loop, prediction pipeline. Also handles stock correlation analysis and the Sentiment Momentum Score calculation. If LSTM is taking too long, deprioritize and fall back to simpler trend extrapolation.

### Person 3: Frontend
React dashboard. Start with hardcoded mock data immediately. Build the sentiment trajectory chart, drivers feed, and interdependency network. Wire to real APIs as they come online.

### Person 4: Backend + Integration
Express API, MongoDB setup, Gemini API integration. Connects Python ML service to Node backend. Also owns the pitch/write-up.

---

## Timeline (24 Hours)

### Hours 0-2: Setup
- **P1:** Python env, FinBERT download, load scraped Reddit data into MongoDB
- **P2:** PyTorch setup, start LSTM architecture, load stock data
- **P3:** React scaffold, Tailwind, Recharts, mock data, layout skeleton
- **P4:** Express scaffold, MongoDB connection, API route stubs, load stock data via yfinance

### Hours 2-8: Core Build
- **P1:** Preprocessing done, FinBERT scoring running on real data, writing results to MongoDB
- **P2:** LSTM training on historical sentiment sequences, iterate on architecture
- **P3:** Sentiment trajectory chart working, entity selector, drivers feed layout
- **P4:** API endpoints serving real sentiment data, Gemini integration for summaries

### Hours 8-14: Deep Build
- **P1:** Temporal aggregation + anomaly detection producing real alerts, tune thresholds
- **P2:** LSTM predictions flowing, stock correlation analysis, SMS score implemented
- **P3:** Interdependency network graph (d3-force), stock overlay toggle, forecast view
- **P4:** All endpoints live, end-to-end pipeline working, start on write-up

### Hours 14-20: Polish + Validate
- **P1 + P2:** Backtest results, baseline comparison (VADER vs FinBERT), signal decay analysis, pick best demo examples
- **P3:** UI polish, animations, loading states, responsive, demo flow
- **P4:** Write-up finalized, pitch deck, end-to-end testing

### Hours 20-24: Demo Prep
- Rehearse 3+ times with assigned speaking roles
- Backup plan: screenshots / pre-recorded video if live demo breaks
- ML team ready for technical questions from judges

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| LSTM doesn't converge in time | Fall back to simple moving average extrapolation for the forecast line. The chart still looks good, you just mention LSTM as "in progress" |
| FinBERT too slow on full dataset | Pre-process overnight. During demo, show pre-computed results. Run live scoring on a small subset to show it works |
| Gemini API rate limits | Cache summaries in MongoDB. Pre-generate summaries for key anomaly windows |
| Interdependency graph looks bad | Use a simple static layout (fixed node positions) instead of force-directed simulation. Still tells the story |

---

## Deliverables Checklist

- [ ] Working demo: end-to-end pipeline from raw text to signal to decision
- [ ] Write-up: assumptions, what worked, what failed, interesting failure cases
- [ ] Baseline comparison: FinBERT+LSTM vs VADER
- [ ] Signal decay analysis
- [ ] Formal metrics: precision/recall on anomaly detection, correlation coefficients
- [ ] Pitch deck (5-6 slides)
