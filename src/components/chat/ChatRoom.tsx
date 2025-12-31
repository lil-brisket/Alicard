"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { io, type Socket } from "socket.io-client";
import type { RouterOutputs } from "~/trpc/react";

type ChatMessage = RouterOutputs["chat"]["list"]["messages"][number];
type ChatReaction = ChatMessage["reactions"][number];

const DEFAULT_EMOJIS = ["👍", "😂", "🔥", "❤️"];

interface ChatRoomProps {
  room: string;
  title: string;
}

export function ChatRoom({ room, title }: ChatRoomProps) {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Record<string, ChatMessage>>({});
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [pressedMessage, setPressedMessage] = useState<string | null>(null);
  const [unreadMentions, setUnreadMentions] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = status === "authenticated" && !!session?.user;

  // Fetch initial messages - reduced limit for faster mobile load
  const { data, refetch, isLoading: isLoadingMessages } = api.chat.list.useQuery(
    { limit: 30, room },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes - messages update via socket anyway
      gcTime: 1000 * 60 * 10, // 10 minutes cache
    },
  );

  // Fetch unread mentions count
  const { data: unreadNotifications } = api.notifications.listUnread.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  );

  useEffect(() => {
    if (unreadNotifications) {
      const mentionCount = unreadNotifications.filter(
        (n) => n.type === "MENTION"
      ).length;
      setUnreadMentions(mentionCount);
    }
  }, [unreadNotifications]);

  const sendMessage = api.chat.send.useMutation({
    onSuccess: () => {
      setInput("");
      setError(null);
      setReplyingTo(null);
      inputRef.current?.focus();
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      setError(error.message || "Failed to send message. Please try again.");
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    },
  });

  const toggleReaction = api.chat.toggleReaction.useMutation({
    onSuccess: () => {
      // Reactions are updated via socket, but we can refetch if needed
    },
  });

  // Initialize Socket.IO connection
  useEffect(() => {
    // Connect to the same origin (Socket.IO server is on the same server)
    const newSocket = io({
      path: "/api/socketio",
      transports: ["websocket"],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 5000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      // Join the specified room
      newSocket.emit("join", room);
      // Join user-specific room for mentions
      if (session?.user?.id) {
        newSocket.emit("join", `user:${session.user.id}`);
      }
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Listen for new messages
    newSocket.on("chat:new", (message: ChatMessage) => {
      setMessages((prev) => ({ ...prev, [message.id]: message }));
      if (isNearBottomRef.current) {
        scrollToBottom();
      }
    });

    // Listen for reaction updates
    newSocket.on("chat:reactions", (data: { messageId: string; reactions: ChatReaction[] }) => {
      setMessages((prev) => {
        const msg = prev[data.messageId];
        if (!msg) return prev;
        return { ...prev, [data.messageId]: { ...msg, reactions: data.reactions } };
      });
    });

    // Listen for deleted messages
    newSocket.on("chat:deleted", (data: { messageId: string }) => {
      setMessages((prev) => {
        const { [data.messageId]: _, ...rest } = prev;
        return rest;
      });
    });

    // Listen for mention notifications
    newSocket.on("notify:mention", () => {
      setUnreadMentions((prev) => prev + 1);
      // Optionally show a toast notification here
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [room, session?.user?.id]);

  // Update messages when data changes
  useEffect(() => {
    if (data?.messages) {
      const messagesMap: Record<string, ChatMessage> = {};
      for (const msg of data.messages) {
        messagesMap[msg.id] = msg;
      }
      setMessages(messagesMap);
      scrollToBottom();
    }
  }, [data]);

  // Close reactions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on reaction buttons or message content
      if (target.closest('[data-reaction-area]') || target.closest('[data-message-content]')) {
        return;
      }
      setPressedMessage(null);
    };

    // Use a small delay to allow the click event to process first
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending) return;

    if (!isAuthenticated) {
      setError("You must be logged in to send messages.");
      return;
    }

    sendMessage.mutate({
      content: input.trim(),
      room,
      parentMessageId: replyingTo?.id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    toggleReaction.mutate({ messageId, emoji, room });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60 md:rounded-xl max-w-full max-h-full">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 p-1.5 md:p-4">
        <h2 className="text-sm font-semibold text-cyan-400 md:text-lg">{title}</h2>
        {unreadMentions > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
            {unreadMentions > 9 ? "9+" : unreadMentions}
          </span>
        )}
      </div>

      {/* Messages - Only this area scrolls */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 pb-2 md:p-4 md:pb-8 max-w-full"
        onScroll={onScroll}
      >
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 md:text-base">
            Loading messages...
          </div>
        ) : Object.keys(messages).length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 md:text-base">
            No messages yet. Be the first to say something!
          </div>
        ) : (
          <div className="space-y-2 md:space-y-4">
            {Object.values(messages)
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((message) => {
              // Message grouping: show avatar/name only if previous message is from different user or >2 minutes old
              const messageArray = Object.values(messages)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              const currentIndex = messageArray.findIndex((m) => m.id === message.id);
              const prevMessage = currentIndex > 0 ? messageArray[currentIndex - 1] : null;
              const shouldShowHeader =
                !prevMessage ||
                prevMessage.user.id !== message.user.id ||
                new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 120000;
              
              return (
              <div
                key={message.id}
                className="group"
                data-message-content
                onClick={(e) => {
                  // Desktop: toggle reactions on click, but don't trigger if clicking on links/buttons
                  if ((e.target as HTMLElement).closest('button, a')) return;
                  e.stopPropagation();
                  setPressedMessage((prev) => (prev === message.id ? null : message.id));
                }}
                onTouchStart={() => {
                  // Mobile: long-press opens reaction tray
                  pressTimerRef.current = setTimeout(() => {
                    setPressedMessage((prev) => (prev === message.id ? null : message.id));
                  }, 450);
                }}
                onTouchEnd={() => {
                  if (pressTimerRef.current) {
                    clearTimeout(pressTimerRef.current);
                    pressTimerRef.current = null;
                  }
                }}
                onTouchCancel={() => {
                  if (pressTimerRef.current) {
                    clearTimeout(pressTimerRef.current);
                    pressTimerRef.current = null;
                  }
                }}
              >
                <div className="flex items-start gap-2 md:gap-3">
                  {shouldShowHeader && (
                    message.user.image ? (
                      <img
                        src={message.user.image}
                        alt={message.user.username ?? "User"}
                        className="h-8 w-8 flex-shrink-0 rounded-full md:h-8 md:w-8"
                      />
                    ) : (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-400 md:text-sm">
                        {message.user.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )
                  )}
                  <div className="min-w-0 flex-1">
                    {shouldShowHeader && (
                      <div className="flex flex-wrap items-baseline gap-1.5 md:gap-2">
                        <span className="text-base font-semibold text-slate-200 md:text-lg">
                          {message.user.username ?? "Unknown"}
                        </span>
                        <span className="text-xs text-slate-500 md:text-sm">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    <div
                      className={`prose prose-invert max-w-none ${shouldShowHeader ? "mt-1" : "ml-10"} break-words break-all text-base text-slate-300 md:text-lg`}
                      dangerouslySetInnerHTML={{ __html: message.content }}
                      suppressHydrationWarning
                    />
                    {/* Reply button */}
                    {isAuthenticated && (
                      <button
                        onClick={() => {
                          setReplyingTo(message);
                          inputRef.current?.focus();
                        }}
                        className="mt-1.5 text-xs text-slate-400 hover:text-cyan-400 md:text-sm"
                      >
                        Reply
                      </button>
                    )}
                    {/* Show replies if any */}
                    {message.replies && message.replies.length > 0 && (
                      <div className="mt-2 ml-4 space-y-2 border-l-2 border-slate-700 pl-3">
                        {message.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="group/reply"
                            data-message-content
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button, a')) return;
                              e.stopPropagation();
                              setPressedMessage((prev) => (prev === reply.id ? null : reply.id));
                            }}
                          >
                            <div className="flex items-start gap-2">
                              {reply.user.image ? (
                                <img
                                  src={reply.user.image}
                                  alt={reply.user.username ?? "User"}
                                  className="h-6 w-6 flex-shrink-0 rounded-full"
                                />
                              ) : (
                                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-400">
                                  {reply.user.username?.[0]?.toUpperCase() ?? "?"}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm font-semibold text-slate-200">
                                    {reply.user.username ?? "Unknown"}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(reply.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div
                                  className="prose prose-invert max-w-none mt-0.5 break-words break-all text-sm text-slate-300 md:text-base"
                                  dangerouslySetInnerHTML={{ __html: reply.content }}
                                  suppressHydrationWarning
                                />
                                {/* Reactions - Show on press */}
                                {(pressedMessage === reply.id ||
                                  reply.reactions.length > 0) && (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5" data-reaction-area>
                                    {reply.reactions.map((reaction) => (
                                      <button
                                        key={reaction.emoji}
                                        onClick={() => handleReaction(reply.id, reaction.emoji)}
                                        className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/50 px-1.5 py-1 text-xs transition-colors active:bg-slate-800 md:hover:bg-slate-800"
                                        title={reaction.users.map((u) => u.username).join(", ")}
                                      >
                                        <span>{reaction.emoji}</span>
                                        <span className="text-slate-400">{reaction.count}</span>
                                      </button>
                                    ))}
                                    <div className="flex gap-0.5 rounded-md border border-slate-700 bg-slate-900/50 p-0.5">
                                      {DEFAULT_EMOJIS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReaction(reply.id, emoji)}
                                          className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded px-1 text-xs transition-colors active:bg-slate-800 md:hover:bg-slate-800"
                                          title={`Add ${emoji} reaction`}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Reactions - Show on press */}
                    {(pressedMessage === message.id || message.reactions.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5 md:gap-2" data-reaction-area>
                        {message.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleReaction(message.id, reaction.emoji)}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-900/50 px-2 py-1.5 text-sm transition-colors active:bg-slate-800 md:px-2 md:py-1 md:hover:bg-slate-800"
                            title={reaction.users.map((u) => u.username).join(", ")}
                          >
                            <span className="text-base md:text-sm">{reaction.emoji}</span>
                            <span className="text-xs text-slate-400 md:text-sm">{reaction.count}</span>
                          </button>
                        ))}
                        {/* Add reaction button */}
                        <div className="flex gap-0.5 rounded-md border border-slate-700 bg-slate-900/50 p-0.5 md:gap-1 md:p-1">
                          {DEFAULT_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(message.id, emoji)}
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-1.5 py-1 text-base transition-colors active:bg-slate-800 md:px-1 md:py-0.5 md:text-sm md:hover:bg-slate-800"
                              title={`Add ${emoji} reaction`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - Fixed at bottom, above mobile nav */}
      <div className="flex-shrink-0 border-t border-slate-800 bg-slate-950 p-2 pb-2 md:bg-slate-950/60 md:pb-8 md:p-4 max-w-full">
        {error && (
          <div className="mb-1 rounded-lg border border-red-500/30 bg-red-900/20 p-1.5 text-[10px] text-red-300 md:mb-2 md:p-2 md:text-sm">
            {error}
          </div>
        )}
        {!isAuthenticated && (
          <div className="mb-1 rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-1.5 text-[10px] text-yellow-300 md:mb-2 md:p-2 md:text-sm">
            You must be logged in to send messages. <a href="/auth/signin" className="underline">Sign in here</a>.
          </div>
        )}
        {replyingTo && (
          <div className="mb-1 rounded-lg border border-cyan-500/30 bg-cyan-900/20 p-1.5 text-[10px] text-cyan-300 md:mb-2 md:p-2 md:text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="mb-1">
                  <span>Replying to </span>
                  <span className="font-semibold">{replyingTo.user.username ?? "Unknown"}</span>
                </div>
                <div className="rounded border border-cyan-500/20 bg-cyan-950/30 p-1.5 text-cyan-200/80">
                  <div
                    className="line-clamp-2 break-words text-xs"
                    dangerouslySetInnerHTML={{ __html: replyingTo.content }}
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="flex-shrink-0 text-cyan-400 hover:text-cyan-300 active:text-cyan-200"
                aria-label="Cancel reply"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-1.5 md:gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-expand textarea height
              if (inputRef.current) {
                inputRef.current.style.height = "auto";
                inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // On mobile, scroll input into view when focused
              setTimeout(() => {
                inputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
              }, 300);
            }}
            placeholder={
              !isAuthenticated
                ? "Sign in to send messages..."
                : replyingTo
                  ? `Replying to ${replyingTo.user.username ?? "Unknown"}... (Enter to send, Shift+Enter for new line)`
                  : "Type a message... (Enter to send, Shift+Enter for new line)"
            }
            className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900/50 p-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none disabled:opacity-50 md:p-3 md:text-base"
            rows={1}
            maxLength={2000}
            disabled={!isAuthenticated || !isConnected || sendMessage.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isAuthenticated || !isConnected || sendMessage.isPending}
            className="flex min-h-[36px] min-w-[50px] items-center justify-center rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors active:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[auto] md:min-w-[auto] md:px-6 md:py-2 md:text-sm md:hover:bg-cyan-700"
          >
            {sendMessage.isPending ? "Sending..." : "Send"}
          </button>
        </div>
        <div className="mt-1 text-[9px] text-slate-500 md:mt-2 md:text-xs">
          {input.length}/2000 characters
        </div>
      </div>
    </div>
  );
}

