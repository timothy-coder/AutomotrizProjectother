"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OrigenesTab() {

  const [items, setItems] = useState([]);
  const [name, setName] = useState("");

  async function load() {
    const r = await fetch("/api/origenes_citas");
    setItems(await r.json());
  }

  async function create() {
    await fetch("/api/origenes_citas", {
      method: "POST",
      body: JSON.stringify({ name })
    });

    setName("");
    load();
  }

  useEffect(load, []);

  return (
    <div className="space-y-4">

      <div className="flex gap-2">
        <Input
          placeholder="Origen"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <Button onClick={create}>Crear</Button>
      </div>

      {items.map(o => (
        <div key={o.id}>{o.name}</div>
      ))}

    </div>
  );
}
