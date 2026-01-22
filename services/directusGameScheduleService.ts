/**
 * Directus Game Schedule Service
 * 
 * This service handles fetching scheduled games from Directus for scorekeepers.
 * The scorekeeper user is linked to a team via Teams_directus_users junction table,
 * and can fetch games where their team is playing.
 * 
 * Directus Schema:
 * - Games collection
 *   Fields: id, Title, Date, competition, away_team (relation), home_team (relation), status
 * 
 * - Teams collection
 *   Fields: id, name, logo, users (many-to-many via Teams_directus_users)
 * 
 * - Teams_directus_users (junction table)
 *   Links teams to users
 */

import { createDirectus, rest, staticToken, readItems, readItem, updateItem, authentication } from '@directus/sdk';

// Helper function to get environment variable (checks window.__ENV__ first, then process.env)
function getEnvVar(key: string): string | undefined {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key];
  }
  return process.env[key];
}

// Create a separate Directus client for game schedule operations
// This uses the scorekeeper user's token (not admin token)
let scheduleClient: ReturnType<typeof createDirectus> | null = null;

// Track if we've already warned (to avoid spam)
let hasWarnedSchedule = false;

// Initialize client dynamically (can be called after window.__ENV__ is available)
function initializeScheduleClient() {
  const directusUrl = getEnvVar('DIRECTUS_URL');
  const token = getEnvVar('DIRECTUS_SCOREKEEPER_TOKEN');
  
  if (directusUrl && token) {
    if (!scheduleClient) {
      scheduleClient = createDirectus(directusUrl)
        .with(rest())
        .with(staticToken(token));
      // Client initialized (no logging in production)
    }
    return scheduleClient;
  } else {
    // Only warn once, and only if window.__ENV__ is available (meaning injection happened)
    if (!scheduleClient && !hasWarnedSchedule) {
      // Check if window.__ENV__ exists - if it does, we know injection happened and vars are truly missing
      if (typeof window !== 'undefined' && (window as any).__ENV__) {
        console.warn("Directus game schedule environment variables (DIRECTUS_URL, DIRECTUS_SCOREKEEPER_TOKEN) are not set. Game schedule import will not be available.");
        hasWarnedSchedule = true;
      }
      // If window.__ENV__ doesn't exist yet, don't warn - injection might happen later
    }
    return null;
  }
}

// Try to initialize on module load (but don't warn if window.__ENV__ isn't ready yet)
initializeScheduleClient();

export interface DirectusGameItem {
  id: number | string;
  Title?: string;
  Date?: string;
  competition?: string;
  location?: string;
  status?: string;
  home_team?: number | string | { id: number | string; name: string; logo?: string } | { key: number | string; collection: string };
  away_team?: number | string | { id: number | string; name: string; logo?: string } | { key: number | string; collection: string };
  home_roster?: number | string | { key: number | string; collection: string };
  away_roster?: number | string | { key: number | string; collection: string };
}

export interface FetchedGameScheduleData {
  homeTeam: {
    name: string;
    roster: string;
    logoUrl?: string;
    color: string;
  };
  awayTeam: {
    name: string;
    roster: string;
    logoUrl?: string;
    color: string;
  };
  competition: string;
  location: string;
  gameDate?: string | Date; // Date/time of the game
}

/**
 * Fetches the team ID that the scorekeeper user is linked to
 * Uses the Teams_directus_users junction table to find the user's team
 */
