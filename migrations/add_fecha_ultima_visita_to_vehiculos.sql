-- Agregar columna fecha_ultima_visita a la tabla vehiculos
-- Fecha: 2026-02-20
-- Descripción: Almacena la fecha de la última visita del vehículo al taller

ALTER TABLE vehiculos 
ADD COLUMN fecha_ultima_visita DATE NULL AFTER kilometraje;

-- Opcional: agregar un índice si se necesita filtrar por esta fecha frecuentemente
-- CREATE INDEX idx_vehiculos_fecha_visita ON vehiculos(fecha_ultima_visita);
