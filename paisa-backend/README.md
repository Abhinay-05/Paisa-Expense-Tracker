# Paise backend (Node + Express + MongoDB)

## 1. MongoDB Atlas (free)
1. Create a free cluster at mongodb.com/atlas.
2. Database Access -> add a user with a password.
3. Network Access -> add IP `0.0.0.0/0` (Render's IPs change).
4. Connect -> Drivers -> copy the connection string (`mongodb+srv://...`).

## 2. Deploy on Render
1. Push this folder to a GitHub repo (Render deploys from Git).
2. Render -> New -> Web Service -> pick the repo.
3. Build command: `npm install`  Start command: `npm start`
4. Environment variables:
   - `MONGODB_URI` = your Atlas string
   - `APP_PASSWORD` = a long password you choose (the app asks for it once per device)
   - `FRONTEND_URL` = your Vercel URL (add after step 3 of the frontend; no trailing slash)
5. Deploy and copy the URL, e.g. `https://paise-api.onrender.com`.

Note: Render's free tier sleeps after ~15 min idle; the first request can take up to a minute.
Check `https://YOUR-URL/health` returns `{"ok":true}`.
