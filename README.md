# Portal del Departamento de Justicia · Old State RP

Portal de gestión integral para el Departamento de Justicia del servidor de rol **Old State RP**, basado en la estructura funcional de la postulación oficial y en los módulos reales del sistema del Departamento de Policía del servidor (`pcpd.es`), adaptados a Justicia. Incluye login diferenciado para empleados gubernamentales y ciudadanos.

> Contenido ficticio para un servidor de rol. No representa ninguna institución real.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Auth.js / NextAuth v5 (credenciales + JWT, roles)
- Prisma 7 + SQLite (adapter `@prisma/adapter-libsql`)

## Puesta en marcha

```bash
npm install
npm run db:seed   # crea las cuentas de demo y datos de ejemplo
npm run dev
```

Abre http://localhost:4173 (puerto fijo definido en `package.json`; cámbialo ahí si también está ocupado).

Si necesitas rehacer la base de datos desde cero:

```bash
npx prisma migrate reset
npm run db:seed
```

## Cuenta inicial

El seed (`npm run db:seed`) solo crea **una** cuenta real, la del Juez Supremo, más el catálogo de medallas (tomado de la postulación real). Los tipos de trámite y de plus **no** se precargan: sin al menos un tipo de trámite activo, nadie tiene nada que enviar, así que el Juez Supremo debe darlos de alta primero desde `/dashboard/solicitudes` (trámites) y `/dashboard/pluses` (pluses). No hay empleados ni ciudadanos de ejemplo: todo el personal se da de alta de verdad desde `/dashboard/empleados` o con `/contratar` en Discord, y los ciudadanos se registran ellos mismos en `/registro`.

