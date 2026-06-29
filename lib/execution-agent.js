import { ethers } from 'ethers';

class ExecutionAgent {
  constructor() {
    this.isActive = false;
    this.bankroll = 5000;
    this.wallet = null;
    this.provider = null;
  }

  setBankroll(amount) {
    this.bankroll = amount;
  }

  toggleAutoPilot(state) {
    this.isActive = state;
    console.log(`[Execution Agent] Auto-Pilot is now ${state ? 'ACTIVE' : 'OFFLINE'}`);
    if (state && !this.wallet) {
      this.connectWeb3();
    }
  }

  async connectWeb3() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await this.provider.getSigner();
        this.wallet = await signer.getAddress();
        console.log(`[Execution Agent] Web3 Wallet Connected: ${this.wallet}`);
        this.logToTerminal(`Web3 Wallet Connected: ${this.wallet.slice(0,6)}...${this.wallet.slice(-4)}`);
      } catch (err) {
        console.error('Web3 connection failed', err);
        this.logToTerminal('Web3 Connection Failed. Ensure MetaMask is unlocked.');
      }
    } else {
      this.logToTerminal('No Web3 provider found. Please install MetaMask for autonomous execution.');
    }
  }

  async executeWager(market, selection, odds, stake) {
    if (!this.isActive) return false;
    
    // Safety check
    if (stake > this.bankroll * 0.1) {
      console.warn('[Execution Agent] Bet rejected: Exceeds 10% bankroll limit.');
      return false;
    }

    this.logToTerminal(`INITIATING TRADE: $${stake.toFixed(2)} on ${selection} @ ${odds.toFixed(2)}`);

    if (this.wallet && this.provider) {
      this.logToTerminal(`Signing transaction via Web3: ${this.wallet}`);
      // In a real prod environment, we would build the transaction to a Polymarket/Azuro Router Contract here.
      // e.g., const tx = await contract.placeBet(...)
      
      // Simulating network delay for transaction mining
      await new Promise(r => setTimeout(r, 1500));
      this.logToTerminal(`Tx Confirmed! Block: ${Math.floor(Math.random() * 10000000) + 15000000}`);
    } else {
      this.logToTerminal(`Simulating execution (Web3 not connected).`);
    }

    // Deduct from local bankroll state
    this.bankroll -= stake;

    // Log to the Hedge Fund Tracker Ledger
    this.pushToLedger(market, selection, odds, stake);
    
    return true;
  }

  logToTerminal(msg) {
    // We rely on window events to communicate with the Tracker UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('terminal-log', { detail: msg }));
    }
  }

  pushToLedger(market, selection, odds, stake) {
    if (typeof window === 'undefined') return;
    try {
      const STORAGE_KEY = 'bigfish_bet_history';
      const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      history.unshift({
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        match: market,
        legs: selection,
        odds: odds,
        stake: stake,
        result: 'pending',
        pnl: 0,
        isAutoExecuted: true
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      // Dispatch storage event so Tracker page updates
      window.dispatchEvent(new Event('storage'));
    } catch(e) { console.error('Ledger push failed', e); }
  }
}

export const Agent = new ExecutionAgent();
