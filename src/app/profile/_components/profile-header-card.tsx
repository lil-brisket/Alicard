type ProfileHeaderCardProps = {
  avatar?: string | null;
  displayName?: string | null;
  username: string;
  status: "Alive" | "Fallen";
  level: number;
  powerScore: number;
  guildName?: string | null;
  title?: string | null;
  tagline?: string | null;
};

export function ProfileHeaderCard({
  avatar,
  displayName,
  username,
  status,
  level,
  powerScore,
  guildName,
  title,
  tagline,
}: ProfileHeaderCardProps) {
  const statusColor = status === "Alive" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400";
  const statusBorder = status === "Alive" ? "border-green-500/30" : "border-red-500/30";

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="h-24 w-24 rounded-full border-2 border-cyan-500/30 bg-slate-700/50 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={displayName ?? username} className="h-full w-full object-cover" />
            ) : (
              <div className="text-3xl font-bold text-cyan-400">
                {(displayName ?? username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-cyan-300">
              {displayName ?? username}
            </h1>
            <span className="text-sm text-slate-400">@{username}</span>
            {title && (
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400">
                {title}
              </span>
            )}
          </div>

          {tagline && (
            <p className="text-sm text-slate-300 italic">{tagline}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Level</span>
              <span className="font-semibold text-cyan-400">Lv.{level}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Power</span>
              <span className="font-semibold text-yellow-400">{powerScore}</span>
            </div>
            {guildName && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Guild</span>
                <span className="font-medium text-purple-400">{guildName}</span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`rounded-full border ${statusBorder} ${statusColor} px-3 py-1 text-xs font-semibold`}>
              {status}
            </span>
            {/* TODO: Add online/offline placeholder */}
            <span className="text-xs text-slate-500">• Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
