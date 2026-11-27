# ORCA Artifacts

**Tus páginas vivas y tableros en una sola app instalable.** ORCA Artifacts reúne, organiza y muestra las
páginas, registros y tableros que tu equipo (o tus agentes de IA) mantienen al día. Se instala en el teléfono y
en la computadora, funciona sin conexión y cada pantalla está en español e inglés.

[English](README.md) · MIT · funciona sola o con [ORCA](https://github.com/Operio-work/orca)

- **Todo en un lugar:** búsqueda (`/`), paleta Ctrl/⌘+K, fijados por persona, colecciones y etiquetas compartidas.
- **Tableros desde un archivo JSON:** cifras, barras, tendencias y tablas con filtros y clic para filtrar.
  Créalos en la app (`/d/new`) o escribe el archivo. Ver [docs/dashboards.md](docs/dashboards.md).
- **Páginas vivas:** cualquier carpeta con `index.html` se sirve tal cual, con su propia tarjeta.
- **PWA instalable:** aviso de instalación, lectura sin conexión de las últimas páginas abiertas, accesos directos.
- **Con tu marca:** nombre, logo, enlaces a notas y colores en un solo archivo de configuración.

## Inicio rápido

```sh
git clone https://github.com/Operio-work/orca-artifacts.git
cd orca-artifacts
pnpm install
pnpm dev            # http://localhost:5199 con la biblioteca demo
```

Producción:

```sh
pnpm build
ARTIFACTS_LIBRARY=/ruta/a/tu/biblioteca PORT=5199 ORIGIN=https://artifacts.ejemplo.com node build
```

`ecosystem.config.cjs` es un ejemplo para PM2. Pon un proxy con HTTPS delante: instalar y el modo sin conexión
necesitan HTTPS (o `localhost`).

## Tu biblioteca

La app muestra una carpeta, la **biblioteca**. La demo está en `demo-library/`; cópiala a `library/` para empezar.

```
library/
  orca-artifacts.config.json   nombre, logo, zona horaria, enlaces a notas (todo opcional)
  site/<slug>/index.html       páginas vivas (se sirven como archivos); meta.json = título, descripción, etiquetas
  site/assets/                 CSS compartido de tus páginas
  dashboards/<slug>.json       tableros; dashboards/data/*.json = sus datos
  state/organize.json          colecciones y etiquetas (lo escribe la app)
  var/                         fijados por persona (lo escribe la app; fuera de git)
```

El formato de `orca-artifacts.config.json` y todas las variables (`ARTIFACTS_AUTH`, `ARTIFACTS_STORAGE`, …)
están en el [README en inglés](README.md#your-library).

La app **no tiene inicio de sesión propio**. Déjala en `localhost`, en una red privada (Tailscale funciona bien)
o detrás de un proxy que pida acceso. Quien pueda abrirla puede editar tableros y colecciones.

## Con ORCA

[ORCA](https://github.com/Operio-work/orca) corre tus agentes de IA; ORCA Artifacts es donde se ve su trabajo.
Hoy una rutina de ORCA puede escribir el archivo de datos de un tablero y aparece al recargar. Lo que sigue:
publicar desde ORCA, borradores que esperan tu aprobación y una pestaña Artifacts dentro del panel de ORCA.

**ORCA Managed by Operio** aloja ambos por ti, con roles de equipo, enlaces para compartir, alertas, respaldos y
tableros hechos para tu negocio: [make.operio.work](https://make.operio.work).

## Licencia

MIT © Operio
