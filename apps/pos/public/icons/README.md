# Iconos PWA

Este directorio contiene los iconos necesarios para la Progressive Web App.

## Iconos Generados

✅ Los iconos PWA ya han sido generados automáticamente:
- `icon-192x192.png` - Icono PWA 192x192 (requerido)
- `icon-512x512.png` - Icono PWA 512x512 (requerido)
- `apple-touch-icon.png` - Icono iOS 180x180 (recomendado)

## Regenerar Iconos

Si necesitas regenerar los iconos (por ejemplo, después de actualizar el logo), ejecuta:

```bash
pnpm run generate-pwa-icons
```

Este script usa Sharp para generar los iconos desde `public/logo/favicon/favicon-48x48.png`.

## Generación Manual (Alternativas)

Si prefieres generar los iconos manualmente:

### Opción 1: Usar herramienta online
- Visita https://www.pwabuilder.com/imageGenerator
- Sube el logo desde `public/logo/logo-completo/pos-logo-horizontal.png`
- Descarga los iconos generados

### Opción 2: Usar ImageMagick (CLI)
```bash
# Desde el logo existente
convert public/logo/favicon/favicon-48x48.png -resize 192x192 public/icons/icon-192x192.png
convert public/logo/favicon/favicon-48x48.png -resize 512x512 public/icons/icon-512x512.png
convert public/logo/favicon/favicon-48x48.png -resize 180x180 public/icons/apple-touch-icon.png
```

### Opción 3: Usar herramientas de diseño
- Abre el logo en Figma/Photoshop/GIMP
- Exporta en los tamaños requeridos
- Asegúrate de que sean cuadrados y tengan buen contraste

## Notas Importantes

- Los iconos deben ser cuadrados (misma altura y anchura)
- El icono maskable debe tener padding seguro (80% del área central)
- Los iconos generados automáticamente tienen fondo blanco para mejor visibilidad
- Optimiza las imágenes para reducir tamaño de archivo si es necesario
