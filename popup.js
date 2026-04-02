"use strict";

let currentTabId = null;
let currentTabIsLocked = false;

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;

  const titleEl = document.getElementById("tab-title");
  const faviconWrap = document.getElementById("tab-favicon-wrap");

  titleEl.textContent = tab.title || "(No title)";
  titleEl.title = tab.title || "";

  if (tab.favIconUrl && !tab.favIconUrl.startsWith("chrome")) {
    const img = document.createElement("img");
    img.className = "tab-card-favicon";
    img.src = tab.favIconUrl;
    img.onerror = () => img.remove();
    faviconWrap.innerHTML = "";
    faviconWrap.appendChild(img);
  }

  const allLocked = await browser.runtime.sendMessage({ type: "GET_ALL_LOCKED" });

  if (allLocked[currentTabId]) {
    currentTabIsLocked = true;
    setLockedUI(allLocked[currentTabId]);
  }

  renderLockedList(allLocked);
  setupEvents();
}

function setLockedUI(info) {
  const badge = document.getElementById("tab-status-badge");
  badge.className = "tab-indicator locked";
  badge.textContent = info.mode === "disguise" ? "Disguise Active" : "Locked";
  
  document.getElementById("lock-form").classList.add("hidden");
  document.getElementById("unlock-form").classList.remove("hidden");

  const pwdGrp = document.getElementById("unlock-pwd-group");
  if (pwdGrp) {
    if (info.mode === "disguise") {
      pwdGrp.classList.add("hidden");
    } else {
      pwdGrp.classList.remove("hidden");
    }
  }
}

function setUnlockedUI() {
  document.getElementById("tab-status-badge").className = "tab-indicator unlocked";
  document.getElementById("tab-status-badge").textContent = "Unlocked";
  document.getElementById("lock-form").classList.remove("hidden");
  document.getElementById("unlock-form").classList.add("hidden");
}

function setupEvents() {
  const modeSelect = document.getElementById("lock-mode-select");
  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      const pwdGroup = document.getElementById("password-field-group");
      if (modeSelect.value === "disguise") {
        pwdGroup.classList.add("hidden");
      } else {
        pwdGroup.classList.remove("hidden");
      }
    });
  }

  document.getElementById("lock-password").addEventListener("input", updateStrength);

  setupEye("eye-lock", "lock-password");
  setupEye("eye-unlock", "unlock-password");

  const advToggle = document.getElementById("adv-toggle");
  advToggle.addEventListener("click", () => {
    const panel = document.getElementById("adv-panel");
    panel.classList.toggle("open");
    advToggle.classList.toggle("open");
  });

  document.getElementById("lock-btn").addEventListener("click", doLock);
  document.getElementById("unlock-btn").addEventListener("click", doUnlock);
  document.getElementById("force-unlock-btn").addEventListener("click", doForceUnlock);

  document.getElementById("lock-password").addEventListener("keydown", e => {
    if (e.key === "Enter") doLock();
  });

  document.getElementById("unlock-password").addEventListener("keydown", e => {
    if (e.key === "Enter") doUnlock();
  });
}

function setupEye(btnId, inputId) {
  document.getElementById(btnId).addEventListener("click", () => {
    const input = document.getElementById(inputId);
    const eye = document.getElementById(btnId);
    if (input.type === "password") {
      input.type = "text";
      eye.textContent = "🙈";
    } else {
      input.type = "password";
      eye.textContent = "👁";
    }
  });
}

