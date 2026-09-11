# Firebase & Google Cloud Console Manual Guide

This guide gives you straightforward, click-by-click instructions to manage and verify your **Punnagai Toy Store** Firebase project directly in your web browser.

No coding or terminal commands are required. All steps use the standard **Firebase Console** and **Google Cloud Console** web interfaces.

---

## Quick Console Links

- **Firebase Console:** [https://console.firebase.google.com](https://console.firebase.google.com)
- **Google Cloud Console:** [https://console.cloud.google.com](https://console.cloud.google.com)

---

## 1. How to Check Your Firebase Web App Connection & Firestore Native Mode

> **Plain English Glossary:**
>
> - **SDK (Software Development Kit):** The pre-built library of files that connects your website's pages to Google's Firebase servers.
> - **Firestore Native Mode:** The modern, recommended database engine that gives you real-time data sync, offline support, and granular security rules (unlike the older "Datastore mode").

### A. Confirm Your Registered Web App

1. Open the [Firebase Console](https://console.firebase.google.com) and click on your project (**punnagai-toy-store**).
2. In the top-left sidebar, click the **Gear icon (⚙️)** right next to **Project Overview**.
3. Click **Project settings** from the dropdown menu.
4. Stay on the **General** tab and scroll down to the section titled **Your apps**.
5. You will see your registered web app (marked with a `</>` icon).
6. Under **SDK setup and configuration**, select the radio button for **CDN**.
7. Look at the web URLs displayed inside the script tags:
   - You should see URLs containing `10.14.1` (or your current stable version).
   - If you ever see an older version listed here, this panel confirms what snippet Google recommends.

### B. Confirm Firestore is in "Native Mode"

1. In the left-hand navigation menu of the Firebase Console, expand **Build** and click **Firestore Database**.
2. If your database opens with three columns: **Collection** → **Document** → **Fields**, your database is running in **Native Mode**.
3. To double-check in Google Cloud Console:
   - Open the [Google Cloud Console](https://console.cloud.google.com).
   - In the top blue bar, make sure your project is selected in the project picker dropdown.
   - Click the **Navigation menu (☰)** in the top-left corner.
   - Scroll down to **Databases** and click **Firestore**.
   - If your database is in Native Mode, you will see a banner or heading that says: **Firestore in Native mode**.

---

## 2. How to Verify Firebase is Linked to the Correct Google Cloud Project

> **Plain English Glossary:**
>
> - **Google Cloud Project:** The underlying Google enterprise account that actually powers Firebase. Every Firebase project is automatically a Google Cloud project with the exact same Project ID.
> - **IAM (Identity and Access Management):** The Google Cloud permissions dashboard where you control who has admin or viewer access to your resources.

### Step 1: Find Your Project ID in Firebase

1. In the [Firebase Console](https://console.firebase.google.com), open your project.
2. Click the **Gear icon (⚙️)** next to **Project Overview** > **Project settings**.
3. In the **General** tab under the **Project** card, look at the following rows:
   - **Project name** (e.g., `punnagai-toy-store`)
   - **Project ID** (e.g., `punnagai-toy-store` or similar unique identifier)
   - **Project number** (a 12-digit number)
4. Keep this **Project ID** in mind.

### Step 2: Cross-Check in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Look at the top blue bar. Next to "Google Cloud", click the **Project selector dropdown**.
3. Ensure the project selected matches the exact **Project ID** from Firebase.
4. Click the **Navigation menu (☰)** in the top-left corner > **IAM & Admin** > **Settings**.
5. Confirm that the **Project ID** and **Project number** match word-for-word with Firebase.
6. Click **IAM** in the left sub-menu:
   - Verify that your personal/business Google account is listed with the Role **Owner** or **Firebase Admin**.
   - Verify that standard service accounts (like `firebase-adminsdk` and `appspot.gserviceaccount.com`) are present with their default automated roles.

---

## 3. How to Check and Safely Update Firestore Security Rules

> **Plain English Glossary:**
>
> - **Security Rules:** The access control logic that decides who is allowed to read from or write to your database (for example, ensuring customers only edit their own orders and only store admins can change product prices).
> - **Rules Playground / Simulator:** A built-in safe testing tool in the console that lets you test if an action would be allowed or denied without modifying any real data.

### Step 1: View Active Security Rules

1. In the Firebase Console, expand **Build** in the left menu and click **Firestore Database**.
2. Click the **Rules** tab at the top of the page.
3. You will see the active rules text.
4. Above the editor, you will see the publication status (for example: _Published today at..._).

### Step 2: Test Rules Safely Before Publishing (Rules Simulator)

1. In the **Rules** tab, look for the **Rules Playground** button (or **Edit rules** panel).
2. Select a simulation type: **get**, **create**, or **update**.
3. Type a sample path to test (e.g., `orders/sample_order_123` or `products/sample_product_123`).
4. Toggle **Authenticated** on or off to simulate whether a logged-in user or a guest visitor is making the request.
5. Click **Run**.
6. A green banner will show **Simulated read/write allowed** or a red banner will show **Simulated read/write denied**.

### Step 3: View Past Rule Versions & Rollback

1. Look right above the rule text editor and click **Rules monitor** or **Version history**.
2. Firebase saves every version of rules you have ever published.
3. If an edit ever causes problems, select an earlier timestamp and click **Restore** (or copy-paste it back) and click **Publish**.

### Step 4: Publish Updates

1. When you edit the text in the **Rules** tab, the blue **Publish** button in the top right will turn active.
2. Click **Publish**. The new rules take effect globally across all users in less than 60 seconds.

---

## 4. How to Check for Live vs. Cached Data & Confirm Database Region

> **Plain English Glossary:**
>
> - **Cached Data:** Data stored temporarily in your computer's browser memory so pages load faster. Sometimes browser cache can show old prices or old product names even after you changed them in the database.
> - **Database Region:** The physical data center location (e.g., Mumbai `asia-south1` or US Central `us-central1`) where your database files reside.
> - **Database Instance:** The name of your database container. The standard default database in Firebase is always named `(default)`.

### A. Confirm Your Database Instance Name & Region

1. In the Firebase Console, go to **Build** > **Firestore Database**.
2. Click the **Data** tab.
3. Look directly above the first column ("Collection").
4. You will see a dropdown showing **(default)**. This confirms you are viewing the primary database instance.
5. Look just to the right of that dropdown, or click the **Usage** tab:
   - You will see the region displayed (e.g., `asia-south1 (Mumbai)`, `us-central1 (Iowa)`, or `nam5 (multi-region)`).

### B. Force-Refresh the Console Data Viewer (Bypass Stale Views)

1. If you just added a product or placed a test order on your website and do not see it in the console:
   - Do **not** just refresh the whole browser tab.
   - Look inside the Firestore viewer panel: at the top of the **Documents** column, click the small circular **Refresh / Reload list** icon.
   - To inspect a single document, click on the document ID; the right-hand **Fields** pane will fetch the fresh record directly from the server.
2. If your browser website itself is showing stale products:
   - Open your website in an **Incognito / Private Window** (which has zero cached data).
   - Or press **Ctrl + Shift + R** (Windows) / **Cmd + Shift + R** (Mac) on the website to force a hard reload that bypasses local browser cache.

---

## 5. How to Check, Regenerate, or Rotate Firebase API Keys

> **Plain English Glossary:**
>
> - **Firebase Web API Key:** A public identifier that tells Google which Firebase project your website belongs to. Unlike server passwords, a Firebase web API key is meant to be in your website's files; it is protected by your Firestore Security Rules and domain restrictions.
> - **Key Rotation:** Creating a new key and retiring an old one, commonly done as a security best practice if keys were exposed publicly.

### A. View Your Current Web App Config

1. In the Firebase Console, click the **Gear icon (⚙️)** > **Project settings**.
2. In the **General** tab, scroll down to **Your apps**.
3. Under your web app, look at the **SDK setup and configuration** section.
4. Click the **Config** radio button.
5. You will see your configuration keys:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### B. View, Restrict, or Rotate API Keys in Google Cloud Console

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Ensure your Project ID is selected at the top.
3. Under the **API Keys** table, look for the key labeled **Browser key (auto created by Firebase)** or **Firebase App Key**.
4. Click the pencil icon or the name of the key to open its settings:
   - **Set Website Restrictions:** Under **Application restrictions**, choose **Websites**. Under **Website restrictions**, add your live domain (e.g., `https://punnagaitoysfancy.in/*` and `https://www.punnagaitoysfancy.in/*`). This prevents unauthorized websites from using your API key.
5. **If You Need to Rotate / Create a New Key:**
   - In the top toolbar of the Credentials page, click **+ CREATE CREDENTIALS** > **API key**.
   - Copy your new API key.
   - Open your project environment file (`.env`) and update the `FIREBASE_API_KEY` setting.
   - Once your new key is working on your website, return to Google Cloud Console and click the **Trash icon (Delete)** next to the old key.

---

## 6. How to Check Firebase Hosting Deployment Status

> **Plain English Glossary:**
>
> - **Hosting Deployment / Release:** A published snapshot of your website files that Google distributes to fast CDN servers around the world.
> - **Rollback:** The ability to return your live website to a previous working version with a single click if a new deployment has a bug.

### Step 1: Open Release History

1. In the Firebase Console left menu, expand **Build** and click **Hosting**.
2. On the main dashboard, scroll down to the **Release history** table.
3. In this table you will see:
   - **Status:** Shows a green checkmark or label indicating **Current**.
   - **Deployed by:** Shows whether it was deployed by your email address, GitHub Actions, or Firebase CLI.
   - **Date & Time:** The exact timestamp the deployment went live.
   - **Files:** The total number of files in the deployed package.

### Step 2: Confirm Domains are Serving the Latest Release

1. At the top of the **Hosting** page, look under the **Domains** card.
2. Check your active domains:
   - `punnagai-toy-store.web.app` (default Google domain)
   - `punnagai-toy-store.firebaseapp.com` (default Google domain)
   - `punnagaitoysfancy.in` (custom domain, if connected)
3. Click the external link icon next to any domain to open it directly in a new tab and confirm the latest changes are visible.

### Step 3: Perform an Emergency Rollback (If Ever Needed)

1. In the **Release history** table, locate the previous version that was working properly.
2. Click the **Three vertical dots (⋮)** on the right side of that previous row.
3. Click **Roll back**.
4. Firebase will instantly switch your live visitors to that previous version without requiring any uploads.

---

## 7. How to Check Billing & Usage Quotas

> **Plain English Glossary:**
>
> - **Spark Plan (Free):** Google's free tier for Firebase. Includes 50,000 Firestore reads per day, 20,000 writes per day, and 1 GB of stored data for free.
> - **Blaze Plan (Pay-as-you-go):** Google's paid tier. You only pay if you exceed the free allowances. Required if you use Cloud Functions to talk to outside servers (like Razorpay or WhatsApp).
> - **Quota:** A daily or monthly maximum allowance of database queries or storage traffic. If you exceed a free quota, Firebase may show temporary read/write errors until the daily quota resets at midnight Pacific Time.

### Step 1: Check Your Current Plan

1. Look at the very bottom of the left-hand navigation sidebar in the Firebase Console.
2. In the bottom-left corner, you will see a badge that says either:
   - **Spark** (Free plan)
   - **Blaze** (Pay as you go)
3. Click **Upgrade** (or **Modify**) if you need to switch to Blaze to enable external webhooks for payments or WhatsApp notifications.

### Step 2: Check Firestore Reads, Writes & Deletes Usage

1. In the Firebase Console, go to **Build** > **Firestore Database**.
2. Click the **Usage** tab at the top.
3. You will see three large daily graphs:
   - **Reads:** Number of times documents were viewed by visitors.
   - **Writes:** Number of times orders, products, or reviews were saved or updated.
   - **Deletes:** Number of times records were removed.
4. If you are on the Spark free plan, check whether any bar is touching the red dotted daily limit line (50k reads / 20k writes).

### Step 3: Check Project-Wide Usage & Cost Details

1. Click the **Gear icon (⚙️)** > **Usage and billing**.
2. Click the **Details & settings** tab to inspect:
   - Bandwidth used by Firebase Hosting.
   - Cloud Storage bucket size used by toy images.
   - Number of Cloud Function executions.
3. Click the **Billing** tab to set a monthly budget alert (for example, receiving an email if usage ever exceeds ₹100 or $5).

---

## 8. Final Verification Checklist

Use this checklist to confirm that your console setup is fully verified and aligned with your store's codebase:

| Category                 | Verification Item                                                                                                 | Status |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------- | :----: |
| **Firestore Database**   | Database opens in **Native mode** under `Build` > `Firestore Database`                                            | `[ ]`  |
| **Firestore Instance**   | Primary database instance is labeled **(default)**                                                                | `[ ]`  |
| **Security Rules**       | Security rules in `Firestore` > `Rules` are published with recent timestamp                                       | `[ ]`  |
| **Composite Indexes**    | Under `Firestore` > `Indexes`, composite index for `reviews` is marked **Enabled**                                | `[ ]`  |
| **Google Cloud Link**    | `Project ID` in Firebase matches the active project in Google Cloud Console                                       | `[ ]`  |
| **Authorized Domains**   | Under `Authentication` > `Settings` > `Authorized domains`, your custom domain (`punnagaitoysfancy.in`) is listed | `[ ]`  |
| **Hosting Status**       | Under `Hosting` > `Release history`, the topmost release has a green **Current** badge                            | `[ ]`  |
| **Billing & Quota**      | Under `Usage and billing`, current usage is well within limits with no quota errors                               | `[ ]`  |
| **API Key Restrictions** | In Google Cloud `APIs & Services` > `Credentials`, web API key is restricted to your store domains                | `[ ]`  |
