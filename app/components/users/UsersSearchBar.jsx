"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function UsersSearchBar({ value, onChange }) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

      <Input
        placeholder="Buscar usuario o nombre..."
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
