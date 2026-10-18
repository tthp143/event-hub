# Event Hub

## Configuration

The app needs a reachable PostgreSQL database for registration, login, and other database-backed features.

1. Copy `.env.example` to `.env.local` in the project root.
2. In Neon, copy the full PostgreSQL connection string from your database's connection details and paste it as the `DATABASE_URL` value. Replace the placeholder completely; do not leave `USER`, `PASSWORD`, `HOST`, or `DATABASE` in the value.
3. Set `AUTH_SECRET` to a long, random secret and choose `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
4. Restart the development server after changing environment variables.

Do not commit `.env.local` or share its secrets. The app displays a configuration error if `DATABASE_URL` is missing or still contains the example placeholder.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For production, configure the same environment variables in your hosting provider's project settings.
