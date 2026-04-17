Deploy the reservation system to Cloudflare.

Run these steps in order:

1. Deploy the Worker (API backend) by running `cd worker && npx wrangler deploy` from the project root
2. Deploy the frontend by running `cd frontend && npm run build` then `npx wrangler pages deploy frontend/dist --project-name=reservation` from the project root

After both succeed, report:
- Worker URL: https://reservation-worker.fcwu-tw.workers.dev
- Pages URL: https://reservation-c7j.pages.dev
