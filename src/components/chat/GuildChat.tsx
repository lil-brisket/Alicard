"use client";

import { ChatRoom } from "./ChatRoom";

interface GuildChatProps {
  guildId: string;
}

export function GuildChat({ guildId }: GuildChatProps) {
  return <ChatRoom room={`guild:${guildId}`} title="Guild Chat" />;
}

