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

## 🌐 Custom Domain Setup (Live & Verified)

Your custom domain **`punnagaitoysfancy.in`** is live and connected via GoDaddy:

1. **Domain Registrar**: GoDaddy DNS Management
2. **Configured DNS Records**:
   - **`CNAME` Record**:
     - Host / Name: `www`
     - Points to / Data: `punnagai-toy-store.onrender.com`
     - TTL: `1/2 Hour` (or 1 Hour)
   - **`A` Record**:
     - Host / Name: `@`
     - Points to / Data: `216.24.57.1` (Render Apex IP)
     - TTL: `1/2 Hour` (or 1 Hour)
3. **SSL/TLS & Canonical Redirection**:
   - Render automatically provisions and renews free edge SSL certificates.
   - `https://www.punnagaitoysfancy.in` automatically redirects via canonical 301 to `https://punnagaitoysfancy.in`.

---

## 🔄 Automatic Deployments

Every time you push new commits to GitHub (`git push`), Render will automatically trigger a new deployment without any manual action needed.
