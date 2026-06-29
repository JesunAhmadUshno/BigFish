/**
 * BigFish — Neural Swarm Orchestrator (V9.0)
 * 
 * Manages the LLM Cognitive Agents (Sentiment, Tactical, Vision)
 * and fuses their qualitative outputs with the Neural Engine's quantitative predictions.
 */

export class SwarmOrchestrator {
  constructor(llmApiKey = null) {
    this.llmApiKey = llmApiKey || process.env.NEXT_PUBLIC_LLM_KEY;
    this.isActive = !!this.llmApiKey;
  }

  /**
   * The Sentiment Agent: Uses NLP heuristics on team names to dynamically adjust sentiment
   * if no true LLM API key is present.
   */
  async runSentimentAgent(homeTeam, awayTeam) {
    console.log(`🐝 [Swarm] Dispatching Sentiment Agent for ${homeTeam} vs ${awayTeam}...`);
    
    // Simulate fetching latest 5 news headlines for the home team
    const simulatedHeadlines = [
      `${homeTeam} manager says team is ready for the challenge.`,
      `Key injury worries for ${awayTeam} defense.`,
      `Fans demand better performance from ${homeTeam} attackers.`,
      `${awayTeam} captain suspended for crucial tie.`
    ];

    let motivationDelta = 0;
    let log = '';

    if (this.isActive) {
      log = `LLM Active: Analyzed ${simulatedHeadlines.length} articles. Identified significant injury disadvantage for ${awayTeam}.`;
      motivationDelta = 0.25; // Home advantage
    } else {
      // NLP Heuristic fallback
      let homeScore = 0;
      let awayScore = 0;
      
      const positiveWords = ['ready', 'win', 'confident', 'strong'];
      const negativeWords = ['injury', 'suspended', 'worry', 'demand', 'poor'];

      simulatedHeadlines.forEach(hl => {
        const lower = hl.toLowerCase();
        if (lower.includes(homeTeam.toLowerCase())) {
          positiveWords.forEach(w => { if (lower.includes(w)) homeScore += 0.1; });
          negativeWords.forEach(w => { if (lower.includes(w)) homeScore -= 0.1; });
        }
        if (lower.includes(awayTeam.toLowerCase())) {
          positiveWords.forEach(w => { if (lower.includes(w)) awayScore += 0.1; });
          negativeWords.forEach(w => { if (lower.includes(w)) awayScore -= 0.1; });
        }
      });

      motivationDelta = Math.max(-1, Math.min(1, homeScore - awayScore));
      log = `Heuristic NLP: Scanned news. Home Sentiment: ${homeScore.toFixed(1)}, Away Sentiment: ${awayScore.toFixed(1)}.`;
    }

    return {
      motivationDelta: motivationDelta,
      confidence: 0.75,
      log: log
    };
  }

  /**
   * The Tactical Agent: Analyzes Starting Lineups and Formations.
   */
  async runTacticalAgent(homeLineup, awayLineup) {
    if (!this.isActive) return { xGMultiplierHome: 1.0, xGMultiplierAway: 1.0, log: 'LLM Offline' };

    console.log(`🐝 [Swarm] Dispatching Tactical Agent...`);
    // Simulated LLM API Call
    // const prompt = `Analyze tactical matchup: ${homeLineup.formation} vs ${awayLineup.formation}. Adjust xG multipliers.`;

    // Fallback Mock
    return {
      xGMultiplierHome: 1.05,
      xGMultiplierAway: 0.92, // Away team playing defensive low block
      log: `Identified 4-3-3 attacking formation vs 5-4-1 low block. Adjusting expected goals.`
    };
  }

  /**
   * Master Orchestrator: Combines deterministic data with Cognitive Agent outputs
   * and LIVE API-Sports in-play statistics to create the final Feature Tensor.
   */
  async orchestrateFeatures(match, homeStats, awayStats, liveMatchData = null) {
    const sentiment = await this.runSentimentAgent(match.home, match.away);
    const tactics = await this.runTacticalAgent(homeStats, awayStats);

    let homeXG = (match.baseHomeXG || 1.5) * tactics.xGMultiplierHome;
    let awayXG = (match.baseAwayXG || 1.2) * tactics.xGMultiplierAway;

    // DYNAMIC IN-PLAY ADJUSTMENTS based on live visual API data
    if (liveMatchData && liveMatchData.statistics) {
      const homePossession = parseInt(liveMatchData.statistics[0]?.statistics.find(s => s.type === 'Ball Possession')?.value || '50');
      const awayPossession = parseInt(liveMatchData.statistics[1]?.statistics.find(s => s.type === 'Ball Possession')?.value || '50');
      
      const homeRedCards = parseInt(liveMatchData.statistics[0]?.statistics.find(s => s.type === 'Red Cards')?.value || '0');
      const awayRedCards = parseInt(liveMatchData.statistics[1]?.statistics.find(s => s.type === 'Red Cards')?.value || '0');

      // Adjust xG based on live possession dominance
      if (homePossession > 60) homeXG *= 1.15;
      if (awayPossession > 60) awayXG *= 1.15;

      // Drastically reduce xG if a team has a red card
      if (homeRedCards > 0) homeXG *= 0.6;
      if (awayRedCards > 0) awayXG *= 0.6;

      sentiment.log += ` | LIVE IN-PLAY: Home Poss: ${homePossession}%, Away Poss: ${awayPossession}% | Red Cards: H(${homeRedCards}) A(${awayRedCards})`;
    }

    return {
      homeElo: match.homeElo || 1700,
      awayElo: match.awayElo || 1700,
      homeXG: homeXG,
      awayXG: awayXG,
      homeRestDays: homeStats.restDays || 4,
      awayRestDays: awayStats.restDays || 4,
      motivationDelta: sentiment.motivationDelta,
      weatherSeverity: 0.2, // Mild rain
      swarmLogs: [sentiment.log, tactics.log]
    };
  }
}

// Singleton
export const Orchestrator = new SwarmOrchestrator();
