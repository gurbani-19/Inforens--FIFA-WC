const https = require('https');
require('dotenv').config();

const API_BASE = 'https://api.football-data.org/v4';
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    if (!FOOTBALL_API_KEY) {
      return reject(new Error('FOOTBALL_API_KEY is not defined in environment variables.'));
    }

    const url = `${API_BASE}/${endpoint}`;
    const options = {
      headers: {
        'X-Auth-Token': FOOTBALL_API_KEY
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } else {
            reject(new Error(`API request failed with status code ${res.statusCode}: ${data}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Service to communicate with football-data.org API
 */
const footballDataService = {
  /**
   * Fetches WC teams list
   */
  async getTeams() {
    console.log('[footballDataService] Fetching World Cup teams...');
    try {
      const data = await makeRequest('competitions/WC/teams');
      return data.teams || [];
    } catch (error) {
      console.error('[footballDataService] Error fetching teams:', error.message);
      throw error;
    }
  },

  /**
   * Fetches WC matches list
   */
  async getMatches() {
    console.log('[footballDataService] Fetching World Cup matches...');
    try {
      const data = await makeRequest('competitions/WC/matches');
      return data.matches || [];
    } catch (error) {
      console.error('[footballDataService] Error fetching matches:', error.message);
      throw error;
    }
  },

  /**
   * Fetches WC group standings
   */
  async getStandings() {
    console.log('[footballDataService] Fetching World Cup standings...');
    try {
      const data = await makeRequest('competitions/WC/standings');
      return data.standings || [];
    } catch (error) {
      console.error('[footballDataService] Error fetching standings:', error.message);
      throw error;
    }
  }
};

module.exports = footballDataService;
