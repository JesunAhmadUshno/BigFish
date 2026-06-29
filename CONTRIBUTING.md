# 🛠️ Contributing to BigFish

First off, thank you for considering contributing to BigFish. This project is built by Quants, for Quants, to level the playing field against institutional sportsbooks using open-source AI and Web3.

We welcome pull requests for bug fixes, new features, and especially **new Cognitive Agents** for the Swarm Orchestrator.

## How to Contribute

### 1. Adding a New Cognitive Agent to the Swarm
The core of BigFish's intelligence is the `swarm-orchestrator.js`. If you have a brilliant idea for a new heuristic (e.g., a "Weather Agent", a "Referee Bias Agent", or an "xG Chain Agent"), you can easily inject it into the pipeline.

**Steps to add an Agent:**
1. Open `lib/swarm-orchestrator.js`.
2. Create an async method for your agent:
   ```javascript
   async runRefereeAgent(homeTeam, awayTeam) {
     // Fetch data from your favorite API
     // Calculate a delta or multiplier
     return { biasMultiplier: 1.05, log: "Referee favors home team by 5%" };
   }
   ```
3. Call your agent inside the `orchestrateFeatures` function and apply its outputs to the final Deep Learning tensor (e.g., modifying `homeXG` or pushing it as a new distinct feature tensor).

### 2. Improving the Deep Learning Model
Our `@tensorflow/tfjs` model in `lib/neural-engine.js` is currently a Sequential model with 3 hidden layers (64 -> 32 -> 16). 
If you are an AI engineer and want to implement an LSTM for time-series form tracking, or a custom loss function (e.g., Ranked Probability Score instead of categorical cross-entropy), PRs are highly encouraged!

### 3. Reporting Bugs
Use GitHub issues. Please provide:
- A clear description of the bug.
- Steps to reproduce.
- Your browser and MetaMask version.

### Pull Request Process
1. Fork the repo and create your branch from `master`.
2. If you've added an Agent, update the README to list your Agent in the Swarm ecosystem.
3. Ensure the project builds successfully (`npm run build`).
4. Submit the PR!

Let's beat the books together. 🦈
