type Character = {
  id: string;
  name: string;
  gender: string;
  level: number;
  floor: number;
  location: string;
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
  currentHp: number;
  maxHp: number;
  currentStamina: number;
  maxStamina: number;
};

type CharacterSummaryProps = {
  character: Character;
};

export function CharacterSummary({ character }: CharacterSummaryProps) {
  const hpPercentage = (character.currentHp / character.maxHp) * 100;
  const staminaPercentage = (character.currentStamina / character.maxStamina) * 100;

  return (
    <div className="rounded-xl bg-white/10 p-6">
      <h2 className="mb-4 text-2xl font-bold">Character Summary</h2>
      
      <div className="space-y-4">
        {/* Name & Level */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-sm text-slate-300">Character</p>
            <p className="text-xl font-semibold">
              {character.name} – Lv. {character.level}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">Gender</p>
            <p className="text-lg font-medium capitalize">{character.gender}</p>
          </div>
        </div>

        {/* Floor & Location */}
        <div>
          <p className="text-sm text-slate-300">Location</p>
          <p className="text-lg font-semibold">
            Floor {character.floor} – {character.location}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-slate-300">Vitality</p>
            <p className="text-xl font-semibold">{character.vitality}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Strength</p>
            <p className="text-xl font-semibold">{character.strength}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Speed</p>
            <p className="text-xl font-semibold">{character.speed}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Dexterity</p>
            <p className="text-xl font-semibold">{character.dexterity}</p>
          </div>
        </div>

        {/* HP */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-300">HP</span>
            <span className="font-medium">
              {character.currentHp} / {character.maxHp}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        {/* Stamina */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-300">Stamina</span>
            <span className="font-medium">
              {character.currentStamina} / {character.maxStamina}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${staminaPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

