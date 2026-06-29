# 🦈 BigFish: God-Level Quantitative Sports Betting Terminal

Welcome to **BigFish**, an institutional-grade, fully autonomous quantitative sports betting terminal built for the 2026 FIFA World Cup and global live soccer markets. 

This is not a traditional spreadsheet or a simple odds scraper. BigFish is a Web3-enabled Hedge Fund Terminal powered by deep learning, cognitive agent swarms, and live in-play data loops.

![Hero Banner](public/assets/hero_banner.png)

---

## 🧠 The V11.0 Neural Swarm Architecture

BigFish has evolved into a "God-Level" autonomous trading ecosystem. Here is how the engine works:

### 1. The Deep Learning Engine (TensorFlow.js)
At the core of BigFish is a non-linear Sequential Neural Network running directly in the browser via `@tensorflow/tfjs`.
- It processes an 8-feature tensor (Elo ratings, expected goals, rest days, weather severity, and motivation).
- **The Quant Backtester:** The `/backtest` module runs thousands of Monte Carlo simulations and calls `model.fit()` to train the weights, visualizing the loss gradient in real-time. The trained memory is stored in `IndexedDB`.

### 2. The Cognitive Agent Swarm (LLM Orchestrator)
Before the deep learning model fires, the **Swarm Orchestrator** dispatches specialized AI agents:
- **The Sentiment Agent:** Scrapes real-time headlines and runs NLP heuristic analysis to identify morale, injuries, and suspensions, generating a "Motivation Delta".
- **The Tactical Agent:** Analyzes the formations and manager styles to calculate expected goals (xG) multipliers.

### 3. The Live In-Play Feedback Loop
BigFish does not rely on static pre-match data. It is a live trading terminal.
- We pull real-time JSON statistics (possession %, red cards, dangerous attacks) from `api-sports.io` every 30 seconds.
- As the live game unfolds, these real-time stats are fed back into the Swarm Orchestrator and Deep Learning Engine.
- The **Neural Heatmap** and **Win Probabilities** literally recalculate and shift on your screen as the match progresses.

### 4. True Web3 Autonomous Execution
The Auto-Pilot is not a mockup. BigFish integrates `ethers.js` to serve as a decentralized execution agent.
- Connect your MetaMask wallet.
- Set your Kelly Criterion fraction.
- The AI will automatically sign smart-contract transactions to decentralized ledgers (like Polymarket/Azuro) to deploy capital the moment it detects a +EV arbitrage edge.

---

## 🖥️ The Command Center Modules

- **🌍 World Cup Hub (`/matches`):** A beautiful grid tracking the 2026 FIFA World Cup groups and dynamic Elo ratings.
- **⚡ Live Markets (`/predictions`):** The institutional Match Center. Features live API-Football pitch trackers, real-time match statistics, high-def tactical Player Radar charts, and the live Neural Heatmap.
- **📊 The Tracker (`/tracker`):** Your Hedge Fund Ledger. Tracks active capital exposure, closed P&L, and yield metrics.
- **🔬 Quant Backtester (`/backtest`):** Simulate historical data and train the neural network before deploying real capital.

---

## 🚀 Installation & Deployment

BigFish is built on **Next.js 16 (App Router)** and exported as a fully static web application.

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Export to static HTML for GitHub Pages / IPFS
npm run build
```

### Environment Variables
To unlock the full potential of BigFish, add your API keys to a `.env.local` file:
```env
# Required for Live Pitch & Real-time Stats
NEXT_PUBLIC_API_SPORTS_KEY=your_key_here

# Required for Live Global Odds
NEXT_PUBLIC_ODDS_API_KEY=your_key_here

# (Optional) For True LLM Sentiment Scraping
NEXT_PUBLIC_LLM_KEY=your_gemini_or_openai_key
```

---

*Disclaimer: BigFish is an experimental algorithmic trading project. The autonomous Web3 execution module deploys real capital. Run the Backtester and understand the variance before engaging the Auto-Pilot.*
