# Cómo crear una red nueva para el visor

1. Copia `datos/plantilla-red-visor.xlsx` (hojas LEEME, CAPAS, INTERACCIONES, NODOS, ARISTAS, RED) y llena tus datos.
   `datos/red-pot-kennedy-visor.xlsx` es el ejemplo completo (58 nodos, 383 relaciones).
2. Copia `index.html` con otro nombre (p. ej. `red2.html`).
3. Genera los datos dentro de esa página (con Python, sin dependencias extra salvo `openpyxl`):

   ```bash
   pip install openpyxl
   python tools/build-red.py datos/mi-red.xlsx red2.html
   ```

   Sin argumentos usa `datos/red-pot-kennedy-visor.xlsx` y `index.html`.
   (Existe también `tools/build-red.js` con la misma función si prefieres Node: `npm i exceljs`).
4. Sube los cambios a GitHub. La página queda en `https://<usuario>.github.io/humedalburro/red2.html`.

Los datos quedan embebidos en el HTML (entre `<!--RED_DATA_START-->` y `<!--RED_DATA_END-->`),
así que la página no depende de ningún otro archivo de datos.

Nota: el mapa del modo Territorio está calibrado para Kennedy (lat 4.611–4.661, lon −74.178 a −74.132).
