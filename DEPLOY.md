# LastWar Coordinate Map Free Deployment

Recommended free setup:

- Render Free: runs the Node server.
- Supabase Free: stores the shared used-supply list.

## 1. Create Supabase table

1. Create a Supabase project.
2. Open `SQL Editor`.
3. Run the contents of `supabase_schema.sql`.
4. In Supabase project settings, copy:
   - Project URL
   - `service_role` key

The service role key must only be stored in the server environment variables. Do not put it in frontend code.

## 2. Deploy to Render Free

1. Push this folder to GitHub.
2. Render -> New -> Web Service.
3. Connect the GitHub repo.
4. Use these settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
5. Add environment variables:
   - `ADMIN_CODE`: your admin password
   - `SUPABASE_URL`: your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: your Supabase service role key
   - `SUPABASE_TABLE`: `used_coordinates`

Render will provide a public URL after deploy.

## 3. Seed existing used list

After deployment:

1. Open the deployed URL.
2. Enter the admin code.
3. Paste the current used coordinates into `사용 목록 대량 추가`.
4. Click `사용 추가`.

The list is then saved in Supabase and shared with all viewers.

## Notes

- Regular users can view, search, pan, and zoom.
- Editing requires the admin code.
- Render Free may sleep after inactivity, so the first visit after a while can be slow.
- Supabase keeps the used list even if Render restarts or redeploys.

## Local run

Without Supabase, local file storage is used:

```bash
ADMIN_CODE="1234" npm start
```

With Supabase:

```bash
ADMIN_CODE="1234" \
SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY" \
npm start
```
