export const finishes = [
  { name: "Hot orange", color: "#ee512d" },
  { name: "Acid yellow", color: "#d6ef43" },
  { name: "Chalk", color: "#e5e5dc" },
  { name: "After hours", color: "#333738" },
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
