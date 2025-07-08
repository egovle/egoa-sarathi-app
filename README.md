# Firebase Studio - IMPORTANT LOGIN FIX

This is a NextJS starter in Firebase Studio.

## Fixing Login on Your Live Website (The Definitive Guide)

If your login works in the local preview but fails on your live URL, it means your deployed app is using the wrong API keys. This guide will fix it permanently.

### Step 1: Find Your CORRECT Firebase Credentials

The API key at the top of your Project Settings is a **placeholder**. You need the keys from your specific **Web App**.

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and select your `egoasarthi` project.
2.  Click the **gear icon ⚙️** > **Project settings**.
3.  On the "General" tab, **scroll down** to the **"Your apps"** card.
4.  Find your web app and select the **"Config"** option under "SDK setup and configuration".
5.  You will now see the `firebaseConfig` object. These are your **real, active credentials**.

### Step 2: Update the `apphosting.yaml` File

Now, you will put these real credentials into the configuration file for your live website.

1.  In the Studio file explorer on the left, open the `apphosting.yaml` file. (It is in the root of your project, not in the `src` folder).
2.  Carefully copy and paste **each value** from the `firebaseConfig` object in the Firebase Console into the matching field in `apphosting.yaml`.

    **Example `apphosting.yaml`:**
    ```yaml
    # In apphosting.yaml

    runConfig:
      # ... other settings
      environmentVariables:
        NEXT_PUBLIC_FIREBASE_API_KEY: "PASTE_YOUR_REAL_API_KEY_HERE"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "PASTE_YOUR_AUTH_DOMAIN_HERE"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "PASTE_YOUR_PROJECT_ID_HERE"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "PASTE_YOUR_STORAGE_BUCKET_HERE"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "PASTE_YOUR_SENDER_ID_HERE"
        NEXT_PUBLIC_FIREBASE_APP_ID: "PASTE_YOUR_APP_ID_HERE"
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "PASTE_YOUR_MEASUREMENT_ID_HERE"
    ```

### Step 3: Save and Deploy

*   After you have pasted all your real keys into `apphosting.yaml`, **save the file**.
*   This will trigger a new deployment. Once it's complete, your login will work on the live URL.

---

## Environment Variables for Local Development

For the application to connect to your Firebase project locally, you need to provide your Firebase project's configuration in a `.env.local` file.

1.  Create a new file named `.env.local` in the root of your project.
2.  Copy the contents of `apphosting.yaml`'s `environmentVariables` section into it.
3.  The application is configured to use these environment variables automatically.
