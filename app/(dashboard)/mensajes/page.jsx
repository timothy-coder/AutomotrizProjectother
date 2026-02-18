"use client";

import { useEffect, useState } from "react";
import { Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import TimelineSheet from "@/app/components/conversations/TimelineSheet";

export default function ConversationsPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [openSheet, setOpenSheet] = useState(false);

  async function load() {
    const res = await fetch("/api/conversations/clients");
    const data = await res.json();
    setSessions(data);
  }

  useEffect(() => {
    load();
  }, []);

  function openTimeline(session) {
    setSelectedSession(session);
    setOpenSheet(true);
  }

  return (
    <div className="max-w-xl mx-auto space-y-2">

     

      <div className="border rounded-xl overflow-hidden bg-white shadow">

        {sessions.map((s) => (
          <div
            key={s.session_id}
            className="flex items-center justify-between p-4 border-b hover:bg-gray-50"
          >
            <div>
              <div className="font-semibold">
                {s.cliente_nombre || "Cliente"}
              </div>

              <div className="text-sm text-gray-500 truncate max-w-[220px]">
                {s.ultimomensaje || "Sin mensajes"}
              </div>

              <div className="text-xs text-gray-400">
                {s.celular}
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => openTimeline(s)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        ))}

      </div>

      <TimelineSheet
        open={openSheet}
        onOpenChange={setOpenSheet}
        session={selectedSession}
      />

    </div>
  );
}
