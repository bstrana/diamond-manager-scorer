import type { PlateAppearance } from '../types';

/**
 * Mocks recording a plate appearance to a Google Sheet.
 * In a real application, this would make an API call to a backend service
 * which would then interact with the Google Sheets API.
 * @param pa The PlateAppearance object to record.
 */
export const recordPlateAppearance = (pa: PlateAppearance): void => {
  // Mock service - in production this would send data to Google Sheets API
  // Keeping minimal logging for debugging (can be removed in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Plate appearance recorded:', pa.result);
  }
};