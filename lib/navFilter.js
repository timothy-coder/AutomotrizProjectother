import { hasPermission } from "@/lib/permissions";

export function filterNavTree(navTree, permissions) {
  return navTree
    .map((section) => {
      const items = section.items.filter((item) => {
        const [module, action] = item.perm;
        return hasPermission(permissions, module, action);
      });
      return items.length ? { ...section, items } : null;
    })
    .filter(Boolean);
}
