"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import {
  Camera,
  Video,
  Mic,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

export default function MediaRecepcionDialog({
  open,
  onOpenChange,
  recepcion,
  initialTab = "fotos",
}) {
  const [tab, setTab] = useState(initialTab);

  const [media, setMedia] = useState({
    fotos: [],
    videos: [],
    audios: [],
  });

  const fotoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab || "fotos");
  }, [open, initialTab]);

  function addFiles(type, fileList) {
    if (!fileList?.length) return;

    const nuevos = Array.from(fileList);

    setMedia((prev) => ({
      ...prev,
      [type]: [...prev[type], ...nuevos],
    }));
  }

  function removeFile(type, index) {
    setMedia((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  }

  function handleGuardar() {
    toast(
      `Guardar medios de recepción #${recepcion?.id ?? "nueva"} pendiente de API`
    );
    onOpenChange(false);
  }

  const titulo = recepcion?.id
    ? `Archivos de recepción #${recepcion.id}`
    : "Archivos de recepción";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => addFiles("fotos", e.target.files)}
        />

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => addFiles("videos", e.target.files)}
        />

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          capture
          multiple
          className="hidden"
          onChange={(e) => addFiles("audios", e.target.files)}
        />

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="audios">Audios</TabsTrigger>
          </TabsList>

          <TabsContent value="fotos" className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => fotoInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-2" />
              Tomar / agregar fotos
            </Button>

            <MediaList
              files={media.fotos}
              type="fotos"
              onRemove={removeFile}
            />
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => videoInputRef.current?.click()}
            >
              <Video className="w-4 h-4 mr-2" />
              Grabar / agregar videos
            </Button>

            <MediaList
              files={media.videos}
              type="videos"
              onRemove={removeFile}
            />
          </TabsContent>

          <TabsContent value="audios" className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => audioInputRef.current?.click()}
            >
              <Mic className="w-4 h-4 mr-2" />
              Grabar / agregar audios
            </Button>

            <MediaList
              files={media.audios}
              type="audios"
              onRemove={removeFile}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar}>
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MediaList({ files, type, onRemove }) {
  if (!files.length) {
    return (
      <div className="border rounded-lg p-6 text-sm text-muted-foreground text-center">
        No hay {type} agregados.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file, i) => (
        <div
          key={`${file.name}-${i}`}
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="text-sm truncate">{file.name}</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(type, i)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ))}
    </div>
  );
}