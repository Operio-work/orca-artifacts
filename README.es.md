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

La app **no tiene inicio de sesión propio**. Déjala en `localhost`, en una red privada (Tailscale funciona bien),
detrás de un proxy que pida acceso, o deja que ORCA inicie la sesión (`ARTIFACTS_AUTH=orca`). Fuera del modo `orca`,
quien pueda abrirla puede editar tableros y colecciones.

**Alertas en el teléfono:** un aviso cuando hay algo nuevo por aprobar o cuando una cifra de un tablero cruza un
límite (`alerts` en [docs/dashboards.md](docs/dashboards.md)). **Compartir a la app:** en Android, comparte un
enlace, texto, imagen o PDF desde cualquier app y llega como borrador. Sube `BODY_SIZE_LIMIT=8M` para archivos grandes.

## Con ORCA

[ORCA](https://github.com/Operio-work/orca) corre tus agentes de IA; ORCA Artifacts es donde se ve su trabajo.
Los agentes publican páginas y tableros con `operio-orca artifact publish`; llegan como **borradores** a
**Por aprobar** (con un número en el ícono de la app) y nadie los ve en la lista hasta que una persona los
aprueba. Las rutinas actualizan cifras con `operio-orca artifact data`. Se activa con `ARTIFACTS_PUBLISH_TOKEN`;
detalles en [docs/publishing.md](docs/publishing.md).

**Una sola sesión.** Con `ARTIFACTS_AUTH=orca` nadie entra dos veces: el botón **Artifacts** del panel de ORCA
abre la app con un pase de un solo uso, y la sesión dura 30 días. Detrás de ORCA Host (ORCA alojado) cada petición
lleva a la persona y su rol; `client_viewer` puede ver y fijar, pero no aprobar ni editar.

**ORCA Managed by Operio** aloja ambos por ti, con roles de equipo, enlaces para compartir, alertas, respaldos y
tableros hechos para tu negocio: [make.operio.work](https://make.operio.work).

## Licencia

MIT © Operio