| Rango | Correo | Contraseña |
| --- | --- | --- |
| Juez Supremo (Henry Morgan, placa #4158) | juezsupremo@doj.es | supremo123 |

Cambia esta contraseña desde Configuración en cuanto entres por primera vez.

## Estructura funcional (rangos)

Sin exceso de rangos, tal como en la postulación, más el SAPD (policía) como departamento aparte:

| Rango | Rol administrativo | Funciones principales |
| --- | --- | --- |
| Juez Supremo | Propietario | Firma final, gestión del dinero del estado, laudos mayores, gestiona las cuentas del personal |
| Juez de Distrito | Gerente | Presidir juicios regulares, resolver órdenes judiciales y publicar resoluciones |
| Fiscal General | Empleado Senior | Acusación, liderar investigaciones de oficio con la policía, resolver órdenes judiciales |
| Abogado (antes "Defensor Público") | Empleado Regular | Defensa civil, redactar contratos (Registro Civil y Notaría) |
| Seguridad (antes "Alguacil") | Empleado Especial | Mantenimiento del orden, seguridad de la corte |
| Encargado SAPD | Jefatura SAPD | Da de alta y gestiona a sus propios agentes SAPD, solicita órdenes judiciales |
| SAPD | Agente SAPD | Acceso al portal, solicita órdenes judiciales |

El rango de cada empleado se asigna automáticamente a partir de su cuenta (nunca se escribe a mano) y se muestra en su **placa** dentro del panel de inicio, junto con horas de la semana, contratos pendientes y faltas activas. Un cambio de rango se refleja al instante en la sesión activa del empleado (no hace falta cerrar sesión) y sincroniza el rol/apodo de Discord en ambos sentidos.

### Sueldo por rango, no por persona

La tarifa/hora se define por rango (Juez Supremo → Nóminas → "Tarifas por rango"), nunca a mano por empleado. El mínimo es $1/h: nunca se puede cobrar $0. La nómina de la semana en curso se recalcula en vivo cada vez que se abre Nóminas, según las horas fichadas hasta ese momento (no solo al cierre del lunes).

### Permisos por rango

Además del Juez Supremo (que siempre tiene acceso total), cualquier otro rango puede recibir permisos delegados desde `/dashboard/permisos`: gestionar empleados, postulaciones, catálogos, faltas, exámenes, nóminas, condecoraciones y resolución de órdenes judiciales. Por defecto ningún rango tiene permisos delegados.

## Estructura de páginas

- `/` — landing pública
- `/login` (con casilla "Mantener sesión iniciada"), `/registro` — acceso y alta de ciudadanos
- `/portal/*` — área ciudadana: mis trámites, mis solicitudes, **Mis Juicios** (audiencias pendientes y resoluciones de los casos en los que el ciudadano está vinculado como parte), **Postulaciones** (postular a un rango del Departamento, una por rango a la vez, con preguntas configurables por el Juez Supremo), perfil (incluye ID de Discord)

- `/dashboard/*` — área de personal del Departamento y del SAPD:
  - **Inicio** — placa del empleado con rango automático
  - **Mi turno** — Fichaje de entrada/salida de servicio, con un cronómetro en vivo (con segundos) del turno actual y de las horas de la semana
  - **Trabajo** — Informes, **Trámites y Solicitudes** (bandeja única: un trámite enviado por un ciudadano o un empleado llega aquí para revisarse, junto a las solicitudes/quejas/apelaciones; cada trámite nuevo se anuncia también en el canal de Discord `logs-tramites`), Certificado de Antecedentes (genera texto `/do` listo para copiar y pegar en el juego)
  - **Judicial** — Expedientes (con partes civiles vinculadas), Audiencias, Registro Civil y Notaría (compraventas, testamentos, matrimonios), **Órdenes judiciales** (SAPD/Fiscalía las solicita, un Juez o Fiscal General las resuelve) y **Resoluciones** (fallos y comunicados oficiales) — todos con campos de texto largo para descripciones y notas extensas
  - **SAPD** (solo Encargado SAPD) — alta y gestión de sus propios agentes, siempre con rango SAPD
  - **Mi perfil** — Contrato laboral (empieza *pendiente de firma*, con todos los datos y firma verificada con tu contraseña), Nóminas (se generan solas cada semana según horas fichadas × tarifa/hora del rango, con acuse "Estoy de acuerdo"; el importe de la semana en curso se actualiza en vivo), Mis Pluses (bonificaciones), Faltas (con "Reconocer" y "Solicitar Falta" — cualquier empleado puede reportar a otro; quien tenga el permiso correspondiente aprueba/rechaza)
  - **Comunicación** — Quejas y Sugerencias internas del personal
  - **Recursos** — Escala Jerárquica (roster por rango), Condecoraciones, **Exámenes** (el Juez Supremo crea plantillas reutilizables con sus preguntas y luego las asigna a quien haga falta, por separado), Ranking de horas semanales, Configuración (contraseña + ID de Discord)
  - **Administración** (Juez Supremo, o rangos con permiso delegado) — **Empleados**: alta de cuentas, cambiar rango (instantáneo), cambiar placa, inhabilitar temporal o permanentemente, resetear contraseña (se envía por Discord, nunca se muestra en la web), subir foto de perfil, eliminar cuenta (falla a propósito si el empleado tiene expedientes/audiencias a su nombre), asignar contrato si no se creó bien, ajustar horas fichadas (± minutos con motivo), imponer faltas; **Usuarios** (solo Juez Supremo): gestión de las cuentas ciudadanas (civiles) registradas, distinta de Empleados; **Postulaciones**: revisar y aprobar/rechazar, y configurar sus preguntas; **Permisos** (solo Juez Supremo): qué puede gestionar cada rango; gestión de contratos laborales/nóminas (incl. tarifas por rango)/pluses/exámenes/condecoraciones y los **catálogos de trámites y pluses** (con alcance interno/externo)
  - Al pie del menú: tu foto de perfil (o iniciales), nombre, rango (como distintivo) y un punto de estado — pulsa para alternar **Disponible/Ocupado**

El middleware (`src/middleware.ts`) protege ambas áreas según el rol de la sesión (JWT) y redirige automáticamente a `/portal` o `/dashboard` según corresponda. Cada acción de servidor valida el rol en el propio servidor (no solo se oculta el enlace en el menú). Si la sesión expira o la cuenta ya no existe, se cierra sesión y se redirige a `/login` automáticamente — nunca se deja a alguien dentro del panel con una sesión inválida.

## Bot de Discord

El bot se llama **Alfonso Miler** (se autorenombra al arrancar) y actúa como secretario del Departamento: firma con ese nombre al final de cada notificación. Vive en `bot/index.ts`, se conecta con `discord.js`, comparte la misma base de datos que la web (vía Prisma) y expone dos comandos:

- **`/contratar`** — solo Administrador. Pide usuario de Discord, nombre, apellidos, DNI, rango (Juez de Distrito, Fiscal General, Abogado o Seguridad — el Juez Supremo no se puede crear por bot, solo hay uno), cargo opcional. Crea la cuenta (con contraseña aleatoria), el contrato laboral inicial (pendiente de firma, con la tarifa de su rango) y la primera nómina en $0, y envía un mensaje privado con la URL del portal, correo y contraseña. Si tiene los MD cerrados, avisa en el canal (en privado, solo tú lo ves).
- **`/encargado-sapd`** — solo Administrador. Da de alta a un usuario como Encargado SAPD (usuario, nombre, apellidos, DNI) y le notifica sus credenciales por Discord; desde el portal, ese Encargado ya puede dar de alta a sus propios agentes SAPD.

Además, cada lunes a las 00:05 el propio bot cierra la nómina de la semana anterior de todo el personal de Justicia (horas fichadas × tarifa de su rango) y abre la nueva en $0 — también se puede forzar desde la web (Nóminas → "Ejecutar cierre semanal ahora"). Cada 15 minutos revisa quién lleva más de 4h fichado sin cerrar turno y lo menciona en el canal de avisos, por si se le olvidó cerrar el fichaje.

### Rangos, apodos y roles de Discord (sincronización bidireccional)

Al arrancar, el bot crea en Discord un rol por cada rango del sistema (incluyendo Civil) si no existe ya. Al contratar a alguien (por la web o por `/contratar`), o al cambiarle el rango, se le asigna el rol de Discord correspondiente y se le pone de apodo "Nombre Apellidos - #Placa"; a quien pasa a ser Fiscal General se le concede además el rol de grupo "Fiscales". Si en la web se cambia el rango de un empleado, se refleja en Discord al instante (vía API REST, sin depender de que el bot esté vivo); si en Discord alguien cambia manualmente los roles de rango de un miembro vinculado, la web actualiza su rango — esto último requiere el intent privilegiado **Server Members Intent** activado en el [Discord Developer Portal](https://discord.com/developers/applications) (tu app → Bot → Privileged Gateway Intents). Si no está activado, el bot lo detecta, avisa por consola y sigue funcionando con normalidad salvo por esa sincronización Discord → Web.

### Panel de verificación de ciudadanos

El bot publica (una sola vez) un panel con un botón "Verificarme como ciudadano" en el canal de verificación configurado; al pulsarlo, cualquier miembro recibe el rol de Ciudadano/Verificado — ese rol es independiente de los rangos y nunca se retira al cambiar de rango.

### Canales de logs (auditoría)

El bot crea, bajo la categoría de logs configurada, un canal de texto por tipo de evento (`logs-empleados`, `logs-nominas`, `logs-faltas`, `logs-postulaciones`, `logs-permisos`, `logs-fichajes`, `logs-tramites`) y publica ahí cada alta, cambio de rango, pago, falta, postulación, ajuste de horas o trámite nuevo — para que el staff lo vea sin tener que entrar al portal. Los canales se crean solos la primera vez que hace falta cada uno (no depende de que el bot esté vivo en ese instante).

### Notificaciones automáticas por Discord

Cada vez que cambia el estado de un trámite, solicitud, falta, plus, examen, nómina, contrato, postulación u orden judicial, el usuario afectado recibe un mensaje directo firmado por Alfonso Miler si tiene su `discordId` vinculado (lo vincula el Juez Supremo al crear la cuenta, el propio bot, o el usuario desde su perfil — también los ciudadanos, desde `/portal/perfil`). Esto **no** depende de que el proceso del bot esté corriendo: la web llama directamente a la API REST de Discord con el token (`src/lib/discord-notify.ts`, `discord-roles.ts`, `discord-logs.ts`), así que funciona incluso si `doj-bot` estuviera caído. Si un usuario no tiene Discord vinculado, simplemente no se le notifica (no falla la acción).

**Invita el bot a tu servidor** con este enlace (necesita permisos de gestionar roles, canales y miembros para todo lo anterior):

```
https://discord.com/api/oauth2/authorize?client_id=1541360852169396324&permissions=268435472&scope=bot%20applications.commands
```

Si el bot está en más de un servidor, define `DISCORD_GUILD_ID` en `.env` para indicar cuál gestionar (si solo está en uno, lo detecta solo).

Ejecutarlo suelto (sin PM2): `npm run bot`

## Mantener la web y el bot siempre activos (PM2)

Ambos procesos corren bajo [PM2](https://pm2.keymetrics.io/), que los reinicia solos si se caen y los vuelve a levantar cuando inicias sesión en Windows:

```bash
npm run build              # build de producción de la web
pm2 start ecosystem.config.js
pm2 save                   # guarda la lista para poder "resucitarla"
```

El arranque automático al iniciar sesión ya está registrado (`pm2-startup install`, visible en el Registro de Windows bajo `HKCU\...\Run\PM2`). Comandos útiles:

- `pm2 list` — ver estado de `doj-web` y `doj-bot`
- `pm2 logs` — ver logs en vivo
- `pm2 restart doj-web` / `pm2 restart doj-bot` — reiniciar tras un cambio de código (recuerda `npm run build` primero para la web)
- `pm2 save` — vuelve a guardar la lista después de cualquier cambio (`start`, `restart`, `delete`) para que sobreviva a un reinicio

## Alternativa: hostear el bot en Discloud

En vez de (o además de) PM2 en este equipo, el bot puede correr 24/7 en [Discloud](https://discloud.com). Como `bot/index.ts` importa código compartido con la web (`src/lib/discord-roles.ts`, `discord-logs.ts`, `discord-scanner.ts`, `discord-notify.ts`, `nominas-auto.ts`, `labels.ts`, `password.ts`) y el cliente de Prisma (`src/generated/prisma`), se sube el repo completo (Discloud solo instancia el proceso que le digas con `START`, no hace falta que sea "solo el bot").

Ya está preparado: `discloud.config` (`MAIN=bot/discloud-entry.js` — un archivo `.js` vacío solo para que Discloud detecte el entorno; la ejecución real la hace `START=npm run bot`, que corre `tsx bot/index.ts`) y `.discloudignore` (excluye `node_modules`, `.next`, `dev.db`, `public/uploads`, etc., para que la subida sea liviana: ~270 KB en vez de cientos de MB).

1. Consigue tu token de API de Discloud (dashboard → tu perfil → pestaña "API Key").
2. Logueate con el CLI (te pide el token por consola):
   ```bash
   npx discloud-cli login
   ```
3. Configura en el panel de Discloud las mismas variables del `.env` que usa el bot: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `APP_URL` (con la URL de Vercel si la web ya está publicada). La base de datos remota (Turso) es la misma que usa la web — así comparten datos igual que con PM2.
4. Sube y arranca:
   ```bash
   npx discloud-cli app upload
   ```
5. `npx discloud-cli app status doj-bot` para ver que quedó online, `npx discloud-cli app logs doj-bot` para ver los logs en vivo.

Si corre en Discloud, apaga el `doj-bot` de PM2 en este equipo (`pm2 delete doj-bot`) para no tener dos instancias del bot conectadas a la vez (Discord las rechazaría / duplicaría cada acción).

> **Nota (03/09/2026):** subir por CLI funciona (tamaño, RAM y `MAIN` ya verificados), pero la creación del contenedor está fallando del lado de Discloud con `[Discloud API: 411] Ocorreu um erro ao configurar o ambiente Lannumber` — un bug de su infraestructura, no de esta config. Reportado a su soporte; probar de nuevo más adelante.

## Alternativa: hostear el bot en Northflank

Otra opción con cómputo siempre activo gratis (sin "dormir" como Render), vía contenedor Docker: [Northflank](https://northflank.com). Pide tarjeta al crear la cuenta solo como verificación anti-abuso — no cobra nada en el plan Sandbox.

Ya está preparado: `Dockerfile` (instala el repo completo, corre `prisma generate` y arranca con `npm run bot`) y `.dockerignore`.

1. Creá una cuenta en northflank.com y conectá tu GitHub (el repo `adrianmiratech/doj`).
2. Dashboard → New Service → **Combined service** (build + deploy) → elegí el repo → Northflank detecta el `Dockerfile` solo.
3. Como es un bot (no un sitio web), no hace falta exponer ningún puerto — decíselo al asistente si te lo pregunta.
4. En "Environment variables" del servicio, cargá las mismas del `.env`: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `APP_URL`.
5. Deploy. Los logs se ven en vivo desde la pestaña "Logs" del servicio.

Igual que con Discloud: si corre acá, apagá el `doj-bot` de PM2 local (`pm2 delete doj-bot`) para que no haya dos bots conectados a la vez.

### Control del bot desde el panel web

El panel `/dashboard/seguridad` (solo Juez Supremo) muestra si el bot está en línea, sus últimos logs y permite reiniciarlo, hablando directo con la API de Northflank (no depende de que el proceso del bot esté conectado). Para que funcione en producción hace falta cargar en Vercel (Production) las mismas variables que ya están en `.env` local: `NORTHFLANK_API_TOKEN` (token de API de la cuenta/equipo de Northflank), `NORTHFLANK_PROJECT_ID` y `NORTHFLANK_SERVICE_ID` (los ID del proyecto/servicio, visibles en la URL del dashboard de Northflank o vía `npx @northflank/cli list projects` / `list services`).

## Publicar en producción (GitHub + Vercel)

El bot de Discord (PM2) sigue corriendo en este equipo; solo la web (Next.js) se despliega en Vercel. Ambos deben apuntar a la **misma base de datos**, así que el primer paso es sacarla de este disco:

1. **Base de datos remota (Turso).** SQLite local (`file:./dev.db`) no sirve en Vercel: el filesystem ahí es de solo lectura y no persiste. Crea una base en [app.turso.tech](https://app.turso.tech) (usa `@prisma/adapter-libsql`, así que no hace falta cambiar ORM) con **"Upload SQLite File"** subiendo `dev.db` directamente, así arranca con los datos reales ya cargados. Sacá la `DATABASE_URL` (`libsql://...`) y un token desde "Connect" en el panel de la base.

   ⚠️ `prisma migrate deploy` **no** funciona contra Turso: el motor de Prisma solo reconoce URLs `file:`, no `libsql://` (da error `P1013`). Para futuras migraciones (después de `prisma migrate dev` en local), aplícalas a la base remota con `npm run db:migrate-remoto` (script propio en `scripts/db-migrate-remoto.ts` que sí sabe hablar con Turso).
2. **Actualiza el `.env` de este equipo** con esa misma `DATABASE_URL`/`DATABASE_AUTH_TOKEN` y reinicia el bot (`pm2 restart doj-bot --update-env`) para que web y bot compartan datos.
3. **Sube el repo a GitHub**: crea un repo vacío en github.com y desde esta carpeta:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin master
   ```
4. **Importa el repo en Vercel** (vercel.com → Add New → Project → importa el repo de GitHub). En "Environment Variables" añade todas las de `.env.example`: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET` (genera uno nuevo con `npx auth secret`, distinto al local), `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, y `APP_URL` con la URL que te asigne Vercel.
5. **Activa Vercel Blob** para las evidencias/certificados/fotos: en el proyecto ya desplegado, Storage → Create Database → Blob → conéctalo al proyecto. Vercel inyecta `BLOB_READ_WRITE_TOKEN` automáticamente, no hay que copiarlo a mano.
6. Tras el primer deploy, actualiza `APP_URL` en el `.env` de este equipo (el que usa el bot para los mensajes de bienvenida/contratación) con el dominio real de Vercel, y reinicia el bot.

`prisma generate` corre solo en cada `npm install` (script `postinstall`), así que Vercel genera el cliente de Prisma sin pasos extra.

## Notas técnicas

- El cliente de Prisma se genera en `src/generated/prisma` (ignorado por git); vuelve a generarse con `npx prisma generate` si hace falta.
- El middleware usa una configuración de auth "edge-safe" (`src/auth.config.ts`) sin Prisma, ya que el runtime Edge no soporta módulos de Node; la configuración completa con el proveedor de credenciales vive en `src/auth.ts`.
- La cuota semanal mínima de horas (objetivo de la placa) es de 5h, configurable en `src/lib/labels.ts` (`OBJETIVO_HORAS_SEMANA`).
- El Ranking y las horas semanales se calculan en vivo a partir de los fichajes, no son datos falsos almacenados aparte.
- Cambia `AUTH_SECRET` en `.env` antes de desplegar a producción.
- Sesión: sin "Mantener sesión iniciada" caduca a las 8h; con la casilla marcada dura 30 días. La cookie en sí siempre tiene el mismo Max-Age largo, pero el propio JWT lleva grabada su expiración real (`src/auth.config.ts`, override de `jwt.encode`), así que una sesión no recordada deja de ser válida en el servidor aunque la cookie siga físicamente en el navegador.
- `trustHost: true` en `src/auth.config.ts` es necesario para que Auth.js acepte peticiones en modo producción (`next start`) sin un dominio público; si algún día lo publicas detrás de un dominio real, configura `AUTH_URL` en vez de depender de esto.
- El token del bot y los secretos de Discord viven solo en `.env` (ignorado por git). Si el token se filtra alguna vez, regenéralo en el Discord Developer Portal.

## Simplificaciones conscientes frente a `pcpd.es`

Para no inventar comportamiento que no puedo verificar, dejé fuera (o simplifiqué) algunas cosas del sistema real de referencia:

- No hay tema claro/oscuro ni panel de notificaciones por Discord granular (solo se guarda el ID de Discord); el portal es siempre oscuro.
- Las Condecoraciones no se calculan automáticamente a partir de la actividad real (arrestos, audiencias...): el Juez Supremo ajusta el progreso manualmente.
- No hay "Canal de Fichaje" (feed en vivo de quién está de servicio) ni Almacén de pruebas, por no ser propios de Justicia.
- El SAPD tiene acceso al portal y puede solicitar órdenes judiciales, pero no tiene nómina/fichaje/contrato laboral propio (no se pidió y no quise inventar un sistema de pagas para un departamento que no es Justicia).
- Órdenes judiciales y Resoluciones son deliberadamente sencillas (tipo, objetivo/título, motivo/contenido y estado) — no replican el flujo completo de un caso judicial real, solo lo esencial para pedir/aprobar una orden o publicar un fallo.
