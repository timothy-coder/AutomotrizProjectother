"use client";

import { useEffect, useState } from "react";

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

    const [form, setForm] = useState({
        fullname: "",
        username: "",
        email: "",
        phone: "",
        role: "",
        password: "",
        password2: "",
        is_active: true,
        work_schedule: {},
        permissions: {},
    });

    useEffect(() => {
    if (user) {

        let perms = user.permissions;
        let schedule = user.work_schedule;

        // 🔥 Parse JSON si viene string
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
            ...user,
            permissions: perms || {},
            work_schedule: schedule || {},
            password: "",
            password2: "",
        });
    }
}, [user]);


    function updateField(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
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
        if (!isView) onSave(form);
    }

    const passMismatch =
        form.password &&
        form.password2 &&
        form.password !== form.password2;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">

                <DialogHeader>
                    <DialogTitle>
                        {isView ? "Ver usuario" : isEdit ? "Editar usuario" : "Nuevo usuario"}
                    </DialogTitle>

                    <DialogDescription>
                        {isView ? "Solo lectura" : "Complete los datos"}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={tab} onValueChange={setTab}>

                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="horario">Horario</TabsTrigger>
                        <TabsTrigger value="permisos">Permisos</TabsTrigger>
                    </TabsList>

                    {/* GENERAL */}
                    <TabsContent value="general" className="mt-4 space-y-4 max-h-[50vh] overflow-y-auto">
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

                            {/* ✅ COLOR */}
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

                            {/* PASSWORD */}
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


                    {/* HORARIO */}
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
                                                onChange={(e) =>
                                                    setDayTime(d.key, "start", e.target.value)
                                                }
                                            />

                                            <Input
                                                type="time"
                                                disabled={isView}
                                                value={form.work_schedule[d.key].end}
                                                onChange={(e) =>
                                                    setDayTime(d.key, "end", e.target.value)
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                    </TabsContent>

                    {/* PERMISOS */}
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
                                    {ACTIONS
                                        .filter((a) => s.actions.includes(a.key))
                                        .map((a) => (
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


                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {isView ? "Cerrar" : "Cancelar"}
                    </Button>

                    {!isView && (
                        <Button onClick={handleSave}>Guardar</Button>
                    )}
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
