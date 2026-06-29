/**
 * BigFish — Automated Live Odds Scraper
 * 
 * Based on puppeteer scraping patterns found in open-source projects
 * like s4l1h/bet365-live-soccer-scraper.
 * 
 * WARNING: This is a backend Node.js script. It cannot be run natively
 * inside the Next.js static export/browser. It requires a server with
 * Puppeteer/Chromium installed to bypass Cloudflare/Incapsula.
 */

import puppeteer from 'puppeteer';

const BET365_MOBILE_URL = 'https://mobile.bet365.com/#type=InPlay;key=1;ip=1;lng=1';

export class OddsScraper {
  constructor(proxyUrl = null) {
    this.proxyUrl = proxyUrl;
    this.browser = null;
    this.page = null;
  }

  async connect() {
    const args = ['--no-sandbox', '--disable-setuid-sandbox'];
    if (this.proxyUrl) {
      args.push(`--proxy-server=${this.proxyUrl}`);
    }

    console.log(`[Scraper] Launching Headless Browser...`);
    this.browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode for better evasion
      args,
      defaultViewport: { width: 375, height: 812, isMobile: true } // Emulate iPhone
    });

    this.page = await this.browser.newPage();
    
    // Set realistic headers to avoid immediate blocking
    await this.page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    console.log(`[Scraper] Navigating to ${BET365_MOBILE_URL}...`);
    await this.page.goto(BET365_MOBILE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the In-Play soccer container to load
    await this.page.waitForSelector('.ipo-Fixture', { timeout: 15000 });
    console.log(`[Scraper] Connected & Initialized.`);
  }

  async fetchLiveOdds() {
    if (!this.page) throw new Error("Browser not connected. Call connect() first.");

    console.log(`[Scraper] Extracting live odds...`);
    const results = await this.page.evaluate(() => {
      const matches = [];
      const matchNodes = document.querySelectorAll('.ipo-Fixture');

      matchNodes.forEach(node => {
        try {
          const homeTeam = node.querySelector('.ipo-TeamStack_TeamWrapper:nth-child(1) .ipo-TeamStack_Team')?.innerText;
          const awayTeam = node.querySelector('.ipo-TeamStack_TeamWrapper:nth-child(2) .ipo-TeamStack_Team')?.innerText;
          const score = node.querySelector('.ipo-TeamStack_ScoreWrapper')?.innerText.replace(/\n/g, '-');
          const time = node.querySelector('.ipo-InPlayTimer')?.innerText;
          
          // Moneyline Odds (1X2)
          const oddsNodes = node.querySelectorAll('.gl-Participant_Odds');
          const homeOdds = oddsNodes[0]?.innerText;
          const drawOdds = oddsNodes[1]?.innerText;
          const awayOdds = oddsNodes[2]?.innerText;

          if (homeTeam && awayTeam) {
            matches.push({
              match: `${homeTeam} vs ${awayTeam}`,
              score,
              time,
              odds: {
                home: homeOdds,
                draw: drawOdds,
                away: awayOdds
              }
            });
          }
        } catch (e) {
          // Skip malformed nodes
        }
      });

      return matches;
    });

    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log(`[Scraper] Browser closed.`);
    }
  }
}

// Example Usage:
// const scraper = new OddsScraper();
// await scraper.connect();
// const odds = await scraper.fetchLiveOdds();
// console.log(odds);
// await scraper.close();
