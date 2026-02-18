"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function TimelineSheet({ open, onOpenChange, session }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!session) return;

    fetch(`/api/conversations/timeline?session_id=${session.session_id}`)
      .then(r => r.json())
      .then(setMessages);
  }, [session]);

  // scroll automático al final
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px]">

        <SheetHeader>
          <SheetTitle>
            {session?.cliente_nombre || "Conversación"}
          </SheetTitle>
          <p className="text-sm text-gray-500">{session?.celular}</p>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="mt-4 space-y-3 overflow-y-auto h-[80vh] pr-2"
        >
          {messages.map((m) => (
            <div key={m.id} className="space-y-1">

              {/* pregunta */}
              {m.pregunta && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 px-3 py-2 rounded-xl max-w-[80%] text-sm">
                    {m.pregunta}
                  </div>
                </div>
              )}

              {/* respuesta */}
              {m.respuesta && (
                <div className="flex justify-end">
                  <div className="bg-[#5e17eb] text-white px-3 py-2 rounded-xl max-w-[80%] text-sm">
                    {m.respuesta}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>

      </SheetContent>
    </Sheet>
  );
}
