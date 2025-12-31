"use client";

import { ChatRoom } from "./ChatRoom";

interface PartyChatProps {
  partyId: string;
}

export function PartyChat({ partyId }: PartyChatProps) {
  return <ChatRoom room={`party:${partyId}`} title="Party Chat" />;
}

