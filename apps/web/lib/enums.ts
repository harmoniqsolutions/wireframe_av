export const projectStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const verificationStatuses = ["MANUAL", "AI_DRAFT", "USER_VERIFIED", "TEAM_VERIFIED", "ADMIN_VERIFIED", "DEPRECATED"] as const;
export const portDirections = ["INPUT", "OUTPUT", "BIDIRECTIONAL"] as const;
export const portSides = ["LEFT", "RIGHT", "TOP", "BOTTOM", "FRONT", "REAR"] as const;
export const drawingPageTypes = ["AUDIO", "VIDEO", "CONTROL", "NETWORK", "POWER", "RACK", "GENERAL"] as const;
export const cableStatuses = ["DESIGNED", "PULLED", "TERMINATED", "TESTED", "VERIFIED"] as const;
