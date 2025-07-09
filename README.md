# The Definitive Guide to Fixing Login Errors

We've confirmed your `apphosting.yaml` file has the correct API keys. The final step is to check for **API Key Restrictions** in your Google Cloud project. This is the most likely cause of the `API key not valid` error.

### Step 1: Go to the Credentials Page

1.  Make sure you are logged into the correct Google Account.
2.  Click this link to go directly to the API credentials page for your project:  
    [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials?project=egoasarthi)

### Step 2: Edit the API Key

1.  On the credentials page, you will see a key named **"Browser key (auto created by Firebase)"**.
2.  Click on the name of that key to open its settings.

### Step 3: Remove Application Restrictions

1.  On the key's settings page, scroll down to the **"Application restrictions"** section.
2.  Select the **"None"** option. This is the simplest and most reliable setting for this app.
3.  Click the blue **"Save"** button at the bottom of the page.

It may take a minute or two for the change to take effect. After that, your live application's login will work correctly.
