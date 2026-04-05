"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, User, Clock, Lock, MapPin, Palette, Loader2 } from "lucide-react";
import { SECTIONS, ACTIONS } from "./constants";

const DAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

const EMPTY_FORM = {
  fullname: "",
  username: "",
  email: "",
  phone: "",
  role_id: null,
  color: "#5e17eb",
  password: "",
  password2: "",
  is_active: true,
  work_schedule: {},
  permissions: {},
  centros: [],
  talleres: [],
  mostradores: [],
};

function normalizeIds(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  }

  if (typeof value === "string" && value.trim()) {
    return [
      ...new Set(
        value
          .split(",")
          .map((x) => Number(x.trim()))
          .filter((n) => Number.isInteger(n) && n > 0)
      ),
    ];
  }

  return [];
}

function dedupeById(items = []) {
  const map = new Map();
  for (const item of items) {
    if (item?.id != null) map.set(Number(item.id), item);
  }
  return Array.from(map.values());
}

function getOptionLabel(item) {
  return (
    item?.nombre ||
    item?.name ||
    item?.label ||
    item?.titulo ||
    item?.descripcion ||
    item?.description ||
    `ID ${item?.id}`
  );
}

export default function UserDialog({
  open,
  onOpenChange,
  mode,
  user,
  onSave,
}) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [tab, setTab] = useState("general");

  const [form, setForm] = useState(EMPTY_FORM);

  const [rolesOptions, setRolesOptions] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [centrosOptions, setCentrosOptions] = useState([]);
  const [talleresOptions, setTalleresOptions] = useState([]);
  const [mostradoresOptions, setMostradoresOptions] = useState([]);

  const [loadingCentros, setLoadingCentros] = useState(false);
  const [loadingDependientes, setLoadingDependientes] = useState(false);

  // ✅ Cargar roles
  useEffect(() => {
    if (!open) return;

    let active = true;

    async function loadRoles() {
      try {
        setLoadingRoles(true);
        const res = await fetch("/api/roles", { cache: "no-store" });
        const data = await res.json();

        if (!active) return;
        setRolesOptions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error cargando roles:", error);
        if (active) setRolesOptions([]);
      } finally {
        if (active) setLoadingRoles(false);
      }
    }

    loadRoles();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setTab("general");

    if (user) {
      let perms = user.permissions;
      let schedule = user.work_schedule;

      if (typeof perms === "string") {
        try {
          perms = JSON.parse(perms);
        } catch {
          perms = {};
        }
      }

      if (typeof schedule === "string") {
        try {
          schedule = JSON.parse(schedule);
        } catch {
          schedule = {};
        }
      }

      setForm({
        ...EMPTY_FORM,
        ...user,
        permissions: perms || {},
        work_schedule: schedule || {},
        centros: normalizeIds(user.centros),
        talleres: normalizeIds(user.talleres),
        mostradores: normalizeIds(user.mostradores),
        password: "",
        password2: "",
        color: user.color || "#5e17eb",
        role_id: user.role_id || null,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;

    let active = true;

    async function loadCentros() {
      try {
        setLoadingCentros(true);
        const res = await fetch("/api/centros", { cache: "no-store" });
        const data = await res.json();

        if (!active) return;
        setCentrosOptions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error cargando centros:", error);
        if (active) setCentrosOptions([]);
      } finally {
        if (active) setLoadingCentros(false);
      }
    }

    loadCentros();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const centrosSeleccionados = normalizeIds(form.centros);

    if (!centrosSeleccionados.length) {
      setTalleresOptions([]);
      setMostradoresOptions([]);
      setForm((prev) => ({
        ...prev,
        talleres: [],
        mostradores: [],
      }));
      return;
    }

    let active = true;

    async function loadDependientes() {
      try {
        setLoadingDependientes(true);

        const results = await Promise.all(
          centrosSeleccionados.map(async (centroId) => {
            const [talleresRes, mostradoresRes] = await Promise.all([
              fetch(`/api/talleres/bycentro?centro_id=${centroId}`, { cache: "no-store" }),
              fetch(`/api/mostradores/bycentro?centro_id=${centroId}`, { cache: "no-store" }),
            ]);

            const talleresData = await talleresRes.json();
            const mostradoresData = await mostradoresRes.json();

            return {
              talleres: Array.isArray(talleresData) ? talleresData : [],
              mostradores: Array.isArray(mostradoresData) ? mostradoresData : [],
            };
          })
        );

        if (!active) return;

        const talleresMerged = dedupeById(results.flatMap((r) => r.talleres));
        const mostradoresMerged = dedupeById(results.flatMap((r) => r.mostradores));

        setTalleresOptions(talleresMerged);
        setMostradoresOptions(mostradoresMerged);

        const talleresValidos = new Set(talleresMerged.map((x) => Number(x.id)));
        const mostradoresValidos = new Set(mostradoresMerged.map((x) => Number(x.id)));

        setForm((prev) => {
          const prevTalleres = normalizeIds(prev.talleres);
          const prevMostradores = normalizeIds(prev.mostradores);

          return {
            ...prev,
            talleres: prevTalleres.filter((id) => talleresValidos.has(id)),
            mostradores: prevMostradores.filter((id) => mostradoresValidos.has(id)),
          };
        });
      } catch (error) {
        console.error("Error cargando talleres/mostradores:", error);
        if (!active) return;
        setTalleresOptions([]);
        setMostradoresOptions([]);
      } finally {
        if (active) setLoadingDependientes(false);
      }
    }

    loadDependientes();

    return () => {
      active = false;
    };
  }, [open, JSON.stringify(normalizeIds(form.centros))]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleArrayField(field, id, checked) {
    const numId = Number(id);

    setForm((prev) => {
      const current = normalizeIds(prev[field]);
      const next = checked
        ? [...new Set([...current, numId])]
        : current.filter((x) => x !== numId);

      return {
        ...prev,
        [field]: next,
      };
    });
  }

  function setDayEnabled(day, enabled) {
    setForm((f) => ({
      ...f,
      work_schedule: {
        ...f.work_schedule,
        [day]: enabled ? { start: "08:00", end: "18:00" } : null,
      },
    }));
  }

  function setPerm(section, action, value) {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...(prev.permissions || {}),
        [section]: {
          ...((prev.permissions || {})[section] || {}),
          [action]: value,
        },
      },
    }));
  }

  function setDayTime(day, type, value) {
    setForm((f) => ({
      ...f,
      work_schedule: {
        ...f.work_schedule,
        [day]: {
          ...f.work_schedule?.[day],
          [type]: value,
        },
      },
    }));
  }

  function handleSave() {
    if (isView) return;
    if (passMismatch) return;
    onSave(form);
  }

  const passMismatch =
    form.password &&
    form.password2 &&
    form.password !== form.password2;

  const centrosSeleccionadosTexto = useMemo(() => {
    if (!form.centros?.length) return "Ninguno";
    return form.centros
      .map((id) => centrosOptions.find((c) => Number(c.id) === Number(id)))
      .filter(Boolean)
      .map((c) => getOptionLabel(c))
      .join(", ");
  }, [form.centros, centrosOptions]);

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange} className="bg-white">
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-white border-b pb-4 z-10">
            <div className="flex items-center gap-2">
              <User size={24} className="text-[#5d16ec]" />
              <div>
                <DialogTitle className="text-xl text-[#5d16ec]">
                  {isView ? "Ver usuario" : isEdit ? "Editar usuario" : "Nuevo usuario"}
                </DialogTitle>
                <DialogDescription>
                  {isView ? "Solo lectura" : "Complete los datos del usuario"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-6">
              <TabsTrigger
                value="general"
                className="flex items-center gap-1"
              >
                <User size={16} />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger
                value="horario"
                className="flex items-center gap-1"
              >
                <Clock size={16} />
                <span className="hidden sm:inline">Horario</span>
              </TabsTrigger>
              <TabsTrigger
                value="permisos"
                className="flex items-center gap-1"
              >
                <Lock size={16} />
                <span className="hidden sm:inline">Permisos</span>
              </TabsTrigger>
              <TabsTrigger
                value="sitios"
                className="flex items-center gap-1"
              >
                <MapPin size={16} />
                <span className="hidden sm:inline">Sitios</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: GENERAL */}
            <TabsContent
              value="general"
              className="space-y-4 max-h-[50vh] overflow-y-auto pr-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Nombre completo */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-[#5d16ec]">
                    Nombre completo
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Nombre y apellido del usuario
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    disabled={isView}
                    value={form.fullname || ""}
                    onChange={(e) => updateField("fullname", e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="h-9"
                  />
                </div>

                {/* Usuario */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-[#5d16ec]">
                    Usuario
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Nombre único para login
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    disabled={isView}
                    value={form.username || ""}
                    onChange={(e) => updateField("username", e.target.value)}
                    placeholder="Ej: jperez"
                    className="h-9"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-[#5d16ec]">
                    Email
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Email del usuario
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    disabled={isView}
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="h-9"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label className="text-[#5d16ec]">
                    Teléfono
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Teléfono del usuario
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    disabled={isView}
                    value={form.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="Ej: 987654321"
                    className="h-9"
                  />
                </div>

                {/* ✅ Rol - Select */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-[#5d16ec]">
                    Rol
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Selecciona el rol del usuario
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={form.role_id ? String(form.role_id) : "null"}
                    onValueChange={(v) => updateField("role_id", v === "null" ? null : Number(v))}
                    disabled={isView || loadingRoles}
                  >
                    <SelectTrigger className="h-9">
                      {loadingRoles ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Cargando roles...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Seleccionar rol..." />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">
                        <span className="text-gray-500">Sin rol</span>
                      </SelectItem>
                      {rolesOptions.map((rol) => (
                        <SelectItem key={rol.id} value={String(rol.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rol.name}</span>
                            {rol.description && (
                              <span className="text-xs text-gray-500">
                                ({rol.description})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-[#5d16ec]">
                    Color
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Color de identificación del usuario
                      </TooltipContent>
                    </Tooltip>
                  </Label>

                  <div className="flex items-center gap-2">
                    <Input
                      disabled={isView}
                      value={form.color || "#5e17eb"}
                      onChange={(e) => updateField("color", e.target.value)}
                      className="flex-1 h-9"
                    />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={isView}
                              className="h-9 w-12 rounded-md border-2 border-slate-300 hover:border-slate-400 transition-colors"
                              style={{ background: form.color || "#5e17eb" }}
                              aria-label="Elegir color"
                            />
                          </PopoverTrigger>

                          <PopoverContent className="w-40">
                            <input
                              type="color"
                              value={form.color || "#5e17eb"}
                              onChange={(e) => updateField("color", e.target.value)}
                              className="w-full h-10 cursor-pointer"
                              disabled={isView}
                            />
                          </PopoverContent>
                        </Popover>
                      </TooltipTrigger>
                      <TooltipContent side="top">Selector de color</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Contraseña */}
                {!isView && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-[#5d16ec]">
                        Contraseña
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle size={14} className="text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Mínimo 6 caracteres
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        type="password"
                        value={form.password || ""}
                        onChange={(e) => updateField("password", e.target.value)}
                        placeholder="••••••••"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-[#5d16ec]">
                        Confirmar contraseña
                      </Label>
                      <Input
                        type="password"
                        value={form.password2 || ""}
                        onChange={(e) => updateField("password2", e.target.value)}
                        placeholder="••••••••"
                        className={`h-9 ${passMismatch ? "border-red-500" : ""}`}
                      />

                      {passMismatch && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle size={12} /> Las contraseñas no coinciden
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Usuario activo */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border col-span-1 md:col-span-2">
                  <Checkbox
                    checked={!!form.is_active}
                    disabled={isView}
                    onCheckedChange={(v) => updateField("is_active", !!v)}
                    className="w-5 h-5"
                  />
                  <div>
                    <p className="font-medium text-sm text-[#5d16ec]">Usuario activo</p>
                    <p className="text-xs text-gray-600">
                      {form.is_active ? "Puede acceder al sistema" : "Acceso bloqueado"}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: HORARIO */}
            <TabsContent value="horario" className="space-y-3 max-h-[50vh] overflow-y-auto pr-4">
              {DAYS.map((d) => {
                const enabled = !!form.work_schedule?.[d.key];

                return (
                  <div key={d.key} className="border rounded-lg p-4 hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <Checkbox
                        checked={enabled}
                        disabled={isView}
                        onCheckedChange={(v) => setDayEnabled(d.key, !!v)}
                      />
                      <Label className="font-semibold text-[#5d16ec] cursor-pointer flex-1 mb-0">
                        {d.label}
                      </Label>
                      {enabled && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Activo
                        </span>
                      )}
                    </div>

                    {enabled && (
                      <div className="grid grid-cols-2 gap-3 pl-6">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">Entrada</Label>
                          <Input
                            type="time"
                            disabled={isView}
                            value={form.work_schedule[d.key].start}
                            onChange={(e) => setDayTime(d.key, "start", e.target.value)}
                            className="h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">Salida</Label>
                          <Input
                            type="time"
                            disabled={isView}
                            value={form.work_schedule[d.key].end}
                            onChange={(e) => setDayTime(d.key, "end", e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            {/* TAB: PERMISOS */}
            <TabsContent
              value="permisos"
              className="space-y-3 max-h-[55vh] overflow-y-auto pr-4"
            >
              {SECTIONS.map((s) => (
                <div
                  key={s.key}
                  className="border rounded-lg p-4 hover:border-slate-300 transition-colors"
                >
                  <div className="font-semibold text-[#5d16ec] mb-3 flex items-center gap-2">
                    <Lock size={16} className="text-[#5d16ec]" />
                    {s.label}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {ACTIONS.filter((a) => s.actions.includes(a.key)).map((a) => (
                      <Tooltip key={a.key}>
                        <TooltipTrigger asChild>
                          <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors">
                            <Checkbox
                              checked={!!form.permissions?.[s.key]?.[a.key]}
                              disabled={isView}
                              onCheckedChange={(v) => setPerm(s.key, a.key, !!v)}
                            />
                            {a.label}
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="top">{a.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* TAB: SITIOS */}
            <TabsContent
              value="sitios"
              className="space-y-4 max-h-[55vh] overflow-y-auto pr-4"
            >
              <div className="p-3 bg-[#5d16ec]/10 border border-[#5d16ec] rounded-lg">
                <p className="text-sm text-slate-900">
                  <span className="font-semibold text-[#5d16ec]">Centros seleccionados:</span>
                  <br />
                  <span className="text-slate-700">{centrosSeleccionadosTexto}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Centros */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-[#5d16ec] mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-[#5d16ec]" />
                    Centros
                  </h3>

                  {loadingCentros ? (
                    <p className="text-sm text-muted-foreground">Cargando centros...</p>
                  ) : centrosOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay centros disponibles</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {centrosOptions.map((item) => {
                        const checked = normalizeIds(form.centros).includes(Number(item.id));

                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-sm p-2 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={isView}
                              onCheckedChange={(v) =>
                                toggleArrayField("centros", item.id, !!v)
                              }
                            />
                            <span className="text-slate-700">{getOptionLabel(item)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Talleres */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-[#5d16ec] mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-[#5d16ec]" />
                    Talleres
                  </h3>

                  {!form.centros?.length ? (
                    <p className="text-sm text-muted-foreground">
                      Selecciona uno o más centros
                    </p>
                  ) : loadingDependientes ? (
                    <p className="text-sm text-muted-foreground">Cargando talleres...</p>
                  ) : talleresOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay talleres para los centros elegidos
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {talleresOptions.map((item) => {
                        const checked = normalizeIds(form.talleres).includes(Number(item.id));

                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-sm p-2 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={isView}
                              onCheckedChange={(v) =>
                                toggleArrayField("talleres", item.id, !!v)
                              }
                            />
                            <span className="text-slate-700">{getOptionLabel(item)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Mostradores */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-[#5d16ec] mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-[#5d16ec]" />
                    Mostradores
                  </h3>

                  {!form.centros?.length ? (
                    <p className="text-sm text-muted-foreground">
                      Selecciona uno o más centros
                    </p>
                  ) : loadingDependientes ? (
                    <p className="text-sm text-muted-foreground">Cargando mostradores...</p>
                  ) : mostradoresOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay mostradores para los centros elegidos
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {mostradoresOptions.map((item) => {
                        const checked = normalizeIds(form.mostradores).includes(Number(item.id));

                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-sm p-2 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={isView}
                              onCheckedChange={(v) =>
                                toggleArrayField("mostradores", item.id, !!v)
                              }
                            />
                            <span className="text-slate-700">{getOptionLabel(item)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4 mt-6 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isView ? "Cerrar" : "Cancelar"}
            </Button>

            {!isView && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSave}
                    disabled={passMismatch}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Guardar cambios
                  </Button>
                </TooltipTrigger>
                {passMismatch && (
                  <TooltipContent side="top">
                    Las contraseñas no coinciden
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}