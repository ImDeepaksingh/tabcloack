"use strict";

const lockedTabs = new Map();
const lockedUrls = new Map();

let globalSettings = {
  panicPassword: null,
  panicPasswordHash: null,
  panicPasswordSalt: null
};

function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 75000, hash: "SHA-256" },
    key, 256
  );
  return Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function persist() {
  const tabsObj = {};
  const urlsObj = {};
  lockedTabs.forEach((v, k) => { tabsObj[k] = v; });
  lockedUrls.forEach((v, k) => { urlsObj[k] = v; });
  browser.storage.local.set({ lockedTabs: tabsObj, lockedUrls: urlsObj, globalSettings });
}

async function restoreState() {
  const data = await browser.storage.local.get(["lockedTabs", "lockedUrls", "globalSettings"]);
  if (data.globalSettings) {
    globalSettings = { ...globalSettings, ...data.globalSettings };
  }
  if (data.lockedUrls) {
    for (const [url, info] of Object.entries(data.lockedUrls)) {
      lockedUrls.set(url, info);
    }
  }
  if (data.lockedTabs) {
    for (const [id, info] of Object.entries(data.lockedTabs)) {
      try {
        await browser.tabs.get(parseInt(id));
        lockedTabs.set(parseInt(id), info);
      } catch (e) {}
    }
  }

  const allTabs = await browser.tabs.query({});
  for (const tab of allTabs) {
    if (tab.url && lockedUrls.has(tab.url) && !lockedTabs.has(tab.id)) {
      lockedTabs.set(tab.id, { ...lockedUrls.get(tab.url), unlockedUntil: 0 });
    }
  }
}

restoreState();

async function lockTab(tabId, { mode = "password", disguiseTitle, password, autoLockMinutes = 1, note = "" }) {
  let tab;
  try { tab = await browser.tabs.get(tabId); } catch (e) { throw new Error("Tab not found"); }

  const salt = mode === "password" ? randomSalt() : "";
  const passwordHash = mode === "password" ? await pbkdf2(password, salt) : "";

  const info = {
    mode,
    url: tab.url,
    disguiseTitle: disguiseTitle || "New Tab",
    passwordHash,
    salt,
    originalTitle: tab.title || "Tab",
    originalFavicon: tab.favIconUrl || "",
    autoLockMinutes: parseInt(autoLockMinutes),
    note,
    lockedAt: Date.now(),
    lastUnlocked: null,
    unlockedUntil: 0
  };

  lockedTabs.set(tabId, info);
  if (info.url && !info.url.startsWith("about:") && !info.url.startsWith("chrome:") && !info.url.startsWith("moz-extension:")) {
    lockedUrls.set(info.url, info);
  }
  
  persist();

  try {
    await browser.tabs.sendMessage(tabId, {
      type: "SYNC_LOCK_STATE",
      locked: true,
      mode: info.mode,
      disguiseTitle: info.disguiseTitle
    });
  } catch (e) {}

  return { success: true };
}

async function verifyPassword(tabId, password) {
  const info = lockedTabs.get(tabId);
  if (!info) return false;
  if (info.mode === "disguise") return true; 
  const hash = await pbkdf2(password, info.salt);
  return hash === info.passwordHash;
}

function unlockTabPermanently(tabId) {
  const info = lockedTabs.get(tabId);
  if (!info) return false;
  lockedTabs.delete(tabId);
  if (info.url) lockedUrls.delete(info.url);
  persist();

  browser.tabs.sendMessage(tabId, {
    type: "SYNC_LOCK_STATE",
    locked: false,
    originalTitle: info.originalTitle
  }).catch(() => {});

  return true;
}

browser.tabs.onActivated.addListener(({ tabId, previousTabId }) => {
  // Handle the tab we are switching AWAY from
  if (previousTabId && lockedTabs.has(previousTabId)) {
    const prevInfo = lockedTabs.get(previousTabId);
    if (prevInfo.autoLockMinutes === 1) {
      prevInfo.unlockedUntil = 0; // Lock immediately on switch
      persist();
    }
    const isLocked = prevInfo.unlockedUntil < Date.now();
    browser.tabs.sendMessage(previousTabId, {
      type: "SYNC_LOCK_STATE",
      locked: isLocked, // If grace period is active, it stays unlocked
      mode: prevInfo.mode,
      disguiseTitle: prevInfo.disguiseTitle,
      switchingAway: true // Signal to immediately force overlay to hide thumbnail
    }).catch(() => {});
  }

  // Handle the tab we are switching TO
  if (tabId && lockedTabs.has(tabId)) {
    const info = lockedTabs.get(tabId);
    const isLocked = info.unlockedUntil < Date.now();
    browser.tabs.sendMessage(tabId, {
      type: "SYNC_LOCK_STATE",
      locked: isLocked,
      mode: info.mode,
      disguiseTitle: info.disguiseTitle
    }).catch(() => {});
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && lockedUrls.has(tab.url) && !lockedTabs.has(tabId)) {
    lockedTabs.set(tabId, { ...lockedUrls.get(tab.url), unlockedUntil: 0 });
    persist();
  }

  if (!lockedTabs.has(tabId)) return;
  if (changeInfo.status !== "complete") return;
  
  const info = lockedTabs.get(tabId);
  const isLocked = info.unlockedUntil < Date.now();
  
  browser.tabs.sendMessage(tabId, {
    type: "SYNC_LOCK_STATE",
    locked: isLocked,
    mode: info.mode,
    disguiseTitle: info.disguiseTitle
  }).catch(() => {});
});

