/**
 * Parse @username mentions from message content
 * Returns array of unique usernames (case-insensitive)
 * Username can contain letters, numbers, and underscores
 */
export function parseMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = content.matchAll(mentionRegex);
  const usernames = new Set<string>();
  
  for (const match of matches) {
    const username = match[1]?.toLowerCase();
    if (username) {
      usernames.add(username);
    }
  }
  
  return Array.from(usernames);
}

/**
 * Wrap mentions in HTML span tags with mention class
 * This should be called AFTER sanitization to ensure safety
 * @param content - The sanitized HTML content
 * @param validUsernames - Map of lowercase username -> original username
 */
export function wrapMentionsInHtml(content: string, validUsernames: Map<string, string>): string {
  return content.replace(/@([a-zA-Z0-9_]+)/g, (match, username) => {
    const lowerUsername = username.toLowerCase();
    const originalUsername = validUsernames.get(lowerUsername);
    
    if (originalUsername) {
      // Valid mention - wrap in span
      return `<span class="mention">@${originalUsername}</span>`;
    }
    
    // Invalid mention - leave as plain text
    return match;
  });
}

