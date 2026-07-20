-- Seed catálogo de módulos (requeridos para registro con empresa)
INSERT INTO "modules" ("id", "key", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'workify', 'Workify', 'Módulo de RRHH y gestión de personal', true, NOW(), NOW()),
  (gen_random_uuid(), 'pos', 'Pos', 'Módulo de ventas y tiendas', true, NOW(), NOW()),
  (gen_random_uuid(), 'techservices', 'Tech Services', 'Módulo de servicios técnicos', true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
