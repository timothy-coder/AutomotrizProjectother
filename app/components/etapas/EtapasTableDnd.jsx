"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { useState, useEffect } from "react";
import { GripVertical, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SortableRow({ item, onView, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-t bg-background">

      <td className="p-3 w-10 text-muted-foreground">
        <span {...attributes} {...listeners} className="cursor-grab">
          <GripVertical size={16} />
        </span>
      </td>

      <td className="p-3">{item.nombre}</td>
      <td className="p-3 text-muted-foreground">{item.descripcion}</td>

      <td className="p-3 text-right space-x-2">
        {onView && (
          <Button size="icon" variant="ghost" onClick={() => onView(item)}>
            <Eye size={16} />
          </Button>
        )}

        {onEdit && (
          <Button size="icon" variant="ghost" onClick={() => onEdit(item)}>
            <Pencil size={16} />
          </Button>
        )}

        {onDelete && (
          <Button size="icon" variant="ghost" onClick={() => onDelete(item)}>
            <Trash2 size={16} />
          </Button>
        )}
      </td>
    </tr>
  );
}

export default function EtapasTableDnd({
  data,
  loading,
  onView,
  onEdit,
  onDelete,
  onReordered,
}) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(data || []);
  }, [data]);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);

    onReordered?.(newItems);
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Cargando...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full text-sm">

          <thead className="bg-muted">
            <tr>
              <th className="p-3 w-10"></th>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Descripción</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>

          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {items.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </SortableContext>

        </table>
      </DndContext>
    </div>
  );
}
