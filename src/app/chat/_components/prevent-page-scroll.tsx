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

    // Prevent all scrolling on the page - only chat messages should scroll
    document.body.style.overflow = "hidden";
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.top = "0";
    document.body.style.left = "0";

    // Also prevent html scroll
    const html = document.documentElement;
    const originalHtmlOverflow = html.style.overflow;
    const originalHtmlOverflowX = html.style.overflowX;
    const originalHtmlOverflowY = html.style.overflowY;
    const originalBodyOverflowY = document.body.style.overflowY;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    html.style.overflow = "hidden";
    html.style.overflowX = "hidden";
    html.style.overflowY = "hidden";

    return () => {
      // Restore original styles when component unmounts
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.overflowX = "";
      document.body.style.overflowY = originalBodyOverflowY;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      html.style.overflow = originalHtmlOverflow;
      html.style.overflowX = originalHtmlOverflowX;
      html.style.overflowY = originalHtmlOverflowY;
    };
  }, []);

  return null;
}

