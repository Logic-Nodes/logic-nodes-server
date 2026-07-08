# Backend — Plan de cierre vs informe TB1

> Repo: `logic-nodes-server`  
> API prod: `https://logic-nodes-server.onrender.com`  
> Relacionado: [`logic-nodes-mobile/docs/INTEGRATION-GAP-REPORT.md`](../logic-nodes-mobile/docs/INTEGRATION-GAP-REPORT.md)

## Comandos operativos (Render / local)

```bash
# 1. Migración segura (schema + billing + features)
npm run migrate

# 2. Solo billing en prod (sin DROP)
npm run migrate:billing

# 3. Datos demo para mobile/web
npm run seed:demo
```

Variables nuevas en `.env.example`: jobs, MQTT, Stripe, FCM.

---

## Estado tras esta rama

| ID | Bloqueante | Estado |
|----|------------|--------|
| B-01–B-05 | Billing 500 | ✅ Script `001_billing_safe.sql` + `migrate:billing` |
| B-06–B-08 | Analytics contrato | ✅ `/analytics/trips` y `/alerts` devuelven arrays dashboard |
| B-09 | PATCH trips | ✅ `PATCH /api/v1/trips/:id` |
| B-10 | Tracking público | ✅ `tracking_code` + `GET /trips/public/:code` |
| B-11 | Job desconexión IoT | ✅ Job cada 5 min (configurable) |
| B-12 | MQTT | ✅ Subscriber si `MQTT_BROKER_URL` está definido |
| B-13 | Stripe payment-method | 🟡 `POST /subscription/:id/payment-method` (guarda PM; Stripe real con `STRIPE_SECRET_KEY`) |
| B-14 | FCM push | 🟡 `POST /device-tokens` + push simulado / hook Firebase |
| B-15 | Cron renovación | ✅ Job cada 12h (configurable) |
| B-28 | Seed demo | ✅ `npm run seed:demo` |

---

## Despliegue en Render (checklist)

1. Merge `feat/billing-contract` → `main`
2. En shell de Render o CI: `npm run migrate:billing && npm run seed:demo`
3. Verificar:
   - `GET /api/v1/plans` → 200
   - `GET /api/v1/subscription/user-id/4` → 200
   - `GET /api/v1/trips/public/DEMO7K9M2` → 200
4. Opcional: configurar `MQTT_BROKER_URL`, `STRIPE_SECRET_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`

---

## Pendiente menor (P3)

- RBAC middleware por rol (B-19)
- `POST /api/v1/contact` landing (B-16)
- Integración Stripe real (SetupIntent)
- Integración Firebase Admin real
- PDF server-side (B-17) — mobile/web ya generan en cliente
