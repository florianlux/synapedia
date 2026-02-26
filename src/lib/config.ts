/**
 * Application configuration constants.
 * Centralises naming so the app can be rebranded (Synapedia → NeuroCodex)
 * without touching dozens of files.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Synapedia";
export const APP_DESCRIPTION = "Wissenschaftliche Wissensdatenbank für psychoaktive Substanzen";
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "synapedia.de";
