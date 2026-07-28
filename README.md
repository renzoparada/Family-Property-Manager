# Family Property Manager

Sistema de administración financiera para propiedades familiares alquiladas
(Airbnb, Booking, Google Vacation Rentals o alquiler directo). Piensa en él
como un pequeño ERP financiero — pero simple, para personas sin formación
contable.

Este repositorio contiene la aplicación **web responsive** (Next.js +
Supabase). Es la base sobre la que se puede construir la app móvil y las
integraciones descritas en la visión completa del producto (ver
[Roadmap](#roadmap) más abajo).

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend / base de datos**: Supabase (PostgreSQL + Auth + Storage), con
  Row Level Security multi-tenant
- **Gráficos**: Recharts

## Módulos incluidos

- Multi-organización (una organización = una familia), multiusuario, con
  roles Administrador / Socio / Contador / Invitado (solo lectura)
- Multi-propiedad, con ambientes ilimitados y nombres editables
- Panel con KPIs del mes, utilidad acumulada, flujo de caja y balance por
  cuenta
- Reservas (Airbnb, Booking, Google, directo) con comisión y monto neto
- Gastos por categoría, propiedad, ambiente, método de pago y adjuntos
  (fotos, facturas, comprobantes, PDF, video, audio)
- Préstamos familiares como cuentas por pagar (no como gastos), con pagos
  parciales/totales e historial
- Inversiones de capital, separadas de los gastos operativos, con
  participación inicial (fija) + capital adicional aportado (informativo,
  nunca modifica las acciones originales)
- Caja y bancos con saldo inicial, movimientos y saldo actual
- Reportes por propiedad, categoría, plataforma y persona, con exportación
  a CSV
- Auditoría automática (quién, cuándo, qué cambió) vía triggers de Postgres

## Puesta en marcha

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica las migraciones SQL en `supabase/migrations/` (en orden) desde el
   SQL Editor del proyecto, o con la CLI de Supabase:

   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```

3. En **Authentication → Providers**, habilita Email y (opcional) Google.
4. Copia `.env.local.example` a `.env.local` y completa con la URL y la
   clave anónima de tu proyecto Supabase.
5. Instala dependencias y corre en desarrollo:

   ```bash
   npm install
   npm run dev
   ```

6. Abre `http://localhost:3000`, crea tu cuenta y sigue el flujo de
   onboarding para crear tu espacio familiar.

### Notas sobre el esquema

- Todas las tablas de negocio están protegidas con RLS: solo los miembros
  de una organización pueden leer/escribir sus datos, y el rol `invitado`
  es de solo lectura.
- Cada movimiento de caja/banco vive en la tabla `transactions`; los
  módulos de reservas, gastos, inversiones y préstamos insertan ahí su
  movimiento correspondiente para que el saldo de cada cuenta sea siempre
  `saldo_inicial + Σ movimientos`.
- Los adjuntos se guardan en el bucket privado `attachments` de Supabase
  Storage, con rutas `organization_id/entity_type/entity_id/archivo` y
  políticas RLS que restringen el acceso a miembros de la organización.

## Roadmap (no incluido en esta base)

Fuera del alcance de esta primera versión, pero contemplado en el diseño
del esquema para agregarse después sin romper lo existente:

- Apps nativas iOS/Android (Flutter o React Native) consumiendo el mismo
  backend de Supabase
- OCR de facturas, clasificación automática de gastos, detección de gastos
  duplicados/sospechosos y un asistente conversacional (IA)
- Integración con las APIs de Airbnb, Booking.com y Google Vacation Rentals
  para importar reservas automáticamente, y sincronización de calendarios
- Pasarelas de pago y conciliación bancaria automática
- Firma electrónica para aprobar gastos/inversiones extraordinarias
- Exportación a PDF/Excel y reportes automáticos programados
- KPIs de ADR / RevPAR / ocupación por ambiente
- API abierta para integraciones contables (QuickBooks, Xero, ERPs
  locales)
