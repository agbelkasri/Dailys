# GAP Daily Update — Setup Guide

## Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (free Spark plan is sufficient)
- A Microsoft Azure AD app registration (for Microsoft SSO)
- A SendGrid account (free tier: 100 emails/day)

---

## Step 1: Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `gap-daily-update`)
3. Enable the following services in the Firebase console:
   - **Firestore Database** → Start in Production mode
   - **Realtime Database** → Start in Locked mode → choose US region
   - **Authentication** → Sign-in providers → Microsoft → Enable
   - **Hosting** → Get started
   - **Functions** → Get started (requires Blaze pay-as-you-go plan for Cloud Functions)

---

## Step 2: Configure Microsoft SSO in Firebase Auth

1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Name: `GAP Daily Update`
4. Supported account types: **Accounts in this organizational directory only**
5. Redirect URI: Web → `https://YOUR_PROJECT.firebaseapp.com/__/auth/handler`
6. After creating, note:
   - **Application (client) ID** → this is your `VITE_AZURE_TENANT_ID` (actually client ID)
   - **Directory (tenant) ID** → also needed
7. Go to **Certificates & secrets** → **New client secret** → copy the value
8. Back in Firebase Console → Authentication → Microsoft provider:
   - Paste your Azure **Application (client) ID** as the OAuth client ID
   - Paste the client secret
   - Copy the **OAuth redirect URI** shown in Firebase → paste back into Azure app redirect URIs

---

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Fill in all values from Firebase Console → Project Settings → Your Apps

---

## Step 4: Update .firebaserc

Edit `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID` with your actual Firebase project ID.

---

## Step 5: Seed the Email Distribution List

Run this once in the Firebase console (Firestore → Add document):
- Collection: `config`
- Document ID: `emailSettings`
- Fields:
  - `recipients` (array of strings): add all executive email addresses

---

## Step 6: Set Cloud Function Environment Variables

```bash
# Install Firebase CLI and log in
firebase login

# Set SendGrid API key
firebase functions:secrets:set SENDGRID_API_KEY
# Paste your SendGrid API key when prompted

# Set the from email address
firebase functions:config:set email.from="dailyreport@yourcompany.com"
```

---

## Step 7: Install Functions Dependencies

```bash
cd functions
npm install
cd ..
```

---

## Step 8: Deploy

```bash
# Deploy everything
firebase deploy

# Or deploy pieces individually:
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only database
firebase deploy --only functions
```

---

## Step 9: Run Locally (Development)

```bash
# Start the Vite dev server
npm run dev

# In a separate terminal, start Firebase emulators
firebase emulators:start
```

The app will be at http://localhost:5173

---

## Daily Operation

- **New reports**: Created automatically at midnight (America/Detroit timezone) by the Cloud Function. If a user opens the app before midnight on a new day, the report is also created automatically client-side as a fallback.

- **5 PM email**: The Cloud Function runs at 5 PM (America/Detroit) automatically. It generates a PDF and emails all recipients in `config/emailSettings`. After sending, the report is locked (read-only).

- **Historical reports**: Use the ◀ ▶ navigation in the header to browse past dates. Historical reports are read-only.

- **Export**: Use **Export Excel** to download an .xlsx file. Use **Print PDF** to print or save as PDF from the browser.

---

## Responsible Parties / Sections

The 18 sections are defined in `src/constants/sections.js`. To change a responsible party name or add/remove sections, edit that file (and the duplicate in `functions/constants/sections.js`).

Current sections and owners:
| Section | Owner |
|---|---|
| EHS | Nicole |
| Staffing Issues | Nicole |
| Current Year Program EOP | Nicole |
| Prem. Freight / Customer Notes | Michelle |
| On Time Delivery | Michelle |
| Customer Invty Status | Michelle |
| SERVICE | Michele |
| Supplier Issues | Jeff Potter |
| Labor / Overtime | John W |
| Daily Efficiency / Daily OEE | John W |
| Downtime Analysis | John W |
| Operations Update - Critical Issues | John W |
| MFG Mishit Reports | John W |
| Housekeeping | John W |
| Change Overs | John W |
| TOOLING | Scott |
| Maintenance | Diego |
| Quality Concerns | Yvonne |
