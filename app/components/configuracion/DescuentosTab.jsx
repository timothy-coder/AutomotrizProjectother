"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2
} from "lucide-react";

export default function DescuentosTab() {

  
  return (
    <div className="space-y-5">

      <h2 className="text-xl font-semibold">Descuentos</h2>
    </div>
  );
}
