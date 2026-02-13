"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MotivosTab() {

  const [items, setItems] = useState([]);
  const [nombre, setNombre] = useState("");

  async function load() {
    const r = await fetch("/api/motivos_citas");
    setItems(await r.json());
  }

  async function create() {
    await fetch("/api/motivos_citas", {
      method: "POST",
      body: JSON.stringify({ nombre })
    });

    setNombre("");
    load();
  }


  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">

      <div className="flex gap-2">
        <Input
          placeholder="Motivo"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />

        <Button onClick={create}>Crear</Button>
      </div>

      {items.map(m => (
        <div key={m.id}>{m.nombre}</div>
      ))}

    </div>
  );
}
