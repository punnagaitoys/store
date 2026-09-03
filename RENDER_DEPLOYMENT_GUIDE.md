# 🚀 Free Render Deployment Guide: Punnagai Toy Store

This repository is fully configured for **100% Free Hosting** on [Render](https://render.com) with automatic global CDN, free SSL (HTTPS), zero cold-start delays, and automated deployments on every Git push.

---

## ⚡ Option 1: 1-Click Render Blueprint (Recommended — 2 Minutes)

Since this repository contains a [`render.yaml`](./render.yaml) configuration file, Render can set up everything automatically (build commands, publish directory, security headers, clean URL rewrites).

1. **Sign in to Render:**
   - Go to [dashboard.render.com](https://dashboard.render.com/) and sign up or log in using your **GitHub account**.
2. **Deploy Blueprint:**
   - Click the **New +** button in the top navigation and select **Blueprint**.
   - Connect your GitHub repository: `punnagaitoys/store` (or your repository fork).
   - Render will read [`render.yaml`](./render.yaml) and automatically detect the service name (`punnagai-toy-store`) and static runtime.
3. **Click Apply:**
   - Render will deploy the site within 30–60 seconds.
   - You will receive a live URL: `https://punnagai-toy-store.onrender.com`.

---

## 🛠️ Option 2: Manual Static Site Setup (Step-by-Step)

If you prefer to configure the service manually in the Render dashboard:

1. **Log in to Render Dashboard:**
   - Open [dashboard.render.com](https://dashboard.render.com/).
2. **Create New Static Site:**
   - Click the **New +** button at the top right and select **Static Site**.
3. **Connect Your GitHub Repository:**
   - Under *Connect a repository*, choose **GitHub**.
   - If prompted, grant Render permission to access your repository: `punnagaitoys/store`.
   - Select the repository and click **Connect**.
4. **Configure Settings:**
   - **Name:** `punnagai-toy-store` (or any name you choose)
   - **Branch:** `main` (or `MZ-Main` / current default branch)
   - **Root Directory:** *(leave blank / default)*
   - **Build Command:** `npm run build` (or leave empty)
   - **Publish Directory:** `.` (single dot for root directory)
5. **Create Static Site:**
   - Click **Create Static Site**.
   - Render will immediately pull the code, verify the publish directory, and issue an SSL certificate.
6. **Live URL:**
   - Your website is now live at `https://[your-app-name].onrender.com`.

---

## 🌐 Custom Domain Setup (Optional)

To connect your custom domain (e.g. `punnagaitoystore.com` or `punnagaitoys.in`):

1. In your Render Dashboard, click into your Static Site.
2. Go to **Settings** > **Custom Domains**.
3. Click **Add Custom Domain** and enter your domain name (e.g., `www.punnagaitoystore.com` and `punnagaitoystore.com`).
4. Update DNS records at your domain registrar (GoDaddy, Cloudflare, Namecheap, Spaceship):
   - **CNAME record** for `www` pointing to `[your-app-name].onrender.com`.
   - **ANAME/ALIAS or A record** for root domain pointing to Render's provided IP.
5. Render will automatically issue and renew a free Let's Encrypt SSL certificate within a few minutes.

---

## 🔄 Automatic Deployments

Every time you push new commits to GitHub (`git push`), Render will automatically trigger a new deployment without any manual action needed.
