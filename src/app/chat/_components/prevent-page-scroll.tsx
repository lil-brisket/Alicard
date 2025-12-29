"use client";

import { useEffect } from "react";

/**
 * Prevents body/html scrolling when the chat page is mounted
 * This ensures only the chat messages area scrolls, not the page
 * Mobile-friendly: Uses overflow hidden instead of position fixed to allow keyboard access
 */
export function PreventPageScroll() {
  useEffect(() => {
    // Check if mobile
    const isMobile = window.innerWidth < 768;
    
    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;

    // On mobile, just prevent overflow to allow keyboard access
    // On desktop, use position fixed for better containment
    if (isMobile) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "relative";
    } else {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
    }

    // Also prevent html scroll
    const html = document.documentElement;
    const originalHtmlOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    return () => {
      // Restore original styles when component unmounts
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      html.style.overflow = originalHtmlOverflow;
    };
  }, []);

  return null;
}

