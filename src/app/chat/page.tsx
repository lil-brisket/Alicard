import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { PreventPageScroll } from "./_components/prevent-page-scroll";
import { ChatWrapper } from "./_components/chat-wrapper";

export default async function ChatPage() {
  const session = await getServerAuthSession();

  // Public users can read messages, but we'll still show the page
  // Authentication is handled in the component for sending messages

  return (
    <>
      <PreventPageScroll />
      <div className="flex h-full w-full flex-col overflow-hidden bg-slate-950 text-slate-100 max-w-full">
        <div className="flex h-full w-full flex-col overflow-hidden p-0 md:p-2 lg:p-3 max-w-full">
          {/* Chat Container - Takes full width, only messages scroll */}
          <div className="flex min-h-0 flex-1 overflow-hidden max-w-full">
            <ChatWrapper />
          </div>
        </div>
      </div>
    </>
  );
}