browser.tabs.onRemoved.addListener(tabId => {
  if (lockedTabs.has(tabId)) {
    lockedTabs.delete(tabId);
    persist(); 
  }
});

browser.commands.onCommand.addListener(async command => {
  if (command !== "panic-lock") return;

  const allTabs = await browser.tabs.query({ currentWindow: true });
  for (const tab of allTabs) {
    if (lockedTabs.has(tab.id)) {
      const info = lockedTabs.get(tab.id);
      info.unlockedUntil = 0; // Force lock
      persist();
      browser.tabs.sendMessage(tab.id, {
        type: "SYNC_LOCK_STATE",
        locked: true,
        mode: info.mode,
        disguiseTitle: info.disguiseTitle
      }).catch(() => {});
    }
  }

  const safe = allTabs.find(t => !lockedTabs.has(t.id));
  if (safe) {
    browser.tabs.update(safe.id, { active: true });
  } else {
    browser.tabs.create({ url: "about:blank" });
  }
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const contentTabId = sender.tab?.id;

  switch (msg.type) {
    case "PING":
      sendResponse({ success: true });
      return true;

    case "GET_LOCK_STATUS": {
      if (contentTabId && lockedTabs.has(contentTabId)) {
        const info = lockedTabs.get(contentTabId);
        const isLocked = info.unlockedUntil < Date.now();
        sendResponse({ locked: isLocked, ...info });
      } else {
        sendResponse(null);
      }
      return true;
    }

    case "UNLOCK_ATTEMPT": {
      if (!contentTabId || !lockedTabs.has(contentTabId)) {
        sendResponse({ success: false, reason: "Not locked" });
        return true;
      }
      verifyPassword(contentTabId, msg.password).then(ok => {
        if (ok) {
          const info = lockedTabs.get(contentTabId);
          info.lastUnlocked = Date.now();
          if (info.autoLockMinutes === 0) {
            info.unlockedUntil = Infinity;
          } else if (info.autoLockMinutes === 1) {
            info.unlockedUntil = Infinity; // Will be reset onActivated
          } else {
            info.unlockedUntil = Date.now() + (info.autoLockMinutes * 60000);
          }
          persist();
          sendResponse({ success: true, originalTitle: info.originalTitle, note: info.note });
        } else {
          sendResponse({ success: false, reason: "Wrong password" });
        }
      });
      return true;
    }

    case "LOCK_TAB_REQUEST": {
      lockTab(msg.tabId, msg)
        .then(res => sendResponse(res))
        .catch(e => sendResponse({ success: false, error: e.message }));
      return true;
    }

    case "UNLOCK_ATTEMPT_POPUP": {
      const tid = msg.tabId;
      if (!lockedTabs.has(tid)) {
        sendResponse({ success: false });
        return true;
      }
      verifyPassword(tid, msg.password).then(ok => {
        if (ok) {
          unlockTabPermanently(tid);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
      });
      return true;
    }

    case "FORCE_UNLOCK_TAB": {
      const removed = unlockTabPermanently(msg.tabId);
      sendResponse({ success: removed });
      return true;
    }

    case "GET_ALL_LOCKED": {
      const result = {};
      lockedTabs.forEach((v, k) => {
        result[k] = { ...v, tabId: k };
      });
      sendResponse(result);
      return true;
    }
  }
});

function closeAllLockedTabs() {
  const tabIds = [...lockedTabs.keys()];
  if (tabIds.length > 0) {
    browser.tabs.remove(tabIds).catch(() => {});
  }
}

browser.runtime.onSuspend.addListener(closeAllLockedTabs);
window.addEventListener("beforeunload", closeAllLockedTabs);
