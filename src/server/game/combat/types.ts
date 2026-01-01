// Combat engine types - pure domain types for combat calculations

export type CombatAction = "attack" | "skill" | "defend" | "item" | "escape";

export interface CombatStats {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
  defense: number;
  currentHP: number;
  maxHP: number;
  currentSP: number;
  maxSP: number;
}

export interface EnemyStats {
  hp: number;
  maxHP: number;
  strength: number;
  speed: number;
  defense: number;
  type: string;
  level: number;
}

export interface CombatState {
  playerHP: number;
  playerSP: number;
  enemyHP: number;
  turnNumber: number;
  combatEnded: boolean;
  playerWon: boolean | null;
}

export interface CombatActionResult {
  state: CombatState;
  messages: string[];
}

export interface CombatStartResult {
  playerStats: {
    hp: number;
    maxHP: number;
    sp: number;
    maxSP: number;
  };
  enemyStats: {
    hp: number;
    maxHP: number;
    type: string;
    level: number;
  };
  playerFirst: boolean;
}

export interface EquipmentItem {
  vitalityBonus: number;
  strengthBonus: number;
  speedBonus: number;
  dexterityBonus: number;
  defenseBonus?: number;
}

export interface Equipment {
  head?: EquipmentItem | null;
  leftArm?: EquipmentItem | null;
  rightArm?: EquipmentItem | null;
  body?: EquipmentItem | null;
  legs?: EquipmentItem | null;
  feet?: EquipmentItem | null;
  ring1?: EquipmentItem | null;
  ring2?: EquipmentItem | null;
  ring3?: EquipmentItem | null;
  necklace?: EquipmentItem | null;
  belt?: EquipmentItem | null;
  cloak?: EquipmentItem | null;
}

export interface PlayerBaseStats {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
  currentHP: number;
  currentSP: number;
}

