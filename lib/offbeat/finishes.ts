export const finishes = [
  { name: "Hot orange", color: "#ee512d", bg: "#edddd6" },
  { name: "Acid yellow", color: "#d6ef43", bg: "#e8edce" },
  { name: "Chalk", color: "#e5e5dc", bg: "#e7e8e3" },
  { name: "After hours", color: "#333738", bg: "#dee1e1" },
];
export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function savePreference(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
