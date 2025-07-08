# Firebase Studio

This is a NextJS starter in Firebase Studio.

## Getting Started

To get started, take a look at `src/app/page.tsx`.

## IMPORTANT: Fixing Login on Your Live Website

If your login works in the local preview but fails on your live URL (the one ending in `.hosted.app`), it means your deployed app is missing its API keys.

Please follow these steps exactly:

1.  **Open the `apphosting.yaml` File:** This file is in the main directory of your project (not inside `src`).

2.  **Get Your Firebase Credentials:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/) and select your `egoasarthi` project.
    *   Click the **gear icon ⚙️** > **Project settings**.
    *   Under the "Your apps" card, find your web app and look at the **SDK setup and configuration**.
    *   You will see your keys (`apiKey`, `authDomain`, `projectId`, etc.).

3.  **Update `apphosting.yaml`:**
    *   Copy your real credentials from the Firebase Console.
    *   Paste them into the `apphosting.yaml` file, replacing the placeholder values.

    **Example:**
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

4.  **Commit Your Changes:** After you have pasted your real keys into `apphosting.yaml`, commit the changes in the source control panel on the left. This will trigger a new deployment with the correct keys, and your login will start working on the live URL.

## Environment Variables for Local Development

For the application to connect to your Firebase project locally, you need to provide your Firebase project's configuration in a `.env.local` file.

1.  Create a new file named `.env.local` in the root of your project.
2.  Copy the contents of `apphosting.yaml`'s `environmentVariables` section into it.
3.  The application is configured to use these environment variables automatically.
