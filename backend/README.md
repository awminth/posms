# OmniPOS Backend

Layered Express + MySQL API for the multi-branch POS system.

## Structure

```
backend/
├── server.ts              # listen only
├── app.ts                 # express + routes + static dist
├── config/                # env + db pool
├── routes/                # path → controller
├── controllers/           # req/res
├── services/              # business logic + SQL
├── middlewares/           # errors
├── utils/                 # mappers, helpers
├── database/              # schema + seeds
└── scripts/               # migrate, prepare-dist
```

## Local development

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

`npm run dev` starts **API + frontend Vite HMR** together via `concurrently`.

- API: `http://localhost:7031`
- UI: `http://localhost:7030`

## Env (`backend/.env`)

```
BACKEND_PORT=7031
FRONTEND_PORT=7030
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=...
DB_NAME=mt_posms
```

## Login (seed users)

| Username | PIN | Password demo | Role |
|----------|-----|---------------|------|
| superadmin | 1234 | admin123 | SUPER_ADMIN |
| manager_downtown | 5678 | admin123 | BRANCH_MANAGER |
| cashier_thiri | 1111 | admin123 | CASHIER |

## Production (SplitDeploy)

```bash
cd backend
npm run build   # builds frontend → backend/dist
npm start       # single Express process (API + static)
```
