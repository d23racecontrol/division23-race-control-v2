/**
 * Einzige Schnittstelle zum Browser-Speicher.
 *
 * Fachmodule greifen nicht direkt auf localStorage zu. So können wir die
 * Speicherung später austauschen, ohne alle Dateien ändern zu müssen.
 */

const STORAGE_PREFIX = "d23_race_control_v2_";

export function readStoredValue(key, fallbackValue = null) {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return value ?? fallbackValue;
  } catch (error) {
    console.warn("Race Control V2: Gespeicherte Daten konnten nicht gelesen werden.", error);
    return fallbackValue;
  }
}

export function writeStoredValue(key, value) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value));
    return true;
  } catch (error) {
    console.warn("Race Control V2: Daten konnten nicht gespeichert werden.", error);
    return false;
  }
}
