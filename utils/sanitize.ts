/**
 * Security utility functions for sanitizing user input
 */

/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML entities
 * @param input The string to sanitize
 * @returns Sanitized string safe for HTML display
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitizes a string for use in HTML attributes
 * @param input The string to sanitize
 * @returns Sanitized string safe for HTML attributes
 */
export function sanitizeAttribute(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // Remove null bytes and control characters
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validates and sanitizes a team name
 * @param name The team name to validate
 * @returns Sanitized team name or empty string if invalid
 */
export function sanitizeTeamName(name: string): string {
  if (typeof name !== 'string') {
    return '';
  }
  
  // Remove HTML tags, limit length, trim whitespace
  const sanitized = name
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .trim()
    .slice(0, 100); // Limit to 100 characters
  
  return sanitized;
}

/**
 * Validates and sanitizes a player name
 * @param name The player name to validate
 * @returns Sanitized player name or empty string if invalid
 */
export function sanitizePlayerName(name: string): string {
  if (typeof name !== 'string') {
    return '';
  }
  
  // Remove HTML tags, limit length, trim whitespace
  const sanitized = name
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .trim()
    .slice(0, 50); // Limit to 50 characters
  
  return sanitized;
}

/**
 * Validates a number is within safe bounds
 * @param value The value to validate
 * @param min Minimum value (default: 0)
 * @param max Maximum value (default: 999)
 * @returns Validated number or 0 if invalid
 */
export function sanitizeNumber(value: any, min: number = 0, max: number = 999): number {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  
  if (isNaN(num) || num < min || num > max) {
    return 0;
  }
  
  return num;
}

/**
 * Validates a URL is safe (only http/https protocols)
 * @param url The URL to validate
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return url.trim();
  } catch {
    return '';
  }
}


