# Backend listo para producción — checklist operativo

**API:** `https://logic-nodes-server.onrender.com` · **Swagger:** `/docs/`  
Merge [PR #4](https://github.com/Logic-Nodes/logic-nodes-server/pull/4) (`feat/billing-contract`) → `main` antes de confiar en prod.

---

## 1. Pre-requisitos

- [ ] PR #4 en `main` + deploy Render `Live`
- [ ] Acceso Render (web service + Postgres)
- [ ] `DB_*` vinculados al servicio
- [ ] Proyecto Firebase (mismo que mobile)
- [ ] Mobile PR #3 en `main`; API base = prod o `--dart-define`

---

## 2. Variables de entorno en Render

| Variable | ¿Req? | Notas |
|----------|-------|--------|
| `NODE_ENV`, `PORT` | Sí | `production`; PORT del dashboard |
| `DB_HOST`…`DB_PASSWORD` | Sí | Postgres Render; **no** `DB_SSL=false` |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Sí | Secret fuerte; no `change-me` |
| `CORS_ORIGINS` | Sí | URLs exactas, coma-separadas |
| `ENABLE_BACKGROUND_JOBS` | Rec. | `true` (disconnect IoT + renovación) |
| `IOT_*`, `IOT_JOB_*`, `RENEWAL_*`, `SUBSCRIPTION_NOTICE_DAYS` | No | Defaults OK |
| `DEMO_SEED_EMAIL`, `DEMO_SEED_PASSWORD` | No | Override del seed |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Push | §4; no `…_PATH` en Render |
| `MQTT_*` | No | Sin URL = sin MQTT |
| `STRIPE_SECRET_KEY` | No | Stub sin clave |

---

## 3. Comandos post-deploy (Shell Render)

Tras servicio `Live` y env guardadas.

```bash
# BD prod ya existente (habitual)
npm run migrate:billing && npm run seed:demo

# BD nueva / vacía
npm run migrate && npm run seed:demo
```

Sin `seed:demo`: trips/analytics demo rotos (E2E local **14/18** en trips hasta seed).

---

## 4. `FIREBASE_SERVICE_ACCOUNT_JSON`

1. Firebase → Settings → Service accounts → Generate new private key.
2. Local: `cat key.json | jq -c .` → una línea.
3. Render → `FIREBASE_SERVICE_ACCOUNT_JSON` → pegar completo → redeploy.

Sin variable: tokens se registran; **no** hay envío FCM.

---

## 5. Smoke

| Request | OK |
|---------|-----|
| `GET /health` | 200 |
| `GET /api/v1/plans` | 200 (no 500 `plans` missing) |
| `GET /api/v1/trips/public/DEMO7K9M2` | 200 post-seed |
| `GET /api/v1/subscription/user-id/4` | 200 post-seed |

---

## 6. Credenciales demo

| | |
|--|--|
| Email | `demo.mobile.2026@omnitrack.io` |
| Password | `DemoMobile123!` |
| Tracking | `DEMO7K9M2` |

`flutter run --dart-define=DEMO_AUTO_LOGIN=true --dart-define=DEMO_TOUR=true`

---

## 7. Opcional / fuera de alcance

Stripe real · MQTT sin broker · push en simulador iOS · contact landing · PDF server · RBAC estricto · Maps server.

---

## 8. Orden de ejecución

1. Merge PR #4 → deploy.
2. Revisar env (§2).
3. `migrate:billing` o `migrate`.
4. `seed:demo`.
5. Firebase JSON + redeploy (si push).
6. Smoke §5.
7. Mobile login §6.

---

## 9. Troubleshooting

- **Billing 500** → `migrate:billing` (tabla `plans` / columna `renewal`).
- **Tracking 404** → `seed:demo`.
- **Sin push** → `FIREBASE_SERVICE_ACCOUNT_JSON` + dispositivo físico.
- **CORS** → origen en `CORS_ORIGINS`, redeploy.
- **Jobs parados** → `ENABLE_BACKGROUND_JOBS=true`.

Ref: `.env.example`, `docs/BACKEND-GAP-RESOLUTION.md`, mobile `INTEGRATION-GAP-REPORT.md`.
