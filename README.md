# humedalburro - Red Territorial de Kennedy (POT)

## Descripción general

Este proyecto visualiza el **Sistema Socioecológico del Humedal Burro** en la localidad de Kennedy, Bogotá. Es una aplicación interactiva que muestra:

- **58 nodos** de especies y elementos del ecosistema
- **383 relaciones** documentadas entre nodos (77 troncales + 306 derivadas por cercanía y entidad compartida)
- **Relaciones interconectadas** entre síntomas, efectos y componentes territoriales
- **Datos del censo SIGAU** de la Secretaría Distrital de Ambiente de Bogotá
- **Visualizaciones 3D** y análisis de capas territoriales

## Estructura del repositorio

| Directorio | Descripción |
|------------|-------------|
| `datos/` | Datos crudos y procesados del censo SIGAU |
| `assets/` | Recursos gráficos, fotos y referencias |
| `tools/` | Scripts Python para generar visualizaciones |
| `*.html` | Módulos interactivos (3D, corte, jardín, etc.) |
| `compiled_taxa.json` | Base de datos con 90+ especies registradas |
| `apply_*.py` | Scripts de actualización y mejora CSS |

## Características principales

- **Modo interactivo**: Exploración de redes, tooltip de nodos, filtrado por categorías
- **Visualización 3D**: Renderizado con Three.js y OrbitControls
- **Conclusiones automáticas**: 6 hallazgos clave extraídos de la red
- **Modo compacto**: Interfaz optimizada para vistas territoriales
- **Modales informativos**: Hubs de especies, sub-redes, recorridos guiados

## Datos fuente

Los datos provienen del:
- **POT Decreto 555 de 2021** (Piano de Ordenamiento Territorial)
- **SDP / EAAB / SDA** (Secretaría Distrital de Ambiente)
- **Plan de Manejo Ambiental del Humedal El Burro**
- **Censo SIGAU Kennedy** (Sistema de Información Geográfica Ambiental Urbano)

## Uso

Ejecutar los scripts Python para generar los archivos HTML finales:

```bash
python build_html.py
python apply_full_updates.py
```

Esto generará `modulo-11-garden.html` y `index.html` con los datos completos y mejoras de interfaz.

## Tecnologías utilizadas

- **Three.js** para renderizado 3D
- **GSAP** para animaciones
- **Font Awesome** para iconografía
- **Google Fonts** (IBM Plex Mono, Inter)
- **CSS personalizado** con variables temáticas (colores tierra-kennedy)