# How to Fix the API Key Login Error

The application is failing because the API credentials in `apphosting.yaml` are incorrect. To fix this, you must copy the correct credentials from your Firebase project settings and paste them into the `apphosting.yaml` file.

This is the final step to make your application work.

### Step 1: Get Your Credentials

1.  **[Click here to open your Firebase Project Settings](https://console.firebase.google.com/project/egoasarthi/settings/general)**.
    *   *(If the link doesn't work, go to the [Firebase Console](https://console.firebase.google.com/), select the `egoasarthi` project, click the ⚙️ gear icon, and select "Project settings").*

2.  In the "Your apps" section, find your "Web app".

3.  In the "Firebase SDK snippet" box, select **Config**.

4.  You will see your credentials, which look like this:
    ```javascript
    const firebaseConfig = {
      apiKey: "AIz...w",
      authDomain: "ego...com",
      projectId: "ego...i",
      // ...and so on
    };
    ```

### Step 2: Update the `apphosting.yaml` File

1.  Open the `apphosting.yaml` file in the editor on the left.

2.  Carefully copy each value from the `firebaseConfig` object (from Step 1) and paste it into the matching line in `apphosting.yaml`.

    **Example:**
    *   Copy the `apiKey` value and paste it over `"PASTE_YOUR_REAL_API_KEY_HERE"`.
    *   Copy the `authDomain` value and paste it over `"PASTE_YOUR_AUTH_DOMAIN_HERE"`.
    *   Do this for all the keys.

Once you have replaced all the placeholders with your real values, the error will be resolved. The application will automatically redeploy with the correct keys.
