# 🇮🇳 India Market Dashboard

Real-time Nifty 50 + Sensex charts with live news feed and pattern-based prediction.

## Features
- Live Nifty 50 chart (TradingView)
- Live Sensex chart (TradingView)
- Google News RSS feed with bullish/bearish sentiment tagging
- Pattern-based prediction engine (news sentiment + session + day-of-week)

## How to Run
Just open `index.html` in any browser. No server needed.

## Data Sources
| Source | What | Cost |
|---|---|---|
| TradingView Widgets | Charts (15-min delayed on free) | Free |
| Google News RSS | News headlines | Free |
| allorigins.win | CORS proxy for RSS | Free |

## ⚠️ Disclaimer
This is for personal/educational use only.
Prediction panel is pattern-based heuristics — NOT financial advice.
Do not make investment decisions based on this tool.

## Project Structure
```
MarketDashboard/
├── index.html   — Layout
├── style.css    — Dark theme styles
├── app.js       — Charts + News + Prediction logic
├── .gitignore   — Keeps secrets out of git
└── README.md
```
