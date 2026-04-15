"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

function idsToCommaText(ids) {
  return (ids || []).join(",");
}

export default function MultiMantenimientoSelector({
  allItems = [],
  selectedIds = [],
  onChange,
  disabled,
  excludeId,
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    const s = new Set(selectedIds);
    return allItems.filter((x) => s.has(Number(x.id)));
  }, [allItems, selectedIds]);

  const options = useMemo(() => {
    return (allItems || [])
      .filter((x) => Number(x.id) !== Number(excludeId))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [allItems, excludeId]);

  function toggle(id) {
    const n = Number(id);
    const exists = selectedIds.includes(n);
    const next = exists
      ? selectedIds.filter((x) => x !== n)
      : [...selectedIds, n];

    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`w-full text-left border rounded-lg px-2 sm:px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 sm:gap-2 items-center transition-colors text-sm ${
              disabled
                ? "opacity-50 cursor-not-allowed bg-gray-50"
                : "cursor-text hover:border-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
          >
            {selected.length === 0 ? (
              <span className="text-xs sm:text-sm text-muted-foreground">
                Click para buscar...
              </span>
            ) : (
              selected.map((it) => (
                <span
                  key={it.id}
                  className="flex items-center gap-1 text-white rounded-md px-1.5 sm:px-2 py-0.5 text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  {it.name}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-0.5 text-sm leading-none hover:opacity-80 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(it.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(it.id);
                      }
                    }}
                    aria-label={`Quitar ${it.name}`}
                  >
                    ×
                  </span>
                </span>
              ))
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder="Buscar mantenimiento..." />
            <CommandList>
              <CommandEmpty>No se encontró.</CommandEmpty>
              <CommandGroup heading="Mantenimientos">
                {options.map((m) => {
                  const isSelected = selectedIds.includes(Number(m.id));
                  return (
                    <CommandItem
                      key={m.id}
                      value={`${m.name ?? ""} ${m.id}`}
                      onSelect={() => toggle(m.id)}
                      className="flex items-center justify-between cursor-pointer text-sm"
                    >
                      <span>{m.name}</span>
                      {isSelected ? (
                        <Check className="h-4 w-4" style={{ color: BRAND_PRIMARY }} />
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div
        className="text-xs p-2 rounded"
        style={{
          color: BRAND_SECONDARY,
          backgroundColor: `${BRAND_PRIMARY}10`,
        }}
      >
        <span className="font-medium">IDs seleccionados:</span>{" "}
        <span className="font-mono">{idsToCommaText(selectedIds) || "—"}</span>
      </div>
    </div>
  );
}