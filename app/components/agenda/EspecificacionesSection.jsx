"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ExternalLink, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";

function isUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function getYouTubeEmbedUrl(url) {
  if (!url) return null;

  const urlLower = url.toLowerCase();
  let videoId = null;

  if (urlLower.includes("youtu.be/")) {
    const match = url.match(/youtu\.be\/([^?&]+)/);
    videoId = match ? match[1] : null;
  } else if (urlLower.includes("youtube.com/watch")) {
    const match = url.match(/v=([^&]+)/);
    videoId = match ? match[1] : null;
  } else if (urlLower.includes("youtube.com/embed/")) {
    const match = url.match(/embed\/([^?&]+)/);
    videoId = match ? match[1] : null;
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&controls=1`;
  }

  return null;
}

function getMediaType(url) {
  if (!url) return null;

  try {
    new URL(url);
  } catch {
    return null;
  }

  const urlLower = url.toLowerCase();

  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".tiff",
  ];
  if (imageExtensions.some((ext) => urlLower.includes(ext))) {
    return "image";
  }

  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
  if (videoExtensions.some((ext) => urlLower.includes(ext))) {
    return "video";
  }

  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return "youtube";
  }

  if (urlLower.includes("vimeo.com")) {
    return "vimeo";
  }

  if (urlLower.includes("drive.google.com")) {
    return "gdrive";
  }

  if (
    urlLower.includes("imgur.com") ||
    urlLower.includes("unsplash.com") ||
    urlLower.includes("pexels.com") ||
    urlLower.includes("pixabay.com") ||
    urlLower.includes("cloudinary.com") ||
    urlLower.includes("amazonaws.com") ||
    urlLower.includes("gstatic.com") ||
    urlLower.includes("media.") ||
    urlLower.includes("images.") ||
    urlLower.includes("encrypted-tbn")
  ) {
    return "image";
  }

  return null;
}

export default function EspecificacionesSection({
  marcaId,
  modeloId,
  expanded,
  onExpandChange,
}) {
  const [modeloEspecificaciones, setModeloEspecificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState({});

  useEffect(() => {
    loadModeloEspecificaciones();
  }, [marcaId, modeloId]);

  async function loadModeloEspecificaciones() {
    if (!marcaId || !modeloId) {
      setModeloEspecificaciones([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/modelo-especificaciones?marca_id=${marcaId}&modelo_id=${modeloId}`,
        { cache: "no-store" }
      );

      const data = await response.json();
      setModeloEspecificaciones(Array.isArray(data) ? data : []);
      setImageLoadErrors({});
    } catch (error) {
      console.error(error);
      toast.error("Error cargando especificaciones");
      setModeloEspecificaciones([]);
    } finally {
      setLoading(false);
    }
  }

  const handleImageError = (idx) => {
    setImageLoadErrors((prev) => ({
      ...prev,
      [idx]: true,
    }));
  };

  return (
    <div className="border-t pt-6">
      <button
        onClick={() => onExpandChange(!expanded)}
        className="flex items-center gap-2 font-semibold mb-4 hover:text-blue-600 transition-colors"
      >
        <ChevronDown
          size={20}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        Especificaciones técnicas
      </button>

      {expanded && (
        <div>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : modeloEspecificaciones.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">
              No hay especificaciones configuradas
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
              {modeloEspecificaciones.map((esp, idx) => {
                const mediaType = getMediaType(esp.valor);
                const isTipoDatoMedia = esp.tipo_dato === "media" || mediaType;
                const hasError = imageLoadErrors[idx];

                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase flex-1">
                        {esp.especificacion_nombre}
                      </p>
                      {isTipoDatoMedia && (
                        <>
                          {mediaType === "image" && (
                            <ImageIcon
                              size={14}
                              className="text-blue-500"
                            />
                          )}
                          {(mediaType === "youtube" ||
                            mediaType === "vimeo" ||
                            mediaType === "video") && (
                            <VideoIcon
                              size={14}
                              className={
                                mediaType === "youtube"
                                  ? "text-red-500"
                                  : "text-purple-500"
                              }
                            />
                          )}
                        </>
                      )}
                    </div>

                    {isTipoDatoMedia ? (
                      <>
                        {mediaType === "image" ? (
                          <div className="flex flex-col gap-2">
                            {!hasError ? (
                              <img
                                src={esp.valor}
                                alt={esp.especificacion_nombre}
                                className="w-full h-40 object-cover rounded-lg border border-gray-300 hover:border-blue-400 transition-colors"
                                onError={() => handleImageError(idx)}
                              />
                            ) : (
                              <div className="w-full h-40 bg-gray-200 rounded-lg border border-gray-300 flex flex-col items-center justify-center gap-2">
                                <ImageIcon
                                  size={32}
                                  className="text-gray-400"
                                />
                                <p className="text-xs text-gray-500">
                                  No se pudo cargar
                                </p>
                              </div>
                            )}
                          </div>
                        ) : mediaType === "youtube" ? (
                          <div className="relative w-full h-40 bg-gray-900 rounded-lg border border-gray-300 overflow-hidden hover:ring-2 hover:ring-red-400 transition-all">
                            <iframe
                              width="100%"
                              height="100%"
                              src={getYouTubeEmbedUrl(esp.valor)}
                              title={esp.especificacion_nombre}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="rounded-lg"
                            />
                          </div>
                        ) : mediaType === "vimeo" ? (
                          <div className="relative w-full h-40 bg-gray-900 rounded-lg border border-gray-300 overflow-hidden hover:ring-2 hover:ring-purple-400 transition-all">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://player.vimeo.com/video/${
                                esp.valor.match(/vimeo\.com\/(\d+)/)?.[1]
                              }`}
                              title={esp.especificacion_nombre}
                              frameBorder="0"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                              className="rounded-lg"
                            />
                          </div>
                        ) : mediaType === "video" ? (
                          <div className="relative w-full h-40 bg-gray-900 rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center group hover:ring-2 hover:ring-blue-400 transition-all">
                            <video
                              src={esp.valor}
                              className="w-full h-full object-cover"
                              controls
                              controlsList="nodownload"
                              preload="metadata"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-40 bg-gray-200 rounded-lg border border-gray-300 flex items-center justify-center">
                            <p className="text-xs text-gray-500">
                              Tipo no soportado
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-gray-900 break-words">
                          {esp.valor}
                        </p>
                        {isUrl(esp.valor) && (
                          <a
                            href={esp.valor}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 break-all"
                          >
                            Abrir enlace
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}