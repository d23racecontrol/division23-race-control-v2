/**
 * Einzige Schnittstelle zum Browser-Speicher.
 *
 * Fachmodule greifen nicht direkt auf localStorage zu. So können wir die
 * Speicherung später austauschen, ohne alle Dateien ändern zu müssen.
 */

const STORAGE_PREFIX = "d23_race_control_v2_";

function buildStorageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

export function readStoredValue(key, fallbackValue = null) {
  try {
    const value = window.localStorage.getItem(buildStorageKey(key));
    return value ?? fallbackValue;
  } catch (error) {
    console.warn("Race Control V2: Gespeicherte Daten konnten nicht gelesen werden.", error);
    return fallbackValue;
  }
}

export function writeStoredValue(key, value) {
  try {
    window.localStorage.setItem(buildStorageKey(key), String(value));
    return true;
  } catch (error) {
    console.warn("Race Control V2: Daten konnten nicht gespeichert werden.", error);
    return false;
  }
}

export function readStoredJson(key, fallbackValue = null) {
  const storedValue = readStoredValue(key, null);

  if (storedValue === null) {
    return fallbackValue;
  }

  try {
    return JSON.parse(storedValue);
  } catch (error) {
    console.warn("Race Control V2: Gespeicherte JSON-Daten sind beschädigt.", error);
    return fallbackValue;
  }
}

export function writeStoredJson(key, value) {
  try {
    return writeStoredValue(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Race Control V2: JSON-Daten konnten nicht gespeichert werden.", error);
    return false;
  }
}

export function removeStoredValue(key) {
  try {
    window.localStorage.removeItem(buildStorageKey(key));
    return true;
  } catch (error) {
    console.warn("Race Control V2: Gespeicherte Daten konnten nicht entfernt werden.", error);
    return false;
  }
}
