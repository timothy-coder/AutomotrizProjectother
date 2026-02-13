"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DashboardPage() {

  const powerbiUrlDesktop =
    "https://app.powerbi.com/view?r=eyJrIjoiMDIxYWU2MTktNTI3Mi00NmZmLWI0MjktNGE0YjMyNjU0MWYyIiwidCI6IjE3MzhmZjU0LTQ0YjctNDkzOS1iZTJmLTEzODI5MjAwOWFmNiJ9&pageName=c24162ef297a7bd44209";

  const powerbiUrlMobile =
    "https://app.powerbi.com/view?r=eyJrIjoiMDIxYWU2MTktNTI3Mi00NmZmLWI0MjktNGE0YjMyNjU0MWYyIiwidCI6IjE3MzhmZjU0LTQ0YjctNDkzOS1iZTJmLTEzODI5MjAwOWFmNiJ9&pageName=c24162ef297a7bd44209";


  const [powerbiUrl, setPowerbiUrl] = useState(powerbiUrlDesktop);

  useEffect(() => {

    function handleResize() {
      if (window.innerWidth < 768) {
        setPowerbiUrl(powerbiUrlMobile);
      } else {
        setPowerbiUrl(powerbiUrlDesktop);
      }
    }

    handleResize(); // ejecutar al cargar
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);

  }, []);

  return (
    <div className="space-y-4">

      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Resumen general del sistema.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-hidden rounded-xl border">
            <div className="relative w-full aspect-video">
              <iframe
                key={powerbiUrl} // 👈 fuerza recarga al cambiar link
                title="Power BI"
                src={powerbiUrl}
                className="absolute inset-0 h-full w-full"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          </div>
        </CardContent>

      </Card>

    </div>
  );
}
