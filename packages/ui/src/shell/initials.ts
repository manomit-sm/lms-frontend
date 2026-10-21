/** Up to two letters for an avatar: "Asha Rao" -> "AR", "admin@acme.test" -> "AA". */
export function initials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
