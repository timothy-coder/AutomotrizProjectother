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
  role: "",
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
  mode, // view | create | edit
  user,
  onSave,
}) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [tab, setTab] = useState("general");

  const [form, setForm] = useState(EMPTY_FORM);

  const [centrosOptions, setCentrosOptions] = useState([]);
  const [talleresOptions, setTalleresOptions] = useState([]);
  const [mostradoresOptions, setMostradoresOptions] = useState([]);

  const [loadingCentros, setLoadingCentros] = useState(false);
  const [loadingDependientes, setLoadingDependientes] = useState(false);

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
    <Dialog open={open} onOpenChange={onOpenChange} className="bg-white">
      <DialogContent className="max-w-4xl">
        <DialogHeader className="bg-white px-6 py-5 rounded-t-2xl border-b border-gray-200">
          <DialogTitle className="text-xl font-bold text-[#1e293b]">
            {isView ? "Ver usuario" : isEdit ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>

          <DialogDescription>
            {isView ? "Solo lectura" : "Complete los datos"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger
              value="general"
              className="flex-1 rounded-lg border-b-2 border-transparent text-gray-600 font-medium data-[state=active]:border-[#13223F] data-[state=active]:text-[#13223F]"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="horario"
              className="flex-1 rounded-lg border-b-2 border-transparent text-gray-600 font-medium data-[state=active]:border-[#13223F] data-[state=active]:text-[#13223F]"
            >
              Horario
            </TabsTrigger>
            <TabsTrigger
              value="permisos"
              className="flex-1 rounded-lg border-b-2 border-transparent text-gray-600 font-medium data-[state=active]:border-[#13223F] data-[state=active]:text-[#13223F]"
            >
              Permisos
            </TabsTrigger>
            <TabsTrigger
              value="sitios"
              className="flex-1 rounded-lg border-b-2 border-transparent text-gray-600 font-medium data-[state=active]:border-[#13223F] data-[state=active]:text-[#13223F]"
            >
              Sitios
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="general"
            className="mt-4 space-y-4 max-h-[50vh] overflow-y-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre completo</Label>
                <Input
                  disabled={isView}
                  value={form.fullname || ""}
                  onChange={(e) => updateField("fullname", e.target.value)}
                />
              </div>

              <div>
                <Label>Usuario</Label>
                <Input
                  disabled={isView}
                  value={form.username || ""}
                  onChange={(e) => updateField("username", e.target.value)}
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  disabled={isView}
                  value={form.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>

              <div>
                <Label>Teléfono</Label>
                <Input
                  disabled={isView}
                  value={form.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>

              <div>
                <Label>Rol</Label>
                <Input
                  disabled={isView}
                  value={form.role || ""}
                  onChange={(e) => updateField("role", e.target.value)}
                />
              </div>

              <div>
                <Label>Color</Label>

                <div className="flex items-center gap-3">
                  <Input
                    disabled={isView}
                    value={form.color || "#5e17eb"}
                    onChange={(e) => updateField("color", e.target.value)}
                  />

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={isView}
                        className="h-9 w-9 rounded-md border border-border"
                        style={{ background: form.color || "#5e17eb" }}
                        aria-label="Elegir color"
                        title="Elegir color"
                      />
                    </PopoverTrigger>

                    <PopoverContent className="w-40">
                      <input
                        type="color"
                        value={form.color || "#5e17eb"}
                        onChange={(e) => updateField("color", e.target.value)}
                        className="w-full h-10"
                        disabled={isView}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {!isView && (
                <>
                  <div>
                    <Label>Contraseña</Label>
                    <Input
                      type="password"
                      value={form.password || ""}
                      onChange={(e) => updateField("password", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Confirmar contraseña</Label>
                    <Input
                      type="password"
                      value={form.password2 || ""}
                      onChange={(e) => updateField("password2", e.target.value)}
                    />

                    {passMismatch && (
                      <p className="text-xs text-destructive">
                        Contraseñas no coinciden
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-2 md:col-span-2">
                <Checkbox
                  checked={!!form.is_active}
                  disabled={isView}
                  onCheckedChange={(v) => updateField("is_active", !!v)}
                />
                Usuario activo
              </div>
            </div>
          </TabsContent>

          <TabsContent value="horario" className="max-h-[50vh] overflow-y-auto">
            {DAYS.map((d) => {
              const enabled = !!form.work_schedule?.[d.key];

              return (
                <div key={d.key} className="border rounded-md p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={enabled}
                      disabled={isView}
                      onCheckedChange={(v) => setDayEnabled(d.key, !!v)}
                    />
                    {d.label}
                  </div>

                  {enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        disabled={isView}
                        value={form.work_schedule[d.key].start}
                        onChange={(e) => setDayTime(d.key, "start", e.target.value)}
                      />

                      <Input
                        type="time"
                        disabled={isView}
                        value={form.work_schedule[d.key].end}
                        onChange={(e) => setDayTime(d.key, "end", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent
            value="permisos"
            className="mt-4 max-h-[55vh] overflow-y-auto pr-2"
          >
            {SECTIONS.map((s) => (
              <div
                key={s.key}
                className="border border-border rounded-md p-3 mb-3"
              >
                <div className="font-medium mb-2">{s.label}</div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {ACTIONS.filter((a) => s.actions.includes(a.key)).map((a) => (
                    <label key={a.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!form.permissions?.[s.key]?.[a.key]}
                        disabled={isView}
                        onCheckedChange={(v) => setPerm(s.key, a.key, !!v)}
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent
            value="sitios"
            className="mt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-2"
          >
            <div className="text-sm text-muted-foreground">
              Centros seleccionados: {centrosSeleccionadosTexto}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="border rounded-md p-3">
                <div className="font-medium mb-3">Centros</div>

                {loadingCentros ? (
                  <p className="text-sm text-muted-foreground">Cargando centros...</p>
                ) : centrosOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay centros disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {centrosOptions.map((item) => {
                      const checked = normalizeIds(form.centros).includes(Number(item.id));

                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isView}
                            onCheckedChange={(v) =>
                              toggleArrayField("centros", item.id, !!v)
                            }
                          />
                          {getOptionLabel(item)}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border rounded-md p-3">
                <div className="font-medium mb-3">Talleres</div>

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
                  <div className="space-y-2">
                    {talleresOptions.map((item) => {
                      const checked = normalizeIds(form.talleres).includes(Number(item.id));

                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isView}
                            onCheckedChange={(v) =>
                              toggleArrayField("talleres", item.id, !!v)
                            }
                          />
                          {getOptionLabel(item)}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border rounded-md p-3">
                <div className="font-medium mb-3">Mostradores</div>

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
                  <div className="space-y-2">
                    {mostradoresOptions.map((item) => {
                      const checked = normalizeIds(form.mostradores).includes(Number(item.id));

                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isView}
                            onCheckedChange={(v) =>
                              toggleArrayField("mostradores", item.id, !!v)
                            }
                          />
                          {getOptionLabel(item)}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isView ? "Cerrar" : "Cancelar"}
          </Button>

          {!isView && (
            <Button onClick={handleSave} disabled={passMismatch}>
              Guardar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}