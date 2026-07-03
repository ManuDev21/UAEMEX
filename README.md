# Sistema Web de Gestion de Activos Institucionales

Aplicacion full-stack para el control de inventario de bienes institucionales:
registro y seguimiento de activos, escaneo de codigos de barras/QR, importacion y
exportacion masiva en Excel, historial de movimientos, auditoria, control de
acceso por roles y un dashboard con graficas.

## Stack tecnologico

**Backend**
- NestJS 10 + GraphQL (Apollo) + REST (para Excel)
- TypeORM + MySQL / MariaDB
- Autenticacion JWT (access + refresh) con Passport y bcrypt
- Control de acceso por roles (ADMIN, SUPERVISOR, CONSULTA)
- ExcelJS (importar/exportar), Multer (subida de archivos)
- Helmet + Throttler (rate limiting)

**Frontend**
- React 19 + Vite 6 + TypeScript
- Apollo Client (GraphQL) + Axios (descargas/subidas Excel)
- TailwindCSS, Framer Motion, Lucide Icons, SweetAlert2
- Recharts (graficas), html5-qrcode (escaner), React Hook Form + Zod
- Modo claro/oscuro y PWA (instalable / offline)

## Estructura

```
Proyecto/
  backend/      # API NestJS (GraphQL + REST)
  frontend/     # SPA React + Vite (PWA)
```

## Requisitos previos

- Node.js 18+ (recomendado 20/22)
- MySQL 8 o MariaDB 10.4+

## 1. Base de datos

Crea la base de datos (el backend la sincroniza automaticamente con
`DB_SYNCHRONIZE=true`, o puedes usar el script SQL de referencia):

```sql
CREATE DATABASE asset_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Esquema de referencia: `backend/database/schema.sql`

## 2. Backend

```bash
cd backend
copy .env.example .env      # Windows (o: cp .env.example .env)
# Edita .env con tus credenciales de MySQL
npm install
npm run seed                # Crea roles, usuarios y datos de ejemplo
npm run start:dev           # Levanta la API en http://localhost:3000/graphql
```

GraphQL Playground: `http://localhost:3000/graphql`

### Endpoints REST (Excel)
- `POST /excel/import`   (multipart `file`) — importa/actualiza bienes (ADMIN)
- `GET  /excel/export`   — descarga el inventario (ADMIN, SUPERVISOR)
- `GET  /excel/template` — descarga la plantilla de carga

## 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

## Usuarios de prueba (tras `npm run seed`)

| Rol         | Correo                       | Contrasena   |
|-------------|------------------------------|--------------|
| ADMIN       | admin@universidad.edu        | Admin123     |
| SUPERVISOR  | supervisor@universidad.edu   | Super123     |
| CONSULTA    | consulta@universidad.edu     | Consulta123  |

## Roles y permisos

- **ADMIN**: acceso total (usuarios, catalogos, bienes, importar, auditoria).
- **SUPERVISOR**: consulta y edicion de bienes, exportar Excel, responsables.
- **CONSULTA**: solo lectura del inventario, dashboard y escaner.

## Funcionalidades clave

- **Dashboard**: totales, valor del inventario, graficas por departamento,
  categoria, estado y movimientos mensuales.
- **Bienes**: CRUD con busqueda, filtros, paginacion e historial de cambios.
- **Escaner**: lectura de codigos de barras/QR con la camara o busqueda manual.
- **Excel**: importacion masiva con upsert por codigo (crea departamentos,
  categorias y responsables automaticamente) y exportacion del inventario.
- **Auditoria**: registro de inicios de sesion y operaciones CRUD/Excel.
- **Seguridad**: JWT con refresh automatico, guards por rol, validacion de
  entradas y rate limiting.

## Scripts utiles

**Backend**
- `npm run start:dev` — desarrollo con recarga
- `npm run build` — compilacion
- `npm run seed` — datos iniciales

**Frontend**
- `npm run dev` — desarrollo
- `npm run build` — build de produccion (PWA)
- `npm run preview` — previsualizar el build

## Variables de entorno (backend)

Ver `backend/.env.example`. Cambia los secretos JWT en produccion.
# UAEMEX
# UAEMEX
