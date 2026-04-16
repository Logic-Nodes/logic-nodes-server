# IoTParkers Node Backend (Clean Architecture)

Migracion base de Java Spring Boot a Node.js manteniendo los mismos endpoints REST y preparada para PostgreSQL.

## Stack

- Node.js 20+
- Express
- PostgreSQL (`pg`)
- Arquitectura: Clean Architecture por contextos

## Estructura

```text
src/
	app.js
	server.js
	contexts/
		alerts/
			application/
			interfaces/http/
		dashboard/
			application/
			interfaces/http/
		fleet/
			application/
			interfaces/http/
		iam/
			application/
			infrastructure/persistence/
			interfaces/http/
		merchants/
			application/
			interfaces/http/
		monitoring/
			application/
			interfaces/http/
		profiles/
			application/
			interfaces/http/
		trip/
			application/
			interfaces/http/
	shared/
		application/
		config/
		infrastructure/db/
		interfaces/http/
db/
	schema.sql
```

## Endpoints migrados

Se replicaron las rutas del backend Java bajo `/api/v1/*`:

- Alerts: `/api/v1/alerts`
- Incidents: `/api/v1/incidents`
- Notifications: `/api/v1/notifications`
- Analytics dashboard: `/api/v1/analytics`
- Fleet devices: `/api/v1/fleet/devices`
- Fleet vehicles: `/api/v1/fleet/vehicles`
- Authentication: `/api/v1/authentication`
- Roles: `/api/v1/roles`
- Users: `/api/v1/users`
- Employees: `/api/v1/employees`
- Merchants: `/api/v1/merchants`
- Monitoring sessions: `/api/v1/monitoring`
- Telemetry: `/api/v1/telemetry`
- Profiles: `/api/v1/profiles`
- Delivery orders: `/api/v1/delivery-orders`
- Origin points: `/api/v1/origin-points`
- Trips: `/api/v1/trips`

Tambien se agrego `GET /health`.

## Estado actual

La API ya no esta en modo `501`.

- Se migraron y conectaron rutas HTTP a servicios por contexto.
- Se implemento acceso a PostgreSQL para IAM, alerts, fleet, merchants, monitoring, profiles, trip y dashboard.
- Se mantiene la estructura clean architecture por contexto para seguir iterando sin romper contratos.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Instala dependencias:

```bash
npm install
```

3. Crea base de datos y aplica schema:

```bash
psql -U postgres -d iotparkers -f db/schema.sql
```

4. Levanta API:

```bash
npm run dev
```

## Siguiente fase recomendada

- Probar endpoints contra una BD real y ajustar validaciones de negocio.
- Agregar autenticacion/autorizacion por rol en rutas protegidas.
- Incorporar tests de integracion por contexto.
