# Football Analytics — Multi-Agent Predictive System

A research-grade, modular AI system for football match analysis targeting the **2026 FIFA World Cup**.

## Architecture

```
football_analytics/
├── agents/                  # Specialized AI analysis agents
│   ├── physiometric_agent.py        # Environmental & physiological modeling
│   ├── quantitative_agent.py        # Dixon-Coles / xG / Bayesian modeling
│   ├── monte_carlo_agent.py         # Copula-driven simulation engine
│   ├── devig_agent.py               # Market efficiency / Shin's method
│   └── sentiment_agent.py           # NLP press conference & news analyzer
├── models/                  # Core statistical models
│   ├── dixon_coles.py               # Bivariate Poisson goal model
│   ├── bayesian_state_space.py      # Dynamic team strength estimation
│   └── kelly_criterion.py           # Capital management framework
├── data_pipeline/           # Data ingestion & ETL
│   ├── match_data.py                # Historical match fetcher
│   └── weather_data.py              # Climate & altitude data
├── devig_engine/            # Odds normalization algorithms
│   ├── shin.py                      # Shin's method implementation
│   ├── wpo.py                       # Weighted proportional odds
│   └── odds_ratio.py                # Odds ratio normalization
├── sgp_builder/             # Same-Game Parlay correlation engine
│   └── copula_simulator.py          # Monte Carlo + Copula framework
├── prompts/                 # YAML agent system prompts
│   ├── physiometric_prompt.yaml
│   ├── quantitative_prompt.yaml
│   ├── sentiment_prompt.yaml
│   └── execution_prompt.yaml
├── utils/
│   └── helpers.py
├── main_loop.py             # Central orchestration
└── requirements.txt
```

## Agents

| Agent | Role |
|---|---|
| **Physiometric** | Models altitude hypoxia, thermal stress, travel fatigue, circadian decay |
| **Quantitative** | Dixon-Coles bivariate Poisson, Bayesian xG state-space, VORP adjustments |
| **Monte Carlo** | Copula-driven joint probability simulation (100k iterations) |
| **Devig** | Shin's method, WPO, Odds Ratio — extracts true implied probabilities |
| **Sentiment** | NLP analysis of press conferences, injury news, lineup sentiment |

## Setup

```bash
pip install -r requirements.txt
python main_loop.py --match "Brazil vs Scotland" --venue "Miami" --altitude 0
```

## Disclaimer
This project is built for **research and sports analytics education only**.
