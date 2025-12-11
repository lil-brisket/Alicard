type Character = {
  name: string;
  level: number;
  gender: string;
  floor: number;
  location: string;
  currentHp: number;
  maxHp: number;
  currentStamina: number;
  maxStamina: number;
  deaths: number;
};

type CharacterSummaryCardProps = {
  character: Character;
};

export function CharacterSummaryCard({
  character,
}: CharacterSummaryCardProps) {
  const hpPercentage = (character.currentHp / character.maxHp) * 100;
  const staminaPercentage =
    (character.currentStamina / character.maxStamina) * 100;
  const isPermaDead = character.deaths >= 5;
  const deathsRemaining = Math.max(0, 5 - character.deaths);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Character Summary</h2>

      <div className="space-y-4">
        {/* Name & Level */}
        <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
          <div>
            <p className="text-xs text-slate-400">Character Name</p>
            <p className="text-lg font-semibold text-cyan-300">
              {character.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Level</p>
            <p className="text-xl font-bold text-cyan-400">
              Lv.{character.level}
            </p>
          </div>
        </div>

        {/* Gender */}
        <div>
          <p className="text-xs text-slate-400">Gender</p>
          <p className="text-sm font-medium capitalize text-slate-300">
            {character.gender}
          </p>
        </div>

        {/* Floor & Location */}
        <div>
          <p className="text-xs text-slate-400">Location</p>
          <p className="text-sm font-semibold text-slate-200">
            Floor {character.floor} – {character.location}
          </p>
        </div>

        {/* HP Bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">HP</span>
            <span className="font-medium text-slate-300">
              {character.currentHp} / {character.maxHp}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Stamina</span>
            <span className="font-medium text-slate-300">
              {character.currentStamina} / {character.maxStamina}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all shadow-[0_0_8px_rgba(34,211,238,0.5)]"
              style={{ width: `${staminaPercentage}%` }}
            />
          </div>
        </div>

        {/* Death Counter */}
        <div
          className={`rounded-lg border p-3 ${
            isPermaDead
              ? "border-red-500/50 bg-red-950/30"
              : "border-slate-700/50 bg-slate-800/30"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">Deaths</p>
            <p
              className={`text-xs font-semibold ${
                isPermaDead ? "text-red-400" : "text-slate-300"
              }`}
            >
              {character.deaths} / 5
            </p>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded ${
                  i < character.deaths
                    ? "bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.5)]"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>
          {!isPermaDead && (
            <p className="mt-2 text-xs text-slate-400">
              {deathsRemaining} live{deathsRemaining !== 1 ? "s" : ""}{" "}
              remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