const getUserTeamId = async (): Promise<number | string | null> => {
  // Initialize client if not already initialized
  const client = initializeScheduleClient();
  if (!client) throw new Error("Directus schedule client not configured.");

  try {
    // Get current user info using REST API /users/me endpoint
    // Cannot use readItem on core collections like directus_users
    let userId: string | null = null;
    
    try {
      const directusUrl = getEnvVar('DIRECTUS_URL');
      const token = getEnvVar('DIRECTUS_SCOREKEEPER_TOKEN');
      
      if (!directusUrl || !token) {
        throw new Error("Directus URL or token not configured");
      }
      
      const response = await fetch(`${directusUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        const user = userData.data || userData;
        // Junction table stores user UUID in "user" field
        userId = user.id;
        // User authenticated (no logging of sensitive data)
      } else {
        const errorText = await response.text();
        console.warn("Failed to get user info from /users/me:", response.status, errorText);
      }
    } catch (err) {
      console.warn("Error getting user info via REST API:", err);
    }
    
    if (!userId) {
      throw new Error("Could not retrieve current user information.");
    }
    
    // Looking up team for user

    // Find the team linked to this user via the junction table
    // Junction table: Teams_directus_users
    // Schema: id (integer), teams (integer - team ID), user (UUID - user ID)
    let teamLinks;
    
    try {
      // Filter by user field (which contains user UUID)
      teamLinks = await client.request(readItems('Teams_directus_users', {
        filter: {
          user: { _eq: userId }
        },
        fields: ['teams', 'user']
      }));
      // Team links found
    } catch (err: any) {
      // Direct filter failed, trying fallback
      
      // Check if it's a 403 Forbidden (permissions issue)
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        throw new Error("Permission denied: The scorekeeper user does not have read access to the Teams_directus_users junction table. Please contact an administrator to grant read permissions.");
      }
      
      // Fallback: Get all and filter in code
      try {
        const allLinks = await client.request(readItems('Teams_directus_users', {
          fields: ['teams', 'user']
        }));
        // All junction records retrieved
        teamLinks = allLinks.filter((link: any) => {
          const linkUserId = link.user;
          return linkUserId === userId;
        });
        // Filtered team links
      } catch (fallbackErr: any) {
        if (fallbackErr?.response?.status === 403 || fallbackErr?.response?.status === 401) {
          throw new Error("Permission denied: The scorekeeper user does not have read access to the Teams_directus_users junction table. Please contact an administrator to grant read permissions.");
        }
        throw fallbackErr;
      }
    }

    if (teamLinks && teamLinks.length > 0) {
      // Return the first team ID
      // teams field should be the team ID directly (value "10" in your case)
      const teamsValue = teamLinks[0].teams;
      const teamId = typeof teamsValue === 'object' ? (teamsValue.id || teamsValue) : teamsValue;
      // Team ID found
      return teamId;
    }

    // No team found for user
    return null;
  } catch (error) {
    console.error("Failed to fetch user team - full error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw new Error("Failed to fetch user's team. Make sure the user is linked to a team in Directus via Teams_directus_users junction table.");
  }
};

/**
 * Fetches scheduled games where the scorekeeper's team is playing (home or away)
 * Returns games with status 'scheduled'
 */
export const fetchUserScheduledGames = async (): Promise<Array<{ id: number | string; title: string }>> => {
  // Initialize client if not already initialized (in case window.__ENV__ wasn't available at module load)
  const client = initializeScheduleClient();
  if (!client) {
    throw new Error('Directus game schedule is not configured. Set DIRECTUS_URL and DIRECTUS_SCOREKEEPER_TOKEN environment variables.');
  }

  try {
    // Get the user's team ID
    const userTeamId = await getUserTeamId();
    
    if (!userTeamId) {
      throw new Error('User is not linked to a team. Please contact an administrator.');
    }

    // Fetch scheduled games where user's team is home or away
    // home_team and away_team are relation fields (Collection Item Dropdown)
    // Convert userTeamId to number if it's a string, as relations typically use integer IDs
    const teamIdForFilter = typeof userTeamId === 'string' ? parseInt(userTeamId, 10) : userTeamId;
    
    // Fetching games for team
    
    // Try filtering by status first, then filter in code for team
    // This avoids complex nested filters that might cause 400 errors
    let games;
    try {
      // First, get all scheduled games
      // Fetching scheduled games
      const allScheduledGames = await client.request(readItems('Games', {
        filter: {
          status: { _eq: 'scheduled' }
        },
        fields: ['id', 'Title', 'competition', 'Date', 'home_team', 'away_team', 'status'],
        sort: ['Date']
      }));
      
      // Processing scheduled games
      
      // Filter in code for games where user's team is home or away
      // home_team and away_team are JSON fields with structure: {key: X, collection: 'Teams'}
      games = allScheduledGames.filter((game: DirectusGameItem) => {
        // Handle JSON objects - structure is {key: X, collection: 'Teams'}
        let homeTeamId: any = null;
        let awayTeamId: any = null;
        
        if (game.home_team) {
          if (typeof game.home_team === 'object') {
            // JSON object - extract key field (not id)
            homeTeamId = (game.home_team as any).key || (game.home_team as any).id || game.home_team;
          } else {
            // Already an ID value
            homeTeamId = game.home_team;
          }
        }
        
        if (game.away_team) {
          if (typeof game.away_team === 'object') {
            // JSON object - extract key field (not id)
            awayTeamId = (game.away_team as any).key || (game.away_team as any).id || game.away_team;
          } else {
            // Already an ID value
            awayTeamId = game.away_team;
          }
        }
        
        // Try multiple comparison methods (strict, loose, string, number)
        const homeMatch = homeTeamId === teamIdForFilter || 
                         homeTeamId == teamIdForFilter || 
                         String(homeTeamId) === String(teamIdForFilter) ||
                         Number(homeTeamId) === Number(teamIdForFilter);
        const awayMatch = awayTeamId === teamIdForFilter || 
                         awayTeamId == teamIdForFilter || 
                         String(awayTeamId) === String(teamIdForFilter) ||
                         Number(awayTeamId) === Number(teamIdForFilter);
        
        return homeMatch || awayMatch;
      });
      
      // Games filtered for team
    } catch (filterError: any) {
      console.error("Error with status filter, trying alternative:", filterError);
      
      // Check if it's a permissions error
      if (filterError?.response?.status === 403 || filterError?.response?.status === 401) {
        throw new Error("Permission denied: The scorekeeper user does not have read access to the Games collection. Please contact an administrator to grant read permissions.");
      }
      
      // Fallback: Try without status filter first
      try {
        const allGames = await client.request(readItems('Games', {
          fields: ['id', 'Title', 'competition', 'Date', 'home_team', 'away_team', 'status'],
          sort: ['Date'],
          limit: 100 // Limit to avoid too many results
        }));
        
        games = allGames.filter((game: DirectusGameItem) => {
          // Handle JSON objects for home_team and away_team - structure is {key: X, collection: 'Teams'}
          let homeTeamId: any = null;
          let awayTeamId: any = null;
          
          if (game.home_team) {
            if (typeof game.home_team === 'object') {
              homeTeamId = (game.home_team as any).key || (game.home_team as any).id || game.home_team;
            } else {
              homeTeamId = game.home_team;
            }
          }
          if (game.away_team) {
            if (typeof game.away_team === 'object') {
              awayTeamId = (game.away_team as any).key || (game.away_team as any).id || game.away_team;
            } else {
              awayTeamId = game.away_team;
            }
          }
          
          const homeMatch = homeTeamId === teamIdForFilter || 
                           homeTeamId == teamIdForFilter || 
                           String(homeTeamId) === String(teamIdForFilter) ||
                           Number(homeTeamId) === Number(teamIdForFilter);
          const awayMatch = awayTeamId === teamIdForFilter || 
                           awayTeamId == teamIdForFilter || 
                           String(awayTeamId) === String(teamIdForFilter) ||
                           Number(awayTeamId) === Number(teamIdForFilter);
          
          return (homeMatch || awayMatch) && game.status === 'scheduled';
        });
      } catch (fallbackError: any) {
        if (fallbackError?.response?.status === 403 || fallbackError?.response?.status === 401) {
          throw new Error("Permission denied: The scorekeeper user does not have read access to the Games collection. Please contact an administrator to grant read permissions.");
        }
        throw fallbackError;
      }
    }

    return games.map((game: DirectusGameItem) => ({
      id: game.id,
      title: game.Title || game.competition || `Game #${game.id}`,
    }));
  } catch (error: any) {
    console.error("Failed to fetch scheduled games:", error);
    
    // Log more details about the error
    if (error?.response) {
      try {
        const errorData = await error.response.json();
        console.error("Error details:", errorData);
      } catch {
        console.error("Error response status:", error.response.status);
        console.error("Error response text:", await error.response.text().catch(() => 'Could not read error text'));
      }
    }
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch scheduled games from Directus.');
  }
};

