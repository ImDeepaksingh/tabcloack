# 🔒 TabCloack – Advanced Tab Privacy Extension

TabCloack protects your browsing flow by stealthily locking or outright disguising your active browser tabs.

---

## 🛡️ Core Capabilities

| Feature | Description |
|---|---|
| **Google Disguise Mode** | Completely transforms the tab into a realistic fake Google Search overlay, requiring no password but fully hiding the underlying tab. Perfect for quick disguises. |
| **Password Lock** | Renders a full-screen, encrypted vault screen over your tab when you switch away. |
| **Tab Metadata Masking** | Modifies the tab's title (e.g. "Google", "Meeting") and scrubs the favicon so tabs look innocent in your browser window. |
| **PBKDF2 Hashing** | Passwords are securely hashed with a random salt via 75,000 iterations of PBKDF2 — never stored in plain text. |
| **Aggressive Relock** | Tabs are instantly re-locked or re-disguised the millisecond you switch away, securing thumbnails. |
| **Lockout Protection** | Entering the wrong password 5 times locks out the vault for 30 seconds. |
| **Private Notes** | Optionally attach an encrypted memo to a locked tab, which is only uncovered upon unlock. |
| **Panic Command** | Press `Ctrl+Shift+L` to instantly force the lock or disguise over all protected tabs and jump to a safe window. |
| **Nuclear Failsafe** | If the extension is forcibly uninstalled or disabled mid-session, all locked tabs instantly detect the connection loss, mask their URLs, wipe their DOM, and attempt to self-terminate. |

---

## 💻 Installation

### Firefox
Open Firefox and navigate to [TabCloack](https://addons.mozilla.org/en-GB/firefox/addon/tabcloack/)

---

## ⚙️ Usage Guide

### Protecting a Tab
1. Click the TabCloack icon while on a tab you wish to secure.
2. Choose your **Mode**:
   - **Password Lock (Secure):** Set a password to lock the content behind a cryptographic vault overlay.
   - **Google Disguise (No Password):** Turn the tab into a fake Google Search without needing a password.
3. Configure your disguise title (what the tab is called in the UI, e.g., `Classwork`).
4. Click **Lock This Tab**.

### Accessing Protected Tabs
- **Password Locked:** Focus the tab and enter your password directly on the injected vault screen.
- **Google Disguised:** Open the TabCloack extension popup and click the red **Remove Lock** button on the target tab.

### The Panic Shortcut
Press `Ctrl+Shift+L` anytime to immediately trigger locks/disguises on all protected tabs. You will be actively redirected to an un-locked tab or a blank page.

### The Nuclear Option
If TabCloack's background process is suddenly terminated (via browser disable, internal crash, or uninstall), any currently-open locked tabs will instantly detect the connection loss, change their URL to Google, and self-terminate the window to prevent data leakage.

---

## 🔐 Security Considerations

- The lock screen vault and disguise overlays are injected via a DOM content script. Ensure this complements your device-level security (like OS lock screens).
- TabCloack runs entirely offline using `browser.storage.local`. None of your settings or password hashes ever leave your local machine.

---

## 📜 License

Licensed under the [MIT License](LICENSE).

Developed with 🛡️ by [Deepak](https://github.com/ImDeepaksingh/).
Official Repository: [ImDeepaksingh/tabcloack](https://github.com/ImDeepaksingh/tabcloack)
