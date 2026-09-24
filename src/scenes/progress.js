const KEY = "taxi-parking-jam.cleared";

export function loadCleared() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function markCleared(levelIndex) {
  try {
    const cleared = loadCleared();
    cleared.add(levelIndex);
    localStorage.setItem(KEY, JSON.stringify([...cleared]));
  } catch {
    // storage unavailable: progress just isn't remembered
  }
}
