"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function UsersToolbar({ canCreate, onNew }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold">Usuarios</h2>

      {canCreate && (
        <Button onClick={onNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo
        </Button>
      )}
    </div>
  );
}
