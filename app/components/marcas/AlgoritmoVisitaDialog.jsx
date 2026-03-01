"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const AlgoritmoVisitaDialog = ({ open, onOpenChange, mode, record, marcas, onSave }) => {
  const [formData, setFormData] = useState({
    modelo_id: "",
    marca_id: "",
    kilometraje: "",
    meses: "",
    años: [], // Cambié esto para que sea un array desde el principio
  });

  const [modelos, setModelos] = useState([]);
  const [isAll, setIsAll] = useState(false); // Para el switch "Aplica todos"
  const [yearRanges, setYearRanges] = useState([["", "", "Tu fuente", "<="]]); // Para los rangos de años

  const [operatorsStart, setOperatorsStart] = useState([]); // Operadores para "Desde"
  const [operatorsEnd, setOperatorsEnd] = useState([]);   // Operadores para "Hasta"

  // Función para cargar los modelos de acuerdo a la marca seleccionada
  const fetchModelos = async (marcaId) => {
    try {
      const response = await fetch(`/api/modelos?marca_id=${marcaId}`);
      const data = await response.json();
      setModelos(data);
    } catch (error) {
      console.error("Error cargando modelos", error);
    }
  };

  useEffect(() => {
    if (mode === "edit" && record) {
      setFormData(record);
      fetchModelos(record.marca_id); // Cargar los modelos si estamos en modo edición
    } else {
      setFormData({
        modelo_id: "",
        marca_id: "",
        kilometraje: "",
        meses: "",
        años: [], // Resetea el campo años a un array vacío
      });
      setModelos([]); // Limpiar modelos si es un nuevo registro
    }
  }, [mode, record]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Manejar cambios en los select (marca y modelo)
  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    if (name === "marca_id") {
      fetchModelos(value); // Si cambia la marca, cargar los modelos correspondientes
    }
  };

  // Cambiar el valor del switch
  const handleSwitchChange = () => {
    setIsAll(!isAll);
    if (isAll) {
      setYearRanges([["", "", "Tu fuente", "<="]]); // Si el switch está activado, se usa un solo rango
    }
  };

  // Función para manejar el cambio en el rango de años
  const handleYearRangeChange = (range) => {
    setFormData({ ...formData, años: range });
  };

  // Agregar un nuevo rango de año
  const handleAddColumn = () => {
    setYearRanges([...yearRanges, ["", "", "Tu fuente", "<="]]);
  };

  // Eliminar una fila de año
  const handleRemoveColumn = (index) => {
    const newYearRanges = [...yearRanges];
    newYearRanges.splice(index, 1);
    setYearRanges(newYearRanges);
  };

  // Manejar el cambio en los inputs de año
  const handleYearChange = (e, index, position) => {
    const newYearRanges = [...yearRanges];
    newYearRanges[index][position] = e.target.value;
    setYearRanges(newYearRanges);
  };

  // Manejar el cambio en los operadores de "Desde"
  const handleOperatorStartChange = (index, value) => {
    const newOperatorsStart = [...operatorsStart];
    newOperatorsStart[index] = value;
    setOperatorsStart(newOperatorsStart);

    const newYearRanges = [...yearRanges];
    // Si el operador es "menor" (<), incrementamos el valor de "Desde"
    if (value === "<") {
      newYearRanges[index][0] = (parseInt(newYearRanges[index][0], 10) + 1).toString();
    }
    setYearRanges(newYearRanges);
  };

  // Manejar el cambio en los operadores de "Hasta"
  const handleOperatorEndChange = (index, value) => {
    const newOperatorsEnd = [...operatorsEnd];
    newOperatorsEnd[index] = value;
    setOperatorsEnd(newOperatorsEnd);

    const newYearRanges = [...yearRanges];
    // Si el operador es "mayor" (>), decrementamos el valor de "Hasta"
    if (value === ">") {
      newYearRanges[index][1] = (parseInt(newYearRanges[index][1], 10) - 1).toString();
    }
    setYearRanges(newYearRanges);
  };

  // Generar la cadena de rangos para enviar
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar los rangos de años y asignar valores predeterminados
    const ranges = yearRanges.map(([start, end]) => {
      // Si "start" está vacío, asignamos "0001"
      const validStart = start || "0001"; 
      // Si "end" está vacío, asignamos "9999"
      const validEnd = end || "9999"; 
      return `${validStart}-${validEnd}`;  // No concatenamos en una cadena extra, solo un array
    });
    
    // Pasa los valores de modelo_id, marca_id, kilometraje, meses, y años
    onSave({
      modelo_id: formData.modelo_id,
      marca_id: formData.marca_id,
      kilometraje: formData.kilometraje,
      meses: formData.meses,
      años: ranges, // Ahora enviamos el array de rangos directamente
    });
    
    onOpenChange(false); // Cierra el diálogo después de guardar
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar Registro" : "Nuevo Registro"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            <div>
              <label>Marca</label>
              <Select
                name="marca_id"
                value={formData.marca_id}
                onValueChange={(value) => handleSelectChange("marca_id", value)}
                className="w-full"
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map((marca) => (
                    <SelectItem key={marca.id} value={String(marca.id)}>
                      {marca.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label>Modelo</label>
              <Select
                name="modelo_id"
                value={formData.modelo_id}
                onValueChange={(value) => handleSelectChange("modelo_id", value)}
                className="w-full"
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((modelo) => (
                    <SelectItem key={modelo.id} value={String(modelo.id)}>
                      {modelo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label>Kilometraje</label>
              <Input
                type="number"
                name="kilometraje"
                value={formData.kilometraje}
                onChange={handleChange}
                className="w-full"
                required
              />
            </div>

            <div>
              <label>Meses</label>
              <Input
                type="number"
                name="meses"
                value={formData.meses}
                onChange={handleChange}
                className="w-full"
                required
              />
            </div>

            <div>
              <label>Años</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label>Aplica todos los rangos:</label>
                  <Switch
                    checked={isAll}
                    onCheckedChange={handleSwitchChange}
                    className="ml-2"
                  />
                </div>

                {isAll ? (
                  <Input
                    type="text"
                    value="" // Dejar vacío cuando no hay valor
                    disabled
                    className="w-full"
                  />
                ) : (
                  <>
                    {yearRanges.map((range, index) => (
                      <div key={index} className="flex space-x-2">
                        <Input
                          type="number"
                          value={range[0] || ""}
                          onChange={(e) => handleYearChange(e, index, 0)}
                          placeholder="Desde"
                          className="w-1/4"
                          min="0001"
                          max="9999"
                        />
                        <Select
                          value={operatorsStart[index] || "<="}
                          onValueChange={(value) => handleOperatorStartChange(index, value)}
                          className="w-1/4"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Operador" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<=">≤</SelectItem>
                            <SelectItem value="<" >menor</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={range[2] || "Tu fuente"}
                          disabled
                          className="w-1/6"
                        />
                        <Select
                          value={operatorsEnd[index] || "<="}
                          onValueChange={(value) => handleOperatorEndChange(index, value)}
                          className="w-1/4"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Operador" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<=">≤</SelectItem>
                            <SelectItem value=">" >mayor</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={range[1] || ""}
                          onChange={(e) => handleYearChange(e, index, 1)}
                          placeholder="Hasta"
                          className="w-1/4"
                          min="0001"
                          max="9999"
                        />
                        <Button type="button" onClick={() => handleRemoveColumn(index)}>
                          (-)
                        </Button>
                        <Button type="button" onClick={handleAddColumn}>
                          (+)
                        </Button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">Guardar</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AlgoritmoVisitaDialog;