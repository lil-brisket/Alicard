import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { GlobalChat } from "~/components/chat/GlobalChat";
import { PreventPageScroll } from "./_components/prevent-page-scroll";

export default async function ChatPage() {
  const session = await getServerAuthSession();

  // Public users can read messages, but we'll still show the page
  // Authentication is handled in the component for sending messages

  return (
    <>
      <PreventPageScroll />
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950 text-slate-100 md:overflow-hidden">
        <div className="flex h-full w-full flex-col overflow-hidden p-1 md:p-2 lg:p-3">
          {/* Header - Compact */}
          <div className="flex-shrink-0 border-b border-slate-800 bg-slate-950 p-1.5 md:border-0 md:bg-transparent md:p-0 md:pb-1">
            <h1 className="text-lg font-bold text-cyan-400 md:text-xl">Global Chat</h1>
            <p className="mt-0.5 text-xs text-slate-400 md:mt-1 md:text-sm">
              Real-time global chat with emoji reactions
            </p>
          </div>

          {/* Chat Container - Takes full width, only messages scroll */}
          <div className="flex min-h-0 flex-1 overflow-hidden pt-1.5 pb-20 md:mt-2 md:pb-0 md:pt-0">
            <GlobalChat />
          </div>
        </div>
      </div>
    </>
  );
}

