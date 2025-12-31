"use client";

import dynamic from "next/dynamic";

// Lazy load chat component for faster initial page load
const GlobalChat = dynamic(() => import("~/components/chat/GlobalChat").then((mod) => ({ default: mod.GlobalChat })), {
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-sm text-slate-400">Loading chat...</div>
    </div>
  ),
  ssr: false,
});

export function ChatWrapper() {
  return <GlobalChat />;
}

