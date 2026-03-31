
import { useState, useCallback, useRef, type SetStateAction } from 'react';
import type { GameState, Player, TeamSetup, PitchType, HitType, OutType, PlateAppearanceResult, PlayerStats, Team, PlateAppearance, DefensivePlays, ScoreboardSettings, HitDescription } from '../types';
import { getGameDataStore } from '../services/gameDataStore';
import { broadcastGameState } from '../services/broadcastService';
import { generateGameSummary } from '../services/gameSummaryService';

const initialPlayerStats: PlayerStats = {
    PA: 0, AB: 0, H: 0, BB: 0, SO: 0, RBI: 0, HR: 0, SF: 0, SH: 0,
    runsScored: 0, SB: 0, CS: 0,
    singles: 0, doubles: 0, triples: 0,
    pitchCount: 0,
    strikesThrown: 0,
    ballsThrown: 0,
    AVG: 0, OBP: 0, SLG: 0,
    A: 0, PO: 0, E: 0,
    IP: 0, IPOuts: 0, R: 0, ER: 0, ERA: 0, H_allowed: 0, BB_allowed: 0, SO_pitched: 0,
};

const parseRoster = (rosterString: string): Player[] => {
  return rosterString.split('\n').filter(line => line.trim()).map((line, index) => {
    const parts = line.split(',');
    // Format: battingOrder, number, name, position, photoUrl (photoUrl is optional)
    const photoUrl = parts[4]?.trim() || 'https://bstrana.sirv.com/ybc/player.png';
    return {
      id: `${Date.now()}-${index}`,
      battingOrder: parseInt(parts[0]?.trim(), 10) || 0,
      number: parseInt(parts[1]?.trim(), 10) || 0,
      name: parts[2]?.trim() || 'Unknown Player',
      position: parts[3]?.trim().toUpperCase() || 'N/A',
      photoUrl: photoUrl,
      stats: { ...initialPlayerStats }
    };
  });
};

const getActiveLineup = (roster: Player[]): Player[] => {
    const hasDH = roster.some(p => p.position.toUpperCase() === 'DH');
    const lineup = roster.filter(p => {
        const pos = p.position.toUpperCase();
        if (pos === 'BENCH' || p.battingOrder === 0) {
            return false;
        }
        if (hasDH && pos === 'P') {
            return false;
        }
        return true;
    });
    return lineup.sort((a, b) => a.battingOrder - b.battingOrder);
};

export const initialGameState: GameState = {
  gameId: null,
  gameStatus: 'setup',
  competition: '',
  location: '',
  scorekeeperName: '',
  homeTeam: { name: 'Home', score: 0, hits: 0, errors: 0, roster: [], LOB: 0, color: '#ffffff', runsByInning: [] },
  awayTeam: { name: 'Away', score: 0, hits: 0, errors: 0, roster: [], LOB: 0, color: '#ffffff', runsByInning: [] },
  inning: 1,
  isTopInning: true,
  outs: 0,
  strikes: 0,
  balls: 0,
  bases: { first: null, second: null, third: null },
  currentBatterIndex: { home: 0, away: 0 },
  currentPitcher: { home: {id:'', name:'', number:0, position: 'P', battingOrder: 0, stats: initialPlayerStats}, away: {id:'', name:'', number:0, position: 'P', battingOrder: 0, stats: initialPlayerStats} },
  pitchSequence: '',
  plateAppearances: [],
  gameStartTime: undefined,
  gameEndTime: undefined,
  homeRosterString: '',
  awayRosterString: '',
  scoreboardSettings: {
    showHits: true,
    showErrors: true,
    showLOB: true,
    showCurrentPitcher: true,
    showCurrentBatter: true,
    showOnDeck: true,
    lowerThirdsBackgroundColor: 'rgba(0, 0, 0, 0.9)', // Default: black with 90% opacity
    lowerThirdsTextColor: '#ffffff', // Default: white
    lockOverlayPositions: false, // Default: allow dragging
    nameTagAccentColor: '#facc15', // Default: yellow-400
  },
};

const updateBatterStats = (player: Player, result: PlateAppearanceResult, rbis: number): Player => {
    const newStats = { ...player.stats };

    newStats.PA += 1;
    newStats.RBI += rbis;

    const isAtBat = !['walk', 'HBP', 'IBB', 'sac_fly', 'sac_bunt'].includes(result);
    if (isAtBat) {
        newStats.AB += 1;
    }

    switch (result) {
        case 'single': newStats.H++; newStats.singles++; break;
        case 'double': newStats.H++; newStats.doubles++; break;
        case 'triple': newStats.H++; newStats.triples++; break;
        case 'homerun': newStats.H++; newStats.HR++; newStats.runsScored++; break; // Batter scores on HR
        case 'walk':
        case 'HBP':
        case 'IBB':
            newStats.BB++; break;
        case 'strikeout': newStats.SO++; break;
        case 'sac_fly': newStats.SF++; break;
        case 'sac_bunt': newStats.SH++; break;
    }

    newStats.AVG = newStats.AB > 0 ? newStats.H / newStats.AB : 0;
    // Standard OBP: (H + BB) / (AB + BB + SF)  — BB includes HBP and IBB; SH excluded per official formula
    const obpDenominator = newStats.AB + newStats.BB + newStats.SF;
    newStats.OBP = obpDenominator > 0 ? (newStats.H + newStats.BB) / obpDenominator : 0;
    const totalBases = (newStats.singles) + (newStats.doubles * 2) + (newStats.triples * 3) + (newStats.HR * 4);
    newStats.SLG = newStats.AB > 0 ? totalBases / newStats.AB : 0;

    return { ...player, stats: newStats };
};

