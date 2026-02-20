"use client";

import { useMemo, useState } from "react";

export function useUserSearch(users) {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!search) return users;

    return users.filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.fullname.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  return {
    search,
    setSearch,
    filteredUsers,
  };
}
