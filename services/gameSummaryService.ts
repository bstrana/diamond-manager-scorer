import type { GameState, Team, Player } from '../types';
import { generateHitDescriptionText } from '../components/HitDescriptionModal';

export const generateGameSummary = (gameState: GameState): string => {
  const { homeTeam, awayTeam, plateAppearances, gameStartTime, gameEndTime } = gameState;

  // 1. Determine Winner and Loser
  const winner = homeTeam.score > awayTeam.score ? homeTeam : (awayTeam.score > homeTeam.score ? awayTeam : null);
  const loser = homeTeam.score < awayTeam.score ? homeTeam : (awayTeam.score < homeTeam.score ? awayTeam : null);
  const isTie = homeTeam.score === awayTeam.score;

  // 2. Game Duration
  let durationStr = 'N/A';
  if (gameStartTime && gameEndTime) {
    const elapsed = Math.floor((gameEndTime - gameStartTime) / 1000); // seconds
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    durationStr = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  }

  // 3. Combine rosters
  const allPlayers = [...homeTeam.roster, ...awayTeam.roster];

  // 4. Top Performers
  const topHitters = allPlayers
    .filter(p => p.stats.H > 0)
    .sort((a, b) => b.stats.H - a.stats.H)
    .slice(0, 3);
  const topRBI = allPlayers
    .filter(p => p.stats.RBI > 0)
    .sort((a, b) => b.stats.RBI - a.stats.RBI)
    .slice(0, 3);

  // 5. Key Plays (Home Runs)
  const homeRuns = plateAppearances.filter(pa => pa.result === 'homerun');

  // 6. Pitchers of Record (Simplified: pitcher with most IP on winning/losing team)
  const findPitcherWithMostIP = (team: Team): Player | undefined => {
      return [...team.roster]
        .filter(p => p.stats.IP > 0)
        .sort((a, b) => b.stats.IP - a.stats.IP)[0];
  }
  const wp = winner ? findPitcherWithMostIP(winner) : null;
  const lp = loser ? findPitcherWithMostIP(loser) : null;

  // 7. Build the summary string
  let summary = `⚾️ **Game Summary** ⚾️\n\n`;
  if (isTie) {
    summary += `**FINAL (TIE):** ${homeTeam.name} ${homeTeam.score} - ${awayTeam.name} ${awayTeam.score}\n`;
  } else if(winner && loser) {
    summary += `**FINAL:** ${winner.name} def. ${loser.name}, ${winner.score}-${loser.score}\n`;
  }
  summary += `*${gameState.competition}* at *${gameState.location}*\n`;
  summary += `Duration: ${durationStr}\n\n`;

  if (wp) summary += `**WP:** ${wp.name} (#${wp.number})\n`;
  if (lp) summary += `**LP:** ${lp.name} (#${lp.number})\n`;
  if (wp || lp) summary += `\n`;
  
  if (topHitters.length > 0) {
    summary += `**Top Hitters:**\n`;
    topHitters.forEach(p => {
      const teamName = homeTeam.roster.some(r => r.id === p.id) ? homeTeam.name : awayTeam.name;
      summary += `- ${p.name} (${teamName.substring(0,3)}): ${p.stats.H} hit${p.stats.H > 1 ? 's' : ''}\n`;
    });
    summary += `\n`;
  }

  if (topRBI.length > 0) {
    summary += `**Top RBI:**\n`;
    topRBI.forEach(p => {
      const teamName = homeTeam.roster.some(r => r.id === p.id) ? homeTeam.name : awayTeam.name;
      summary += `- ${p.name} (${teamName.substring(0,3)}): ${p.stats.RBI} RBI${p.stats.RBI > 1 ? 's' : ''}\n`;
    });
    summary += `\n`;
  }

  if (homeRuns.length > 0) {
    summary += `**Home Runs:**\n`;
    homeRuns.forEach(pa => {
      const description = pa.hitDescription ? generateHitDescriptionText(pa.hitDescription) : 'home run';
      summary += `- ${pa.batter.name} (${pa.battingTeam.substring(0,3)}): ${description}\n`;
    });
    summary += `\n`;
  }

  summary += `#Baseball #LiveScore`;

  return summary;
};