const updatePitcherStats = (pitcher: Player, result: PlateAppearanceResult, runsScored: number, isOut: boolean): Player => {
    const newStats = { ...pitcher.stats };

    if (isOut) {
        // Track outs as an integer to avoid floating-point drift, derive IP from it.
        newStats.IPOuts = (newStats.IPOuts ?? 0) + 1;
        const fullInnings = Math.floor(newStats.IPOuts / 3);
        const remainder = newStats.IPOuts % 3; // 0, 1, or 2
        // Store in baseball notation: 1.2 = 1 full inning + 2 outs (not 1.667 innings)
        newStats.IP = parseFloat((fullInnings + remainder * 0.1).toFixed(1));
    }
    newStats.R += runsScored;
    newStats.ER += runsScored; // Simplified: Assuming all runs are earned for now.

    // Calculate ERA: (Earned Runs * 9) / true decimal innings (IPOuts / 3)
    const trueInnings = (newStats.IPOuts ?? 0) / 3;
    newStats.ERA = trueInnings > 0 ? (newStats.ER * 9) / trueInnings : 0;

    switch (result) {
        case 'single':
        case 'double':
        case 'triple':
        case 'homerun':
            newStats.H_allowed++;
            break;
        case 'walk':
        case 'HBP':
        case 'IBB':
            newStats.BB_allowed++;
            break;
        case 'strikeout':
            newStats.SO_pitched++;
            break;
    }
    return { ...pitcher, stats: newStats };
};

const scoreRun = (runner: Player, state: GameState): GameState => {
    const teamKey = state.isTopInning ? 'awayTeam' : 'homeTeam';
    const team = { ...state[teamKey] };
    team.score++;
    
    // Track runs by inning - create a new array to avoid mutation issues
    const currentInningIndex = state.inning - 1; // Convert to 0-based index
    const existingRunsByInning = team.runsByInning || [];
    // Create a new array with enough slots for current inning
    const runsByInning = [...existingRunsByInning];
    // Ensure array is long enough for current inning
    while (runsByInning.length <= currentInningIndex) {
      runsByInning.push(0);
    }
    // Increment runs for current inning
    runsByInning[currentInningIndex] = (runsByInning[currentInningIndex] || 0) + 1;
    team.runsByInning = runsByInning;
    
    const updatedRoster = team.roster.map(p => {
        if (p.id === runner.id) {
            return { ...p, stats: { ...p.stats, runsScored: p.stats.runsScored + 1 }};
        }
        return p;
    });
    team.roster = updatedRoster;
    const newState = { ...state, [teamKey]: team };

    // Sync with configured data store
    const dataStore = getGameDataStore();
    if (newState.gameId && dataStore.isConfigured()) {
        dataStore.updateGameScores(newState.gameId, newState.homeTeam.score, newState.awayTeam.score)
            .catch(e => console.error("Failed to update scores in data store:", e));
    }
    
    return newState;
};


