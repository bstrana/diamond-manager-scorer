import type { TeamSetup } from '../types';

// This interface defines the shape of the data we expect from the ACF fields in WordPress.
// It's used for both `acf` and `meta_box` structures.
interface WpAcfGameData {
  competition: string;
  location: string;
  home_team_name: string;
  home_team_logo?: string;
  home_team_color: string;
  home_team_roster: string;
  away_team_name: string;
  away_team_logo?: string;
  away_team_color: string;
  away_team_roster: string;
}

export interface FetchedGameData {
  homeTeam: TeamSetup;
  awayTeam: TeamSetup;
  competition: string;
  location: string;
}

export interface WpGameListItem {
  id: number;
  title: string;
}

/**
 * Decodes HTML entities from a string (e.g., &#8211; becomes –).
 * SECURITY: Uses textContent instead of innerHTML to prevent XSS.
 * @param text The string to decode.
 * @returns The decoded string.
 */
const decodeHtmlEntities = (text: string): string => {
  try {
    // Security: Use textContent instead of innerHTML to prevent XSS
    // Create a temporary element and set textContent (which auto-decodes entities)
    const textarea = document.createElement('textarea');
    textarea.textContent = text;
    return textarea.value || text;
  } catch (e) {
    // Fallback: Use a simple regex-based decoder for common entities
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"');
  }
};


export const fetchUserGames = async (): Promise<WpGameListItem[]> => {
  const siteUrl = process.env.WP_SITE_URL;
  const username = process.env.WP_USERNAME;
  const appPass = process.env.WP_APP_PASS;

  if (!siteUrl || !username || !appPass) {
    throw new Error('WordPress API credentials are not configured in environment variables.');
  }

  const endpoint = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/game`;
  const credentials = btoa(`${username}:${appPass}`);
  const headers = { 'Authorization': `Basic ${credentials}` };

  const userResponse = await fetch(`${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me?context=edit`, { headers });
  if (!userResponse.ok) {
    let errorMessage = 'Authentication failed. Please check your username and Application Password.';
    try {
      const errorData = await userResponse.json();
      if (errorData.message) {
        errorMessage += ` (Server says: ${errorData.message})`;
      }
    } catch {
      // Ignore JSON parsing errors
    }
    errorMessage += ' Also, check if a security plugin or server configuration is blocking REST API requests.';
    throw new Error(errorMessage);
  }
  const userData = await userResponse.json();
  const userId = userData.id;
  
  const gamesUrl = new URL(endpoint);
  gamesUrl.searchParams.append('author', userId.toString());
  gamesUrl.searchParams.append('meta_key', 'game_status');
  gamesUrl.searchParams.append('meta_value', 'scheduled');
  gamesUrl.searchParams.append('status', 'publish');
  gamesUrl.searchParams.append('_fields', 'id,title');
  
  const gamesResponse = await fetch(gamesUrl.toString(), { headers });
  if (!gamesResponse.ok) {
    throw new Error('Failed to fetch games. Make sure the REST API for the "game" post type is enabled and public.');
  }
  
  const gamesData = await gamesResponse.json();

  if (!Array.isArray(gamesData)) {
    throw new Error('Expected an array of games from WordPress, but received something else.');
  }

  return gamesData.map(game => ({
    id: game.id,
    title: game.title?.rendered ? decodeHtmlEntities(game.title.rendered) : `Game #${game.id}`,
  }));
};

export const fetchGameDataFromWordPress = async (
  postId: string
): Promise<FetchedGameData> => {
  const siteUrl = process.env.WP_SITE_URL;
  const username = process.env.WP_USERNAME;
  const appPass = process.env.WP_APP_PASS;

  if (!siteUrl || !username || !appPass) {
    throw new Error('WordPress API credentials are not configured in environment variables.');
  }

  const endpoint = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/game/${postId}?context=edit`;
  const credentials = btoa(`${username}:${appPass}`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage;
    if (response.status === 404) {
      errorMessage = `Game with Post ID ${postId} not found. Check the ID and that the post type is 'game'.`;
    } else if (response.status === 401 || response.status === 403) {
      errorMessage = 'Authentication failed. Please check your username and application password.';
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage += ` (Server says: ${errorData.message})`;
        }
      } catch { /* Ignore */ }
      errorMessage += ' Also, check if a security plugin or server configuration is blocking API access.';
    } else {
      errorMessage = `Failed to fetch data. Server responded with status: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  // Based on the user's screenshot, the data is in `meta_box`.
  const acfData = data.meta_box as WpAcfGameData;

  if (!acfData || !acfData.home_team_name || !acfData.away_team_name || !acfData.home_team_roster || !acfData.away_team_roster) {
      throw new Error(`The WordPress post is missing required fields in its 'meta_box'. Make sure custom fields like 'home_team_name' are set to 'Show in REST API'.`);
  }

  return {
    homeTeam: {
      name: acfData.home_team_name,
      logoUrl: acfData.home_team_logo || '',
      color: acfData.home_team_color,
      roster: acfData.home_team_roster,
    },
    awayTeam: {
      name: acfData.away_team_name,
      logoUrl: acfData.away_team_logo || '',
      color: acfData.away_team_color,
      roster: acfData.away_team_roster,
    },
    competition: acfData.competition,
    location: acfData.location,
  };
};

export const updateGameStatusInWordPress = async (
  postId: string
): Promise<void> => {
  const siteUrl = process.env.WP_SITE_URL;
  const username = process.env.WP_USERNAME;
  const appPass = process.env.WP_APP_PASS;

  if (!siteUrl || !username || !appPass) {
    throw new Error('WordPress API credentials are not configured in environment variables.');
  }

  const endpoint = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/game/${postId}`;
  const credentials = btoa(`${username}:${appPass}`);

  const response = await fetch(endpoint, {
    method: 'POST', // POST or PUT can be used for updates
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meta_box: {
        game_status: 'finished',
      }
    })
  });

  if (!response.ok) {
    let errorMessage = `Failed to update game status. Server responded with status: ${response.status}.`;
    if (response.status === 401 || response.status === 403) {
      errorMessage = 'Authentication failed when trying to update game status.';
    }
    
    try {
      const errorData = await response.json();
      console.error("WP Update Error:", errorData);
      if (errorData.message) {
        errorMessage += ` (Server says: ${errorData.message})`;
      }
    } catch { /* Ignore */ }
    
    if (response.status === 401 || response.status === 403) {
      errorMessage += ' Please check credentials and ensure the user has permission to edit games.';
    }
    
    throw new Error(errorMessage);
  }
  
  // WordPress game updated successfully
};

export const updateWpPostContent = async (
  postId: string,
  content: string
): Promise<void> => {
  const siteUrl = process.env.WP_SITE_URL;
  const username = process.env.WP_USERNAME;
  const appPass = process.env.WP_APP_PASS;

  if (!siteUrl || !username || !appPass) {
    throw new Error('WordPress API credentials are not configured in environment variables.');
  }
  
  const endpoint = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/game/${postId}`;
  const credentials = btoa(`${username}:${appPass}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: content,
    }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to update post content. Server responded with status: ${response.status}.`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage += ` (Server says: ${errorData.message})`;
      }
    } catch { /* Ignore */ }
    throw new Error(errorMessage);
  }

  // WordPress game content updated successfully
};