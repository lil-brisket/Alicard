import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes HTML content for chat messages.
 * Only allows safe formatting tags and attributes.
 *
 * Allowed tags:
 * - b, strong, i, em, u, s (text formatting)
 * - code, pre (code blocks)
 * - br, p (line breaks and paragraphs)
 * - ul, ol, li (lists)
 * - a (links with href only, forced target="_blank" and safe rel)
 * - span (with class "mention" or "spoiler" only)
 *
 * All scripts, styles, inline CSS, and unsafe attributes are disallowed.
 */
export function sanitizeChatHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "code",
      "pre",
      "br",
      "p",
      "ul",
      "ol",
      "li",
      "a",
      "span",
    ],
    allowedAttributes: {
      a: ["href"],
      span: ["class"],
    },
    allowedClasses: {
      span: ["mention", "spoiler"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Force all links to open in new tab with safe rel
    transformTags: {
      a: (tagName, attribs) => {
        return {
          tagName: "a",
          attribs: {
            href: attribs.href ?? "#",
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      },
    },
    // Disallow all inline styles
    allowedStyles: {},
    // Disallow scripts and other dangerous content
    disallowedTagsMode: "discard",
  });
}

