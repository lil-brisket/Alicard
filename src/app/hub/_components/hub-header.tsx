import { LogoutButton } from "./logout-button";

type HubHeaderProps = {
  characterName: string;
  level: number;
};

export function HubHeader({ characterName, level }: HubHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Alicard Hub
        </h1>
        <p className="text-xs text-slate-400 md:text-sm">
          Turn-based MMO · Perma-death after 5 falls.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs md:text-sm">
        <div className="flex flex-col">
          <span className="font-medium">{characterName}</span>
          <span className="text-slate-400">Lv. {level}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}

