export function safeParsePermissions(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw; // por si ya viene parseado
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function hasPermission(perms, module, action) {
  if (!perms) return false;
  return perms?.[module]?.[action] === true;
}
