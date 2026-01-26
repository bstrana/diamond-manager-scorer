import type { GameState } from '../types';
import { generateHitDescriptionText } from '../components/HitDescriptionModal';
import { getEnvVar } from '../utils/env';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Formats game state data into a structured prompt for AI recap generation
 */
function formatGameDataForAI(gameState: GameState): string {
  const { homeTeam, awayTeam, plateAppearances, gameStartTime, gameEndTime, inning, competition, location } = gameState;

  // Determine winner
  const winner = homeTeam.score > awayTeam.score ? homeTeam : (awayTeam.score > homeTeam.score ? awayTeam : null);
  const isTie = homeTeam.score === awayTeam.score;

  // Game duration
  let durationStr = 'N/A';
  if (gameStartTime && gameEndTime) {
    const elapsed = Math.floor((gameEndTime - gameStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    durationStr = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  }

  // Top performers
  const allPlayers = [...homeTeam.roster, ...awayTeam.roster];
  const topHitters = allPlayers
    .filter(p => p.stats.H > 0)
    .sort((a, b) => b.stats.H - a.stats.H)
    .slice(0, 5);
  const topRBI = allPlayers
    .filter(p => p.stats.RBI > 0)
    .sort((a, b) => b.stats.RBI - a.stats.RBI)
    .slice(0, 5);
  const topPitchers = allPlayers
    .filter(p => p.stats.IP > 0)
    .sort((a, b) => b.stats.IP - a.stats.IP)
    .slice(0, 3);

  // Key plays
  const homeRuns = plateAppearances.filter(pa => pa.result === 'homerun');
  const keyPlays = plateAppearances.filter(pa => 
    pa.result === 'homerun' || 
    pa.runnersBattedIn >= 2 ||
    pa.result === 'triple'
  ).slice(0, 10);

  const gameData = {
    competition: competition || 'Baseball Game',
    location: location || 'Unknown',
    date: gameState.gameDate ? new Date(gameState.gameDate).toLocaleDateString() : 'Unknown',
    duration: durationStr,
    finalScore: {
      home: { name: homeTeam.name, score: homeTeam.score, hits: homeTeam.hits, errors: homeTeam.errors },
      away: { name: awayTeam.name, score: awayTeam.score, hits: awayTeam.hits, errors: awayTeam.errors },
      winner: winner ? winner.name : null,
      isTie: isTie
    },
    innings: inning,
    topPerformers: {
      hitters: topHitters.map(p => ({
        name: p.name,
        number: p.number,
        team: homeTeam.roster.some(r => r.id === p.id) ? homeTeam.name : awayTeam.name,
        hits: p.stats.H,
        atBats: p.stats.AB,
        rbis: p.stats.RBI,
        homeRuns: p.stats.HR,
        avg: p.stats.AVG.toFixed(3)
      })),
      rbiLeaders: topRBI.map(p => ({
        name: p.name,
        number: p.number,
        team: homeTeam.roster.some(r => r.id === p.id) ? homeTeam.name : awayTeam.name,
        rbis: p.stats.RBI
      })),
      pitchers: topPitchers.map(p => ({
        name: p.name,
        number: p.number,
        team: homeTeam.roster.some(r => r.id === p.id) ? homeTeam.name : awayTeam.name,
        innings: p.stats.IP.toFixed(1),
        runs: p.stats.R,
        earnedRuns: p.stats.ER,
        strikeouts: p.stats.SO_pitched,
        era: p.stats.ERA.toFixed(2)
      }))
    },
    keyPlays: keyPlays.map(pa => ({
      inning: pa.inning,
      isTop: pa.isTopInning,
      batter: pa.batter.name,
      batterNumber: pa.batter.number,
      team: pa.battingTeam,
      result: pa.result,
      rbis: pa.runnersBattedIn,
      hitDescription: pa.hitDescription ? generateHitDescriptionText(pa.hitDescription) : null,
      description: `${pa.batter.name} (${pa.result})${pa.runnersBattedIn > 0 ? ` - ${pa.runnersBattedIn} RBI${pa.runnersBattedIn > 1 ? 's' : ''}` : ''}`
    })),
    homeRuns: homeRuns.map(pa => ({
      inning: pa.inning,
      isTop: pa.isTopInning,
      batter: pa.batter.name,
      batterNumber: pa.batter.number,
      team: pa.battingTeam,
      rbis: pa.runnersBattedIn,
      hitDescription: pa.hitDescription ? generateHitDescriptionText(pa.hitDescription) : null
    }))
  };

  return JSON.stringify(gameData, null, 2);
}

/**
 * Generates an AI-powered game recap using OpenRouter
 */
export async function generateAIGameRecap(gameState: GameState): Promise<string> {
  const apiKey = getEnvVar('OPENROUTER_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured. Set OPENROUTER_API_KEY environment variable.');
  }

  const gameData = formatGameDataForAI(gameState);
  
  // Get model from environment variable, with fallback to default free model
  const model = getEnvVar('OPENROUTER_MODEL') || 'mistralai/mistral-7b-instruct:free';
  
  const systemPrompt = `You are a professional sports writer specializing in baseball game recaps. Write an engaging, professional game recap based on the provided game statistics. The recap should be:
- 3-5 paragraphs long
- Engaging and narrative-driven
- Highlight key moments and standout performances
- Include final score and key statistics
- Written in a professional sports journalism style
- Suitable for social media or blog posts`;

  const userPrompt = `Write a game recap for this baseball game:

${gameData}

Please write an engaging game recap that tells the story of this game, highlights key performances, and captures the excitement of the matchup.`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin, // Optional: for analytics
        'X-Title': 'Baseball Scoreboard Game Recap' // Optional: for analytics
      },
      body: JSON.stringify({
        model: model, // Configurable via OPENROUTER_MODEL environment variable
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data: OpenRouterResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenRouter API');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate AI recap');
  }
}

/**
 * Checks if OpenRouter is configured
 */
export function isOpenRouterConfigured(): boolean {
  return !!getEnvVar('OPENROUTER_API_KEY');
}