/**
 * Fetches detailed game data for a specific scheduled game
 * Note: Rosters are not stored in the Games collection - they need to be added to Teams collection
 * or we need to handle roster data separately. For now, returning empty rosters.
 */
export const fetchGameScheduleData = async (
  gameId: number | string
): Promise<FetchedGameScheduleData> => {
  // Initialize client if not already initialized (in case window.__ENV__ wasn't available at module load)
  const client = initializeScheduleClient();
  if (!client) {
    throw new Error('Directus game schedule is not configured. Set DIRECTUS_URL and DIRECTUS_SCOREKEEPER_TOKEN environment variables.');
  }

  try {
    // Fetch the game - include roster relations
    const game = await client.request(readItem('Games', gameId, {
      fields: [
        'id',
        'Title',
        'competition',
        'Date',
        'location',
        'home_team',
        'away_team',
        'home_roster',
        'away_roster',
      ]
    })) as DirectusGameItem;
    
    // Game data fetched

    // Extract team IDs from JSON structure
    // home_team and away_team are JSON: {key: X, collection: 'Teams'}
    const homeTeamId = typeof game.home_team === 'object' && (game.home_team as any).key 
      ? (game.home_team as any).key 
      : (typeof game.home_team === 'object' && (game.home_team as any).id 
        ? (game.home_team as any).id 
        : game.home_team);
    
    const awayTeamId = typeof game.away_team === 'object' && (game.away_team as any).key 
      ? (game.away_team as any).key 
      : (typeof game.away_team === 'object' && (game.away_team as any).id 
        ? (game.away_team as any).id 
        : game.away_team);
    
    // Team IDs extracted
    
    if (!homeTeamId || !awayTeamId) {
      throw new Error('Game schedule is missing required team IDs (home_team or away_team is null).');
    }
    
    // Fetch team data from Teams collection
    let homeTeamData: any = null;
    let awayTeamData: any = null;
    
    try {
      // Try to fetch with logo expanded first (in case logo is a file relation)
      homeTeamData = await client.request(readItem('Teams', homeTeamId, {
        fields: ['id', 'name', 'logo.id', 'logo.filename_disk', 'logo']
      }));
      // Home team data fetched
    } catch (homeTeamError: any) {
      console.error("Error fetching home team data:", homeTeamError);
      // Fallback: try without expanded logo
      try {
        homeTeamData = await client.request(readItem('Teams', homeTeamId, {
          fields: ['id', 'name', 'logo']
        }));
        // Home team data fetched (fallback)
      } catch (fallbackError: any) {
        throw new Error(`Failed to fetch home team data: ${homeTeamError.message || 'Unknown error'}`);
      }
    }
    
    try {
      // Try to fetch with logo expanded first (in case logo is a file relation)
      awayTeamData = await client.request(readItem('Teams', awayTeamId, {
        fields: ['id', 'name', 'logo.id', 'logo.filename_disk', 'logo']
      }));
      // Away team data fetched
    } catch (awayTeamError: any) {
      console.error("Error fetching away team data:", awayTeamError);
      // Fallback: try without expanded logo
      try {
        awayTeamData = await client.request(readItem('Teams', awayTeamId, {
          fields: ['id', 'name', 'logo']
        }));
        // Away team data fetched (fallback)
      } catch (fallbackError: any) {
        throw new Error(`Failed to fetch away team data: ${awayTeamError.message || 'Unknown error'}`);
      }
    }
    
    // Helper function to convert logo UUID to URL
    const getLogoUrl = (logo: any): string => {
      if (!logo) {
        // Logo is empty
        return '';
      }
      
      // Processing logo
      
      // If logo is already a URL string, return it
      if (typeof logo === 'string' && (logo.startsWith('http://') || logo.startsWith('https://'))) {
        return logo;
      }
      
      // If logo is a UUID (string), construct Directus file URL with access token
      if (typeof logo === 'string') {
        const directusUrl = getEnvVar('DIRECTUS_URL')?.replace(/\/$/, ''); // Remove trailing slash
        const token = getEnvVar('DIRECTUS_SCOREKEEPER_TOKEN');
        const url = token 
          ? `${directusUrl}/assets/${logo}?access_token=${token}`
          : `${directusUrl}/assets/${logo}`;
        return url;
      }
      
      // If logo is an object, try to extract ID from various possible fields
      if (typeof logo === 'object') {
        const logoId = logo.id || logo.key || logo.uuid || logo.filename_disk;
        if (logoId) {
          const directusUrl = getEnvVar('DIRECTUS_URL')?.replace(/\/$/, '');
          const token = getEnvVar('DIRECTUS_SCOREKEEPER_TOKEN');
          const url = token 
            ? `${directusUrl}/assets/${logoId}?access_token=${token}`
            : `${directusUrl}/assets/${logoId}`;
          return url;
        }
      }
      
      return '';
    };

    // Helper function to get player photo URL (similar to getLogoUrl)
    const getPlayerPhotoUrl = (photo: any): string => {
      if (!photo) return 'https://bstrana.sirv.com/ybc/player.png'; // Default placeholder
      
      // If photo is already a URL string, return it
      if (typeof photo === 'string' && (photo.startsWith('http://') || photo.startsWith('https://'))) {
        return photo;
      }
      
      // If photo is a UUID (string), construct Directus file URL with access token
      if (typeof photo === 'string') {
        const directusUrl = getEnvVar('DIRECTUS_URL')?.replace(/\/$/, ''); // Remove trailing slash
        const token = getEnvVar('DIRECTUS_SCOREKEEPER_TOKEN');
        // Add access token to URL if available (for private assets)
        if (token) {
          return `${directusUrl}/assets/${photo}?access_token=${token}`;
        }
        return `${directusUrl}/assets/${photo}`;
      }
      
      // If photo is an object with id field
      if (typeof photo === 'object' && photo.id) {
        const directusUrl = process.env.DIRECTUS_URL?.replace(/\/$/, '');
        const token = process.env.DIRECTUS_SCOREKEEPER_TOKEN;
        // Add access token to URL if available (for private assets)
        if (token) {
          return `${directusUrl}/assets/${photo.id}?access_token=${token}`;
        }
        return `${directusUrl}/assets/${photo.id}`;
      }
      
      return 'https://bstrana.sirv.com/ybc/player.png'; // Default placeholder
    };
    
    const homeLogoUrl = getLogoUrl(homeTeamData.logo);
    const awayLogoUrl = getLogoUrl(awayTeamData.logo);

    if (!homeTeamData || !awayTeamData) {
      throw new Error('Game schedule is missing required team data (could not fetch team information).');
    }
    
    const homeTeamName = homeTeamData.name || `Team ${homeTeamId}`;
    const awayTeamName = awayTeamData.name || `Team ${awayTeamId}`;
    
    if (!homeTeamName || !awayTeamName) {
      throw new Error('Game schedule is missing required team names.');
    }

    // Fetch roster data from Rosters collection
    // Games have home_roster and away_roster fields connecting to Rosters collection
    // Rosters have a "players" repeater field
    let homeRosterString = '';
    let awayRosterString = '';
    
    try {
      // Get roster IDs from game (they might be JSON objects or direct IDs)
      // Handle null/undefined values
      let homeRosterId: number | string | null = null;
      let awayRosterId: number | string | null = null;
      
      if (game.home_roster) {
        if (typeof game.home_roster === 'object') {
          homeRosterId = (game.home_roster as any).key || (game.home_roster as any).id || null;
        } else {
          homeRosterId = game.home_roster;
        }
      }
      
      if (game.away_roster) {
        if (typeof game.away_roster === 'object') {
          awayRosterId = (game.away_roster as any).key || (game.away_roster as any).id || null;
        } else {
          awayRosterId = game.away_roster;
        }
      }
      
      // Processing rosters
      
      // Fetch home roster
      if (homeRosterId) {
        try {
          const homeRosterData = await client.request(readItem('Rosters', homeRosterId, {
            fields: ['id', 'players']
          }));
          // Home roster fetched
          
          // Convert players repeater to roster string format
          // Players are stored as JSON: [{"key":2,"collection":"Players"},{"key":1,"collection":"Players"}]
          // We need to fetch actual player data from Players collection
          if (homeRosterData.players && Array.isArray(homeRosterData.players)) {
            // Processing home roster players
            
            // Fetch all player data at once using readItems with filter
            // Players are stored as: [{"key":2,"collection":"Players"},{"key":1,"collection":"Players"}]
            // Extract all player IDs first
            const playerIds = homeRosterData.players
              .map((playerRef: any) => playerRef.key || playerRef.id)
              .filter((id: any) => id !== null && id !== undefined);
            
            // Fetching players
            
            let playersData: any[] = [];
            
            if (playerIds.length > 0) {
              try {
                // Fetch all players at once using readItems with filter
                // Players collection only has first_name and last_name fields accessible
                const allPlayers = await client.request(readItems('Players', {
                  filter: {
                    id: { _in: playerIds }
                  },
                  fields: ['id', 'first_name', 'last_name', 'player_photo']
                }));
                
                // Players fetched
                
                // Create a map for quick lookup
                const playersMap = new Map(allPlayers.map((p: any) => [p.id, p]));
                
                // Map back to original order
                playersData = playerIds.map((id: any) => playersMap.get(id) || null);
              } catch (error: any) {
                console.warn("Error fetching players with readItems:", error?.response?.status, error?.message);
                
                // Fallback: try individual reads if bulk fetch fails
                // Falling back to individual fetches
                const playerPromises = homeRosterData.players.map(async (playerRef: any) => {
                  const playerId = playerRef.key || playerRef.id || playerRef;
                  if (!playerId) return null;
                  
                  try {
                    const playerData = await client.request(readItem('Players', playerId, {
                      fields: ['id', 'first_name', 'last_name', 'player_photo']
                    }));
                    return playerData;
                  } catch (err: any) {
                    console.warn(`Error fetching player ${playerId}:`, err?.response?.status);
                    return null;
                  }
                });
                
                playersData = await Promise.all(playerPromises);
              }
            }
            
            // Home players processed
            
            // Convert to roster string format
            // Format: battingOrder, number, name, position, photoUrl (photoUrl is optional)
            const rosterLines = playersData
              .filter((player: any) => player !== null)
              .map((player: any, index: number) => {
                // Assign batting order 1-9 for first 9 players, 0 for rest (bench)
                const battingOrder = index < 9 ? index + 1 : 0;
                
                // Players collection only has first_name and last_name
                // Number and position are not available, so we'll use defaults
                const number = 0; // No number field available
                
                // Players collection uses first_name and last_name fields
                const firstName = player.first_name || '';
                const lastName = player.last_name || '';
                const name = `${firstName} ${lastName}`.trim() || 'Unknown Player';
                
                // Position is not available, default to BENCH (user can edit in roster table)
                const position = 'BENCH';
                
                // Get player photo URL
                const photoUrl = getPlayerPhotoUrl(player.player_photo);
                
                return `${battingOrder}, ${number}, ${name}, ${position}, ${photoUrl}`;
              });
            
            homeRosterString = rosterLines.join('\n');
            // Home roster string generated
          }
        } catch (homeRosterError: any) {
          console.warn("Error fetching home roster:", homeRosterError);
        }
      }
      
      // Fetch away roster
      if (awayRosterId) {
        try {
          const awayRosterData = await client.request(readItem('Rosters', awayRosterId, {
            fields: ['id', 'players']
          }));
          // Away roster fetched
          
          // Convert players repeater to roster string format
          // Players are stored as JSON: [{"key":2,"collection":"Players"},{"key":1,"collection":"Players"}]
          // We need to fetch actual player data from Players collection
          if (awayRosterData.players && Array.isArray(awayRosterData.players)) {
            // Processing away roster players
            
            // Fetch all player data at once using readItems with filter
            // Players are stored as: [{"key":2,"collection":"Players"},{"key":1,"collection":"Players"}]
            // Extract all player IDs first
            const playerIds = awayRosterData.players
              .map((playerRef: any) => playerRef.key || playerRef.id)
              .filter((id: any) => id !== null && id !== undefined);
            
            // Fetching players
            
            let playersData: any[] = [];
            
            if (playerIds.length > 0) {
              try {
                // Fetch all players at once using readItems with filter
                // Players collection only has first_name and last_name fields accessible
                const allPlayers = await client.request(readItems('Players', {
                  filter: {
                    id: { _in: playerIds }
                  },
                  fields: ['id', 'first_name', 'last_name', 'player_photo']
                }));
                
                // Players fetched
                
                // Create a map for quick lookup
                const playersMap = new Map(allPlayers.map((p: any) => [p.id, p]));
                
                // Map back to original order
                playersData = playerIds.map((id: any) => playersMap.get(id) || null);
              } catch (error: any) {
                console.warn("Error fetching players with readItems:", error?.response?.status, error?.message);
                
                // Fallback: try individual reads if bulk fetch fails
                // Falling back to individual fetches
                const playerPromises = awayRosterData.players.map(async (playerRef: any) => {
                  const playerId = playerRef.key || playerRef.id || playerRef;
                  if (!playerId) return null;
                  
                  try {
                    const playerData = await client.request(readItem('Players', playerId, {
                      fields: ['id', 'first_name', 'last_name', 'player_photo']
                    }));
                    return playerData;
                  } catch (err: any) {
                    console.warn(`Error fetching player ${playerId}:`, err?.response?.status);
                    return null;
                  }
                });
                
                playersData = await Promise.all(playerPromises);
              }
            }
            
            // Away players processed
            
            // Convert to roster string format
            // Format: battingOrder, number, name, position, photoUrl (photoUrl is optional)
            const rosterLines = playersData
              .filter((player: any) => player !== null)
              .map((player: any, index: number) => {
                const battingOrder = index < 9 ? index + 1 : 0;
                
                // Players collection only has first_name and last_name
                // Number and position are not available, so we'll use defaults
                const number = 0; // No number field available
                
                // Players collection uses first_name and last_name fields
                const firstName = player.first_name || '';
                const lastName = player.last_name || '';
                const name = `${firstName} ${lastName}`.trim() || 'Unknown Player';
                
                // Position is not available, default to BENCH (user can edit in roster table)
                const position = 'BENCH';
                
                // Get player photo URL
                const photoUrl = getPlayerPhotoUrl(player.player_photo);
                
                return `${battingOrder}, ${number}, ${name}, ${position}, ${photoUrl}`;
              });
            
            awayRosterString = rosterLines.join('\n');
            // Away roster string generated
          }
        } catch (awayRosterError: any) {
          console.warn("Error fetching away roster:", awayRosterError);
        }
      }
    } catch (rosterError: any) {
      console.warn("Error fetching rosters:", rosterError);
      // Continue without rosters - user can fill them in manually
    }
    
    return {
      homeTeam: {
        name: homeTeamName,
        roster: homeRosterString,
        logoUrl: homeLogoUrl,
        color: '#ffffff', // TODO: Add color field to Teams collection if needed
      },
      awayTeam: {
        name: awayTeamName,
        roster: awayRosterString,
        logoUrl: awayLogoUrl,
        color: '#ffffff', // TODO: Add color field to Teams collection if needed
      },
      competition: game.competition || '',
      location: game.location || '',
      gameDate: game.Date || undefined,
    };
  } catch (error) {
    console.error("Failed to fetch game schedule data:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch game schedule data for game ${gameId}.`);
  }
};

/**
 * Updates the game status in Directus when a game is finalized
 */
export const updateGameScheduleStatus = async (
  gameId: number | string,
  status: 'in_progress' | 'finished'
): Promise<void> => {
  if (!scheduleClient) return;

  try {
    await client.request(
      updateItem('Games', gameId, { status })
    );
  } catch (error) {
    console.error("Failed to update game schedule status:", error);
    // Don't throw - this is not critical
  }
};