export const useGameState = () => {
  const [gameState, setGameStateInternal] = useState<GameState>(() => {
    try {
      const savedState = localStorage.getItem('gameState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Ensure scoreboardSettings has all required fields (merge with defaults)
        parsed.scoreboardSettings = {
          ...initialGameState.scoreboardSettings,
          ...(parsed.scoreboardSettings || {}),
        };
        return parsed;
      }
      return initialGameState;
    } catch (error) {
      console.error("Error loading game state from localStorage, resetting.", error);
      localStorage.removeItem('gameState');
      return initialGameState;
    }
  });

  // Debounce localStorage writes and API sync separately to improve performance
  const localStorageWriteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const apiSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setGameState = useCallback((updater: SetStateAction<GameState>) => {
    setGameStateInternal(prevState => {
      const newState = typeof updater === 'function' ? updater(prevState) : updater;

      // Clear any pending localStorage write
      if (localStorageWriteTimeoutRef.current) {
        clearTimeout(localStorageWriteTimeoutRef.current);
      }

      // Debounce localStorage write (100ms) to avoid excessive writes
      localStorageWriteTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem('gameState', JSON.stringify(newState));
        } catch (error) {
          console.error("Error saving game state to localStorage:", error);
        }
      }, 100);

      // Broadcast immediately (no debounce needed for real-time updates)
      try {
        broadcastGameState(newState);

        // Also POST to server API for OBS browser sources (debounced)
        if (apiSyncTimeoutRef.current) {
          clearTimeout(apiSyncTimeoutRef.current);
        }
        apiSyncTimeoutRef.current = setTimeout(() => {
          const obsSyncEnabled = (process.env.ENABLE_OBS_SYNC || '').toString().toLowerCase() === 'true';
          const shouldSyncToApi = process.env.NODE_ENV === 'production' || obsSyncEnabled;
          if (!shouldSyncToApi) {
            return;
          }
          fetch('/api/gamestate', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
            body: JSON.stringify(newState)
          }).then(res => {
            if (!res.ok) {
              console.debug(`[useGameState] API POST failed: HTTP ${res.status}`);
            }
          }).catch(err => {
            // Silently fail - this is just for OBS compatibility
            console.debug('[useGameState] Failed to sync game state to server (this is OK if not using OBS):', err.message);
          });
        }, 100);
      } catch (error) {
        console.error("Error broadcasting game state:", error);
      }
      
      return newState;
    });
  }, []);

  const incrementPitchCount = useCallback((prevState: GameState, pitchType: 'ball' | 'strike'): GameState => {
    const pitchingTeamKey = prevState.isTopInning ? 'homeTeam' : 'awayTeam';
    const pitchingTeam = prevState[pitchingTeamKey];
    const pitcher = prevState.currentPitcher[prevState.isTopInning ? 'home' : 'away'];

    if (!pitcher) return prevState;

    const updatedRoster = pitchingTeam.roster.map(p => {
        if (p.id === pitcher.id) {
            const newStats = { 
                ...p.stats, 
                pitchCount: p.stats.pitchCount + 1,
                strikesThrown: p.stats.strikesThrown + (pitchType === 'strike' ? 1 : 0),
                ballsThrown: p.stats.ballsThrown + (pitchType === 'ball' ? 1 : 0),
            };
            return { ...p, stats: newStats };
        }
        return p;
    });
    
    const updatedPitcherInState = {
        ...pitcher,
        stats: { 
            ...pitcher.stats, 
            pitchCount: pitcher.stats.pitchCount + 1,
            strikesThrown: pitcher.stats.strikesThrown + (pitchType === 'strike' ? 1 : 0),
            ballsThrown: pitcher.stats.ballsThrown + (pitchType === 'ball' ? 1 : 0),
        }
    };

    return {
        ...prevState,
        [pitchingTeamKey]: { ...pitchingTeam, roster: updatedRoster },
        currentPitcher: { ...prevState.currentPitcher, [prevState.isTopInning ? 'home' : 'away']: updatedPitcherInState }
    };
  }, []);

  // Function to update setup data in gameState while keeping status as 'setup'
  const updateSetupData = useCallback((
    homeTeamSetup: TeamSetup,
    awayTeamSetup: TeamSetup,
    competition: string,
    location: string,
    gameDate?: string | Date
  ) => {
    setGameState(prevState => ({
      ...prevState,
      gameStatus: 'setup', // Keep as setup
      competition,
      location,
      gameDate,
      homeTeam: {
        ...prevState.homeTeam,
        name: homeTeamSetup.name,
        logoUrl: homeTeamSetup.logoUrl,
        color: homeTeamSetup.color,
      },
      awayTeam: {
        ...prevState.awayTeam,
        name: awayTeamSetup.name,
        logoUrl: awayTeamSetup.logoUrl,
        color: awayTeamSetup.color,
      },
    }));
  }, [setGameState]);

  const handleGameSetup = useCallback((
    homeTeamSetup: TeamSetup, 
    awayTeamSetup: TeamSetup,
    competition: string,
    location: string,
    gameId?: number | string,
    scorekeeperName?: string,
    gameDate?: string | Date
  ) => {
    const isEditing = gameState.gameStatus === 'playing';

    let newState: GameState;
    if (!isEditing) {
      const homeRoster = parseRoster(homeTeamSetup.roster);
      const awayRoster = parseRoster(awayTeamSetup.roster);
      newState = {
        ...initialGameState,
        gameStatus: 'playing',
        gameStartTime: Date.now(),
        competition,
        location,
        gameDate,
        scorekeeperName,
        homeTeam: { ...initialGameState.homeTeam, name: homeTeamSetup.name, logoUrl: homeTeamSetup.logoUrl, roster: homeRoster, color: homeTeamSetup.color, runsByInning: [] },
        awayTeam: { ...initialGameState.awayTeam, name: awayTeamSetup.name, logoUrl: awayTeamSetup.logoUrl, roster: awayRoster, color: awayTeamSetup.color, runsByInning: [] },
        homeRosterString: homeTeamSetup.roster,
        awayRosterString: awayTeamSetup.roster,
        currentPitcher: {
            home: homeRoster.find(p => p.position === 'P') || getActiveLineup(homeRoster)[getActiveLineup(homeRoster).length - 1],
            away: awayRoster.find(p => p.position === 'P') || getActiveLineup(awayRoster)[getActiveLineup(awayRoster).length - 1],
        },
        gameId: gameId || null,
      };
    } else {
        const homeRosterChanged = homeTeamSetup.roster !== gameState.homeRosterString;
        const awayRosterChanged = awayTeamSetup.roster !== gameState.awayRosterString;

        if (!homeRosterChanged && !awayRosterChanged) {
            newState = {
              ...gameState,
              competition,
              location,
              scorekeeperName,
              homeTeam: { ...gameState.homeTeam, name: homeTeamSetup.name, logoUrl: homeTeamSetup.logoUrl, color: homeTeamSetup.color },
              awayTeam: { ...gameState.awayTeam, name: awayTeamSetup.name, logoUrl: awayTeamSetup.logoUrl, color: awayTeamSetup.color },
            }
        } else {
            const homeRoster = parseRoster(homeTeamSetup.roster);
            const awayRoster = parseRoster(awayTeamSetup.roster);
            newState = {
              ...initialGameState,
              gameStatus: 'playing',
              competition,
              location,
              gameDate,
              scorekeeperName,
              inning: gameState.inning,
              isTopInning: gameState.isTopInning,
              gameStartTime: gameState.gameStartTime,
              plateAppearances: [],
              homeTeam: {
                ...initialGameState.homeTeam, name: homeTeamSetup.name, logoUrl: homeTeamSetup.logoUrl, roster: homeRoster, score: gameState.homeTeam.score, color: homeTeamSetup.color, runsByInning: gameState.homeTeam.runsByInning || [],
              },
              awayTeam: {
                ...initialGameState.awayTeam, name: awayTeamSetup.name, logoUrl: awayTeamSetup.logoUrl, roster: awayRoster, score: gameState.awayTeam.score, color: awayTeamSetup.color, runsByInning: gameState.awayTeam.runsByInning || [],
              },
              homeRosterString: homeTeamSetup.roster,
              awayRosterString: awayTeamSetup.roster,
              currentPitcher: {
                  home: homeRoster.find(p => p.position === 'P') || getActiveLineup(homeRoster)[getActiveLineup(homeRoster).length - 1],
                  away: awayRoster.find(p => p.position === 'P') || getActiveLineup(awayRoster)[getActiveLineup(awayRoster).length - 1],
              },
              gameId: gameId || null,
            };
        }
    }
    
    setGameState(newState);

    // Sync with configured data store
    const dataStore = getGameDataStore();
    if (dataStore.isConfigured()) {
      dataStore.createGame(newState)
        .then(newGameId => {
          if (newGameId) {
            setGameState(current => ({ ...current, gameId: newGameId }));
          }
        })
        .catch(e => console.error("Failed to create game in data store:", e));
    }
      
  }, [setGameState, gameState]);

  const resetGame = useCallback(() => {
    setGameState(initialGameState);
  }, [setGameState]);

  const handleFinalGame = useCallback(() => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'playing') {
        return prevState;
      }
      
      const finalState: GameState = { ...prevState, gameStatus: 'final', gameEndTime: Date.now() };
      
      // Sync with configured data store
      const dataStore = getGameDataStore();
      if (finalState.gameId && dataStore.isConfigured()) {
          dataStore.updateGameStatus(finalState.gameId, 'final', finalState.gameEndTime)
              .catch(e => console.error("Failed to update game status in data store:", e));
      }

      // Schedule status updates can be handled by the configured provider if needed.

      return finalState;
    });
  }, [setGameState]);

  const startNewPlateAppearance = useCallback((prevState: GameState, result: PlateAppearanceResult, runsScored: number, defensivePlays?: DefensivePlays, hitDescription?: HitDescription) => {
    const battingTeamKey = prevState.isTopInning ? 'awayTeam' : 'homeTeam';
    const pitchingTeamKey = prevState.isTopInning ? 'homeTeam' : 'awayTeam';

    const battingTeam = prevState[battingTeamKey];
    const pitchingTeam = prevState[pitchingTeamKey];

    const activeLineup = getActiveLineup(battingTeam.roster);
    const batterIndex = prevState.currentBatterIndex[prevState.isTopInning ? 'away' : 'home'];
    const batter = activeLineup[batterIndex];
    
    const pitcher = prevState.currentPitcher[prevState.isTopInning ? 'home' : 'away'];
    
    // Update Batter Stats
    const updatedBatter = updateBatterStats(batter, result, runsScored);
    const updatedBattingRoster = battingTeam.roster.map(p => p.id === updatedBatter.id ? updatedBatter : p);
    const updatedBattingTeam = { ...battingTeam, roster: updatedBattingRoster };

    // Update Pitcher Stats
    const isOut = ['strikeout', 'flyout', 'groundout', 'sac_fly', 'sac_bunt', 'fielders_choice'].includes(result);
    const updatedPitcher = updatePitcherStats(pitcher, result, runsScored, isOut);
    const updatedPitchingRoster = pitchingTeam.roster.map(p => p.id === updatedPitcher.id ? updatedPitcher : p);
    const updatedPitchingTeam = { ...pitchingTeam, roster: updatedPitchingRoster };
    
     let resolvedDefensivePlays: PlateAppearance['defensivePlays'] | undefined = undefined;
    if (defensivePlays) {
        const defensiveRoster = pitchingTeam.roster;
        resolvedDefensivePlays = {
            putoutBy: defensiveRoster.find(p => p.id === defensivePlays.putoutById),
            assistBy: defensiveRoster.filter(p => defensivePlays.assistByIds?.includes(p.id)),
            errorBy: defensiveRoster.find(p => p.id === defensivePlays.errorById),
            errorType: defensivePlays.errorType,
        };
    }

    const newPA: PlateAppearance = {
        battingTeam: battingTeam.name,
        batter: updatedBatter,
        pitcher: updatedPitcher,
        pitchSequence: prevState.pitchSequence,
        result,
        runnersBattedIn: runsScored,
        hitDescription: hitDescription, // Store hit description if provided
        defensivePlays: resolvedDefensivePlays,
    };
    
    // Sync with configured data store
    const dataStore = getGameDataStore();
    if (prevState.gameId && dataStore.isConfigured()) {
        dataStore.createPlateAppearance(newPA, prevState.gameId, prevState.inning, prevState.isTopInning)
            .catch(e => console.error("Failed to record plate appearance in data store:", e));
    }

    const newBatterIndex = (batterIndex + 1) % activeLineup.length;
    const nextBattingTeamKey = prevState.isTopInning ? 'away' : 'home';

    return {
      ...prevState,
      balls: 0,
      strikes: 0,
      pitchSequence: '',
      [battingTeamKey]: updatedBattingTeam,
      [pitchingTeamKey]: updatedPitchingTeam,
      currentPitcher: { ...prevState.currentPitcher, [prevState.isTopInning ? 'home' : 'away']: updatedPitcher },
      currentBatterIndex: {
          ...prevState.currentBatterIndex,
          [nextBattingTeamKey]: newBatterIndex
      },
      plateAppearances: [...prevState.plateAppearances, newPA],
    };
  }, []);

  const advanceInning = (prevState: GameState): GameState => {
    const runnersLeft = [prevState.bases.first, prevState.bases.second, prevState.bases.third].filter(Boolean).length;
    const battingTeamKey = prevState.isTopInning ? 'awayTeam' : 'homeTeam';
    const battingTeam = prevState[battingTeamKey];
    const updatedTeam = { ...battingTeam, LOB: battingTeam.LOB + runnersLeft };
    
    if (prevState.isTopInning) { 
      return { ...prevState, isTopInning: false, outs: 0, bases: { first: null, second: null, third: null }, [battingTeamKey]: updatedTeam };
    } else { 
      return { ...prevState, isTopInning: true, outs: 0, inning: prevState.inning + 1, bases: { first: null, second: null, third: null }, [battingTeamKey]: updatedTeam };
    }
  };

  const advanceRunners = (
    prevState: GameState, 
    type: HitType | 'walk' | 'HBP' | 'fielders_choice' | 'reached_on_error'
  ): { newState: GameState, runsScored: number } => {
    let tempState = { ...prevState };
    let runsScored = 0;
    const scoreRunAndAdvance = (runner: Player) => {
        runsScored++;
        tempState = scoreRun(runner, tempState);
    };

    const batter = getActiveLineup(
      tempState.isTopInning ? tempState.awayTeam.roster : tempState.homeTeam.roster
    )[tempState.isTopInning ? tempState.currentBatterIndex.away : tempState.currentBatterIndex.home];

    let newBases = { ...tempState.bases };
    const { first: runner1, second: runner2, third: runner3 } = tempState.bases;

    if (type === 'walk' || type === 'HBP') {
        if (runner1 && runner2 && runner3) { scoreRunAndAdvance(runner3); }
        if (runner1 && runner2) { newBases.third = runner2; }
        if (runner1) { newBases.second = runner1; }
        newBases.first = batter;
    } else if (type === 'homerun') {
        if (runner3) scoreRunAndAdvance(runner3);
        if (runner2) scoreRunAndAdvance(runner2);
        if (runner1) scoreRunAndAdvance(runner1);
        // Batter also scores on a home run
        scoreRunAndAdvance(batter);
        newBases = { first: null, second: null, third: null };
    } else if (type === 'triple') {
        if (runner3) scoreRunAndAdvance(runner3);
        if (runner2) scoreRunAndAdvance(runner2);
        if (runner1) scoreRunAndAdvance(runner1);
        newBases = { first: null, second: null, third: batter };
    } else if (type === 'double') {
        if (runner3) scoreRunAndAdvance(runner3);
        if (runner2) scoreRunAndAdvance(runner2);
        newBases.third = runner1 ? runner1 : null;
        newBases.second = batter;
        newBases.first = null;
    } else if (type === 'single' || type === 'fielders_choice' || type === 'reached_on_error') {
        // Forced advances only
        if (runner1 && runner2 && runner3) {
            scoreRunAndAdvance(runner3);
            newBases.third = runner2;
            newBases.second = runner1;
        } else if (runner1 && runner2) {
            newBases.third = runner2;
            newBases.second = runner1;
        } else if (runner1) {
            newBases.second = runner1;
        }
        // Unforced runners (e.g., runner on 2nd, 1st is empty) stay put by default
        newBases.first = batter;
    }
    
    return { newState: { ...tempState, bases: newBases }, runsScored };
  };

  const applyDefensiveStats = (state: GameState, defensivePlays?: DefensivePlays): GameState => {
      if (!defensivePlays) return state;

      const pitchingTeamKey = state.isTopInning ? 'homeTeam' : 'awayTeam';
      const pitchingTeam = { ...state[pitchingTeamKey] };

      const updatedRoster = pitchingTeam.roster.map(p => {
          const newStats = { ...p.stats };
          let hasChanged = false;
          if (defensivePlays.putoutById === p.id) {
              newStats.PO += 1;
              hasChanged = true;
          }
          if (defensivePlays.assistByIds?.includes(p.id)) {
              newStats.A += 1;
              hasChanged = true;
          }
          if (defensivePlays.errorById === p.id) {
              newStats.E += 1;
              hasChanged = true;
          }
          return hasChanged ? { ...p, stats: newStats } : p;
      });
      pitchingTeam.roster = updatedRoster;

      if (defensivePlays.errorById) {
          pitchingTeam.errors += 1;
      }

      return { ...state, [pitchingTeamKey]: pitchingTeam };
  };

  const handleOut = useCallback((type: OutType, defensivePlays?: DefensivePlays) => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'playing') return prevState;

      let finalState = applyDefensiveStats(prevState, defensivePlays);

      if (type === 'strikeout' && !defensivePlays?.putoutById) {
        const pitchingTeamKey = finalState.isTopInning ? 'homeTeam' : 'awayTeam';
        const pitchingTeam = { ...finalState[pitchingTeamKey] };
        const catcher = pitchingTeam.roster.find(p => p.position === 'C');

        if (catcher) {
            const updatedRoster = pitchingTeam.roster.map(p => {
                if (p.id === catcher.id) {
                    return { ...p, stats: { ...p.stats, PO: p.stats.PO + 1 }};
                }
                return p;
            });
            pitchingTeam.roster = updatedRoster;
            finalState = { ...finalState, [pitchingTeamKey]: pitchingTeam };
        }
      }

      finalState = type === 'strikeout' ? finalState : incrementPitchCount(finalState, 'strike');

      const newState = { ...finalState, outs: finalState.outs + 1 };

      if (newState.outs >= 3) {
        const stateAfterPA = startNewPlateAppearance(newState, type, 0, defensivePlays);
        return advanceInning(stateAfterPA);
      } else {
        return startNewPlateAppearance(newState, type, 0, defensivePlays);
      }
    });
  }, [setGameState, startNewPlateAppearance, advanceInning, incrementPitchCount]);

  const handlePitch = useCallback((type: PitchType, strikeoutType?: 'looking' | 'swinging') => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'playing') return prevState;

      const pitchResultType = type === 'ball' ? 'ball' : 'strike';
      let newState = incrementPitchCount(prevState, pitchResultType);
      
      // Update pitch sequence - for strikeouts, add 'K' for looking or 'K' for swinging
      if (type === 'strike' && prevState.strikes === 2) {
        // This is the third strike - 'K' = swinging, 'k' = looking (called third strike)
        newState = { ...newState, pitchSequence: newState.pitchSequence + (strikeoutType === 'looking' ? 'k' : 'K') };
      } else {
        newState = { ...newState, pitchSequence: newState.pitchSequence + type.charAt(0) };
      }

      if (type === 'ball') {
        if (newState.balls === 3) {
          const { newState: stateAfterWalk, runsScored } = advanceRunners(newState, 'walk');
          return startNewPlateAppearance(stateAfterWalk, 'walk', runsScored);
        }
        return { ...newState, balls: newState.balls + 1 };
      }

      if (type === 'strike') {
        if (newState.strikes === 2) {
          // This is a strikeout. Process the out.
          let strikeoutState = { ...newState };

          // Catcher gets a putout on a strikeout unless otherwise specified
          const pitchingTeamKey = strikeoutState.isTopInning ? 'homeTeam' : 'awayTeam';
          const pitchingTeam = { ...strikeoutState[pitchingTeamKey] };
          const catcher = pitchingTeam.roster.find(p => p.position === 'C');

          if (catcher) {
              const updatedRoster = pitchingTeam.roster.map(p => {
                  if (p.id === catcher.id) {
                      return { ...p, stats: { ...p.stats, PO: p.stats.PO + 1 }};
                  }
                  return p;
              });
              pitchingTeam.roster = updatedRoster;
              strikeoutState = { ...strikeoutState, [pitchingTeamKey]: pitchingTeam };
          }

          const stateWithOut = { ...strikeoutState, outs: strikeoutState.outs + 1 };

          if (stateWithOut.outs >= 3) {
            const stateAfterPA = startNewPlateAppearance(stateWithOut, 'strikeout', 0);
            return advanceInning(stateAfterPA);
          } else {
            return startNewPlateAppearance(stateWithOut, 'strikeout', 0);
          }
        }
        return { ...newState, strikes: newState.strikes + 1 };
      }
      
      if (type === 'foul') {
          if (newState.strikes < 2) {
              return { ...newState, strikes: newState.strikes + 1 };
          }
      }

      return newState;
    });
  }, [setGameState, startNewPlateAppearance, advanceInning, incrementPitchCount, advanceRunners]);
  
  const handleHit = useCallback((type: HitType, description?: HitDescription) => {
      setGameState(prevState => {
          if (prevState.gameStatus !== 'playing') return prevState;

          const battingTeamKey = prevState.isTopInning ? 'awayTeam' : 'homeTeam';
          const battingTeam = prevState[battingTeamKey];
          const updatedBattingTeam = { ...battingTeam, hits: battingTeam.hits + 1 };
          
          let updatedState = { 
            ...prevState, 
            [battingTeamKey]: updatedBattingTeam
          };

          const stateWithPitch = incrementPitchCount(updatedState, 'strike');
          let {newState, runsScored} = advanceRunners(stateWithPitch, type);
          let rbis = runsScored;
          if (type === 'homerun') {
              rbis += 1; // Batter gets an RBI for themself
          }
          return startNewPlateAppearance(newState, type, rbis, undefined, description);
      });
  }, [setGameState, advanceRunners, startNewPlateAppearance, incrementPitchCount]);

  const handleSacFly = useCallback((defensivePlays?: DefensivePlays) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing' || prevState.outs >= 2) return prevState;

        let newState = incrementPitchCount(prevState, 'strike');
        newState = applyDefensiveStats(newState, defensivePlays);
        newState = { ...newState, outs: newState.outs + 1 };
        let runsScored = 0;
        
        if (newState.bases.third) {
            const scoringRunner = newState.bases.third;
            runsScored = 1;
            newState = scoreRun(scoringRunner, newState);
            newState.bases.third = null;
        }
        
        if (newState.outs >= 3) {
            const stateAfterPA = startNewPlateAppearance(newState, 'sac_fly', runsScored, defensivePlays);
            return advanceInning(stateAfterPA);
        } else {
            return startNewPlateAppearance(newState, 'sac_fly', runsScored, defensivePlays);
        }
    });
  }, [setGameState, startNewPlateAppearance, advanceInning, incrementPitchCount]);

  const handleSacBunt = useCallback((defensivePlays?: DefensivePlays) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;

        let newState = incrementPitchCount(prevState, 'strike');
        newState = applyDefensiveStats(newState, defensivePlays);
        newState = { ...newState, outs: newState.outs + 1 };

        // A sac bunt advances all runners one base; runner on third scores
        const { bases } = newState;
        const newBases = { first: null as typeof bases.first, second: null as typeof bases.second, third: null as typeof bases.third };
        let runsScored = 0;
        if (bases.third) {
            newState = scoreRun(bases.third, newState);
            runsScored++;
        }
        if (bases.second) newBases.third = bases.second;
        if (bases.first) newBases.second = bases.first;
        newState = { ...newState, bases: newBases };

        if (newState.outs >= 3) {
            const stateAfterPA = startNewPlateAppearance(newState, 'sac_bunt', runsScored, defensivePlays);
            return advanceInning(stateAfterPA);
        } else {
            return startNewPlateAppearance(newState, 'sac_bunt', runsScored, defensivePlays);
        }
    });
  }, [setGameState, startNewPlateAppearance, advanceInning, incrementPitchCount]);

  const handleFieldersChoice = useCallback((defensivePlays?: DefensivePlays) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        
        let newState = incrementPitchCount(prevState, 'strike');
        newState = applyDefensiveStats(newState, defensivePlays);
        newState = { ...newState, outs: newState.outs + 1 };

        if (newState.outs >= 3) {
          const {newState: stateAfterFC} = advanceRunners(newState, 'fielders_choice');
          const stateAfterPA = startNewPlateAppearance(stateAfterFC, 'fielders_choice', 0, defensivePlays);
          return advanceInning(stateAfterPA);
        } else {
          const {newState: stateAfterFC} = advanceRunners(newState, 'fielders_choice');
          return startNewPlateAppearance(stateAfterFC, 'fielders_choice', 0, defensivePlays);
        }
    });
  }, [setGameState, advanceRunners, startNewPlateAppearance, advanceInning, incrementPitchCount]);

  const handleReachedOnError = useCallback((defensivePlays: DefensivePlays) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing' || !defensivePlays.errorById) return prevState;
        
        let newState = incrementPitchCount(prevState, 'strike');
        newState = applyDefensiveStats(newState, defensivePlays);

        const { newState: stateAfterAdvance, runsScored } = advanceRunners(newState, 'reached_on_error');
        return startNewPlateAppearance(stateAfterAdvance, 'reached_on_error', runsScored, defensivePlays);
    });
  }, [setGameState, advanceRunners, startNewPlateAppearance, incrementPitchCount]);
  
  const handleHBP = useCallback(() => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        const stateWithPitch = incrementPitchCount(prevState, 'ball');
        const { newState, runsScored } = advanceRunners(stateWithPitch, 'HBP');
        return startNewPlateAppearance(newState, 'HBP', runsScored);
    });
  }, [setGameState, advanceRunners, startNewPlateAppearance, incrementPitchCount]);

  const handleIntentionalWalk = useCallback(() => {
      setGameState(prevState => {
          if (prevState.gameStatus !== 'playing') return prevState;
          // No pitch count increment for IBB
          const { newState, runsScored } = advanceRunners(prevState, 'walk');
          return startNewPlateAppearance(newState, 'IBB', runsScored);
      });
  }, [setGameState, advanceRunners, startNewPlateAppearance]);

  const handleBalk = useCallback(() => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        
        let newState = { ...prevState };
        const { bases } = newState;
        const hasRunners = bases.first || bases.second || bases.third;

        // Balk with no runners is a ball
        if (!hasRunners) {
             if (newState.balls === 3) {
                const { newState: stateAfterWalk, runsScored } = advanceRunners(newState, 'walk');
                return startNewPlateAppearance(stateAfterWalk, 'walk', runsScored);
            }
            return { ...newState, balls: newState.balls + 1 };
        }

        // Balk with runners: runners advance
        const newBases = { first: null, second: null, third: null };

        if (bases.third) {
            newState = scoreRun(bases.third, newState);
        }
        if (bases.second) {
            newBases.third = bases.second;
        }
        if (bases.first) {
            newBases.second = bases.first;
        }
        
        newState.bases = newBases;
        return newState;
    });
  }, [setGameState, advanceRunners, startNewPlateAppearance]);

  const handleRunnerOut = useCallback((base: 'first' | 'second' | 'third', defensivePlays?: DefensivePlays) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;

        let stateToUpdate = applyDefensiveStats(prevState, defensivePlays);

        const newOuts = stateToUpdate.outs + 1;
        const newBases = { ...stateToUpdate.bases, [base]: null };

        if (newOuts >= 3) {
            let newState = { ...stateToUpdate, outs: newOuts, bases: newBases };
            return advanceInning(newState);
        }

        return { ...stateToUpdate, outs: newOuts, bases: newBases };
    });
  }, [setGameState, advanceInning]);

  const handleStolenBase = useCallback((runnerId: string, base: 'second' | 'third' | 'home') => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        const battingTeamKey = prevState.isTopInning ? 'awayTeam' : 'homeTeam';
        const team = prevState[battingTeamKey];
        const newBases = { ...prevState.bases };
        let runner: Player | null = null;
        let newState = { ...prevState };
        
        if (base === 'second' && prevState.bases.first?.id === runnerId) {
            runner = prevState.bases.first;
            newBases.first = null;
            newBases.second = runner;
        } else if (base === 'third' && prevState.bases.second?.id === runnerId) {
            runner = prevState.bases.second;
            newBases.second = null;
            newBases.third = runner;
        } else if (base === 'home' && prevState.bases.third?.id === runnerId) {
            runner = prevState.bases.third;
            newBases.third = null;
            newState = scoreRun(runner, newState); // Score sync happens inside scoreRun
        }

        if (!runner) return prevState;

        const updatedRoster = team.roster.map(p => {
            if (p.id === runner!.id) {
                return { ...p, stats: { ...p.stats, SB: p.stats.SB + 1 }};
            }
            return p;
        });

        return {
            ...newState,
            bases: newBases,
            [battingTeamKey]: { ...team, roster: updatedRoster },
        };
    });
  }, [setGameState]);

  const handleCaughtStealing = useCallback((runnerId: string, base: 'second' | 'third' | 'home', defensivePlays?: DefensivePlays) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;

        const battingTeamKey = prevState.isTopInning ? 'awayTeam' : 'homeTeam';
        const battingTeam = prevState[battingTeamKey];
        let runner: Player | null = null;
        const newBases = { ...prevState.bases };
        
        if (base === 'second' && prevState.bases.first?.id === runnerId) {
            runner = prevState.bases.first;
            newBases.first = null;
        } else if (base === 'third' && prevState.bases.second?.id === runnerId) {
            runner = prevState.bases.second;
            newBases.second = null;
        } else if (base === 'home' && prevState.bases.third?.id === runnerId) {
            runner = prevState.bases.third;
            newBases.third = null;
        }

        if (!runner) return prevState;

        const updatedRoster = battingTeam.roster.map(p => {
            if (p.id === runner!.id) {
                return { ...p, stats: { ...p.stats, CS: p.stats.CS + 1 }};
            }
            return p;
        });

        let finalState = {
            ...prevState,
            bases: newBases,
            [battingTeamKey]: { ...battingTeam, roster: updatedRoster },
        };
        
        finalState = applyDefensiveStats(finalState, defensivePlays);
        
        const newOuts = finalState.outs + 1;
        
        if (newOuts >= 3) {
            finalState.outs = newOuts;
            return advanceInning(finalState);
        }
        
        return { ...finalState, outs: newOuts };
    });
  }, [setGameState, advanceInning]);

  const handleRunnerAdvanceOnError = useCallback((runnerId: string, base: 'first' | 'second' | 'third', defensivePlays: DefensivePlays) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing' || !defensivePlays.errorById) return prevState;
        
        let newState = applyDefensiveStats(prevState, defensivePlays);
        const newBases = { ...newState.bases };
        const runner = newState.bases[base];
        
        if (runner && runner.id === runnerId) {
            if (base === 'third') {
                newState = scoreRun(runner, newState); // Score sync happens inside scoreRun
                newBases.third = null;
            } else if (base === 'second') {
                newBases.third = runner;
                newBases.second = null;
            } else if (base === 'first') {
                newBases.second = runner;
                newBases.first = null;
            }
        }
        
        return { ...newState, bases: newBases };
    });
  }, [setGameState]);

  const handleManualRunnerAdvance = useCallback((runnerId: string, fromBase: 'first' | 'second' | 'third') => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        
        const newBases = { ...prevState.bases };
        let newState = { ...prevState };
        const runner = prevState.bases[fromBase];

        if (!runner || runner.id !== runnerId) return prevState;

        newBases[fromBase] = null; // Vacate the current base

        if (fromBase === 'third') {
            newState = scoreRun(runner, newState); // Score sync happens inside scoreRun
        } else if (fromBase === 'second') {
            newBases.third = runner;
        } else if (fromBase === 'first') {
            newBases.second = runner;
        }

        return { ...newState, bases: newBases };
    });
  }, [setGameState]);

  const handleCountCorrection = useCallback((type: 'ball' | 'strike' | 'out', delta: 1 | -1) => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'playing') return prevState;
      switch(type) {
        case 'ball':
          return { ...prevState, balls: Math.max(0, Math.min(3, prevState.balls + delta)) };
        case 'strike':
          return { ...prevState, strikes: Math.max(0, Math.min(2, prevState.strikes + delta)) };
        case 'out':
          return { ...prevState, outs: Math.max(0, Math.min(2, prevState.outs + delta)) };
        default:
          return prevState;
      }
    });
  }, [setGameState]);

  const handleInningCorrection = useCallback((delta: 1 | -1) => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'playing') return prevState;
      return { ...prevState, inning: Math.max(1, prevState.inning + delta) };
    });
  }, [setGameState]);
  
  const handlePitchCountCorrection = useCallback((delta: 1 | -1) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        const pitchingTeamKey = prevState.isTopInning ? 'home' : 'away';
        const pitcher = prevState.currentPitcher[pitchingTeamKey];
        if (!pitcher) return prevState;

        const newPitchCount = Math.max(0, pitcher.stats.pitchCount + delta);

        const updatedPitcher = { ...pitcher, stats: { ...pitcher.stats, pitchCount: newPitchCount } };
        
        const teamToUpdateKey = prevState.isTopInning ? 'homeTeam' : 'awayTeam';
        const teamToUpdate = prevState[teamToUpdateKey];
        const updatedRoster = teamToUpdate.roster.map(p => p.id === pitcher.id ? updatedPitcher : p);

        return {
            ...prevState,
            currentPitcher: { ...prevState.currentPitcher, [pitchingTeamKey]: updatedPitcher },
            [teamToUpdateKey]: { ...teamToUpdate, roster: updatedRoster }
        };
    });
  }, [setGameState]);
  
  const handleBaseRunnerCorrection = useCallback((base: 'first' | 'second' | 'third', playerId: string | null) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        
        const newBases = { ...prevState.bases };
        if (playerId === null) {
            newBases[base] = null;
        } else {
            const battingTeam = prevState.isTopInning ? prevState.awayTeam : prevState.homeTeam;
            const player = battingTeam.roster.find(p => p.id === playerId);
            if(player) newBases[base] = player;
        }
        return { ...prevState, bases: newBases };
    });
  }, [setGameState]);

  const handlePlayerSubstitution = useCallback((teamKey: 'homeTeam' | 'awayTeam', playerOutId: string, playerInId: string) => {
      setGameState(prevState => {
          if (prevState.gameStatus !== 'playing') return prevState;
          
          const team = prevState[teamKey];
          const newRoster = [...team.roster];

          const playerOutIndex = newRoster.findIndex(p => p.id === playerOutId);
          const playerInIndex = newRoster.findIndex(p => p.id === playerInId);

          if (playerOutIndex === -1 || playerInIndex === -1) return prevState;
          
          const playerOut = { ...newRoster[playerOutIndex] };
          const playerIn = { ...newRoster[playerInIndex] };

          // Swap batting order and position
          const tempBattingOrder = playerOut.battingOrder;
          const tempPosition = playerOut.position;

          playerOut.battingOrder = playerIn.battingOrder; // Move player out to bench spot
          playerOut.position = 'BENCH';

          playerIn.battingOrder = tempBattingOrder; // Move player in to active spot
          playerIn.position = tempPosition;

          newRoster[playerOutIndex] = playerOut;
          newRoster[playerInIndex] = playerIn;

          const newTeam = { ...team, roster: newRoster };

          let newCurrentPitcher = { ...prevState.currentPitcher };
          const pitcherTeamKey = teamKey === 'homeTeam' ? 'home' : 'away';

          // If the pitcher was subbed out, the new player is the pitcher
          if(prevState.currentPitcher[pitcherTeamKey].id === playerOutId) {
            newCurrentPitcher[pitcherTeamKey] = playerIn;
          }

          return { ...prevState, [teamKey]: newTeam, currentPitcher: newCurrentPitcher };
      });
  }, [setGameState]);

  const handlePositionSwap = useCallback((teamKey: 'homeTeam' | 'awayTeam', newPositions: Record<string, string>) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;

        const team = prevState[teamKey];
        let newPitcher = null;

        const newRoster = team.roster.map(player => {
            if (newPositions[player.id]) {
                const updatedPlayer = { ...player, position: newPositions[player.id] };
                if (updatedPlayer.position === 'P') {
                    newPitcher = updatedPlayer;
                }
                return updatedPlayer;
            }
            return player;
        });

        const newTeam = { ...team, roster: newRoster };
        let newCurrentPitcher = { ...prevState.currentPitcher };

        const pitcherTeamKey = teamKey === 'homeTeam' ? 'home' : 'away';
        if (newPitcher && newPitcher.id !== prevState.currentPitcher[pitcherTeamKey].id) {
            newCurrentPitcher[pitcherTeamKey] = newPitcher;
        }
        
        return { ...prevState, [teamKey]: newTeam, currentPitcher: newCurrentPitcher };
    });
  }, [setGameState]);

  const handleErrorCorrection = useCallback((teamKey: 'homeTeam' | 'awayTeam', delta: 1 | -1) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        const team = prevState[teamKey];
        const updatedTeam = { ...team, errors: Math.max(0, team.errors + delta) };
        return { ...prevState, [teamKey]: updatedTeam };
    });
  }, [setGameState]);

  const handlePinchRunner = useCallback((runnerId: string, substituteId: string) => {
    setGameState(prevState => {
        if (prevState.gameStatus !== 'playing') return prevState;
        
        const teamKey = prevState.isTopInning ? 'awayTeam' : 'homeTeam';
        const team = prevState[teamKey];
        const newRoster = [...team.roster];

        const playerOutIndex = newRoster.findIndex(p => p.id === runnerId);
        const playerInIndex = newRoster.findIndex(p => p.id === substituteId);

        if (playerOutIndex === -1 || playerInIndex === -1) return prevState;
        
        const playerOut = { ...newRoster[playerOutIndex] };
        const playerIn = { ...newRoster[playerInIndex] };

        // Swap batting order and position
        const tempBattingOrder = playerOut.battingOrder;
        const tempPosition = playerOut.position;

        playerOut.battingOrder = 0; // Move player out to bench spot
        playerOut.position = 'BENCH';

        playerIn.battingOrder = tempBattingOrder; // Move player in to active spot
        playerIn.position = tempPosition;

        newRoster[playerOutIndex] = playerOut;
        newRoster[playerInIndex] = playerIn;

        const newTeam = { ...team, roster: newRoster };

        // Update bases
        const newBases = { ...prevState.bases };
        (Object.keys(newBases) as Array<keyof typeof newBases>).forEach(base => {
            if (newBases[base]?.id === runnerId) {
                newBases[base] = playerIn;
            }
        });
        
        return { ...prevState, [teamKey]: newTeam, bases: newBases };
    });
  }, [setGameState]);

  const handleSettingsUpdate = useCallback((settings: Partial<ScoreboardSettings>) => {
    setGameState(prevState => ({
      ...prevState,
      scoreboardSettings: {
        ...prevState.scoreboardSettings,
        ...settings,
      },
    }));
  }, [setGameState]);

  return { 
    gameState,
    updateSetupData,
    handleGameSetup, handlePitch, handleHit, handleOut, handleSacFly, 
    handleFieldersChoice, handleHBP, handleIntentionalWalk, handleRunnerOut,
    resetGame, handleFinalGame, handleCountCorrection, handleInningCorrection,
    handlePitchCountCorrection, handleBaseRunnerCorrection, handlePlayerSubstitution,
    handlePositionSwap,
    handleErrorCorrection,
    handleStolenBase,
    handleCaughtStealing,
    handleBalk,
    handleSacBunt,
    handleReachedOnError,
    handleRunnerAdvanceOnError,
    handleManualRunnerAdvance,
    handlePinchRunner,
    handleSettingsUpdate,
  };
};
