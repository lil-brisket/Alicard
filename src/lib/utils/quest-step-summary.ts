/**
 * Formats a quest step into a human-readable summary
 * Used for display in lists, previews, and UI components
 */

export type QuestStepSummary = {
  summary: string;
  icon?: string;
};

export type QuestStepForSummary = {
  type: string;
  title?: string | null;
  description?: string | null;
  targetRefId?: string | null;
  quantity: number;
  isOptional?: boolean;
};

/**
 * Format a quest step into a human-readable summary string
 */
export function formatQuestStepSummary(step: QuestStepForSummary): string {
  const quantity = step.quantity > 1 ? ` ${step.quantity}x` : "";
  const optional = step.isOptional ? " (Optional)" : "";

  // If there's a custom title, use it
  if (step.title) {
    return `${step.title}${optional}`;
  }

  // Otherwise, generate from step type
  switch (step.type) {
    case "KILL_ENEMY":
      return `Kill${quantity} ${step.targetRefId ?? "enemies"}${optional}`;
    case "GATHER_ITEM":
      return `Gather${quantity} ${step.targetRefId ?? "items"}${optional}`;
    case "CRAFT_ITEM":
      return `Craft${quantity} ${step.targetRefId ?? "items"}${optional}`;
    case "VISIT_LOCATION":
      return `Visit ${step.targetRefId ?? "location"}${optional}`;
    case "DELIVER_ITEM":
      return `Deliver${quantity} ${step.targetRefId ?? "items"}${optional}`;
    case "TALK_TO_NPC":
      return `Talk to ${step.targetRefId ?? "NPC"}${optional}`;
    case "INTERACT_NODE":
      return `Interact with ${step.targetRefId ?? "node"}${quantity}${optional}`;
    default:
      return step.description ?? `Complete ${step.type}${optional}`;
  }
}

/**
 * Get a display-friendly label for a quest step type
 */
export function getQuestStepTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    KILL_ENEMY: "Kill Enemy",
    GATHER_ITEM: "Gather Item",
    CRAFT_ITEM: "Craft Item",
    VISIT_LOCATION: "Visit Location",
    DELIVER_ITEM: "Deliver Item",
    TALK_TO_NPC: "Talk to NPC",
    INTERACT_NODE: "Interact with Node",
  };
  return labels[type] ?? type;
}

/**
 * Get a display-friendly label for a quest reward type
 */
export function getQuestRewardTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    XP_CHARACTER: "Character XP",
    XP_OCCUPATION: "Occupation XP",
    ITEM: "Item",
    GOLD: "Gold",
    RECIPE_UNLOCK: "Recipe Unlock",
    SKILL_UNLOCK: "Skill Unlock",
  };
  return labels[type] ?? type;
}

/**
 * Get a display-friendly label for quest repeatability
 */
export function getQuestRepeatabilityLabel(repeatability: string): string {
  const labels: Record<string, string> = {
    ONCE: "Once",
    DAILY: "Daily",
    WEEKLY: "Weekly",
    REPEATABLE: "Repeatable",
  };
  return labels[repeatability] ?? repeatability;
}

