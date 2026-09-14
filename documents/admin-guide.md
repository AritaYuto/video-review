# VideoReview Admin Guide

VideoReview has **no web-based admin console**.
Administration is split between the Web UI and the maintenance CLI.

| Task | Where |
| --- | --- |
| Register an administrator | Initial setup screen in the Web UI |
| Generate an API token | Web UI, Settings → Edit Profile |
| Creating users, deleting videos, reading comments, and other operations | [Maintenance CLI](../maintenance/README.md) |

---

## Initial Setup

A freshly deployed instance has no users at all, so register an administrator from the Web UI.

---

### Step 1: Open the Web UI

Open the root URL in a browser.

`http://localhost:3489` (when running with Docker)

Note: if you are not working on the server itself, use the server hostname and the port published in `compose.prod.yml`  
Note: on the first boot the page shows "Database is preparing..." for a few seconds, and retries on its own

- Not initialized → you are redirected to the setup screen (`/bootstrap`)
- Already initialized → you are redirected to the login screen

---

### Step 2: Register the administrator

On the **"Please register an administrator"** screen,  
enter an email address and a password (at least 6 characters), then click **Initialize**.

<img src="https://github.com/user-attachments/assets/fb096964-9dba-4941-a5ea-af8cf4087392" width="400" />

The user created here always gets the **admin** role.  
Once registration completes, you are logged in automatically with that account.

Next, generate an [API Token](#generating-an-api-token) below so that you can use the [Maintenance CLI](../maintenance/README.md).

---

### Notes

- The setup screen is available **only while the instance is uninitialized**  
  Once an administrator exists, the setup API returns `410 Already initialized` and the root URL leads to the login screen
- Users created afterwards with the CLI (`create-user`) always get the **viewer** role  
  To promote an existing user to admin, call the `PATCH /api/v1/admin/role-update` API with an admin token
- The Web UI has no password reset screen, so store the administrator credentials somewhere safe

---

## Generating an API Token

API tokens can be generated **only by admin users** via the Web UI.
They are used for maintenance APIs and automation purposes.

---

### Step 1: Open Settings

1. Click the **⚙ (Settings) icon** at the bottom-left of the screen.
2. Select **Edit Profile** from the settings menu.

![Settings](https://github.com/user-attachments/assets/b4b9f1a1-5167-4680-ab61-f8bd40319c4e)

---

### Step 2: Generate an API Token

On the profile screen, click the **“API Token Generate”** button.

![API Token Generate](https://github.com/user-attachments/assets/72a62a9d-c11f-4e08-81f8-7710cdf65b1d)

---

### Step 3: Save the Token

Copy the generated API token and store it in a secure location.

---

### Notes

* The generated API token is **shown only once**
* Once the profile dialog is closed, the token **cannot be viewed again**
* If you lose the token, you must **rotate (re-generate)** it
* Only users with the **admin** role can generate or rotate API tokens
