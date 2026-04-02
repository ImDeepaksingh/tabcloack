(function () {
  "use strict";

  if (window.__tabCloakInjected) return;
  window.__tabCloakInjected = true;

  let state = {
    locked: false,
    mode: "password",
    disguiseTitle: "",
    originalTitle: "",
    overlayShown: false,
    failedAttempts: 0,
    lockoutUntil: 0,
    titleObserver: null,
    headObserver: null
  };

  function applyDisguise(title) {
    state.disguiseTitle = title;
    document.title = title;

    document.querySelectorAll(
      'link[rel*="icon"], link[rel*="apple-touch-icon"], link[rel*="shortcut"]'
    ).forEach(l => l.remove());

    const blank = document.createElement("link");
    blank.rel = "shortcut icon";
    blank.type = "image/x-icon";
    blank.href = "data:image/x-icon;base64,AAABAAEAAQEAAAEAGAAoAAAAFgAAACgAAAABAAAAAgAAAAEAGAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
    (document.head || document.documentElement).appendChild(blank);

    if (state.titleObserver) state.titleObserver.disconnect();
    state.titleObserver = new MutationObserver(() => {
      if (state.locked && document.title !== state.disguiseTitle) {
        document.title = state.disguiseTitle;
      }
    });

    const titleEl = document.querySelector("title");
    if (titleEl) {
      state.titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }

    if (state.headObserver) state.headObserver.disconnect();
    state.headObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && node.tagName === "LINK" && node.rel && (node.rel.includes("icon") || node.rel.includes("apple-touch"))) {
            node.remove();
          }
        }
      }
    });
    if (document.head) {
      state.headObserver.observe(document.head, { childList: true, subtree: true });
    }
  }

  function removeDisguise() {
    if (state.titleObserver) { state.titleObserver.disconnect(); state.titleObserver = null; }
    if (state.headObserver) { state.headObserver.disconnect(); state.headObserver = null; }
    if (state.originalTitle) document.title = state.originalTitle;
  }

  const OVERLAY_ID = "__tc_overlay_7f3a__";
  function getOverlay() { return document.getElementById(OVERLAY_ID); }

  function showOverlay() {
    if (state.overlayShown && getOverlay()) return;
    state.overlayShown = true;

    const old = getOverlay();
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;

    if (state.mode === "disguise") {
      overlay.innerHTML = `
        <style>
          #${OVERLAY_ID} {
            all: initial !important; position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
            background: #fff !important; z-index: 2147483647 !important; display: flex !important; flex-direction: column !important;
            align-items: center !important; justify-content: center !important; font-family: arial, sans-serif !important;
          }
          #__tc_g_logo { font-size: 84px !important; font-weight: bold !important; letter-spacing: -3px !important; margin-bottom: 25px !important; user-select: none !important; }
          #__tc_g_search { width: 584px !important; max-width: 90% !important; height: 46px !important; border-radius: 24px !important; border: 1px solid #dfe1e5 !important; position: relative !important; display: flex !important; align-items: center !important; }
          #__tc_g_search:hover { box-shadow: 0 1px 6px rgba(32,33,36,.28) !important; border-color: rgba(223,225,229,0) !important; }
          #__tc_g_btns { margin-top: 28px !important; }
          #__tc_g_btn { background: #f8f9fa !important; border: 1px solid #f8f9fa !important; border-radius: 4px !important; color: #3c4043 !important; cursor: pointer !important; font-size: 14px !important; margin: 11px 4px !important; padding: 0 16px !important; height: 36px !important; }
          #__tc_g_btn:hover { box-shadow: 0 1px 1px rgba(0,0,0,.1) !important; background: #f8f9fa !important; border: 1px solid #dadce0 !important; color: #202124 !important; }
        </style>
        <div id="__tc_g_logo">
          <span style="color:#4285F4">G</span><span style="color:#EA4335">o</span><span style="color:#FBBC05">o</span><span style="color:#4285F4">g</span><span style="color:#34A853">l</span><span style="color:#EA4335">e</span>
        </div>
        <div id="__tc_g_search">
          <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="margin-left: 14px; width: 20px; fill: #9aa0a6;"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
        </div>
        <div id="__tc_g_btns">
          <button id="__tc_g_btn">Google Search</button>
          <button id="__tc_g_btn">I'm Feeling Lucky</button>
        </div>
      `;
      document.documentElement.appendChild(overlay);
      return; 
    }

    const style = document.createElement("style");
    style.textContent = `
      #${OVERLAY_ID} { all: initial !important; position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; background: #060608 !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif !important; overflow: hidden !important; }
      #__tc_bg__ { position: absolute; inset: 0; background: radial-gradient(ellipse 600px 500px at 20% 40%, rgba(99,57,255,0.08) 0%, transparent 70%), radial-gradient(ellipse 400px 400px at 80% 60%, rgba(180,57,255,0.05) 0%, transparent 70%); pointer-events: none; }
      #__tc_card__ { position: relative; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 44px 40px; width: 360px; text-align: center; box-shadow: 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07); }
      #__tc_icon__ { font-size: 44px; display: block; margin-bottom: 18px; filter: drop-shadow(0 0 24px rgba(111,88,255,0.6)); animation: __tc_float__ 3s ease-in-out infinite; }
      @keyframes __tc_float__ { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      @keyframes __tc_shake__ { 0%,100% { transform: translateX(0); } 15% { transform: translateX(-9px); } 30% { transform: translateX(9px); } 45% { transform: translateX(-6px); } 60% { transform: translateX(6px); } 75% { transform: translateX(-3px); } 90% { transform: translateX(3px); } }
      #__tc_card__.shaking { animation: __tc_shake__ 0.5s ease !important; }
      #__tc_title__ { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin: 0 0 6px; }
      #__tc_sub__ { color: rgba(255,255,255,0.35); font-size: 13px; margin: 0 0 28px; font-weight: 400; }
      #__tc_input_wrap__ { position: relative; margin-bottom: 12px; }
      #__tc_pwd_input__ { all: initial !important; display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 13px 44px 13px 16px !important; background: rgba(255,255,255,0.06) !important; border: 1.5px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; color: #fff !important; font-size: 15px !important; font-family: inherit !important; outline: none !important; transition: border-color 0.2s !important; letter-spacing: 0.05em !important; }
      #__tc_pwd_input__:focus { border-color: rgba(111,88,255,0.6) !important; background: rgba(111,88,255,0.06) !important; }
      #__tc_eye_btn__ { all: initial !important; position: absolute !important; right: 12px !important; top: 50% !important; transform: translateY(-50%) !important; cursor: pointer !important; color: rgba(255,255,255,0.3) !important; font-size: 16px !important; line-height: 1 !important; padding: 4px !important; user-select: none !important; font-family: inherit !important; }
      #__tc_eye_btn__:hover { color: rgba(255,255,255,0.6) !important; }
      #__tc_unlock_btn__ { all: initial !important; display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 13px !important; background: linear-gradient(135deg, #6f58ff, #a855f7) !important; border: none !important; border-radius: 12px !important; color: #fff !important; font-size: 14px !important; font-weight: 700 !important; letter-spacing: 0.03em !important; cursor: pointer !important; transition: opacity 0.2s, transform 0.1s !important; font-family: inherit !important; }
      #__tc_unlock_btn__:hover { opacity: 0.88 !important; }
      #__tc_unlock_btn__:active { transform: scale(0.98) !important; }
      #__tc_unlock_btn__:disabled { opacity: 0.4 !important; cursor: not-allowed !important; }
      #__tc_err__ { color: #ff6b6b; font-size: 12px; min-height: 18px; margin-top: 10px; font-weight: 500; transition: opacity 0.3s; }
      #__tc_lockout__ { color: rgba(255,255,255,0.2); font-size: 11px; margin-top: 6px; }
      #__tc_note_reveal__ { display: none; margin-top: 18px; padding: 12px; background: rgba(111,88,255,0.08); border: 1px solid rgba(111,88,255,0.2); border-radius: 10px; color: rgba(255,255,255,0.6); font-size: 12px; text-align: left; line-height: 1.5; }
    `;

    overlay.appendChild(style);
    overlay.innerHTML += `
      <div id="__tc_bg__"></div>
      <div id="__tc_card__">
        <span id="__tc_icon__">🔒</span>
        <h2 id="__tc_title__">Tab Locked</h2>
        <p id="__tc_sub__">Enter your password to continue</p>
        <div id="__tc_input_wrap__">
          <input type="password" id="__tc_pwd_input__" placeholder="Password" autocomplete="off" spellcheck="false">
          <button id="__tc_eye_btn__" type="button" title="Show/hide password">👁</button>
        </div>
        <button id="__tc_unlock_btn__" type="button">Unlock</button>
        <div id="__tc_err__"></div>
        <div id="__tc_lockout__"></div>
        <div id="__tc_note_reveal__"></div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    const input = document.getElementById("__tc_pwd_input__");
    const btn = document.getElementById("__tc_unlock_btn__");
    const eyeBtn = document.getElementById("__tc_eye_btn__");
    const errEl = document.getElementById("__tc_err__");
    const lockoutEl = document.getElementById("__tc_lockout__");

    setTimeout(() => { if (input) input.focus(); }, 80);

    eyeBtn.addEventListener("click", () => {
      if (input.type === "password") { input.type = "text"; eyeBtn.textContent = "🙈"; }
      else { input.type = "password"; eyeBtn.textContent = "👁"; }
    });

    input.addEventListener("keydown", e => { if (e.key === "Enter") attemptUnlock(); });
    btn.addEventListener("click", attemptUnlock);

    async function attemptUnlock() {
      if (Date.now() < state.lockoutUntil) return;
      const pwd = input.value;
      if (!pwd) { shake(); return; }

      btn.disabled = true;
      btn.textContent = "Verifying…";
      errEl.textContent = "";

      let result;
      try { result = await browser.runtime.sendMessage({ type: "UNLOCK_ATTEMPT", password: pwd }); }
      catch (e) { btn.disabled = false; btn.textContent = "Unlock"; return; }

      if (result && result.success) {
        state.failedAttempts = 0;
        state.overlayShown = false;
        state.locked = false;

        btn.style.background = "linear-gradient(135deg,#10b981,#059669)";
        btn.textContent = "✓ Unlocked";

        if (result.note) {
          const noteEl = document.getElementById("__tc_note_reveal__");
          noteEl.textContent = "📝 " + result.note;
          noteEl.style.display = "block";
        }

        setTimeout(() => {
          overlay.style.transition = "opacity 0.35s";
          overlay.style.opacity = "0";
          setTimeout(() => {
            overlay.remove();
            removeDisguise();
            if (result.originalTitle) document.title = result.originalTitle;
          }, 350);
        }, result.note ? 800 : 250);
      } else {
        state.failedAttempts++;
        input.value = "";
        input.focus();
        btn.disabled = false;
        btn.textContent = "Unlock";
        shake();

        if (state.failedAttempts >= 5) {
          state.lockoutUntil = Date.now() + 30000;
          btn.disabled = true;
          errEl.textContent = "Too many attempts";
          let secs = 30;
          const interval = setInterval(() => {
            lockoutEl.textContent = `Try again in ${secs}s`;
            secs--;
            if (secs < 0) {
              clearInterval(interval);
              btn.disabled = false;
              state.failedAttempts = 0;
              lockoutEl.textContent = "";
              errEl.textContent = "";
            }
          }, 1000);
        } else {
          errEl.textContent = state.failedAttempts >= 3 ? `Incorrect password (${state.failedAttempts} attempts)` : "Incorrect password";
        }
      }
    }

    function shake() {
      const card = document.getElementById("__tc_card__");
      card.classList.remove("shaking");
      void card.offsetWidth;
      card.classList.add("shaking");
      card.addEventListener("animationend", () => card.classList.remove("shaking"), { once: true });
    }
  }

  function hideOverlay() {
    state.overlayShown = false;
    const overlay = getOverlay();
    if (overlay) {
      overlay.style.transition = "opacity 0.3s";
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 300);
    }
  }

  browser.runtime.onMessage.addListener((msg) => {
    switch (msg.type) {
      case "SYNC_LOCK_STATE":
        state.locked = msg.locked;
        if (msg.mode) state.mode = msg.mode;
        if (msg.disguiseTitle) state.disguiseTitle = msg.disguiseTitle;

        if (state.locked || msg.switchingAway) {
          // Apply disguise title
          applyDisguise(state.disguiseTitle);
          // Put the overlay up if it's locked, or if we are just hiding it for the background
          showOverlay();
        } else {
          // If unlocked and currently in focus, safely remove everything!
          removeDisguise();
          hideOverlay();
        }
        break;
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.locked) {
      showOverlay();
    }
  });

  async function init() {
    try {
      const status = await browser.runtime.sendMessage({ type: "GET_LOCK_STATUS" });
      if (status && status.locked) {
        state.locked = true;
        state.mode = status.mode || "password";
        state.disguiseTitle = status.disguiseTitle;
        state.originalTitle = status.originalTitle || document.title;
        applyDisguise(status.disguiseTitle);

        if (!document.hidden) {
          showOverlay();
        }
      }
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  setInterval(() => {
    if (state.locked) {
      try {
        const p = browser.runtime.sendMessage({ type: "PING" });
        if (p && p.catch) {
          p.catch(() => { triggerNuclear(); });
        }
      } catch (e) {
        triggerNuclear();
      }
    }
  }, 1000);

  function triggerNuclear() {
    document.documentElement.innerHTML = "";
    document.documentElement.style.background = "#000";
    window.location.replace("https://www.google.com/");
    try { window.close(); } catch (e) {}
  }

})();