function updateStrength() {
  const pwd = document.getElementById("lock-password").value;
  const bars = ["sb1", "sb2", "sb3", "sb4"].map(id => document.getElementById(id));
  const label = document.getElementById("strength-label");

  let score = 0;
  if (pwd.length >= 4) score++;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[\d!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/`~\\]/.test(pwd)) score++;

  const palette = ["#ef4444", "#f97316", "#eab308", "#10b981"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  bars.forEach((bar, i) => {
    bar.style.background = i < score ? palette[score - 1] : "rgba(255,255,255,0.07)";
  });

  if (pwd) {
    label.textContent = labels[score] || "Weak";
    label.style.color = palette[Math.max(0, score - 1)];
  } else {
    label.textContent = "—";
    label.style.color = "var(--text-dim)";
  }
}

async function doLock() {
  const disguiseTitle = document.getElementById("disguise-title").value.trim() || "New Tab";
  const password = document.getElementById("lock-password").value;
  const autoLockMinutes = parseInt(document.getElementById("auto-lock-select").value);
  const note = document.getElementById("lock-note").value.trim();
  const mode = document.getElementById("lock-mode-select").value;

  if (mode === "password") {
    if (!password) {
      showToast("Please set a password first", "error");
      document.getElementById("lock-password").focus();
      return;
    }
    if (password.length < 3) {
      showToast("Password must be at least 3 characters", "error");
      return;
    }
  }

  const btn = document.getElementById("lock-btn");
  btn.disabled = true;
  btn.textContent = "Locking…";

  const result = await browser.runtime.sendMessage({
    type: "LOCK_TAB_REQUEST",
    tabId: currentTabId,
    mode,
    disguiseTitle,
    password: mode === "password" ? password : "",
    autoLockMinutes,
    note
  });

  if (result && result.success) {
    showToast(mode === "disguise" ? "Disguise Active! 🎭" : "Tab locked! 🔒", "success");
    setTimeout(() => window.close(), 900);
  } else {
    showToast(result?.error || "Failed to lock tab", "error");
    btn.disabled = false;
    btn.textContent = "🔒  Lock This Tab";
  }
}

async function doUnlock() {
  const password = document.getElementById("unlock-password").value;
  if (!password) {
    showToast("Enter the password", "error");
    return;
  }

  const btn = document.getElementById("unlock-btn");
  btn.disabled = true;
  btn.textContent = "Verifying…";

  const result = await browser.runtime.sendMessage({
    type: "UNLOCK_ATTEMPT_POPUP",
    tabId: currentTabId,
    password
  });

  if (result && result.success) {
    showToast("Tab unlocked! 🔓", "success");
    setTimeout(() => window.close(), 900);
  } else {
    showToast("Wrong password", "error");
    document.getElementById("unlock-password").value = "";
    document.getElementById("unlock-password").focus();
    btn.disabled = false;
    btn.textContent = "🔓  Unlock Tab";
  }
}

async function doForceUnlock() {
  await browser.runtime.sendMessage({
    type: "FORCE_UNLOCK_TAB",
    tabId: currentTabId
  });

  showToast("Lock/Disguise removed", "success");
  setTimeout(() => window.close(), 800);
}

async function renderLockedList(allLocked) {
  const list = document.getElementById("locked-list");
  const countEl = document.getElementById("locked-count");

  const entries = Object.entries(allLocked);
  countEl.textContent = entries.length;

  if (entries.length === 0) {
    list.textContent = "";
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "empty";
    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-icon";
    emptyIcon.textContent = "🛡️";
    const emptyText = document.createElement("p");
    emptyText.textContent = "No tabs are hiding yet.";
    emptyDiv.appendChild(emptyIcon);
    emptyDiv.appendChild(emptyText);
    list.appendChild(emptyDiv);
    return;
  }

  list.textContent = "";

  const tabDetails = {};
  for (const [tabId] of entries) {
    try {
      const t = await browser.tabs.get(parseInt(tabId));
      tabDetails[tabId] = t;
    } catch (e) {
      tabDetails[tabId] = null;
    }
  }

  for (const [tabId, info] of entries) {
    const tab = tabDetails[tabId];
    const isCurrentTab = parseInt(tabId) === currentTabId;

    const item = document.createElement("div");
    item.className = "locked-item";
    item.dataset.tabId = tabId;

    let iconWrap = document.createElement("div");
    iconWrap.className = "locked-item-icon";
    iconWrap.textContent = info.mode === "disguise" ? "🎭" : "🔒";

    let infoWrap = document.createElement("div");
    infoWrap.className = "locked-item-info";

    let titleEl = document.createElement("div");
    titleEl.className = "locked-item-title";
    let titleText = info.originalTitle || "Tab #" + tabId;
    titleEl.title = titleText;
    titleEl.textContent = titleText;
    if (isCurrentTab) {
      let curSpan = document.createElement("span");
      curSpan.style.cssText = "font-size:9px;color:var(--accent);margin-left:5px;font-weight:700;";
      curSpan.textContent = "CURRENT";
      titleEl.appendChild(curSpan);
    }

    let descEl = document.createElement("div");
    descEl.className = "locked-item-disguise";
    descEl.textContent = (info.mode === "disguise" ? 'Disguised as' : 'Masked as') + ": ";
    let emEl = document.createElement("em");
    emEl.style.cssText = "color:rgba(255,255,255,0.5)";
    emEl.textContent = '"' + info.disguiseTitle + '"';
    descEl.appendChild(emEl);
    if (info.note) {
      descEl.appendChild(document.createTextNode(' · 📝 Note'));
    }
    infoWrap.appendChild(titleEl);
    infoWrap.appendChild(descEl);

    let actionsWrap = document.createElement("div");
    actionsWrap.className = "locked-item-actions";

    let btnF = document.createElement("button");
    btnF.className = "btn btn-ghost btn-sm";
    btnF.dataset.action = "focus";
    btnF.dataset.id = tabId;
    btnF.title = "Switch to tab";
    btnF.textContent = "→";

    let btnR = document.createElement("button");
    btnR.className = "btn btn-danger btn-sm";
    btnR.dataset.action = "remove";
    btnR.dataset.id = tabId;
    btnR.title = "Remove protection";
    btnR.textContent = "✕";

    actionsWrap.appendChild(btnF);
    actionsWrap.appendChild(btnR);

    item.appendChild(iconWrap);
    item.appendChild(infoWrap);
    item.appendChild(actionsWrap);

    list.appendChild(item);
  }

  list.querySelectorAll("[data-action='focus']").forEach(btn => {
    btn.addEventListener("click", async () => {
      await browser.tabs.update(parseInt(btn.dataset.id), { active: true });
      window.close();
    });
  });

  list.querySelectorAll("[data-action='remove']").forEach(btn => {
    btn.addEventListener("click", async () => {
      const tabId = parseInt(btn.dataset.id);
      await browser.runtime.sendMessage({ type: "FORCE_UNLOCK_TAB", tabId });

      const item = btn.closest(".locked-item");
      item.style.transition = "opacity 0.25s, transform 0.25s";
      item.style.opacity = "0";
      item.style.transform = "translateX(10px)";
      setTimeout(() => {
        item.remove();
        const remaining = list.querySelectorAll(".locked-item").length;
        countEl.textContent = remaining;
        if (remaining === 0) {
          list.textContent = "";
          const emptyDiv2 = document.createElement("div");
          emptyDiv2.className = "empty";
          const emptyIcon2 = document.createElement("div");
          emptyIcon2.className = "empty-icon";
          emptyIcon2.textContent = "🛡️";
          const emptyText2 = document.createElement("p");
          emptyText2.textContent = "No tabs are hiding yet.";
          emptyDiv2.appendChild(emptyIcon2);
          emptyDiv2.appendChild(emptyText2);
          list.appendChild(emptyDiv2);
        }
      }, 250);
    });
  });
}

let toastTimer = null;
function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type} show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 3000);
}

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", init);
