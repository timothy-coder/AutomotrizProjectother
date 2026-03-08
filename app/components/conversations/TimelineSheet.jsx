"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileText } from "lucide-react";

export default function TimelineSheet({ open, onOpenChange, session }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!session?.session_id) return;

    fetch(`/api/conversations/timeline?session_id=${session.session_id}`)
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error(e);
        setMessages([]);
      });
  }, [session]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const resumen = useMemo(() => {
    return session?.resumen || messages?.[0]?.resumen || "Sin resumen disponible";
  }, [session, messages]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>
              {session?.cliente_nombre || "Conversación"}
            </SheetTitle>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <FileText className="h-4 w-4" />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-[320px]">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Resumen</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {resumen}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-sm text-gray-500">{session?.celular}</p>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="mt-4 space-y-3 overflow-y-auto h-[80vh] pr-2"
        >
          {messages.map((m) => (
            <div key={m.id} className="space-y-1">
              {m.pregunta && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 px-3 py-2 rounded-xl max-w-[80%] text-sm">
                    {m.pregunta}
                  </div>
                </div>
              )}

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