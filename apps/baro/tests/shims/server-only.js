// Stub para entornos de test (jsdom). En producción `server-only` exporta vía
// la condición `react-server` un módulo vacío, y en client-side throwa para
// detectar acoplamientos accidentales. Acá replicamos el comportamiento RSC
// (no-op) para que los tests puedan importar módulos server-side benignos.
export {}
