// ==UserScript==
// @name         Work Browser Tools
// @namespace    https://github.com/KaiserXanderW/work-browser-tools-releases
// @version      1.3.4
// @description  Work browser tools in one Violentmonkey entry. Menu: "Tools on this page…" switches single tools off.
// @match        https://*.assd.com/*
// @match        https://*.assd.com:9443/*
// @match        https://botfriendsx.com/project/*/handover/tool/handover
// @match        https://*.novomind.com/*
// @match        *://forms.office.com/*
// @match        *://forms.cloud.microsoft/*
// @match        *://forms.microsoft.com/*
// @match        https://*.novomind.com/agent/client/index.imail
// @include      /^https:\/\/[^\/]*-[^\/]*\.assd\.com\//
// @include      /^https?:\/\/[^\/@]*novomind[^\/@]*\//
// @exclude-match *://*.novomind.com/agent/client/messageQueueContent.imail*
// @exclude-match *://*.novomind.com/agent/client/emptyGrid.imail*
// @exclude-match *://*.novomind.com/agent/client/disposeChild.html*
// @exclude-match *://*.novomind.com/agent/client/pdfPreview.html*
// @run-at       document-start
// @grant        GM_addElement
// @grant        GM_addStyle
// @grant        GM_addValueChangeListener
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.deepseek.com
// @connect      api.github.com
// @updateURL    https://raw.githubusercontent.com/KaiserXanderW/work-browser-tools-releases/main/work-browser-tools.user.js
// @downloadURL  https://raw.githubusercontent.com/KaiserXanderW/work-browser-tools-releases/main/work-browser-tools.user.js
// ==/UserScript==

var __wbtT0 = typeof performance === "object" ? performance.now() : 0;
(() => {
  // bundle/monitor.js
  var OTHER = "(outside a tool)", G = globalThis, now = () => G.performance.now(), native = {
    setTimeout: G.setTimeout,
    clearTimeout: G.clearTimeout,
    setInterval: G.setInterval,
    clearInterval: G.clearInterval,
    requestAnimationFrame: G.requestAnimationFrame,
    cancelAnimationFrame: G.cancelAnimationFrame,
    MutationObserver: G.MutationObserver
  }, started = now(), stats = /* @__PURE__ */ new Map(), active = null;
  function entry(id) {
    let key = id ?? OTHER, s = stats.get(key);
    return s || (s = { calls: 0, ms: 0, maxMs: 0, records: 0, observers: 0, intervals: 0, timers: 0 }, stats.set(key, s)), s;
  }
  function runAs(id, fn, ...args) {
    let prev = active;
    active = id;
    let t = now();
    try {
      return fn(...args);
    } finally {
      let ms = now() - t;
      active = prev;
      let s = entry(id);
      s.calls += 1, s.ms += ms, ms > s.maxMs && (s.maxMs = ms);
    }
  }
  function snapshot() {
    let tools = {};
    for (let [id, s] of stats) tools[id] = { ...s };
    return { elapsedMs: now() - since, tools };
  }
  var since = started;
  function reset() {
    let next = /* @__PURE__ */ new Map();
    for (let [id, s] of stats)
      next.set(id, { calls: 0, ms: 0, maxMs: 0, records: 0, observers: s.observers, intervals: s.intervals, timers: s.timers });
    stats = next, since = now();
  }
  var call = (f, args) => f.apply(G, args), live = /* @__PURE__ */ new Map();
  function setTimeout(fn, ms, ...rest) {
    if (typeof fn != "function") return call(native.setTimeout, [fn, ms, ...rest]);
    let tool = active, id = call(native.setTimeout, [() => {
      live.delete(id) && (entry(tool).timers -= 1), runAs(tool, fn, ...rest);
    }, ms]);
    return live.set(id, [tool, "timers"]), entry(tool).timers += 1, id;
  }
  function setInterval(fn, ms, ...rest) {
    if (typeof fn != "function") return call(native.setInterval, [fn, ms, ...rest]);
    let tool = active, id = call(native.setInterval, [() => runAs(tool, fn, ...rest), ms]);
    return live.set(id, [tool, "intervals"]), entry(tool).intervals += 1, id;
  }
  function clear(id) {
    let l = live.get(id);
    l && (live.delete(id), entry(l[0])[l[1]] -= 1);
  }
  function clearTimeout(id) {
    return clear(id), call(native.clearTimeout, [id]);
  }
  function clearInterval(id) {
    return clear(id), call(native.clearInterval, [id]);
  }
  var frames = /* @__PURE__ */ new Map();
  function requestAnimationFrame(fn) {
    let tool = active, id = call(native.requestAnimationFrame, [(t) => {
      frames.delete(id) && (entry(tool).timers -= 1), runAs(tool, fn, t);
    }]);
    return frames.set(id, tool), entry(tool).timers += 1, id;
  }
  var MutationObserver = class {
    constructor(cb) {
      let tool = active;
      this._tool = tool, this._on = !1, this._mo = new native.MutationObserver((records) => {
        entry(tool).records += records.length, runAs(tool, cb, records, this);
      });
    }
    observe(target, options) {
      this._mo.observe(target, options), this._on || (this._on = !0, entry(this._tool).observers += 1);
    }
    disconnect() {
      this._mo.disconnect(), this._on && (this._on = !1, entry(this._tool).observers -= 1);
    }
    takeRecords() {
      return this._mo.takeRecords();
    }
  };

  // packages/gm/settings.js
  function readSetting(key) {
    let v = GM_getValue(key, "");
    return typeof v == "string" ? v.trim() : "";
  }
  function askSetting({ key, question, check = () => null, normalize: normalize2 = (v) => v }, win = window) {
    let answer = win.prompt(question, readSetting(key));
    if (answer === null) return null;
    let value = answer.trim() ? normalize2(answer.trim()) : "", problem = value ? check(value) : null;
    return problem ? (win.alert(problem), null) : (GM_setValue(key, value), value);
  }
  function menuSetting(setting, onChange = () => {
  }, win = window) {
    win === win.top && GM_registerMenuCommand(setting.caption, () => {
      let v = askSetting(setting);
      v !== null && onChange(v);
    });
  }
  var checkHttpsUrl = (v) => /^https:\/\/[^\s/?#]+\/\S*$/.test(v) ? null : "That is not an https:// address.", SIGNATURE_SETTING = {
    key: "work-browser-tools.signatureName",
    caption: "Set the name you sign with…",
    question: "The name to sign replies with:"
  };

  // scripts/assd-autofill/src/main.js
  var USER_SETTING = {
    key: "work-browser-tools.assdUserCode",
    caption: "Set your ASSD user code…",
    question: "Your ASSD user code, written into memo entries:"
  };
  function start() {
    (function() {
      "use strict";
      menuSetting(USER_SETTING);
      function findActiveTab() {
        let titlebar = document.querySelector(
          ".ui-dialog-titlebar.ui-widget-header.ui-corner-all.ui-helper-clearfix.selected.tabbed.maximize.active"
        );
        if (!titlebar) return null;
        let span = titlebar.querySelector('span[id^="ui-id-"]');
        if (!span) return null;
        let num2 = span.id.match(/\d+/)[0];
        return document.querySelector(`div.ui-dialog[aria-labelledby="ui-id-${num2}"]`);
      }
      function setDatepickerDate(input, date) {
        let pageWindow = typeof unsafeWindow < "u" ? unsafeWindow : window;
        if (pageWindow.jQuery)
          try {
            return pageWindow.jQuery(input).datepicker("setDate", date), !0;
          } catch (e) {
            console.error("[assd-autofill] datepicker setDate failed:", e);
          }
        return console.error("[assd-autofill] jQuery not available for datepicker"), !1;
      }
      function autofillDates(activeTabDiv, callback) {
        if (!activeTabDiv) {
          console.error("[assd-autofill] Active tab not found");
          return;
        }
        let arrivalInput = activeTabDiv.querySelector('input[id^="arrival_ds"]'), departureInput = activeTabDiv.querySelector('input[id^="departure_ds"]'), arrivalHidden = activeTabDiv.querySelector('input[id^="arrival_dp"]'), departureHidden = activeTabDiv.querySelector('input[id^="departure_dp"]'), today = /* @__PURE__ */ new Date(), tomorrow = /* @__PURE__ */ new Date();
        tomorrow.setDate(today.getDate() + 1);
        let arrivalEmpty = arrivalInput && !arrivalInput.value.trim() && !arrivalHidden?.value.trim(), departureEmpty = departureInput && !departureInput.value.trim() && !departureHidden?.value.trim();
        arrivalEmpty && setDatepickerDate(arrivalInput, today), departureEmpty && setDatepickerDate(departureInput, tomorrow), setTimeout(() => {
          document.activeElement.blur(), callback?.();
        }, 125);
      }
      function commitAutocompleteInput(input, val) {
        input.focus(), input.value = val, input.dispatchEvent(new Event("input", { bubbles: !0 })), input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: !0, key: val.slice(-1) })), input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: !0, key: val.slice(-1) })), setTimeout(() => {
          let items = document.querySelectorAll('.ui-autocomplete:not([style*="display: none"]) .ui-menu-item'), match = null;
          items.forEach((it) => {
            !match && it.textContent.trim().startsWith(val) && (match = it);
          }), match ? (match.click(), console.log(`[assd-autofill] #${input.id}: committed via menu click`)) : console.warn(`[assd-autofill] #${input.id}: no autocomplete item matching "${val}" (items=${items.length})`);
        }, 200);
      }
      function fillFormFields(activeTabDiv, callback) {
        if (!activeTabDiv) {
          console.error("[assd-autofill] Active tab not found");
          return;
        }
        setTimeout(() => {
          let guestBox = activeTabDiv.querySelector("#guest_r");
          guestBox && (guestBox.value = "1", guestBox.dispatchEvent(new Event("change", { bubbles: !0 })));
          let userBox = activeTabDiv.querySelector("#ruser04");
          userBox && commitAutocompleteInput(userBox, "01");
          let regcodeButton = activeTabDiv.querySelector("#regcode");
          regcodeButton && (regcodeButton.click(), setTimeout(() => {
            activeTabDiv.querySelector('.dropdown-menu.scrollable-menu li a[val="28"]')?.click(), callback?.();
          }, 62));
        }, 125);
      }
      let CUSTOMER_FILLED = "assd-customer-filled";
      function selectDropdownOption(dialog, buttonId, val, callback) {
        let btn = dialog.querySelector(`#${buttonId}`);
        if (!btn) {
          console.warn(`[assd-autofill] #${buttonId} not found`), callback?.();
          return;
        }
        btn.click(), setTimeout(() => {
          let menu = btn.parentElement.querySelector(".dropdown-menu"), option = menu?.querySelector(`a[val="${val}"]`);
          console.log(`[assd-autofill] #${buttonId}: menu items=${menu?.querySelectorAll("a").length}, target val="${val}" found=${!!option}`), option?.click(), callback?.();
        }, 62);
      }
      function triggerMatchcodeSearch(dialog) {
        let lastname = dialog.querySelector("#lastname")?.value?.trim() ?? "", firstname = dialog.querySelector("#firstname")?.value?.trim() ?? "", matchInput = dialog.querySelector("#match1");
        if (!matchInput) {
          console.warn("[assd-autofill] #match1 not found");
          return;
        }
        if (!lastname && !firstname) {
          console.warn("[assd-autofill] No name entered yet");
          return;
        }
        let query = [lastname, firstname].filter(Boolean).join(", ").toUpperCase();
        matchInput.value = query, matchInput.dispatchEvent(new Event("input", { bubbles: !0 })), matchInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: !0 })), setTimeout(() => {
          let items = document.querySelectorAll('.ui-autocomplete:not([style*="display: none"]) .ui-menu-item');
          items.length >= 3 ? items[2].click() : items.length > 0 ? items[items.length - 1].click() : console.warn("[assd-autofill] Matchcode autocomplete produced no items");
        }, 350);
      }
      function autofillCustomerMask(dialog) {
        if (dialog.classList.contains(CUSTOMER_FILLED)) return;
        dialog.classList.add(CUSTOMER_FILLED), setTimeout(() => {
          selectDropdownOption(dialog, "nation2", "DE", () => {
            selectDropdownOption(dialog, "guestcode", "01");
          });
        }, 200);
        let saveBtn = dialog.querySelector("#cmdsave");
        if (saveBtn && !dialog.querySelector(".assd-matchcode-btn")) {
          let btn = document.createElement("button");
          btn.className = "cmd_button assd-matchcode-btn", btn.type = "button", btn.title = "Matchcode aus Namen suchen", btn.textContent = "Matchcode", btn.style.cssText = "margin-right: 4px;", btn.addEventListener("click", () => triggerMatchcodeSearch(dialog)), saveBtn.after(btn);
        }
      }
      function getUser() {
        return readSetting(USER_SETTING.key) || askSetting(USER_SETTING) || "";
      }
      function getMemoDate() {
        let now2 = /* @__PURE__ */ new Date(), dd = String(now2.getDate()).padStart(2, "0"), mm = String(now2.getMonth() + 1).padStart(2, "0"), yy = String(now2.getFullYear()).slice(-2);
        return `${dd}.${mm}.${yy}`;
      }
      function insertAtCursor(textarea, text, cursorInText = text.length) {
        let start12 = textarea.selectionStart, end = textarea.selectionEnd;
        textarea.value = textarea.value.slice(0, start12) + text + textarea.value.slice(end), textarea.setSelectionRange(start12 + cursorInText, start12 + cursorInText), textarea.focus(), textarea.dispatchEvent(new Event("input", { bubbles: !0 })), textarea.dispatchEvent(new Event("change", { bubbles: !0 }));
      }
      function insertMemoTimestamp(textarea) {
        let user = getUser();
        if (!user) return;
        let stamp = `${getMemoDate()} -  - ${user}
`;
        textarea.value = stamp + textarea.value;
        let cursorPos = stamp.indexOf(" -  - ") + 3;
        textarea.setSelectionRange(cursorPos, cursorPos), textarea.focus(), textarea.dispatchEvent(new Event("input", { bubbles: !0 })), textarea.dispatchEvent(new Event("change", { bubbles: !0 }));
      }
      function insertInvoiceAddress(textarea) {
        let head = `<JADDRESS>
`;
        insertAtCursor(textarea, `${head}
</JADDRESS>`, head.length);
      }
      function makeMemoBtn(label, title, onClick) {
        let btn = document.createElement("a");
        return btn.className = "cmd_button picker assd-memo-injected", btn.title = title, btn.textContent = label, btn.style.cssText = "cursor:pointer; margin-bottom:4px; padding: 2px 8px; width:90px;", btn.addEventListener("click", (e) => {
          e.preventDefault(), onClick();
        }), btn;
      }
      function injectMemoButtons(dialog) {
        let memo = dialog.querySelector("#memo");
        if (!memo || dialog.dataset.assdMemoInjected) return;
        dialog.dataset.assdMemoInjected = "1";
        let buttons = [
          makeMemoBtn(
            "📅 Stamp",
            "Datum + Kürzel einfügen",
            () => insertMemoTimestamp(memo)
          ),
          makeMemoBtn(
            "Invoice Address",
            "Rechnungsadresse (JADDRESS) an der Cursorposition einfügen",
            () => insertInvoiceAddress(memo)
          )
          // Switched off (owner, 2026-10-20): the parking and room-fixed buttons. Uncomment to bring one back.
          /*
          makeMemoBtn('Parking',        'Parking added as per sender',
            () => insertAtCursor(memo, 'Parking added as per sender')),
          makeMemoBtn('Room Fixed',     'Room allocation failed – reassigned',
            () => insertAtCursor(memo, 'Room allocation failed – reassigned')),
          makeMemoBtn('No Parking',     'Parking requested as per sender, but none available',
            () => insertAtCursor(memo, 'Parking requested as per sender, but none available')),
          makeMemoBtn('Part. Parking',  'Parking requested as per sender; not available for full stay – added for available days only',
            () => insertAtCursor(memo, 'Parking requested as per sender; not available for full stay – added for available days only')),
          */
        ], wrapper = document.createElement("span");
        wrapper.style.cssText = "display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px; vertical-align: top; margin-left: -70px; margin-top: 10px;", buttons.forEach((btn) => wrapper.appendChild(btn));
        let pickerBtn = dialog.querySelector('a.cmd_button.picker[field="memo"]'), anchor = pickerBtn || memo;
        pickerBtn || console.warn('[assd-autofill] picker[field="memo"] not found, anchoring after #memo'), anchor.after(wrapper), console.log("[assd-autofill] memo buttons injected after", anchor.id || anchor.className);
      }
      function autofillForm() {
        let activeTabDiv = findActiveTab();
        autofillDates(activeTabDiv, () => {
          fillFormFields(activeTabDiv);
        });
      }
      let cmdguestHandled = !1, scanScheduled = !1;
      function scan() {
        scanScheduled = !1;
        let cmdguestBtn = document.querySelector("#cmdguest3");
        cmdguestBtn && !cmdguestHandled ? (cmdguestHandled = !0, cmdguestBtn.click(), setTimeout(autofillForm, 125)) : !cmdguestBtn && cmdguestHandled && (cmdguestHandled = !1), document.querySelectorAll(".ui-dialog").forEach((dialog) => {
          !dialog.classList.contains(CUSTOMER_FILLED) && dialog.querySelector(".guestName") && autofillCustomerMask(dialog), !dialog.dataset.assdMemoInjected && dialog.querySelector("#memo") && injectMemoButtons(dialog);
        });
      }
      function scheduleScan() {
        scanScheduled || (scanScheduled = !0, requestAnimationFrame(scan));
      }
      new MutationObserver(scheduleScan).observe(document.body, { childList: !0, subtree: !0 }), scan();
    })();
  }

  // scripts/assd-house-index/extension/src/houses.ts
  var HOUSES_KIND = "assd-houses";
  var isObj = (v) => !!v && typeof v == "object" && !Array.isArray(v), str = (v) => typeof v == "number" && Number.isFinite(v) ? String(v) : typeof v == "string" && v.trim() ? v.trim() : void 0, strList = (v) => {
    if (!Array.isArray(v)) return;
    let out = v.map(str).filter((s) => !!s);
    return out.length ? out : void 0;
  }, FIELD_NAMES = {
    code: ["code", "houseId", "house_id", "id"],
    houseNumber: ["houseNumber", "house_number", "number"],
    name: ["name"],
    city: ["city"],
    country: ["country"],
    address: ["address"],
    link: ["link", "url"],
    aliases: ["aliases"]
  }, KNOWN = new Set(Object.values(FIELD_NAMES).flat());
  function pick(h, names) {
    for (let n of names) if (h[n] !== void 0 && h[n] !== null) return h[n];
  }
  function safeLink(v) {
    let s = str(v);
    if (s)
      try {
        let u = new URL(s);
        return u.protocol === "https:" || u.protocol === "http:" ? u.href : void 0;
      } catch {
        return;
      }
  }
  function houseNumberOf(v) {
    return v == null || v === "" ? { value: null, odd: !1 } : typeof v == "number" && Number.isInteger(v) && v >= 0 ? { value: v, odd: !1 } : typeof v == "string" && /^\s*#?\s*\d+\s*$/.test(v) ? { value: Number(v.replace(/[^\d]/g, "")), odd: !1 } : { value: null, odd: !0 };
  }
  function looksLegacy(v) {
    let vals = Object.values(v);
    return vals.length > 0 && vals.every((x) => isObj(x) && ("houseId" in x || "houseNumber" in x));
  }
  function parseHouses(raw) {
    let v = raw;
    if (typeof raw == "string")
      try {
        v = JSON.parse(raw);
      } catch (e) {
        return { ok: !1, error: `not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
      }
    let warnings = [], list, generatedAt, source;
    if (Array.isArray(v))
      return { ok: !1, error: `expected a JSON object with "kind": "${HOUSES_KIND}", got a list` };
    if (!isObj(v)) return { ok: !1, error: "expected a JSON object" };
    if (v.kind === void 0 && looksLegacy(v))
      list = Object.values(v), warnings.push('old userscript format (no "kind"); converted');
    else {
      if (v.kind !== HOUSES_KIND) return { ok: !1, error: `"kind" must be "${HOUSES_KIND}"` };
      if (v.schemaVersion !== 1)
        return { ok: !1, error: '"schemaVersion" must be 1' };
      if (!Array.isArray(v.houses)) return { ok: !1, error: '"houses" must be a list' };
      list = v.houses, generatedAt = str(v.generatedAt), source = str(v.source);
    }
    let houses = [], seen = /* @__PURE__ */ new Set(), unknownKeys = /* @__PURE__ */ new Set(), oddNumbers = [], badLinks = [];
    if (list.forEach((h, i) => {
      if (!isObj(h)) {
        warnings.push(`house #${i + 1} skipped: not an object`);
        return;
      }
      let code = str(pick(h, FIELD_NAMES.code)), name = str(pick(h, FIELD_NAMES.name));
      if (!code && !name) {
        warnings.push(`house #${i + 1} skipped: needs "code" or "name"`);
        return;
      }
      let label = code ?? name ?? "", dupKey = code ? normCode(code) : `name:${norm(name ?? "")}`;
      if (seen.has(dupKey)) {
        warnings.push(`"${label}" listed twice; kept the first`);
        return;
      }
      seen.add(dupKey);
      for (let k of Object.keys(h)) KNOWN.has(k) || unknownKeys.add(k);
      let num2 = houseNumberOf(pick(h, FIELD_NAMES.houseNumber));
      num2.odd && oddNumbers.push(label);
      let rawLink = pick(h, FIELD_NAMES.link), link = safeLink(rawLink);
      rawLink !== void 0 && !link && badLinks.push(label);
      let house = { code: code ?? "", houseNumber: num2.value, name: name ?? code ?? "" }, city = str(h.city), country = str(h.country), address = str(h.address), aliases = strList(h.aliases);
      city && (house.city = city), country && (house.country = country), address && (house.address = address), link && (house.link = link), aliases && (house.aliases = aliases), houses.push(house);
    }), !houses.length) return { ok: !1, error: "no usable houses" };
    let few = (xs) => xs.slice(0, 5).join(", ") + (xs.length > 5 ? ", …" : "");
    unknownKeys.size && warnings.push(`unknown fields ignored: ${[...unknownKeys].join(", ")}`), oddNumbers.length && warnings.push(`${oddNumbers.length} house number(s) weren't a whole number and were left empty: ${few(oddNumbers)}`), badLinks.length && warnings.push(`${badLinks.length} link(s) weren't a web address and were dropped: ${few(badLinks)}`);
    let noLink = houses.filter((h) => !h.link).map((h) => h.code || h.name);
    return noLink.length && warnings.push(`${noLink.length} house(s) have no link and can't be opened: ${few(noLink)}`), {
      ok: !0,
      warnings,
      data: { kind: HOUSES_KIND, schemaVersion: 1, generatedAt, source, houses }
    };
  }
  var DASHES = /[-\u2010-\u2015\u2212]/g;
  function norm(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u00df/g, "ss").toLowerCase();
  }
  function normCode(s) {
    return norm(s).replace(DASHES, "").replace(/\s+/g, "");
  }
  function textHaystack(h) {
    return norm([h.name, h.city, h.address, ...h.aliases ?? []].filter(Boolean).join(" | "));
  }
  function termMatches(h, hay, term) {
    let t = norm(term), c = normCode(term);
    return c ? hay.includes(t) || h.country && norm(h.country) === t || h.code && normCode(h.code).includes(c) ? !0 : h.houseNumber !== null && String(h.houseNumber).startsWith(t) : !1;
  }
  function rank(h, query) {
    let q = norm(query.trim()), qc = normCode(query);
    return h.code && normCode(h.code) === qc || h.houseNumber !== null && String(h.houseNumber) === q ? 0 : norm(h.name) === q || (h.aliases ?? []).some((a) => norm(a) === q) ? 1 : norm(h.name).startsWith(q) ? 2 : 3;
  }
  function searchHouses(houses, query, limit = 5) {
    let terms = query.split(/[\s,]+/).filter((t) => normCode(t));
    return terms.length ? houses.map((h, i) => ({ h, i, hay: textHaystack(h) })).filter((x) => terms.every((t) => termMatches(x.h, x.hay, t))).map((x) => ({ ...x, r: rank(x.h, query) })).sort((a, b) => a.r - b.r || a.i - b.i).slice(0, limit).map((x) => x.h) : [];
  }
  var SORT_KEYS = ["name", "number", "id", "address"], byText = (a, b) => a.localeCompare(b, void 0, { sensitivity: "base", numeric: !0 });
  function sortHouses(houses, by) {
    let out = [...houses];
    switch (by) {
      case "name":
        return out.sort((a, b) => byText(a.name, b.name));
      case "id":
        return out.sort((a, b) => byText(a.code, b.code));
      case "number":
        return out.sort((a, b) => (a.houseNumber ?? 1 / 0) - (b.houseNumber ?? 1 / 0) || byText(a.name, b.name));
      case "address":
        return out.sort((a, b) => (a.address ? 0 : 1) - (b.address ? 0 : 1) || byText(a.address ?? "", b.address ?? ""));
    }
  }
  var num = (h) => h.houseNumber === null ? "—" : String(h.houseNumber), codeOf = (h) => h.code || "—";
  function rowText(h, by) {
    switch (by) {
      case "number":
        return { strong: num(h), rest: ` (#) - ${codeOf(h)} - ${h.name}` };
      case "id":
        return { strong: codeOf(h), rest: ` - House#: ${num(h)} - ${h.name}` };
      case "address":
        return { strong: h.address ?? "[No Address]", rest: ` - ${codeOf(h)} - House#: ${num(h)} - ${h.name}` };
      default:
        return { strong: h.name, rest: ` - ${codeOf(h)} - House#: ${num(h)}` };
    }
  }
  function resultText(h) {
    return { line1: `${h.name} - ${codeOf(h)} - House#: ${num(h)}`, line2: h.address ?? "No address available" };
  }

  // scripts/assd-house-index/extension/src/store.ts
  var HOUSES_KEY = "ahi.houses";
  async function importHouses(storage, text) {
    let r = parseHouses(text);
    return r.ok ? (await storage.set({ [HOUSES_KEY]: r.data }), { ok: !0, houses: r.data.houses.length, warnings: r.warnings }) : r;
  }
  async function loadHouses(storage) {
    let d = (await storage.get(HOUSES_KEY))[HOUSES_KEY];
    return d && d.kind === HOUSES_KIND && Array.isArray(d.houses) ? d : null;
  }
  async function removeHouses(storage) {
    storage.remove ? await storage.remove(HOUSES_KEY) : await storage.set({ [HOUSES_KEY]: null });
  }
  var ctrlSEnabled = (s) => s?.ctrlS !== !1;

  // scripts/assd-house-index/extension/src/sites.ts
  var LAUNCHER_POS_KEY = "ahi.launcherPos";
  var DEFAULT_POS = { right: 20, bottom: 20 };
  function siteCovers(siteKey, pageKey) {
    if (siteKey === pageKey) return !0;
    let m = /^(https?:\/\/)\*\.(.+)$/.exec(siteKey);
    if (!m || !pageKey.startsWith(m[1])) return !1;
    let host = pageKey.slice(m[1].length);
    return host === m[2] || host.endsWith("." + m[2]);
  }
  function findSiteForUrl(href, sites) {
    let pageKey = siteKeyForUrl(href);
    if (!pageKey) return null;
    let exact = `${pageKey}/*`;
    return sites.includes(exact) ? exact : sites.find((p) => siteCovers(siteKeyFromPattern(p), pageKey)) ?? null;
  }
  function siteKeyFromPattern(pattern) {
    return pattern.replace(/\/\*$/, "");
  }
  function siteKeyForUrl(href) {
    try {
      let u = new URL(href);
      return u.protocol !== "https:" && u.protocol !== "http:" ? null : `${u.protocol}//${u.hostname}`;
    } catch {
      return null;
    }
  }
  async function loadPositions(storage) {
    let raw = (await storage.get(LAUNCHER_POS_KEY))[LAUNCHER_POS_KEY];
    return raw && typeof raw == "object" ? { ...raw } : {};
  }
  async function savePosition(storage, key, pos) {
    let all = await loadPositions(storage);
    all[key] = { right: Math.round(pos.right), bottom: Math.round(pos.bottom) }, await storage.set({ [LAUNCHER_POS_KEY]: all });
  }
  async function resetPosition(storage, key) {
    let all = await loadPositions(storage);
    key in all && (delete all[key], await storage.set({ [LAUNCHER_POS_KEY]: all }));
  }
  function isValidPos(p) {
    let v = p;
    return !!v && Number.isFinite(v.right) && Number.isFinite(v.bottom);
  }
  function clampPos(pos, vw, vh) {
    let maxR = Math.max(0, vw - 70), maxB = Math.max(0, vh - 70);
    return {
      right: Math.min(Math.max(0, pos.right), maxR),
      bottom: Math.min(Math.max(0, pos.bottom), maxB)
    };
  }
  var GAP = 10, MARGIN = 8, MIN_PANEL_H = 200;
  function panelRect(pos, vw, vh, want) {
    let width = Math.max(0, Math.min(want.width, vw - 2 * MARGIN)), lTop = vh - pos.bottom - 70, lBottom = vh - pos.bottom, lRight = vw - pos.right, left = Math.min(Math.max(MARGIN, lRight - width), Math.max(MARGIN, vw - MARGIN - width)), above = lTop - GAP - MARGIN, below = vh - lBottom - GAP - MARGIN;
    if (above >= want.height) return { left, top: lTop - GAP - want.height, width, height: want.height };
    if (below >= want.height) return { left, top: lBottom + GAP, width, height: want.height };
    if (above >= below) {
      let height2 = Math.max(Math.min(MIN_PANEL_H, vh - 2 * MARGIN), above);
      return { left, top: Math.max(MARGIN, lTop - GAP - height2), width, height: height2 };
    }
    let height = Math.max(Math.min(MIN_PANEL_H, vh - 2 * MARGIN), below);
    return { left, top: Math.min(lBottom + GAP, vh - MARGIN - height), width, height };
  }

  // scripts/assd-house-index/extension/src/messages.ts
  var PANEL_CLOSE = "ahi.panel.close", PANEL_OPENED = "ahi.panel.opened", PANEL_TYPE = "ahi.panel.type", PANEL_RESIZE = "ahi.panel.resize";

  // scripts/assd-house-index/extension/src/launcher.ts
  var DRAG_THRESHOLD = 4, PANEL_SIZE = { width: 520, height: 520 }, PANEL_MIN_WIDTH = 240, PANEL_MAX_WIDTH = 600, PANEL_MAX_VH = 0.8, BAR_HEIGHT = 37, PANEL_BORDER = 1, T = {
    lines: ["ASSD", "House", "Index"],
    tip: "House index (Ctrl+S) — drag to move",
    reset: "Reset position",
    close: "Close",
    frame: "House index"
  };
  function viewportEl(doc) {
    return doc.compatMode === "BackCompat" && doc.body || doc.documentElement;
  }
  function setStyle(el, props) {
    for (let [k, v] of Object.entries(props)) el.style.setProperty(k, v, "important");
  }
  function mountLauncher(deps) {
    let doc = deps.doc ?? document, win = doc.defaultView ?? window, ctrlS = ctrlSEnabled(deps.settings), pos = isValidPos(deps.position) ? { ...deps.position } : { ...DEFAULT_POS }, open = !1, frame = null, frameReady = !1, launcher = doc.createElement("ahi-launcher");
    launcher.id = "ahi-launcher", launcher.setAttribute("role", "button"), launcher.tabIndex = 0;
    for (let text of T.lines) {
      let line = doc.createElement("ahi-line");
      line.textContent = text, launcher.appendChild(line);
    }
    let panel = doc.createElement("ahi-panel");
    panel.id = "ahi-panel";
    let slot = doc.createElement("ahi-frame-slot"), bar = doc.createElement("ahi-bar"), resetBtn = doc.createElement("button");
    resetBtn.type = "button", resetBtn.className = "ahi-bar-btn";
    let closeBtn = doc.createElement("button");
    if (closeBtn.type = "button", closeBtn.className = "ahi-bar-btn ahi-bar-close", closeBtn.textContent = "×", deps.buttons?.length) {
      let group = doc.createElement("ahi-bar-group");
      group.append(resetBtn);
      for (let b of deps.buttons) {
        let btn = doc.createElement("button");
        btn.type = "button", btn.className = "ahi-bar-btn", btn.textContent = b.label, btn.addEventListener("click", () => b.onClick()), group.append(btn);
      }
      bar.append(group, closeBtn);
    } else
      bar.append(resetBtn, closeBtn);
    panel.append(slot, bar);
    let renderText = () => {
      launcher.title = ctrlS ? T.tip : T.tip.replace(" (Ctrl+S)", ""), launcher.setAttribute("aria-label", T.frame), launcher.setAttribute("aria-expanded", String(open)), resetBtn.textContent = T.reset, closeBtn.title = T.close, closeBtn.setAttribute("aria-label", T.close), frame && (frame.title = T.frame);
    }, content = null, frame2 = (outer, inner) => outer > inner ? outer - inner : PANEL_BORDER * 2, wanted = () => {
      if (!content) return PANEL_SIZE;
      let barH = bar.getBoundingClientRect().height || BAR_HEIGHT, bx = frame2(panel.offsetWidth, panel.clientWidth), by = frame2(panel.offsetHeight, panel.clientHeight);
      return {
        width: Math.min(Math.max(content.width + bx, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH),
        height: Math.min(content.height + barH + by, Math.floor(vh() * PANEL_MAX_VH))
      };
    }, vw = () => viewportEl(doc).clientWidth || win.innerWidth, vh = () => viewportEl(doc).clientHeight || win.innerHeight, place = () => {
      let drawn = clampPos(pos, vw(), vh());
      if (setStyle(launcher, { right: `${drawn.right}px`, bottom: `${drawn.bottom}px` }), !open) return;
      let r = panelRect(drawn, vw(), vh(), wanted());
      setStyle(panel, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`
      });
    }, post = (type) => {
      frame?.contentWindow && frameReady && deps.extOrigin && frame.contentWindow.postMessage({ type }, deps.extOrigin);
    }, embedded = !1, doOpen = () => {
      if (!open) {
        if (open = !0, deps.embed) {
          embedded || (embedded = !0, deps.embed.mount(slot)), panel.dataset.open = "true", renderText(), place(), deps.embed.opened();
          return;
        }
        !frame && deps.frameUrl && (frame = doc.createElement("iframe"), frame.className = "ahi-frame", frame.src = deps.frameUrl, frame.addEventListener("load", () => {
          frameReady = !0, open && (frame?.focus(), post(PANEL_OPENED));
        }), slot.appendChild(frame)), panel.dataset.open = "true", renderText(), place(), frame?.focus(), post(PANEL_OPENED);
      }
    }, doClose = (refocus = !1) => {
      open && (open = !1, panel.dataset.open = "false", renderText(), refocus && launcher.focus({ preventScroll: !0 }));
    }, toggle = () => open ? doClose() : doOpen(), press = null, dragged = !1, suppressClick = !1;
    launcher.addEventListener("pointerdown", (e) => {
      e.button === 0 && (press = { x: e.clientX, y: e.clientY, start: clampPos(pos, vw(), vh()), id: e.pointerId }, dragged = !1, launcher.setPointerCapture?.(e.pointerId), e.preventDefault());
    }), launcher.addEventListener("pointermove", (e) => {
      if (!press) return;
      let dx = e.clientX - press.x, dy = e.clientY - press.y;
      !dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD || (dragged = !0, launcher.dataset.dragging = "true", pos = clampPos({ right: press.start.right - dx, bottom: press.start.bottom - dy }, vw(), vh()), place());
    });
    let endPress = (e) => {
      press && (launcher.releasePointerCapture?.(press.id), press = null, delete launcher.dataset.dragging, dragged && e.type === "pointerup" && (suppressClick = !0, win.setTimeout(() => {
        suppressClick = !1;
      }, 0), savePosition(deps.storage, deps.siteKey, pos).catch(() => {
      })));
    };
    launcher.addEventListener("pointerup", endPress), launcher.addEventListener("pointercancel", endPress), launcher.addEventListener("click", (e) => {
      if (e.preventDefault(), suppressClick || dragged) {
        suppressClick = !1, dragged = !1;
        return;
      }
      toggle();
    }), launcher.addEventListener("keydown", (e) => {
      (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle());
    }), resetBtn.addEventListener("click", () => {
      handle.resetPosition();
    }), closeBtn.addEventListener("click", () => doClose(!0));
    let onKey = (e) => {
      open && e.key === "Escape" && doClose(!0), ctrlS && e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === "s" && (e.preventDefault(), toggle());
    }, setContentSize = (size) => {
      let { width, height } = size;
      typeof width != "number" || typeof height != "number" || !(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height) || (content = { width, height }, place());
    }, onMessage = (e) => {
      if (!deps.extOrigin || e.origin !== deps.extOrigin || !frame || e.source !== frame.contentWindow) return;
      let type = e.data?.type;
      type === PANEL_CLOSE && doClose(!0), type === PANEL_RESIZE && setContentSize(e.data);
    }, onResize = () => place(), isField = (t) => {
      let el = t;
      return !!el && (el.isContentEditable === !0 || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName ?? ""));
    }, ours = (t) => t instanceof win.Node && (launcher.contains(t) || panel.contains(t)), onStray = (e) => {
      if (!(!open || e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey || e.isComposing) && !(isField(e.target) || ours(e.target)) && (e.preventDefault(), e.stopImmediatePropagation(), e.type === "keydown")) {
        if (deps.embed?.typed) {
          deps.embed.typed(e.key);
          return;
        }
        frame?.focus(), frame?.contentWindow && frameReady && deps.extOrigin && frame.contentWindow.postMessage({ type: PANEL_TYPE, key: e.key }, deps.extOrigin);
      }
    }, STRAY_EVENTS = ["keydown", "keypress", "keyup"];
    for (let t of STRAY_EVENTS) win.addEventListener(t, onStray, !0);
    doc.addEventListener("keydown", onKey, !0), win.addEventListener("message", onMessage), win.addEventListener("resize", onResize), panel.dataset.open = "false", renderText(), place(), doc.documentElement.append(panel, launcher);
    let handle = {
      launcher,
      panel,
      isOpen: () => open,
      open: doOpen,
      close: (refocus = !1) => doClose(refocus),
      toggle,
      setContentSize,
      async resetPosition() {
        pos = { ...DEFAULT_POS }, place(), await resetPosition(deps.storage, deps.siteKey);
      },
      applySettings(s) {
        ctrlS = ctrlSEnabled(s), renderText();
      },
      applyPositions(all) {
        if (press) return;
        let p = all[deps.siteKey];
        pos = isValidPos(p) ? { ...p } : { ...DEFAULT_POS }, place();
      },
      destroy() {
        doc.removeEventListener("keydown", onKey, !0);
        for (let t of STRAY_EVENTS) win.removeEventListener(t, onStray, !0);
        win.removeEventListener("message", onMessage), win.removeEventListener("resize", onResize), launcher.remove(), panel.remove();
      }
    };
    return handle;
  }

  // scripts/assd-house-index/extension/src/panel.ts
  var SORT_LABELS = {
    name: ["Sort by", "Name"],
    number: ["Sort by", "#"],
    id: ["Sort by", "ID"],
    address: ["Sort by", "Address"]
  }, MIN_WIDTH = 360, MIN_WIDTH_SEARCH = 240, MAX_WIDTH = 600;
  function measureNatural(root, minWidth = MIN_WIDTH) {
    let saved = root.getAttribute("style");
    root.style.cssText += `;width:max-content;min-width:${minWidth}px;max-width:${MAX_WIDTH}px;height:auto;max-height:none`;
    let box = root.getBoundingClientRect(), size = { width: Math.ceil(box.width), height: Math.ceil(box.height) };
    return saved === null ? root.removeAttribute("style") : root.setAttribute("style", saved), size;
  }
  function mountPanel(root, deps) {
    let doc = deps.doc ?? root.ownerDocument;
    root.textContent = "", root.classList.add("ahi-panel");
    let listWrap = doc.createElement("div");
    listWrap.className = "ahi-list-wrap";
    let list = doc.createElement("ul");
    list.className = "ahi-list", list.setAttribute("role", "listbox"), listWrap.appendChild(list);
    let sortArea = doc.createElement("div");
    sortArea.className = "ahi-sort";
    let sortButtons = /* @__PURE__ */ new Map();
    for (let key of SORT_KEYS) {
      let b = doc.createElement("button");
      b.type = "button", b.className = "ahi-sort-btn", b.dataset.sort = key;
      let [l1, l2] = SORT_LABELS[key];
      b.append(l1, doc.createElement("br"), l2), sortArea.appendChild(b), sortButtons.set(key, b);
    }
    let search = doc.createElement("input");
    search.type = "text", search.className = "ahi-search", search.placeholder = "Search (name, ID, #, address)...", search.setAttribute("aria-label", "Search houses"), search.autocomplete = "off", search.spellcheck = !1, root.append(listWrap, sortArea, search);
    let sortBy = "name", item = (cls = "") => {
      let li = doc.createElement("li");
      return cls && (li.className = cls), li;
    }, linkRow = (li, h, title) => {
      li.setAttribute("role", "option"), li.title = title, h.link ? li.dataset.link = h.link : (li.classList.add("ahi-nolink"), li.title = "No link for this house in the imported file");
    }, showMessage = (text, cls, onClick) => {
      let li = item(cls);
      li.textContent = text, onClick && li.addEventListener("click", onClick), list.replaceChildren(li);
    }, showNoData = () => deps.data()?.houses.length ? !1 : (showMessage(deps.noDataText ?? "No house list loaded. Click here to import one on the options page.", "ahi-empty", deps.openOptions), !0), widest = 0, report = () => {
      if (!deps.onSize) return;
      let searching = sortArea.hidden, s = (deps.measure ?? measureNatural)(root, searching ? MIN_WIDTH_SEARCH : MIN_WIDTH);
      widest = searching ? Math.max(widest, s.width) : 0, deps.onSize({ width: searching ? widest : s.width, height: s.height });
    }, drawFullList = (by) => {
      sortBy = by, sortArea.hidden = !1;
      for (let [k, b] of sortButtons) b.classList.toggle("active", k === by);
      if (showNoData()) return;
      let rows = sortHouses(deps.data().houses, by).map((h) => {
        let li = item(), t = rowText(h, by), strong = doc.createElement("strong");
        return strong.textContent = t.strong, li.append(strong, t.rest), linkRow(li, h, t.strong + t.rest), li;
      });
      list.replaceChildren(...rows), listWrap.scrollTop = 0;
    }, drawResults = (q) => {
      if (sortArea.hidden = !0, showNoData()) return;
      let matches = searchHouses(deps.data().houses, q, 5);
      if (!matches.length) {
        showMessage("No results", "no-results");
        return;
      }
      let rows = matches.slice().reverse().map((h, i, arr) => {
        let li = item(i === arr.length - 1 ? "highlight" : ""), t = resultText(h);
        return li.append(t.line1, doc.createElement("br"), t.line2), linkRow(li, h, `${t.line1}
${t.line2}`), li;
      });
      list.replaceChildren(...rows), rows[rows.length - 1].scrollIntoView?.({ block: "nearest" });
    }, showFullList = (by) => {
      drawFullList(by), report();
    }, showResults = (q) => {
      drawResults(q), report();
    }, render = () => {
      let q = search.value.trim();
      q ? showResults(q) : showFullList(sortBy);
    }, activate = (li, background = !1) => {
      let link = safeLink(li?.dataset?.link);
      link && deps.openLink(link, background);
    };
    sortArea.addEventListener("click", (e) => {
      let b = e.target.closest("button[data-sort]");
      b && showFullList(b.dataset.sort);
    }), search.addEventListener("input", render), list.addEventListener("click", (e) => activate(e.target.closest("li[data-link]"), e.ctrlKey || e.metaKey)), list.addEventListener("auxclick", (e) => {
      e.button === 1 && (e.preventDefault(), activate(e.target.closest("li[data-link]"), !0));
    });
    let move = (step) => {
      let items = Array.from(list.querySelectorAll("li[role=option]"));
      if (!items.length) return;
      let cur = list.querySelector(".highlight"), idx = items.indexOf(cur), next = idx < 0 ? step === 1 ? 0 : items.length - 1 : (idx + step + items.length) % items.length;
      for (let li of items) li.classList.remove("highlight");
      items[next].classList.add("highlight"), items[next].scrollIntoView?.({ block: "nearest" });
    }, onKey = (e) => {
      if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === "s") {
        e.preventDefault(), deps.ctrlS?.() !== !1 && deps.close();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault(), deps.close();
        return;
      }
      e.target === search && (e.key === "ArrowDown" ? (e.preventDefault(), move(1)) : e.key === "ArrowUp" ? (e.preventDefault(), move(-1)) : e.key === "Enter" && (e.preventDefault(), activate(list.querySelector(".highlight"), e.ctrlKey || e.metaKey)));
    };
    return doc.addEventListener("keydown", onKey, !0), showFullList("name"), {
      reset() {
        search.value = "", showFullList("name");
      },
      focusInput() {
        search.focus();
      },
      type(ch) {
        search.focus(), search.value += ch, render();
      },
      refresh: render,
      destroy() {
        doc.removeEventListener("keydown", onKey, !0), root.textContent = "";
      }
    };
  }

  // scripts/assd-house-index/extension/src/prompt.ts
  var WORK_AI_PROMPT = `I need the house table below converted into one JSON file that I can download and
import into a browser tool. The output must follow this exact format.

FORMAT
{
  "kind": "assd-houses",
  "schemaVersion": 1,
  "generatedAt": "<today, YYYY-MM-DD>",
  "source": "<which table/page this came from and its as-of date, one line>",
  "houses": [ <one entry per house / row of the table> ]
}

Each house:
{ "code": "<the house ID exactly as in the table, e.g. DK-K1>",
  "houseNumber": <the house number as a plain whole number, e.g. 12>,
  "name": "<house name>",
  "city": "<city>",
  "country": "<ISO 2-letter country code>",
  "address": "<street and number, postcode, city>",
  "link": "<the booking-system page address of this house>",
  "aliases": [ <other names or short names staff use for this house, if any> ] }

RULES
1. One entry per house in the table. Do not drop, merge or invent houses. Keep the
   order of the table.
2. Copy codes, names and addresses exactly as written. Do not translate or
   "correct" them.
3. "houseNumber" is a number without quotes. If the table has no house number for
   a house, or it is unclear, use null.
4. "link": take it from the table if the table has it. Otherwise take it from the
   previous file I attached: find the same house by its code (ignore dashes and
   upper/lower case, so DKK1 = DK-K1) and copy its "link" exactly. If the house is
   not in the previous file, use null. Never build, guess or complete a link
   yourself, even if other links look like a pattern.
5. Blank, unclear or contradictory cells are null. Never guess and never fill in
   from general knowledge. "aliases" may be an empty list.
6. If I attach a previous file, keep the "aliases" it has for houses that still
   exist.
7. Use exactly the field names above, with this spelling. No other fields.

OUTPUT
- The complete JSON as a downloadable file named assd-houses-<YYYY-MM-DD>.json.
  If you cannot create files, output it as one single \`\`\`json code block and
  nothing else inside that block. It must be valid JSON (no comments, no trailing
  commas).
- After the file: one short check list:
  - number of houses
  - houses whose "link" is null (code and name)
  - houses that were in the previous file but are not in the table any more
  - every other null you set because a cell was unclear (not just blank), with
    the reason

THE TABLE
<paste the table here, or attach it / name the page>
`;

  // scripts/assd-house-index/extension/static/launcher.css
  var launcher_default = `

ahi-launcher#ahi-launcher,
ahi-panel#ahi-panel,
ahi-panel#ahi-panel * {
  all: initial !important;
}

ahi-launcher#ahi-launcher {
  position: fixed !important;
  z-index: 999999 !important;
  width: 70px !important;
  height: 70px !important;
  box-sizing: border-box !important;
  border-radius: 50% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  font: 11px/1.3 Arial, sans-serif !important;
  text-align: center !important;
  cursor: pointer !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  touch-action: none !important;
  background: #007BFF !important;
  color: #fff !important;
  transition: background 0.3s !important;
}
ahi-launcher#ahi-launcher:hover { background: #0056b3 !important; }
ahi-launcher#ahi-launcher[data-dragging="true"] { cursor: grabbing !important; }
ahi-launcher#ahi-launcher:focus-visible { outline: 2px solid #fff !important; outline-offset: 2px !important; }
ahi-launcher#ahi-launcher ahi-line {
  all: initial !important;
  display: block !important;
  font: inherit !important;
  color: inherit !important;
  pointer-events: none !important;
}

ahi-panel#ahi-panel {
  position: fixed !important;
  z-index: 999998 !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  background: #222 !important;
  border: 1px solid #444 !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6) !important;
  font: 12px Arial, sans-serif !important;
  color: #fff !important;
}
ahi-panel#ahi-panel[data-open="false"] { display: none !important; }
ahi-panel#ahi-panel ahi-frame-slot {
  display: flex !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
}
ahi-panel#ahi-panel iframe.ahi-frame {
  display: block !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  background: #222 !important;
  color-scheme: dark !important;
}
ahi-panel#ahi-panel ahi-bar {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 6px 8px !important;
  border-top: 1px solid #444 !important;
  background: #222 !important;
}
ahi-panel#ahi-panel button.ahi-bar-btn {
  display: inline-block !important;
  padding: 4px 10px !important;
  background: #333 !important;
  border: 1px solid #555 !important;
  border-radius: 5px !important;
  color: #fff !important;
  font: 12px Arial, sans-serif !important;
  cursor: pointer !important;
  transition: background 0.3s !important;
}
ahi-panel#ahi-panel button.ahi-bar-btn:hover { background: #007BFF !important; }
ahi-panel#ahi-panel button.ahi-bar-btn:focus-visible { outline: 2px solid #007BFF !important; outline-offset: 1px !important; }
ahi-panel#ahi-panel button.ahi-bar-close { font-size: 16px !important; line-height: 1 !important; padding: 2px 9px !important; }
`;

  // scripts/assd-house-index/extension/static/panel.css
  var panel_default = `

html, body {
  margin: 0;
  padding: 0;
  background: #222;
  color: #fff;
  font-family: Arial, sans-serif;
  color-scheme: dark;
}


html.ahi-embed, html.ahi-embed body { width: 100%; height: 100%; overflow: hidden; }

#app.ahi-panel {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: max-content;
  min-width: 240px;
  max-width: 600px;
  max-height: 580px;
  padding: 10px;
}
#app.ahi-panel:has(> .ahi-sort:not([hidden])) { min-width: 360px; }   
html.ahi-embed #app.ahi-panel { width: 100%; height: 100%; min-width: 0; max-width: none; max-height: none; }

.ahi-list-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  
  scrollbar-gutter: stable;
  margin-bottom: 10px;
}

.ahi-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ahi-list li {
  padding: 10px;
  background: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 5px;
  margin-bottom: 5px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.3s;
}
.ahi-list li:hover,
.ahi-list li.highlight { background: #007BFF; }
.ahi-list li.ahi-nolink { color: #aaa; cursor: default; }
.ahi-list li.ahi-nolink.highlight { background: #444; }
.ahi-list li.ahi-nolink:hover { background: #333; }


.ahi-list li.no-results {
  background: #3d0000;
  color: #ff6b6b;
  cursor: default;
  text-align: center;
  font-style: italic;
}
.ahi-list li.no-results:hover { background: #3d0000; }
.ahi-list li.ahi-empty { white-space: normal; text-align: center; color: #aaa; }
.ahi-list li.ahi-empty:hover { background: #0056b3; color: #fff; }

.ahi-sort {
  flex-shrink: 0;
  display: flex;
  gap: 5px;
  justify-content: space-between;
  margin-bottom: 10px;
}
.ahi-sort[hidden] { display: none; }

.ahi-sort-btn {
  flex: 1;
  height: 48px;
  padding: 0 10px;
  box-sizing: border-box;
  background: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 5px;
  cursor: pointer;
  font: 12px/1.2 Arial, sans-serif;
  text-align: center;
  transition: background 0.3s;
}
.ahi-sort-btn.active { background: #007BFF; }
.ahi-sort-btn:hover { background: #0056b3; }

.ahi-search {
  flex-shrink: 0;
  padding: 10px;
  height: 48px;
  border: 1px solid #555;
  border-radius: 5px;
  background: #333;
  color: #fff;
  font: 14px Arial, sans-serif;
  box-sizing: border-box;
  width: 100%;
  outline: none;
}
.ahi-search:focus { border-color: #007BFF; }
`;

  // scripts/assd-house-index/extension/static/userscript.css
  var userscript_default = `

ahi-panel#ahi-panel ahi-bar-group {
  display: flex !important;
  gap: 8px !important;
}

ahi-toast {
  all: initial !important;
  position: fixed !important;
  z-index: 999999 !important;
  max-width: 360px !important;
  box-sizing: border-box !important;
  padding: 8px 12px !important;
  background: #333 !important;
  border: 1px solid #555 !important;
  border-radius: 5px !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6) !important;
  color: #fff !important;
  font: 12px/1.4 Arial, sans-serif !important;
  white-space: normal !important;
}
ahi-toast[hidden] { display: none !important; }
`;

  // scripts/assd-house-index/extension/src/userscript.ts
  var POSITION_SITES = ["https://*.assd.com/*"], TOAST_MS = 6e3, PICKER_ID = "ahi-file-picker";
  function gmStorageArea(gm) {
    return {
      async get(key) {
        let v = gm.getValue(key);
        return v === void 0 ? {} : { [key]: v };
      },
      async set(items) {
        for (let [k, v] of Object.entries(items)) gm.setValue(k, v);
      }
    };
  }
  function importMessage(name, r) {
    return r.ok ? `Imported ${r.houses} houses from ${name}.` + (r.warnings.length ? ` Warnings: ${r.warnings.join("; ")}.` : "") : `Import failed — ${r.error}. The previous list is unchanged.`;
  }
  async function startUserscript(deps) {
    let doc = deps.doc ?? document;
    if (doc.getElementById("ahi-launcher")) return null;
    deps.addStyle(launcher_default + `
` + userscript_default);
    let { storage } = deps, pattern = findSiteForUrl(deps.href, POSITION_SITES), siteKey = pattern ? siteKeyFromPattern(pattern) : siteKeyForUrl(deps.href) ?? "", data = await loadHouses(storage).catch(() => null), panel = null, panelFrame = null, toastEl = doc.createElement("ahi-toast");
    toastEl.hidden = !0;
    let toastTimer = 0, win = doc.defaultView ?? window, toast = (text) => {
      toastEl.textContent = text;
      let r = launcher.launcher.getBoundingClientRect(), vw = viewportEl(doc).clientWidth || win.innerWidth, vh = viewportEl(doc).clientHeight || win.innerHeight;
      toastEl.style.setProperty("right", `${Math.max(8, vw - r.left + 8)}px`, "important"), toastEl.style.setProperty("bottom", `${Math.max(8, vh - r.bottom)}px`, "important"), toastEl.hidden = !1, win.clearTimeout(toastTimer), toastTimer = win.setTimeout(() => {
        toastEl.hidden = !0;
      }, TOAST_MS);
    }, reload = async () => {
      data = await loadHouses(storage).catch(() => null), panel?.refresh();
    }, importText = async (name, text) => {
      let r = await importHouses(storage, text);
      toast(importMessage(name, r)), await reload(), launcher.isOpen() && (panelFrame?.focus(), panel?.focusInput());
    }, pickFile2 = () => {
      if (deps.pickFile) {
        deps.pickFile((n, t) => void importText(n, t));
        return;
      }
      doc.getElementById(PICKER_ID)?.remove();
      let input = doc.createElement("input");
      input.id = PICKER_ID, input.type = "file", input.accept = "application/json,.json", input.hidden = !0, input.style.setProperty("display", "none", "important"), doc.documentElement.appendChild(input), input.addEventListener("change", async () => {
        input.remove();
        let file = input.files?.[0];
        if (!file) return;
        let text;
        try {
          text = await file.text();
        } catch (e) {
          toast(`Import failed — could not read ${file.name}: ${e instanceof Error ? e.message : String(e)}`);
          return;
        }
        await importText(file.name, text);
      }), input.click();
    }, positions = await loadPositions(storage), launcher = mountLauncher({
      storage,
      siteKey,
      doc,
      position: positions[siteKey],
      buttons: [{ label: "Import list", onClick: pickFile2 }],
      embed: {
        mount(slot) {
          let frame = doc.createElement("iframe");
          frame.className = "ahi-frame", frame.title = "House index", slot.appendChild(frame);
          let build = () => {
            let fdoc = frame.contentDocument;
            if (!fdoc || fdoc.getElementById("app")) return;
            fdoc.documentElement.classList.add("ahi-embed");
            try {
              let sheet = new fdoc.defaultView.CSSStyleSheet();
              sheet.replaceSync(panel_default), fdoc.adoptedStyleSheets = [sheet];
            } catch {
              let style = fdoc.createElement("style");
              style.textContent = panel_default, fdoc.head.appendChild(style);
            }
            let root = fdoc.createElement("div");
            root.id = "app", fdoc.body.appendChild(root), panel?.destroy(), panel = mountPanel(root, {
              doc: fdoc,
              data: () => data,
              close: () => launcher.close(!0),
              openOptions: pickFile2,
              noDataText: "No house list loaded. Click here to import the file (assd-houses JSON).",
              onSize: (size) => launcher.setContentSize(size),
              openLink: (url, background) => {
                if (!background && pattern) {
                  launcher.close(), deps.navigate(url);
                  return;
                }
                deps.openInTab(url, background), background || launcher.close();
              }
            }), launcher.isOpen() && (panel.reset(), frame.focus(), panel.focusInput());
          };
          build(), frame.addEventListener("load", build), panelFrame = frame;
        },
        opened() {
          panel?.reset(), panelFrame?.focus(), panel?.focusInput();
        },
        typed(ch) {
          panelFrame?.focus(), panel?.type(ch);
        }
      }
    });
    return doc.documentElement.appendChild(toastEl), deps.registerMenuCommand("Import house list…", () => {
      launcher.open(), pickFile2();
    }), deps.registerMenuCommand("Remove house list", () => {
      deps.confirm("Remove the imported house list from this browser?") && removeHouses(storage).then(reload).then(() => toast("House list removed from this browser."));
    }), deps.registerMenuCommand("Copy work-AI prompt", () => {
      deps.setClipboard(WORK_AI_PROMPT), toast("Work-AI prompt copied.");
    }), deps.registerMenuCommand("Reset launcher position", () => {
      launcher.resetPosition();
    }), deps.onValueChange(HOUSES_KEY, () => {
      reload();
    }), deps.onValueChange(LAUNCHER_POS_KEY, (v) => launcher.applyPositions(v ?? {})), { launcher, importText, toast };
  }
  function start2() {
    typeof GM_getValue != "function" || typeof window > "u" || window !== window.top || startUserscript({
      storage: gmStorageArea({ getValue: (k) => GM_getValue(k), setValue: (k, v) => GM_setValue(k, v) }),
      href: location.href,
      openInTab: (url, background) => {
        GM_openInTab(url, { active: !background, insert: !0 });
      },
      navigate: (url) => {
        location.assign(url);
      },
      addStyle: (css) => {
        GM_addStyle(css);
      },
      setClipboard: (text) => GM_setClipboard(text, "text"),
      registerMenuCommand: (caption, onClick) => {
        GM_registerMenuCommand(caption, onClick);
      },
      onValueChange: (key, cb) => {
        GM_addValueChangeListener(key, (_k, _old, nv) => cb(nv));
      },
      confirm: (text) => window.confirm(text)
    });
  }

  // scripts/assd-login/src/main.js
  function start3() {
    (function() {
      "use strict";
      let USERNAME_SELECTOR = 'input[type="text"], input[type="email"]', PASSWORD_SELECTOR = 'input[type="password"]', LOGIN_BUTTON_SEL = 'input.btn.btn-default.center-block[name="submit"][type="submit"]', TAGES_LINK_SELECTOR = 'a[href="/a_dayview/index"][title="Tagesübersicht"]', RESERV_LINK_SELECTOR = 'a[href="/s_reser/list"][title="Reservierung"]', LOGIN_DONE_KEY = "assd-login-done", NAV_DONE_KEY = "assd-nav-done";
      if (sessionStorage.getItem(LOGIN_DONE_KEY) && sessionStorage.getItem(NAV_DONE_KEY))
        return;
      let postLoginObserver = null, observerTimeoutId = null, navClicked = !1;
      function setupPostLoginClicks() {
        if (postLoginObserver || (sessionStorage.setItem(LOGIN_DONE_KEY, "1"), sessionStorage.getItem(NAV_DONE_KEY))) return;
        let tagesLink = document.querySelector(TAGES_LINK_SELECTOR), reservLink = document.querySelector(RESERV_LINK_SELECTOR);
        if (tagesLink && reservLink) {
          console.log("[assd-login] Both post-login links ready; clicking..."), tagesLink.click(), setTimeout(() => {
            reservLink.click(), sessionStorage.setItem(NAV_DONE_KEY, "1");
          }, 800);
          return;
        }
        console.log("[assd-login] Setting up observer for post-login links..."), postLoginObserver = new MutationObserver(() => {
          if (navClicked) return;
          let tagesLink2 = document.querySelector(TAGES_LINK_SELECTOR), reservLink2 = document.querySelector(RESERV_LINK_SELECTOR);
          tagesLink2 && reservLink2 && (console.log("[assd-login] Post-login links detected; clicking..."), navClicked = !0, tagesLink2.click(), setTimeout(() => {
            reservLink2.click(), sessionStorage.setItem(NAV_DONE_KEY, "1");
          }, 800), postLoginObserver.disconnect(), clearTimeout(observerTimeoutId));
        }), postLoginObserver.observe(document.body, { childList: !0, subtree: !0 }), observerTimeoutId = setTimeout(() => {
          console.log("[assd-login] Observer timeout; giving up on nav links."), postLoginObserver.disconnect();
        }, 15e3);
      }
      window.addEventListener("load", () => {
        let polls = 0;
        setTimeout(checkAndAct, 1500);
        function checkAndAct() {
          let userField = document.querySelector(USERNAME_SELECTOR), passField = document.querySelector(PASSWORD_SELECTOR), loginBtn = document.querySelector(LOGIN_BUTTON_SEL);
          if (userField && passField && loginBtn) {
            if (userField.value && passField.value) {
              console.log("[assd-login] Credentials ready; submitting..."), loginBtn.click();
              return;
            }
            if (++polls >= 30) {
              console.log("[assd-login] Bitwarden fill timeout; giving up.");
              return;
            }
            console.log("[assd-login] Waiting for Bitwarden fill..."), setTimeout(checkAndAct, 1e3);
          } else
            setupPostLoginClicks();
        }
      });
    })();
  }

  // scripts/assd-ocr-assist/src/main.js
  function start4() {
    (function() {
      "use strict";
      GM_addElement("link", {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400&display=swap"
      }), GM_addStyle(`
    input[id^="arrival_ds"] {
      height: 32px !important;
      width: auto !important;
      font-size: 32px !important;
      font-family: "Source Code Pro", Consolas, Monaco, monospace;
      color: #000 !important;
      background-color: #fff !important;
    }

    input[id^="number"] {
      height: 48px !important;
      font-size: 48px !important;
      font-family: "Source Code Pro", Consolas, Monaco, monospace;
      color: #000;
      background-color: #fff;
    }
    input#number {
      background: #fff;
    }

    input[id^="beds"] {
      height: 48px !important;
      font-size: 48px !important;
      font-family: "Source Code Pro", Consolas, Monaco, monospace;
      color: #000;
      background-color: #fff !important;
      min-height: 50px;
      max-height: 50px;
      min-width: 100px;
      max-width: 100px;
    }
    input#bedsbooked {
      background-color: #fff;
      min-height: 50px;
      max-height: 50px;
      min-width: 100px;
      max-width: 100px;
    }

    input#match2 {
      font-size: 32px !important;
      height: auto !important;
      width: auto !important;
      font-family: "Source Code Pro", Consolas, Monaco, monospace;
      color: #000;
      background: #fff;
    }
    input#match3 {
      display: none;
    }

    #number {
      font-size: 48px !important;
      height: auto !important;
      font-family: "Source Code Pro", Consolas, Monaco, monospace;
      min-height: 50px;
      max-height: 50px;
      min-width: 100px;
      max-width: 100px;
    }

    #head .pms_title {
      font-size: 32px !important;
      font-family: "Source Code Pro", Consolas, Monaco, monospace;
      color: #000;
      background: #fff;
    }

    button#regcode {
      font-size: 32px !important;
      height: auto !important;
      font-family: "Source Code Pro", Consolas, Monaco, monospace;
    }
  `), GM_addStyle(`
    div.loader {
      width: 2000px !important;
      height: 500px !important;
      background: #000 !important;
      display: block !important;
    }
  `);
    })();
  }

  // scripts/novomind-confirm-delete/src/main.js
  var LOG = "[work-browser-tools:novomind-confirm-delete]", DELETE_BUTTON = "#mailToolbarBtn_delete", CONFIRM = ".mceWrapper.mceModal.mceConfirm", OK_BUTTON = ".mceButton.mceOk", TEXTS = ["Die Nachricht wurde noch nicht beantwortet", "Nachricht jetzt senden"];
  function findOk(doc) {
    for (let modal of doc.querySelectorAll(CONFIRM)) {
      let text = (modal.querySelector(".mceContent") || modal).textContent || "";
      if (TEXTS.some((t) => text.includes(t))) {
        let ok = modal.querySelector(OK_BUTTON);
        if (ok) return ok;
      }
    }
    return null;
  }
  function confirmNext(doc) {
    let now2 = findOk(doc);
    if (now2) return void click(now2);
    let timer = 0, obs = new MutationObserver(() => {
      let ok = findOk(doc);
      ok && (stop(), click(ok));
    }), stop = () => {
      obs.disconnect(), clearTimeout(timer);
    };
    obs.observe(doc.body || doc.documentElement, { childList: !0, subtree: !0 }), timer = setTimeout(stop, 2e3);
  }
  function click(ok) {
    ok.click(), console.info(LOG, "confirmed the delete");
  }
  function start5(doc = document) {
    doc.addEventListener("click", (e) => {
      let t = e.target;
      t && typeof t.closest == "function" && t.closest(DELETE_BUTTON) && confirmNext(doc);
    }, !0);
  }

  // scripts/novomind-email-response-index/src/main.js
  var TEMPLATES_SETTING = {
    key: "templatesUrl",
    caption: "Set templates address…",
    question: "Address of the templates file (the raw JSON, https://…):",
    check: checkHttpsUrl
  };
  function start6() {
    (function() {
      "use strict";
      let lastFocusedElement = null, lastIframe = null, searchBoxContainer = null, input, ul, highlightedIndex = -1, selectedLanguage = "DE", filteredTemplates = [], templates = [], templatesLoadFailed = !1, selectedIndices = /* @__PURE__ */ new Set(), observer = null, selectedCountDiv = null, selectedSummaryEl = null, selectedNamesEl = null, languageLocked = !1, preF4FieldContent = null, pickerActive = !1, selectedClosingIndex = 0, closings = [], discardTimer = null, searchTimer = null, templatesPromise = null, templatesLoaded = !1, iframeScanScheduled = !1, listenedDocs = /* @__PURE__ */ new WeakSet();
      async function init() {
        console.log("Template Index Script: init() called."), document.removeEventListener("focusin", trackFocusedElement), document.removeEventListener("keydown", globalKeyListener), document.addEventListener("focusin", trackFocusedElement, { capture: !0 }), document.addEventListener("keydown", globalKeyListener, { capture: !0 }), observer && observer.disconnect(), observer = new MutationObserver(scheduleIframeScan), observer.observe(document.body, { childList: !0, subtree: !0 }), setupIframeListeners(), templatesPromise = null, templatesLoaded = !1;
      }
      function applyLoadedTemplates(loaded) {
        loaded.templates === null ? (templatesLoadFailed = !0, templates = []) : (templatesLoadFailed = !1, templates = sanitizeTemplates(loaded.templates)), closings = loaded.closings || [], templatesLoaded = !0;
      }
      function sanitizeTemplates(list) {
        if (!Array.isArray(list)) return [];
        let hasText = (t, lang) => typeof (t.text[lang] || t.text[lang.toUpperCase()]) == "string", valid = list.filter((t) => t && typeof t.title == "string" && t.text && typeof t.text == "object" && hasText(t, "en") && hasText(t, "de"));
        return valid.length < list.length && console.warn(`Template Index Script: skipped ${list.length - valid.length} malformed template(s).`), valid.forEach((t) => {
          t.tags = Array.isArray(t.tags) ? t.tags.filter((tag) => typeof tag == "string") : [];
        }), valid;
      }
      function ensureTemplates() {
        return templatesPromise || (templatesPromise = loadTemplates().then(applyLoadedTemplates)), templatesPromise;
      }
      function scheduleIframeScan() {
        iframeScanScheduled || (iframeScanScheduled = !0, requestAnimationFrame(() => {
          iframeScanScheduled = !1, setupIframeListeners();
        }));
      }
      function setupIframeListeners() {
        document.querySelectorAll("iframe").forEach((iframe) => {
          iframe.dataset.scriptLoadHook || (iframe.dataset.scriptLoadHook = "true", iframe.addEventListener("load", () => {
            lastIframe === iframe && (lastFocusedElement = null, lastIframe = null), attachToIframeDoc(iframe);
          })), attachToIframeDoc(iframe);
        });
      }
      function attachToIframeDoc(iframe) {
        let doc = iframe.contentDocument;
        !doc || listenedDocs.has(doc) || (listenedDocs.add(doc), doc.addEventListener("focusin", (e) => trackFocusedElementInIframe(e, iframe), { capture: !0 }), doc.addEventListener("keydown", (e) => globalKeyListenerInIframe(e, iframe), { capture: !0 }));
      }
      function trackFocusedElement(event) {
        if (searchBoxContainer && searchBoxContainer.contains(event.target)) return;
        let target = event.target;
        isEditable(target) && (lastFocusedElement = target, lastIframe = null);
      }
      function trackFocusedElementInIframe(event, iframe) {
        if (searchBoxContainer && searchBoxContainer.contains(event.target)) return;
        let target = event.target;
        isEditable(target) && (lastFocusedElement = target, lastIframe = iframe);
      }
      function globalKeyListener(event) {
        event.key === "F4" && (event.preventDefault(), event.stopPropagation(), createSearchBox());
      }
      function globalKeyListenerInIframe(event, iframe) {
        event.key === "F4" && (event.preventDefault(), event.stopPropagation(), createSearchBox());
      }
      function isEditable(el) {
        return el.tagName === "TEXTAREA" || el.tagName === "INPUT" && el.type === "text" || el.isContentEditable || el.contentEditable === "true";
      }
      function focusTargetAlive() {
        return !lastFocusedElement || !lastFocusedElement.isConnected ? !1 : lastIframe ? lastIframe.isConnected && lastIframe.contentDocument === lastFocusedElement.ownerDocument : !0;
      }
      function getTargetEditor() {
        if (typeof tinymce > "u" || !tinymce.get || !lastFocusedElement) return null;
        let frameDoc = lastIframe ? lastIframe.contentDocument : null;
        return tinymce.get().find((e) => {
          try {
            return e.getBody() === lastFocusedElement || frameDoc && e.getDoc() === frameDoc;
          } catch {
            return !1;
          }
        }) || null;
      }
      function insertHtml(html) {
        lastFocusedElement.focus();
        let editor = getTargetEditor();
        if (editor) {
          editor.focus(), editor.insertContent(html);
          return;
        }
        let doc = lastFocusedElement.ownerDocument;
        doc.execCommand ? doc.execCommand("insertHTML", !1, html) : lastFocusedElement.innerHTML += html;
      }
      function getCurrentFieldContent() {
        if (!lastFocusedElement) return "";
        let editor = getTargetEditor();
        return editor ? editor.getContent() : lastFocusedElement.tagName === "TEXTAREA" || lastFocusedElement.tagName === "INPUT" && lastFocusedElement.type === "text" ? lastFocusedElement.value : lastFocusedElement.innerHTML || "";
      }
      function restoreFieldContent(content) {
        if (!lastFocusedElement) return;
        let editor = getTargetEditor();
        if (editor) {
          editor.setContent(content);
          return;
        }
        if (lastFocusedElement.tagName === "TEXTAREA" || lastFocusedElement.tagName === "INPUT" && lastFocusedElement.type === "text") {
          lastFocusedElement.value = content;
          return;
        }
        lastFocusedElement.innerHTML = content;
      }
      function createSearchBox() {
        if (searchBoxContainer && (searchBoxContainer.remove(), searchBoxContainer = null, selectedIndices.clear(), languageLocked = !1, preF4FieldContent = null), removeClosingPicker(), !focusTargetAlive()) {
          lastFocusedElement = null, lastIframe = null, alert("No text box or contenteditable field was focused.");
          return;
        }
        searchBoxContainer = document.createElement("div"), searchBoxContainer.style.cssText = `
            position: absolute; z-index: 10000; font-family: Arial, sans-serif;
            background: white; border: 1px solid #ccc; border-radius: 4px;
            padding: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        `;
        let rect = lastIframe ? lastIframe.getBoundingClientRect() : lastFocusedElement.getBoundingClientRect();
        searchBoxContainer.style.top = `${rect.top + window.scrollY}px`, searchBoxContainer.style.left = `${rect.left + window.scrollX}px`;
        let topRowContainer = document.createElement("div");
        topRowContainer.style.cssText = "display: flex; align-items: center;", input = document.createElement("input"), Object.assign(input.style, {
          width: "200px",
          padding: "5px",
          fontSize: "14px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          display: "block"
        }), input.type = "text", input.placeholder = "Type to filter templates...", input.autocomplete = "off", input.autocorrect = "off", input.spellcheck = !1, input.name = "search_" + Math.random().toString(36).substr(2, 10), input.readOnly = !0, input.addEventListener("focus", () => input.readOnly = !1);
        let closeButton = document.createElement("button");
        closeButton.textContent = "X", closeButton.style.cssText = "font-size: 14px; cursor: pointer; margin-left: 5px;", closeButton.addEventListener("click", () => closeSearchBox({ discard: !0 }));
        let confirmButton = document.createElement("button");
        confirmButton.textContent = "✓", confirmButton.style.cssText = "font-size: 14px; cursor: pointer; margin-left: 5px; background: #007bff; color: white; border: none; border-radius: 3px; font-weight: bold; padding: 2px 10px;", confirmButton.addEventListener("click", () => {
          selectedIndices.size === 0 && highlightedIndex >= 0 && filteredTemplates.length > 0 ? (appendTemplateBody(filteredTemplates[highlightedIndex], !0, selectedLanguage), finalizeAndClose()) : selectedIndices.size > 0 && ([...selectedIndices].sort((a, b) => a - b).forEach((idx, i) => {
            appendTemplateBody(templates[idx], i === 0, selectedLanguage);
          }), selectedIndices.size > 1 ? showClosingPicker() : finalizeAndClose());
        }), topRowContainer.append(input, confirmButton, closeButton), selectedSummaryEl = document.createElement("div"), selectedSummaryEl.id = "selectedSummary", selectedSummaryEl.style.cssText = "font-size: 12px; padding: 4px 5px; color: #007bff; display: none;", selectedNamesEl = document.createElement("span"), selectedNamesEl.id = "selectedNames", selectedSummaryEl.appendChild(document.createTextNode("Selected templates: ")), selectedSummaryEl.appendChild(selectedNamesEl);
        let titleBar = document.createElement("div");
        titleBar.style.cssText = "font-size: 12px; font-weight: bold; padding: 6px 8px; background: linear-gradient(to bottom, #007bff, #0056b3); color: white; border-radius: 3px 3px 0 0; margin: -5px -5px 5px -5px; display: flex; justify-content: space-between; align-items: center;", titleBar.innerHTML = '<span>Email Templates</span><span style="font-size:10px;font-weight:normal;opacity:0.8;">F4 to toggle</span>', searchBoxContainer.insertBefore(titleBar, searchBoxContainer.firstChild), ul = document.createElement("ul"), ul.style.cssText = `
            list-style: none; margin: 5px 0 0 0; padding: 0; background: white;
            border: 1px solid #ccc; border-radius: 4px; max-height: 200px;
            overflow-y: auto; display: none;
        `, selectedCountDiv = document.createElement("div"), selectedCountDiv.id = "selectedCount", selectedCountDiv.style.cssText = "font-size: 12px; padding: 4px 8px; color: #007bff; display: none; border-bottom: 1px solid #eee;", searchBoxContainer.append(topRowContainer, selectedSummaryEl, selectedCountDiv, ul);
        let shortcutsDiv = document.createElement("div");
        shortcutsDiv.style.cssText = "font-size: 10px; color: #666; padding: 4px 5px; border-top: 1px solid #eee; margin-top: 2px; cursor: pointer;", shortcutsDiv.textContent = "⌨ Shortcuts";
        let shortcutsList = document.createElement("div");
        if (shortcutsList.style.cssText = "display: none; font-size: 10px; color: #666; padding: 4px 5px; line-height: 1.6; border-top: 1px solid #eee;", shortcutsList.innerHTML = "↑↓ Navigate &nbsp; ←→ Switch EN/DE<br>Enter Confirm &nbsp; Shift+Enter Select<br>Esc Clear/Discard &nbsp; ✓ Confirm", shortcutsDiv.addEventListener("click", () => {
          shortcutsList.style.display = shortcutsList.style.display === "none" ? "block" : "none";
        }), searchBoxContainer.append(shortcutsDiv, shortcutsList), document.body.appendChild(searchBoxContainer), preF4FieldContent = getCurrentFieldContent(), searchBoxContainer.addEventListener("focusout", (e) => {
          discardTimer && clearTimeout(discardTimer), discardTimer = setTimeout(() => {
            discardTimer = null, !pickerActive && (!searchBoxContainer || !searchBoxContainer.contains(document.activeElement)) && closeSearchBox({ discard: !0 });
          }, 100);
        }), input.focus(), input.addEventListener("input", () => {
          searchTimer && clearTimeout(searchTimer), searchTimer = setTimeout(() => handleSearch(input.value), 150);
        }), input.addEventListener("keydown", handleInputNavigation, !0), handleSearch(""), !templatesLoaded) {
          let box = searchBoxContainer;
          ensureTemplates().then(() => {
            searchBoxContainer === box && handleSearch(input.value);
          });
        }
      }
      function handleSearch(query) {
        if (query = query.trim().toLowerCase(), ul.innerHTML = "", highlightedIndex = -1, templatesLoadFailed) {
          ul.style.display = "block";
          let li = document.createElement("li");
          li.style.cssText = "padding: 8px; color: red; display: flex; justify-content: space-between; align-items: center;", li.innerHTML = readSetting(TEMPLATES_SETTING.key) ? "<span>Failed to load templates.</span>" : '<span>No templates address set: Violentmonkey menu, "Set templates address…".</span>';
          let retryBtn = document.createElement("button");
          retryBtn.textContent = "Retry", retryBtn.style.cssText = "padding: 2px 8px; font-size: 11px; cursor: pointer;", retryBtn.addEventListener("click", async () => {
            li.textContent = "Loading...", templatesPromise = null, await ensureTemplates(), handleSearch(input.value);
          }), li.appendChild(retryBtn), ul.appendChild(li);
          return;
        }
        if (filteredTemplates = templates.filter(
          (t) => t.title.toLowerCase().includes(query) || t.tags.some((tag) => tag.toLowerCase().includes(query))
        ), filteredTemplates.length === 0) {
          ul.style.display = "none";
          return;
        }
        if (ul.style.display = "block", filteredTemplates.forEach((template, index) => {
          let li = document.createElement("li");
          li.style.cssText = `
                display: flex; justify-content: space-between; align-items: center;
                padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;
                user-select: none;
            `, li.tabIndex = -1;
          let stableIndex = templates.indexOf(template);
          selectedIndices.has(stableIndex) && (li.style.borderLeft = "3px solid #007bff", li.style.backgroundColor = "#f0f7ff");
          let title = document.createElement("span");
          title.textContent = template.title, title.style.flex = "1";
          let buttonContainer = document.createElement("div");
          buttonContainer.style.cssText = "display: flex; gap: 5px;";
          let buttonEN = createLangButton("EN", template.text.en, index), buttonDE = createLangButton("DE", template.text.de, index);
          buttonContainer.append(buttonEN, buttonDE), li.append(title, buttonContainer), li.addEventListener("mouseenter", () => {
            let stableIdx = templates.indexOf(template);
            selectedIndices.has(stableIdx) || (li.style.backgroundColor = "#e8e8e8");
          }), li.addEventListener("mouseleave", () => {
            let stableIdx = templates.indexOf(template);
            selectedIndices.has(stableIdx) || (li.style.backgroundColor = "");
          }), li.addEventListener("click", () => highlightResult(index)), ul.appendChild(li);
        }), highlightResult(0), selectedCountDiv && (selectedIndices.size > 0 ? (selectedCountDiv.style.display = "block", selectedCountDiv.textContent = selectedIndices.size + " selected") : selectedCountDiv.style.display = "none"), selectedSummaryEl && selectedNamesEl)
          if (selectedIndices.size > 0) {
            selectedSummaryEl.style.display = "block";
            let names = [];
            for (let idx of selectedIndices)
              idx < templates.length && names.push(templates[idx].title);
            selectedNamesEl.textContent = names.join(", ");
          } else
            selectedSummaryEl.style.display = "none";
      }
      function createLangButton(lang, text, index) {
        let button = document.createElement("button");
        return button.textContent = lang, button.style.cssText = `
            padding: 5px 10px; font-size: 12px; cursor: pointer;
            border: 1px solid #ccc; border-radius: 4px;
            transition: background 0.2s, color 0.2s, opacity 0.2s;
        `, button.addEventListener("click", (e) => {
          if (e.stopPropagation(), languageLocked && lang !== selectedLanguage || selectedIndices.has(templates.indexOf(filteredTemplates[index]))) return;
          selectedIndices.size === 0 && (selectedLanguage = lang, languageLocked = !0), selectedIndices.add(templates.indexOf(filteredTemplates[index]));
          let isFirst = selectedIndices.size === 1;
          appendTemplateBody(filteredTemplates[index], isFirst, selectedLanguage), handleSearch(input.value);
        }), button.addEventListener("mouseenter", () => {
          button.style.backgroundColor = "#007bff", button.style.color = "white";
        }), button.addEventListener("mouseleave", () => {
          updateButtonStyle(button, lang, index);
        }), updateButtonStyle(button, lang, index), button;
      }
      function updateButtonStyle(button, lang, index) {
        languageLocked && lang !== selectedLanguage ? (button.style.opacity = "0.4", button.style.cursor = "not-allowed") : (button.style.opacity = "1", button.style.cursor = "pointer"), index === highlightedIndex && lang === selectedLanguage ? (button.style.backgroundColor = "#007bff", button.style.color = "white") : (button.style.backgroundColor = "#ddd", button.style.color = "black");
      }
      function highlightResult(index) {
        highlightedIndex = index;
        let items = ul.querySelectorAll("li");
        items.forEach((item, i) => {
          if (i === index)
            item.style.backgroundColor = "#bde4ff";
          else if (selectedIndices.size > 0 && i < filteredTemplates.length) {
            let stableIdx = templates.indexOf(filteredTemplates[i]);
            selectedIndices.has(stableIdx) ? item.style.backgroundColor = "#f0f7ff" : item.style.backgroundColor = "";
          } else
            item.style.backgroundColor = "";
          item.querySelectorAll("button").forEach((btn) => {
            let lang = btn.textContent;
            updateButtonStyle(btn, lang, i);
          });
        }), index >= 0 && items[index] && items[index].scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      function handleInputNavigation(event) {
        if (ul.querySelectorAll("li").length)
          switch (event.key) {
            case "ArrowDown":
              highlightedIndex = (highlightedIndex + 1) % filteredTemplates.length, highlightResult(highlightedIndex);
              break;
            case "ArrowUp":
              highlightedIndex = (highlightedIndex - 1 + filteredTemplates.length) % filteredTemplates.length, highlightResult(highlightedIndex);
              break;
            case "ArrowLeft":
              if (languageLocked) return;
              selectedLanguage = "EN", highlightResult(highlightedIndex);
              break;
            case "ArrowRight":
              if (languageLocked) return;
              selectedLanguage = "DE", highlightResult(highlightedIndex);
              break;
            case "Enter":
              if (event.preventDefault(), event.stopPropagation(), !event.shiftKey)
                selectedIndices.size === 0 && highlightedIndex >= 0 ? (appendTemplateBody(filteredTemplates[highlightedIndex], !0, selectedLanguage), finalizeAndClose()) : ([...selectedIndices].sort((a, b) => a - b).forEach((idx, i) => {
                  appendTemplateBody(templates[idx], i === 0, selectedLanguage);
                }), selectedIndices.size > 1 ? showClosingPicker() : finalizeAndClose());
              else if (highlightedIndex >= 0 && filteredTemplates.length > 0) {
                let stableIdx = templates.indexOf(filteredTemplates[highlightedIndex]);
                selectedIndices.has(stableIdx) || (selectedIndices.size === 0 && (languageLocked = !0), selectedIndices.add(stableIdx), input.value = "", handleSearch(""));
              }
              break;
            case "Escape":
              selectedIndices.size > 0 ? (selectedIndices.clear(), languageLocked = !1, handleSearch(input.value)) : closeSearchBox({ discard: !0 });
              break;
          }
      }
      function getBodyOnly(template, lang) {
        let bodyText = template.bodyOnly && (template.bodyOnly[lang] || template.bodyOnly[lang.toUpperCase()]);
        if (bodyText) return bodyText;
        let textKey = template.text[lang] ? lang : lang.toUpperCase(), text = template.text[textKey];
        return text = text.replace(/^(Sehr geehrte Damen und Herren,|Dear Sir or Madam,)\n\n/, ""), text = text.replace(/^(vielen Dank für Ihre Nachricht\.|Thank you for your message\.)\n\n/, ""), text = text.replace(/\n\n(Bei weiteren Fragen stehen wir Ihnen (gerne )?zur Verfügung[.!]?|Wir freuen uns auf Ihre Rückmeldung\.?|If you have further questions you can always contact us\.?|We are looking forward to hearing from you\.?|If you have any questions, feel free to ask!)$/, ""), text.trim();
      }
      function appendTemplateBody(template, isFirst, lang) {
        if (!lastFocusedElement) return;
        let langKey = template.text[lang.toLowerCase()] ? lang.toLowerCase() : lang.toUpperCase(), text;
        isFirst ? (text = template.text[langKey].trim(), text = text.replace(/\n\n(Bei weiteren Fragen stehen wir Ihnen (gerne )?zur Verfügung[.!]?|Wir freuen uns auf Ihre Rückmeldung\.?|If you have further questions you can always contact us\.?|We are looking forward to hearing from you\.?|If you have any questions, feel free to ask!)$/, ""), text = text.replace(/\n/g, "<br>")) : text = "<br><br>" + getBodyOnly(template, lang.toLowerCase()).replace(/\n/g, "<br>"), insertHtml(text), input && input.focus();
      }
      function finalizeAndClose() {
        if (!lastFocusedElement) return;
        discardTimer && clearTimeout(discardTimer);
        let closing = "";
        closings.length > 0 && selectedClosingIndex >= 0 && selectedClosingIndex < closings.length && (closing = selectedLanguage === "DE" ? closings[selectedClosingIndex].de : closings[selectedClosingIndex].en);
        let name = readSetting(SIGNATURE_SETTING.key);
        name || console.info('[email-templates] no name to sign with: Violentmonkey menu, "Set the name you sign with…"');
        let nameLine = name ? "<br>" + name.replace(/[<>&"]/g, "") : "", signature = selectedLanguage === "DE" ? "<br><br>Freundliche Grüße," + nameLine : "<br><br>Kind regards," + nameLine, wrappedText = "";
        closing ? wrappedText = "<br><br>" + closing.replace(/\n/g, "<br>") + signature : wrappedText = signature, insertHtml(wrappedText), input && input.focus(), closeSearchBox();
      }
      function showClosingPicker() {
        pickerActive = !0;
        let existing = document.getElementById("closingPicker");
        existing && existing.remove();
        let pickerContainer = document.createElement("div");
        if (pickerContainer.id = "closingPicker", Object.assign(pickerContainer.style, {
          position: "absolute",
          zIndex: "10001",
          background: "white",
          border: "1px solid #007bff",
          borderRadius: "4px",
          padding: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          fontFamily: "Arial, sans-serif",
          minWidth: "300px"
        }), lastFocusedElement) {
          let rect = lastIframe ? lastIframe.getBoundingClientRect() : lastFocusedElement.getBoundingClientRect();
          pickerContainer.style.top = rect.top + window.scrollY + "px", pickerContainer.style.left = rect.left + window.scrollX + "px";
        }
        let pickerTitle = document.createElement("div");
        pickerTitle.style.cssText = "font-size: 12px; font-weight: bold; padding: 6px 8px; background: linear-gradient(to bottom, #007bff, #0056b3); color: white; border-radius: 3px 3px 0 0; margin: -8px -8px 8px -8px;", pickerTitle.textContent = "Select Closing", pickerContainer.insertBefore(pickerTitle, pickerContainer.firstChild);
        let DEFAULT_CLOSINGS = [
          { de: "Bei weiteren Fragen stehen wir Ihnen zur Verfügung.", en: "If you have further questions you can always contact us." },
          { de: "Wir freuen uns auf Ihre Rückmeldung.", en: "We are looking forward to hearing from you." }
        ], options = closings && closings.length > 0 ? closings : DEFAULT_CLOSINGS, pickerHighlightedIndex = 0, optionDivs = options.map(function(opt, idx) {
          let div = document.createElement("div");
          return div.style.cssText = "padding: 6px 10px; cursor: pointer; border-radius: 3px;", div.textContent = selectedLanguage === "DE" ? opt.de : opt.en, div.addEventListener("mouseenter", function() {
            highlightPickerOption(idx);
          }), div.addEventListener("click", function() {
            selectClosing(idx);
          }), div;
        });
        optionDivs.forEach(function(div) {
          pickerContainer.appendChild(div);
        }), optionDivs.length > 0 && (optionDivs[0].style.background = "#e8f0fe");
        function highlightPickerOption(idx) {
          pickerHighlightedIndex = idx, optionDivs.forEach(function(div, i) {
            div.style.background = i === idx ? "#e8f0fe" : "";
          });
        }
        function selectClosing(idx) {
          if (closings && closings.length > 0)
            selectedClosingIndex = idx;
          else {
            selectedClosingIndex = -1;
            let closingText = options[idx], closingHtml = "<br><br>" + (selectedLanguage === "DE" ? closingText.de : closingText.en).replace(/\n/g, "<br>");
            insertHtml(closingHtml);
          }
          pickerContainer.remove(), finalizeAndClose();
        }
        function skipClosing() {
          selectedClosingIndex = -1, pickerContainer.remove(), searchBoxContainer && (searchBoxContainer.style.display = ""), finalizeAndClose();
        }
        pickerContainer.addEventListener("keydown", function(e) {
          switch (e.key) {
            case "ArrowDown":
              e.preventDefault(), e.stopPropagation(), pickerHighlightedIndex = (pickerHighlightedIndex + 1) % options.length, highlightPickerOption(pickerHighlightedIndex);
              break;
            case "ArrowUp":
              e.preventDefault(), e.stopPropagation(), pickerHighlightedIndex = (pickerHighlightedIndex - 1 + options.length) % options.length, highlightPickerOption(pickerHighlightedIndex);
              break;
            case "Enter":
              e.preventDefault(), e.stopPropagation(), selectClosing(pickerHighlightedIndex);
              break;
            case "Escape":
              e.preventDefault(), e.stopPropagation(), skipClosing();
              break;
          }
        }), pickerContainer.addEventListener("focusout", () => {
          setTimeout(() => {
            !pickerContainer.isConnected || pickerContainer.contains(document.activeElement) || closeSearchBox({ discard: !0 });
          }, 100);
        }), pickerContainer.tabIndex = -1, searchBoxContainer && (searchBoxContainer.style.display = "none"), document.body.appendChild(pickerContainer), pickerContainer.focus(), requestAnimationFrame(() => {
          let pickerRect = pickerContainer.getBoundingClientRect();
          if (pickerRect.bottom > window.innerHeight && searchBoxContainer) {
            let searchRect = searchBoxContainer.getBoundingClientRect();
            pickerContainer.style.top = searchRect.top + window.scrollY - pickerRect.height - 4 + "px";
          }
          pickerRect.right > window.innerWidth && (pickerContainer.style.left = window.innerWidth - pickerRect.width - 10 + window.scrollX + "px");
        });
      }
      function removeClosingPicker() {
        let picker = document.getElementById("closingPicker");
        picker && picker.remove(), pickerActive = !1;
      }
      function closeSearchBox({ discard } = {}) {
        discardTimer && (clearTimeout(discardTimer), discardTimer = null), discard && preF4FieldContent !== null && restoreFieldContent(preF4FieldContent), removeClosingPicker(), searchBoxContainer && searchBoxContainer.remove(), searchBoxContainer = null, selectedIndices.clear(), languageLocked = !1, preF4FieldContent = null;
      }
      async function loadTemplates() {
        try {
          let url = readSetting(TEMPLATES_SETTING.key);
          if (!url) throw new Error('no templates address set (Violentmonkey menu: "Set templates address…")');
          let response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          let data = await response.json();
          return GM_setValue("templatesCache", JSON.stringify(data)), { templates: data.templates || data, closings: data.closings || [] };
        } catch (error) {
          console.error("Error loading templates:", error);
          let cached = GM_getValue("templatesCache", null);
          if (cached) {
            console.warn("Using cached templates.");
            let parsed = JSON.parse(cached);
            return { templates: parsed.templates || parsed, closings: parsed.closings || [] };
          }
          return { templates: null, closings: [] };
        }
      }
      init(), typeof GM_registerMenuCommand == "function" && (menuSetting(TEMPLATES_SETTING, () => {
        templatesPromise = null, templatesLoaded = !1;
      }), menuSetting(SIGNATURE_SETTING), GM_registerMenuCommand("Restart Script", async () => {
        console.clear(), console.log("Restarting Template Index Script!"), await init(), await ensureTemplates();
      }));
    })();
  }

  // scripts/novomind-house-contact-index/extension/src/contacts.ts
  var CONTACTS_KIND = "house-contacts";
  var isObj2 = (v) => !!v && typeof v == "object" && !Array.isArray(v), str2 = (v) => typeof v == "string" && v.trim() ? v.trim() : void 0, numText = (v) => typeof v == "number" && Number.isFinite(v) ? String(v) : str2(v), strList2 = (v) => {
    if (!Array.isArray(v)) return;
    let out = v.map(str2).filter((s) => !!s);
    return out.length ? out : void 0;
  }, SYNONYMS = {
    code: ["code", "houseId", "house_id", "houseCode", "house_code", "id"],
    houseNumber: ["houseNumber", "house_number", "number", "nr"],
    kurzwahl: ["kurzwahl", "shortDial", "short_dial"],
    phone: ["phone", "phoneNumber", "phone_number", "telephone", "tel"],
    email: ["email", "mail", "e-mail"],
    name: ["name", "houseName", "house_name"]
  }, KNOWN_KEYS = /* @__PURE__ */ new Set([
    ...Object.values(SYNONYMS).flat(),
    "address",
    "city",
    "country",
    "aliases",
    "notes",
    // Further numbers of a house (0.1.0–0.1.2 showed each as its own row).
    // Owner, 0.1.3: one number per house, so files that still carry them
    // import without a warning and the list is ignored.
    "numbers"
  ]);
  function cleanKurzwahl(k) {
    return k === void 0 ? void 0 : k.replace(/[\s()\-\u2010-\u2015\u2212]/g, "") || void 0;
  }
  function unwrap(text) {
    let t = text.replace(/^\ufeff/, "").trim(), fence = /^```[a-z]*\s*\n([\s\S]*?)\n?```$/i.exec(t);
    return fence ? fence[1] : t;
  }
  function parseContacts(raw) {
    let v = raw;
    if (typeof raw == "string")
      try {
        v = JSON.parse(unwrap(raw));
      } catch (e) {
        return { ok: !1, error: `not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
      }
    if (!isObj2(v)) return { ok: !1, error: "expected a JSON object" };
    if (v.kind !== CONTACTS_KIND)
      return { ok: !1, error: `"kind" must be "${CONTACTS_KIND}" — is this the right file? (it says ${JSON.stringify(v.kind ?? null)})` };
    if (v.schemaVersion !== 1)
      return { ok: !1, error: '"schemaVersion" must be 1' };
    if (!Array.isArray(v.houses)) return { ok: !1, error: '"houses" must be an array' };
    let warnings = [], renamed = /* @__PURE__ */ new Map(), unknownKeys = /* @__PURE__ */ new Set(), badNumbers = [], noDial = [], houses = [], pick2 = (h, key, as) => {
      for (let k of SYNONYMS[key]) {
        let val = as(h[k]);
        if (val !== void 0)
          return k !== key && renamed.set(k, key), val;
      }
    };
    if (v.houses.forEach((h, i) => {
      if (!isObj2(h)) {
        warnings.push(`house #${i + 1} skipped: not an object`);
        return;
      }
      let code = pick2(h, "code", numText), name = pick2(h, "name", str2);
      if (!code && !name) {
        warnings.push(`house #${i + 1} skipped: needs "code" or "name"`);
        return;
      }
      let label = code ?? name ?? "", houseNumber = null, rawNo = pick2(h, "houseNumber", numText);
      if (rawNo !== void 0) {
        let m = /^#?\s*(\d+)$/.exec(rawNo);
        m ? houseNumber = Number(m[1]) : badNumbers.push(label);
      }
      for (let k of Object.keys(h)) KNOWN_KEYS.has(k) || unknownKeys.add(k);
      let house = {
        code: code ?? "",
        houseNumber,
        name: name ?? code ?? "",
        kurzwahl: cleanKurzwahl(pick2(h, "kurzwahl", numText)),
        phone: pick2(h, "phone", numText),
        email: pick2(h, "email", str2),
        address: str2(h.address),
        city: str2(h.city),
        country: str2(h.country),
        aliases: strList2(h.aliases),
        notes: str2(h.notes)
      };
      for (let k of Object.keys(house)) house[k] === void 0 && delete house[k];
      !house.kurzwahl && !house.phone && noDial.push(label), houses.push(house);
    }), !houses.length) return { ok: !1, error: "no usable houses" };
    for (let [from, to] of renamed) warnings.push(`read "${from}" as "${to}"`);
    unknownKeys.size && warnings.push(`ignored unknown keys: ${[...unknownKeys].join(", ")}`), badNumbers.length && warnings.push(`house number isn't a whole number, left empty: ${listSome(badNumbers)}`), noDial.length && warnings.push(`no Kurzwahl or phone number: ${listSome(noDial)}`);
    let codes = houses.map((h) => normalize(h.code)).filter(Boolean), dupes = [...new Set(codes.filter((c, i) => codes.indexOf(c) !== i))];
    return dupes.length && warnings.push(`house code listed more than once (all kept): ${listSome(dupes)}`), {
      ok: !0,
      warnings,
      data: {
        kind: CONTACTS_KIND,
        schemaVersion: 1,
        ...str2(v.generatedAt) ? { generatedAt: str2(v.generatedAt) } : {},
        ...str2(v.source) ? { source: str2(v.source) } : {},
        houses
      }
    };
  }
  function listSome(items) {
    return items.slice(0, 5).join(", ") + (items.length > 5 ? `, … (${items.length} in all)` : "");
  }
  var DASHES2 = /[-\u2010-\u2015\u2212]/g;
  function normalize(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(DASHES2, "");
  }
  function fullNumber(phone) {
    return phone ? phone.replace(/[\s()/.\-\u2010-\u2015\u2212]/g, "") : "";
  }
  function dialString(n) {
    return n.kurzwahl || fullNumber(n.phone);
  }
  function rowOf(h) {
    return { house: h, dial: dialString(h), full: fullNumber(h.phone) };
  }
  function sortedHouses(data, by) {
    let rows = data.houses.map(rowOf), text = (r) => by === "name" ? r.house.name : by === "id" ? r.house.code : r.house.kurzwahl ?? "";
    return by === "number" ? rows.sort((a, b) => (a.house.houseNumber ?? 1 / 0) - (b.house.houseNumber ?? 1 / 0) || a.house.name.localeCompare(b.house.name)) : rows.sort((a, b) => {
      let ta = text(a), tb = text(b);
      return !ta != !tb ? ta ? -1 : 1 : ta.localeCompare(tb, void 0, { numeric: !0 }) || a.house.name.localeCompare(b.house.name);
    });
  }
  function houseHaystack(h) {
    return normalize([h.code, h.name, h.address, h.city, h.country, h.email, ...h.aliases ?? []].filter(Boolean).join(" | "));
  }
  function numberHaystack(h) {
    let phone = h.phone ? `${h.phone} | ${h.phone.replace(/\D/g, "")}` : "";
    return normalize([h.kurzwahl, phone].filter(Boolean).join(" | "));
  }
  function searchRows(data, query) {
    let terms = query.split(/\s+/).map(normalize).filter(Boolean);
    if (!terms.length) return [];
    let scored = [];
    return data.houses.forEach((h, i) => {
      let hay = houseHaystack(h) + " | " + numberHaystack(h), code = normalize(h.code), num2 = h.houseNumber === null ? "" : String(h.houseNumber), kw = normalize(h.kurzwahl ?? ""), nameWords = normalize(h.name).split(/[\s,/()·.:;]+/), score = 0;
      terms.every((t) => hay.includes(t) || !!num2 && num2.startsWith(t) ? (t === code ? score += 100 : t === num2 ? score += 90 : t === kw ? score += 80 : code.startsWith(t) ? score += 30 : nameWords.some((w) => w.startsWith(t)) && (score += 10), !0) : !1) && scored.push({ row: rowOf(h), score, i });
    }), scored.sort((a, b) => b.score - a.score || a.row.house.name.localeCompare(b.row.house.name) || a.i - b.i).map((s) => s.row);
  }

  // scripts/novomind-house-contact-index/extension/src/sites.ts
  var LAUNCHER_POS_KEY3 = "hci.launcherPos";
  var DEFAULT_POS2 = { right: 20, bottom: 20 };
  function siteKeyForUrl2(href) {
    try {
      let u = new URL(href);
      return u.protocol !== "https:" && u.protocol !== "http:" ? null : `${u.protocol}//${u.hostname}`;
    } catch {
      return null;
    }
  }
  async function loadPositions3(storage) {
    let raw = (await storage.get(LAUNCHER_POS_KEY3))[LAUNCHER_POS_KEY3];
    return raw && typeof raw == "object" ? { ...raw } : {};
  }
  async function savePosition2(storage, key, pos) {
    let all = await loadPositions3(storage);
    all[key] = { right: Math.round(pos.right), bottom: Math.round(pos.bottom) }, await storage.set({ [LAUNCHER_POS_KEY3]: all });
  }
  async function resetPosition2(storage, key) {
    let all = await loadPositions3(storage);
    key in all && (delete all[key], await storage.set({ [LAUNCHER_POS_KEY3]: all }));
  }
  function isValidPos2(p) {
    let v = p;
    return !!v && Number.isFinite(v.right) && Number.isFinite(v.bottom);
  }
  function clampPos2(pos, vw, vh) {
    let maxR = Math.max(0, vw - 70), maxB = Math.max(0, vh - 70);
    return {
      right: Math.min(Math.max(0, pos.right), maxR),
      bottom: Math.min(Math.max(0, pos.bottom), maxB)
    };
  }

  // scripts/novomind-house-contact-index/extension/src/launcher.ts
  var DRAG_THRESHOLD2 = 4, MAX_RESULTS = 5, PANEL_MAX_WIDTH2 = 600, GAP2 = 10, MARGIN2 = 8, TOAST_MS2 = 2e3, SORT_BUTTONS = [
    { key: "name", label: ["Sort by", "Name"] },
    { key: "number", label: ["Sort by", "#"] },
    { key: "id", label: ["Sort by", "ID"] },
    { key: "kurzwahl", label: ["Sort by", "Kurzwahl"] }
  ];
  function panelPlacement(pos, vw, vh) {
    let maxWidth = Math.max(0, Math.min(PANEL_MAX_WIDTH2, vw - 2 * MARGIN2)), right = Math.min(Math.max(MARGIN2, pos.right), Math.max(MARGIN2, vw - MARGIN2 - maxWidth)), above = vh - pos.bottom - 70 - MARGIN2, below = pos.bottom - MARGIN2, cap = Math.floor(vh * 0.8), box = { right: `${right}px`, width: "auto", "max-width": `${maxWidth}px` };
    return above >= Math.min(320, cap) || above >= below ? { ...box, top: "auto", bottom: `${pos.bottom + 70}px`, "max-height": `${Math.max(0, Math.min(cap, above))}px` } : { ...box, bottom: "auto", top: `${vh - pos.bottom}px`, "max-height": `${Math.max(0, Math.min(cap, below))}px` };
  }
  var mainNumber = (r) => {
    let { kurzwahl, phone } = r.house;
    return kurzwahl && phone ? `Kurzwahl: ${kurzwahl} · ${phone}` : kurzwahl ? `Kurzwahl: ${kurzwahl}` : phone ? `Phone: ${phone}` : "no number";
  };
  function rowText2(r, by) {
    let h = r.house, id = h.code || "—", num2 = h.houseNumber ?? "—";
    switch (by) {
      case "name":
        return { strong: h.name, text: ` - ${id} - ${mainNumber(r)}` };
      case "number":
        return { strong: String(num2), text: ` (#) - ${id} - ${h.name}` };
      case "id":
        return { strong: id, text: ` - House#: ${num2} - ${h.name}` };
      case "kurzwahl":
        return { strong: h.kurzwahl ?? h.phone ?? "—", text: ` - ${id} - ${h.name}` };
      default:
        return { text: `${h.name} - ${id} - ${mainNumber(r)}`, second: h.address || "No address available" };
    }
  }
  function setStyle2(el, props) {
    for (let [k, v] of Object.entries(props)) el.style.setProperty(k, v, "important");
  }
  function mountLauncher2(deps) {
    let doc = deps.doc ?? document, win = doc.defaultView ?? window, pos = isValidPos2(deps.position) ? { ...deps.position } : { ...DEFAULT_POS2 }, open = !1, data = null, loaded = !1, sortBy = "name", rows = [], el = (tag, cls) => {
      let e = doc.createElement(tag);
      return cls && (e.className = cls), e;
    }, launcher = el("hci-launcher");
    launcher.id = "hci-launcher", launcher.setAttribute("role", "button"), launcher.setAttribute("aria-label", "House contact index"), launcher.title = "House contact index — drag to move", launcher.tabIndex = 0;
    for (let t of ["House", "Contact", "Index"]) {
      let line = el("hci-line");
      line.textContent = t, launcher.appendChild(line);
    }
    let panel = el("hci-panel");
    panel.id = "hci-panel", panel.setAttribute("aria-label", "House contact index");
    let listBox = el("hci-list-box"), list = el("hci-list");
    list.setAttribute("role", "listbox"), listBox.appendChild(list);
    let sortBar = el("hci-sort"), sortBtns = /* @__PURE__ */ new Map();
    for (let s of SORT_BUTTONS) {
      let b = doc.createElement("button");
      b.type = "button", b.className = "hci-sort-btn", b.dataset.sort = s.key;
      let l1 = el("hci-line");
      l1.textContent = s.label[0];
      let l2 = el("hci-line");
      l2.textContent = s.label[1], b.append(l1, l2), sortBtns.set(s.key, b), sortBar.appendChild(b);
    }
    let search = doc.createElement("input");
    search.type = "text", search.id = "hci-search", search.placeholder = "Search (name, ID, #, Kurzwahl)...", search.setAttribute("aria-label", "Search houses"), search.autocomplete = "off", search.spellcheck = !1, panel.append(listBox, sortBar, search);
    let toastEl = el("hci-toast");
    toastEl.setAttribute("role", "status");
    let toastTimer = 0, viewportEl2 = () => doc.compatMode === "BackCompat" && doc.body || doc.documentElement, vw = () => viewportEl2().clientWidth || win.innerWidth, vh = () => viewportEl2().clientHeight || win.innerHeight, place = () => {
      let drawn = clampPos2(pos, vw(), vh());
      setStyle2(launcher, { right: `${drawn.right}px`, bottom: `${drawn.bottom}px` }), setStyle2(toastEl, { right: `${drawn.right}px`, bottom: `${drawn.bottom + 70 + GAP2}px` }), open && setStyle2(panel, panelPlacement(drawn, vw(), vh()));
    }, toast = (msg, isError = !1) => {
      toastEl.textContent = msg, toastEl.dataset.kind = isError ? "error" : "ok", toastEl.dataset.show = "true", place(), win.clearTimeout(toastTimer), toastTimer = win.setTimeout(() => {
        toastEl.dataset.show = "false";
      }, TOAST_MS2);
    }, message = (text, cls, onClick) => {
      list.innerHTML = "", rows = [];
      let li = el("hci-row", `hci-row ${cls}`);
      li.textContent = text, onClick && li.addEventListener("click", onClick), list.appendChild(li);
    }, render = (rs, by, highlight) => {
      list.innerHTML = "", rows = rs, rs.forEach((r, i) => {
        let li = el("hci-row", "hci-row");
        li.setAttribute("role", "option"), r.house.kurzwahl && r.full && (li.title = "Click / Enter: Kurzwahl · Shift+click / Shift+Enter: full number"), li.dataset.index = String(i);
        let t = rowText2(r, by);
        if (t.strong) {
          let s = el("hci-strong");
          s.textContent = t.strong, li.appendChild(s);
        }
        if (li.appendChild(doc.createTextNode(t.text)), t.second) {
          let sec = el("hci-second");
          sec.textContent = t.second, li.appendChild(sec);
        }
        i === highlight && (li.dataset.highlight = "true"), list.appendChild(li);
      });
    }, noData = () => message(deps.noDataText ?? "No contact list loaded. Click here to open the options and import one.", "hci-no-data", () => {
      doClose(), deps.openOptions();
    }), showFullList = (by) => {
      sortBy = by, sortBar.dataset.hidden = "false";
      for (let [k, b] of sortBtns) b.dataset.active = String(k === by);
      if (!data) {
        noData();
        return;
      }
      render(sortedHouses(data, by), by, -1);
    }, runSearch = () => {
      let q = search.value.trim();
      if (!q) {
        showFullList(sortBy);
        return;
      }
      if (sortBar.dataset.hidden = "true", !data) {
        noData();
        return;
      }
      let found = searchRows(data, q).slice(0, MAX_RESULTS);
      if (!found.length) {
        message("No results", "hci-no-results");
        return;
      }
      let shown = found.reverse();
      render(shown, "search", shown.length - 1);
    }, highlighted = () => {
      let h = list.querySelector('[data-highlight="true"]');
      return h ? Number(h.dataset.index) : -1;
    }, move = (delta) => {
      let items = [...list.querySelectorAll("hci-row[data-index]")];
      if (!items.length) return;
      let cur = highlighted(), next = cur < 0 ? delta > 0 ? 0 : items.length - 1 : (cur + delta + items.length) % items.length;
      items.forEach((i) => delete i.dataset.highlight), items[next].dataset.highlight = "true", items[next].scrollIntoView?.({ block: "nearest" });
    }, pick2 = async (r, full = !1) => {
      if (!r) return;
      doClose();
      let who = r.house.code || r.house.name, number = full ? r.full : r.dial;
      if (!number) {
        toast(full ? `No full number for ${who}` : `No number for ${who}`, !0);
        return;
      }
      let ok = !1;
      try {
        ok = await deps.dial(number);
      } catch (e) {
        console.warn("[house-contact-index] dial failed:", e);
      }
      ok ? toast(`Dialing ${number}`) : toast(`Dial field not found. Is the softphone open? (${number})`, !0);
    }, doOpen = async () => {
      if (!open) {
        if (open = !0, panel.dataset.open = "true", launcher.setAttribute("aria-expanded", "true"), place(), search.value = "", search.focus({ preventScroll: !0 }), !loaded) {
          message("Loading…", "hci-loading");
          try {
            data = await deps.loadData();
          } catch (e) {
            console.warn("[house-contact-index] could not load the contact list:", e), data = null;
          }
          loaded = !0;
        }
        open && runSearch();
      }
    }, doClose = (refocus = !1) => {
      open && (open = !1, panel.dataset.open = "false", launcher.setAttribute("aria-expanded", "false"), refocus && launcher.focus({ preventScroll: !0 }));
    }, toggle = () => {
      open ? doClose() : doOpen();
    }, press = null, dragged = !1, suppressClick = !1;
    launcher.addEventListener("pointerdown", (e) => {
      e.button === 0 && (press = { x: e.clientX, y: e.clientY, start: clampPos2(pos, vw(), vh()), id: e.pointerId }, dragged = !1, launcher.setPointerCapture?.(e.pointerId), e.preventDefault());
    }), launcher.addEventListener("pointermove", (e) => {
      if (!press) return;
      let dx = e.clientX - press.x, dy = e.clientY - press.y;
      !dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD2 || (dragged = !0, launcher.dataset.dragging = "true", pos = clampPos2({ right: press.start.right - dx, bottom: press.start.bottom - dy }, vw(), vh()), place());
    });
    let endPress = (e) => {
      press && (launcher.releasePointerCapture?.(press.id), press = null, delete launcher.dataset.dragging, dragged && e.type === "pointerup" && (suppressClick = !0, win.setTimeout(() => {
        suppressClick = !1;
      }, 0), savePosition2(deps.storage, deps.siteKey, pos).catch(() => {
      })));
    };
    launcher.addEventListener("pointerup", endPress), launcher.addEventListener("pointercancel", endPress), launcher.addEventListener("click", (e) => {
      if (e.preventDefault(), suppressClick || dragged) {
        suppressClick = !1, dragged = !1;
        return;
      }
      toggle();
    }), launcher.addEventListener("keydown", (e) => {
      (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle());
    }), sortBar.addEventListener("click", (e) => {
      let b = e.target.closest("button[data-sort]");
      b && showFullList(b.dataset.sort);
    }), list.addEventListener("click", (e) => {
      let li = e.target.closest("hci-row[data-index]");
      li && pick2(rows[Number(li.dataset.index)], e.shiftKey);
    }), search.addEventListener("input", runSearch), search.addEventListener("keydown", (e) => {
      e.stopPropagation(), e.key === "ArrowDown" ? (e.preventDefault(), move(1)) : e.key === "ArrowUp" ? (e.preventDefault(), move(-1)) : e.key === "Enter" ? (e.preventDefault(), pick2(rows[highlighted()], e.shiftKey)) : e.key === "Escape" && (e.preventDefault(), doClose(!0));
    });
    let onKey = (e) => {
      open && e.key === "Escape" && doClose(!0);
    }, onResize = () => place();
    return doc.addEventListener("keydown", onKey, !0), win.addEventListener("resize", onResize), panel.dataset.open = "false", toastEl.dataset.show = "false", launcher.setAttribute("aria-expanded", "false"), place(), doc.documentElement.append(panel, toastEl, launcher), {
      launcher,
      panel,
      search,
      list,
      isOpen: () => open,
      open: doOpen,
      close: () => doClose(),
      toggle,
      async resetPosition() {
        pos = { ...DEFAULT_POS2 }, place(), await resetPosition2(deps.storage, deps.siteKey);
      },
      applyPositions(all) {
        if (press) return;
        let p = all[deps.siteKey];
        pos = isValidPos2(p) ? { ...p } : { ...DEFAULT_POS2 }, place();
      },
      // A new list was imported (or removed): reload on the next open, or now
      // if the popup is showing.
      dataChanged() {
        loaded = !1, open && (open = !1, doOpen());
      },
      toast,
      async offer(text, onClick) {
        await doOpen(), sortBar.dataset.hidden = "true", message(text, "hci-no-data", () => {
          doClose(), onClick();
        });
      },
      destroy() {
        doc.removeEventListener("keydown", onKey, !0), win.removeEventListener("resize", onResize), win.clearTimeout(toastTimer), launcher.remove(), panel.remove(), toastEl.remove();
      }
    };
  }

  // scripts/novomind-house-contact-index/extension/src/gm-storage.ts
  function gmStorageArea2(gm) {
    return {
      async get(key) {
        let v = gm.getValue(key, void 0);
        return v === void 0 ? {} : { [key]: v };
      },
      async set(items) {
        for (let [k, v] of Object.entries(items)) gm.setValue(k, v);
      }
    };
  }

  // scripts/novomind-house-contact-index/extension/src/store.ts
  var CONTACTS_KEY = "hci.contacts";
  async function loadContacts(storage) {
    let raw = (await storage.get(CONTACTS_KEY))[CONTACTS_KEY];
    if (!raw) return null;
    let parsed = parseContacts(raw);
    return parsed.ok ? parsed.data : null;
  }
  async function importContacts(storage, text) {
    let parsed = parseContacts(text);
    return parsed.ok && await storage.set({ [CONTACTS_KEY]: parsed.data }), parsed;
  }
  async function clearContacts(storage) {
    await storage.set({ [CONTACTS_KEY]: null });
  }

  // scripts/novomind-house-contact-index/extension/src/dial.ts
  var DIAL_INPUT_ID = "dial-number-input";
  function fillInput(input, value) {
    let win = input.ownerDocument.defaultView ?? window, setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")?.set;
    setter ? setter.call(input, value) : input.value = value, input.dispatchEvent(new Event("input", { bubbles: !0 })), input.dispatchEvent(new Event("change", { bubbles: !0 })), input.focus();
  }
  function ownDialInput(doc) {
    let el = doc.getElementById(DIAL_INPUT_ID);
    return el && el.tagName === "INPUT" ? el : null;
  }
  function findDialInput(win) {
    try {
      let el = ownDialInput(win.document);
      if (el) return el;
      for (let i = 0; i < win.frames.length; i++) {
        let found = findDialInput(win.frames[i]);
        if (found) return found;
      }
    } catch {
    }
    return null;
  }
  function fillDialHere(win, value, deep = !0) {
    let input = deep ? findDialInput(win) : ownDialInput(win.document);
    return input ? (fillInput(input, value), !0) : !1;
  }

  // scripts/novomind-house-contact-index/extension/src/frame-relay.ts
  var FILL_POST = "hci.fill", FILLED_POST = "hci.filled", ACK_MS = 800;
  function allFrames(win) {
    let out = [], walk = (w) => {
      let n = 0;
      try {
        n = w.frames.length;
      } catch {
        return;
      }
      for (let i = 0; i < n; i++) {
        let f;
        try {
          f = w.frames[i];
        } catch {
          continue;
        }
        f && (out.push(f), walk(f));
      }
    };
    return walk(win), out;
  }
  var randomId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function makeFrameDial(win, opts = {}) {
    let ackMs = opts.ackMs ?? ACK_MS, newId = opts.newId ?? randomId;
    return (number) => new Promise((resolve) => {
      let frames2 = allFrames(win);
      if (!frames2.length) {
        resolve(!1);
        return;
      }
      let id = newId(), timer = 0, onMessage = (e) => {
        let d = e.data;
        d?.type === FILLED_POST && d.id === id && done(!0);
      }, done = (ok) => {
        win.removeEventListener("message", onMessage), win.clearTimeout(timer), resolve(ok);
      };
      win.addEventListener("message", onMessage), timer = win.setTimeout(() => done(!1), ackMs);
      let msg = { type: FILL_POST, id, number };
      for (let f of frames2)
        try {
          f.postMessage(msg, "*");
        } catch {
        }
    });
  }
  function frameReceiver(win) {
    return (e) => {
      let d = e.data;
      if (!(d?.type !== FILL_POST || typeof d.id != "string" || typeof d.number != "string" || !d.number) && !(!e.source || e.source !== win.top) && fillDialHere(win, d.number, !1))
        try {
          e.source.postMessage({ type: FILLED_POST, id: d.id }, e.origin && e.origin !== "null" ? e.origin : "*");
        } catch {
        }
    };
  }

  // scripts/novomind-house-contact-index/extension/src/read-file.ts
  function readFileText(file) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = () => resolve(String(reader.result)), reader.onerror = () => reject(reader.error ?? new Error("read failed")), reader.readAsText(file);
    });
  }

  // scripts/novomind-house-contact-index/extension/src/work-ai-prompt.ts
  var WORK_AI_PROMPT2 = `I need ONE JSON file built from TWO sources, which I will paste, attach or name below,
so I can import it into a browser tool. The output must follow this exact format and
contain nothing else.

THE TWO SOURCES
- SOURCE 1 — the Kurzwahl table: the houses with their Kurzwahl (the internal number,
  the one staff dial), usually under German city names.
- SOURCE 2 — the contact list: the houses with their full external phone number
  (and possibly house ID, house number, address and the internal number, often in
  bold), usually under local or English names.

FORMAT
{
  "kind": "house-contacts",
  "schemaVersion": 1,
  "generatedAt": "<today, YYYY-MM-DD>",
  "source": "<both sources, each with its as-of date, one line>",
  "houses": [ <one entry per house> ]
}

Each house — exactly these keys, no others:
{ "code": "<the house ID / house code exactly as written, e.g. XX-1>",
  "houseNumber": <the internal house number as a whole number, or null>,
  "name": "<house name, see rule 4>",
  "kurzwahl": "<the internal number, see rule 3: just the digits, no minus
               sign, e.g. \\"1234\\">",
  "phone": "<from SOURCE 2: the house's external phone number as written, as text>",
  "address": "<street, postcode, city>",
  "city": "<city, in German>",
  "country": "<ISO 2-letter country code, e.g. DE>",
  "aliases": [ <see rule 5> ] }

RULES
1. One entry per house that appears in either source. Do not invent houses.
2. Match the two sources by house code; if a source has no codes, by house name. Two
   entries with different codes are still the same house when they are in the same city
   and their names are the same once the chain's brand name, "Hostel" and "Hotel" are left out: make one
   entry with SOURCE 1's code, add the other code to its aliases, and put it on the check
   list. Otherwise never guess a match: a house found in only one source still gets an
   entry, with null for what the other source would have given, and goes on the check
   list.
3. The Kurzwahl is the internal number. SOURCE 1 lists it. SOURCE 2 often lists it too,
   in bold: bold digits in SOURCE 2 are ALWAYS the internal number, also when they are
   part of the external phone number (a phone number "+351 21 555 4401" with "4401" in
   bold has the Kurzwahl 4401; the phone number stays as written). Gather every internal
   number both sources give for the house. If they are all the same, that is the
   Kurzwahl. If there are several or they differ, take the one that ends in 1; if none
   or more than one ends in 1, take SOURCE 1's first. Put every house where you chose on
   the check list, with all the numbers you saw. Write the Kurzwahl as just the digits:
   no minus sign, no spaces, no brackets. "(-4401)", "- 4401", "-4401" and a bold "4401"
   all become "4401".
4. The name: SOURCE 1's name, without the chain's brand name, "Hostel" or "Hotel". If that name is only the
   city and SOURCE 2's name for the house adds a part that tells the houses apart (a
   district, a station, a street, "City", "Centrum", "Beach"), add that part as SOURCE 2
   writes it: "Lissabon" + "Lisboa Alfama" gives "Lissabon Alfama". If SOURCE 1's name
   already has such a part, keep SOURCE 1's name as it is ("Hbf" and "Hauptbahnhof" are
   the same part).
5. Aliases, so the house is found under every name staff use: the city in German, in
   English and in the local language when they differ ("Lissabon", "Lisbon", "Lisboa");
   SOURCE 2's name for the house when it differs from "name"; any other code from rule
   2; and other names or short names staff use. No duplicates.
6. ONE Kurzwahl and ONE phone number per house: the number you would call to reach the
   house, usually reception. Leave out everything else: emergency numbers, night or
   after-hours lines, managers, staff and personal numbers, fax, mobile numbers, email
   addresses, opening hours, notes. Do not add any key that is not in the format above.
7. Numbers are always text. The phone number is copied exactly (keep +, spaces).
8. Blank, unclear or contradictory values are null. Never guess and never fill in from
   general knowledge (no looking up addresses or phone numbers). The one exception is the
   city names in rule 5. If the two sources disagree on a house's code or address, use
   SOURCE 1's value (the Kurzwahl table) and put the house on the check list (for the
   Kurzwahl, rule 3 decides).
9. If I attach a previous version of this file, keep its codes and aliases where the
   house still exists, so my searches keep working.

OUTPUT
- The complete JSON as a downloadable file named house-contacts-<YYYY-MM-DD>.json.
  If you cannot create files, output it as one single \`\`\`json code block and nothing
  else inside that block. It must be valid JSON (no comments, no trailing commas).
- After the file: one short check list: number of houses; houses only in SOURCE 1;
  houses only in SOURCE 2; houses merged under different codes (rule 2); houses where
  you chose the Kurzwahl (rule 3), with every number you saw and the one you took; houses
  without a Kurzwahl; houses without a phone number; houses where the sources disagreed
  (rule 8) and on what; every null you set because a value was unclear (not just blank),
  with the reason.

SOURCE 1 — THE KURZWAHL TABLE
<paste it here, or attach it / name the page>

SOURCE 2 — THE CONTACT LIST
<paste it here, or attach it / name the page>`;

  // scripts/novomind-house-contact-index/extension/src/userscript.ts
  var LOG2 = "[house-contact-index]";
  function pickFile(doc, onFile) {
    doc.getElementById("hci-file-input")?.remove();
    let input = doc.createElement("input");
    input.id = "hci-file-input", input.type = "file", input.accept = "application/json,.json", input.hidden = !0, input.addEventListener("change", () => {
      let file = input.files?.[0];
      input.remove(), file && onFile(file);
    }), doc.documentElement.appendChild(input), input.click();
  }
  function startTop() {
    let storage = gmStorageArea2({ getValue: GM_getValue, setValue: GM_setValue }), siteKey = siteKeyForUrl2(location.href) ?? location.origin, frameDial = makeFrameDial(window), handle = null, importFile = async (file) => {
      let text;
      try {
        text = await readFileText(file);
      } catch (e) {
        handle?.toast(`Import failed: could not read ${file.name}`, !0), console.warn(LOG2, "could not read", file.name, e);
        return;
      }
      let result = await importContacts(storage, text);
      if (!result.ok) {
        handle?.toast(`Import failed: ${result.error}. The previous list is unchanged.`, !0);
        return;
      }
      for (let w of result.warnings) console.warn(LOG2, "import:", w);
      handle?.dataChanged(), handle?.toast(`Imported ${result.data.houses.length} houses` + (result.warnings.length ? ` (${result.warnings.length} warnings, see the console)` : ""));
    }, chooseFile = () => pickFile(document, (f) => {
      importFile(f);
    }), style, mount = async () => {
      style?.isConnected || (style = GM_addStyle(`

hci-launcher#hci-launcher,
hci-launcher#hci-launcher *,
hci-panel#hci-panel,
hci-panel#hci-panel *,
hci-toast {
  all: initial !important;
}

hci-launcher#hci-launcher {
  position: fixed !important;
  z-index: 999999 !important;
  width: 70px !important;
  height: 70px !important;
  box-sizing: border-box !important;
  border-radius: 50% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  font: 11px/1.3 Arial, sans-serif !important;
  text-align: center !important;
  cursor: pointer !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  touch-action: none !important;
  background: #007BFF !important;
  color: #fff !important;
  transition: background 0.3s !important;
}
hci-launcher#hci-launcher:hover { background: #0056b3 !important; }
hci-launcher#hci-launcher[data-dragging="true"] { cursor: grabbing !important; }
hci-launcher#hci-launcher:focus-visible { outline: 2px solid #fff !important; outline-offset: 2px !important; }
hci-launcher#hci-launcher hci-line {
  display: block !important;
  font: inherit !important;
  color: inherit !important;
  pointer-events: none !important;
}

hci-panel#hci-panel {
  position: fixed !important;
  z-index: 999998 !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 10px !important;
  background: #222 !important;
  border: 1px solid #444 !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6) !important;
  font: 14px Arial, sans-serif !important;
  color: #fff !important;
}
hci-panel#hci-panel[data-open="false"] { display: none !important; }

hci-panel#hci-panel hci-list-box {
  display: block !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  margin-bottom: 10px !important;
}

hci-panel#hci-panel hci-list { display: block !important; box-sizing: border-box !important; padding: 10px !important; }
hci-panel#hci-panel hci-row {
  display: block !important;
  box-sizing: border-box !important;
  padding: 10px !important;
  margin-bottom: 5px !important;
  background: #333 !important;
  color: #fff !important;
  border: 1px solid #555 !important;
  border-radius: 5px !important;
  font: 14px Arial, sans-serif !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  cursor: pointer !important;
  transition: background 0.3s !important;
}
hci-panel#hci-panel hci-row:hover,
hci-panel#hci-panel hci-row[data-highlight="true"] { background: #007BFF !important; }
hci-panel#hci-panel hci-row hci-strong { display: inline !important; font: bold 14px Arial, sans-serif !important; color: inherit !important; }
hci-panel#hci-panel hci-row hci-second {
  display: block !important;
  font: inherit !important;
  color: inherit !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
hci-panel#hci-panel hci-row.hci-no-results {
  background: #3d0000 !important;
  color: #ff6b6b !important;
  font-style: italic !important;
  text-align: center !important;
  cursor: default !important;
}
hci-panel#hci-panel hci-row.hci-no-results:hover { background: #3d2000 !important; }
hci-panel#hci-panel hci-row.hci-no-data { white-space: normal !important; color: #ffc107 !important; }
hci-panel#hci-panel hci-row.hci-loading { color: #aaa !important; cursor: default !important; }

hci-panel#hci-panel hci-sort {
  display: flex !important;
  flex-shrink: 0 !important;
  gap: 5px !important;
  margin-bottom: 10px !important;
}
hci-panel#hci-panel hci-sort[data-hidden="true"] { display: none !important; }
hci-panel#hci-panel button.hci-sort-btn {
  display: block !important;
  flex: 1 !important;
  height: 48px !important;
  padding: 10px !important;
  box-sizing: border-box !important;
  background: #333 !important;
  color: #fff !important;
  border: 1px solid #555 !important;
  border-radius: 5px !important;
  font: 12px/1.2 Arial, sans-serif !important;
  text-align: center !important;
  cursor: pointer !important;
  transition: background 0.3s !important;
}
hci-panel#hci-panel button.hci-sort-btn[data-active="true"] { background: #007BFF !important; }
hci-panel#hci-panel button.hci-sort-btn:hover { background: #0056b3 !important; }
hci-panel#hci-panel button.hci-sort-btn hci-line { display: block !important; font: inherit !important; color: inherit !important; text-align: center !important; pointer-events: none !important; }

hci-panel#hci-panel input#hci-search {
  display: block !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
  width: 100% !important;
  height: 48px !important;
  padding: 10px !important;
  background: #333 !important;
  color: #fff !important;
  border: 1px solid #555 !important;
  border-radius: 5px !important;
  font: 14px Arial, sans-serif !important;
  cursor: text !important;
}
hci-panel#hci-panel input#hci-search:focus { outline: 2px solid #007BFF !important; outline-offset: -1px !important; }
hci-panel#hci-panel button:focus-visible { outline: 2px solid #007BFF !important; outline-offset: 1px !important; }

hci-toast {
  position: fixed !important;
  z-index: 9999999 !important;
  display: block !important;
  padding: 8px 14px !important;
  border-radius: 6px !important;
  background: #27ae60 !important;
  color: #fff !important;
  font: 13px Arial, sans-serif !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
  pointer-events: none !important;
}
hci-toast[data-kind="error"] { background: #c0392b !important; }
hci-toast[data-show="false"] { display: none !important; }
`));
      let positions = await loadPositions3(storage);
      handle?.destroy(), handle = mountLauncher2({
        storage,
        siteKey,
        position: positions[siteKey],
        loadData: () => loadContacts(storage),
        dial: async (number) => fillDialHere(window, number) || frameDial(number),
        openOptions: chooseFile,
        noDataText: "No contact list loaded. Click here to import the house-contacts file."
      });
    };
    (async () => (await mount(), GM_addValueChangeListener(CONTACTS_KEY, (_k, _o, _n, remote) => {
      remote && handle?.dataChanged();
    }), GM_addValueChangeListener(LAUNCHER_POS_KEY3, (_k, _o, n, remote) => {
      remote && handle?.applyPositions(n ?? {});
    }), GM_registerMenuCommand("Import contact list…", () => {
      handle?.offer("Click here to choose the house-contacts file.", chooseFile);
    }), GM_registerMenuCommand("Remove contact list", () => {
      window.confirm("Remove the contact list from this browser?") && clearContacts(storage).then(() => {
        handle?.dataChanged(), handle?.toast("Contact list removed from this browser.");
      });
    }), GM_registerMenuCommand("Copy work-AI prompt", () => {
      GM_setClipboard(WORK_AI_PROMPT2, "text"), handle?.toast("Work-AI prompt copied.");
    }), GM_registerMenuCommand("Reset launcher position", () => {
      handle?.resetPosition();
    }), GM_registerMenuCommand("Restart Script", () => {
      console.info(LOG2, "restarting"), mount().then(() => handle?.toast("House contact index restarted."));
    })))();
  }
  function start7() {
    typeof window > "u" || globalThis.__hciUserscript || (globalThis.__hciUserscript = !0, window === window.top ? startTop() : window.addEventListener("message", frameReceiver(window)));
  }

  // scripts/novomind-offline-time-tracker/src/main.js
  function start8() {
    (function() {
      "use strict";
      let STORAGE_KEY2 = "offlineTimePayload", ACTIVE_KEY = "offlineTimeActiveId", FORM_SETTING = {
        key: "offlineTimeFormUrl",
        caption: "Set offline-time form address…",
        question: "Address of the offline-time form (https://…):",
        check: checkHttpsUrl
      }, FORMS_HOSTS = ["forms.office.com", "forms.cloud.microsoft", "forms.microsoft.com"];
      function newId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      }
      function getEntries() {
        let entries;
        try {
          entries = JSON.parse(GM_getValue(STORAGE_KEY2, "[]"));
        } catch {
          return [];
        }
        let migrated = !1;
        return entries.forEach(function(e) {
          e.id || (e.id = newId(), migrated = !0);
        }), migrated && saveEntries(entries), entries;
      }
      function saveEntries(entries) {
        entries.length === 0 ? GM_deleteValue(STORAGE_KEY2) : GM_setValue(STORAGE_KEY2, JSON.stringify(entries));
      }
      function removeEntry(id) {
        saveEntries(getEntries().filter(function(e) {
          return e.id !== id;
        })), GM_getValue(ACTIVE_KEY, null) === id && GM_deleteValue(ACTIVE_KEY);
      }
      function openFormFor(id) {
        let formUrl = readSetting(FORM_SETTING.key) || askSetting(FORM_SETTING);
        formUrl && (GM_setValue(ACTIVE_KEY, id), window.open(formUrl, "_blank"));
      }
      function entryLabel(entry2) {
        return entry2.date + "  " + entry2.startTime + "–" + entry2.endTime;
      }
      function initTracker() {
        if (window !== window.top || document.querySelector("#novomind-offline-tracker-btn")) return;
        menuSetting(FORM_SETTING);
        let startTime = null, timerInterval = null;
        function pad(n) {
          return String(n).padStart(2, "0");
        }
        function formatTime(d) {
          return pad(d.getHours()) + ":" + pad(d.getMinutes());
        }
        function formatDate(d) {
          return d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear();
        }
        function elapsed(from) {
          let secs = Math.floor((Date.now() - from) / 1e3), h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60;
          return (h ? pad(h) + ":" : "") + pad(m) + ":" + pad(s);
        }
        GM_addStyle(`
      #novomind-offline-tracker-btn {
        position: fixed; bottom: 20px; right: 220px; z-index: 999999;
        padding: 10px 16px; background: #007BFF; color: #fff;
        border: none; border-radius: 6px; cursor: pointer;
        font-size: 13px; font-family: Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3); user-select: none; min-width: 130px;
      }
      #novomind-offline-popup {
        position: fixed; bottom: 65px; right: 220px; z-index: 999998;
        width: 280px; background: #222; color: #fff;
        border: 1px solid #444; border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.6);
        font-family: Arial, sans-serif; padding: 10px;
        box-sizing: border-box; display: none;
      }
      #novomind-offline-popup h4 {
        margin: 0 0 8px 0; font-size: 11px; color: #aaa;
        text-transform: uppercase; letter-spacing: 0.5px;
      }
      #novomind-offline-list { list-style: none; padding: 0; margin: 0; }
      #novomind-offline-list li {
        display: flex; justify-content: space-between; align-items: center;
        padding: 8px 10px; background: #333; color: #fff;
        border: 1px solid #555; border-radius: 5px; margin-bottom: 5px; font-size: 13px;
      }
      #novomind-offline-list li:last-child { margin-bottom: 0; }
      #novomind-offline-list li span { flex: 1; }
      .novomind-offline-action {
        background: none; border: none; color: #888;
        cursor: pointer; font-size: 15px; line-height: 1; padding: 0 0 0 10px; flex-shrink: 0;
      }
      .novomind-offline-open:hover { color: #4da3ff; }
      .novomind-offline-delete:hover { color: #ff4444; }
    `);
        let btn = document.createElement("button");
        btn.id = "novomind-offline-tracker-btn", btn.textContent = "Start Offline", document.body.appendChild(btn);
        let popup = document.createElement("div");
        popup.id = "novomind-offline-popup", popup.innerHTML = '<h4>Pending entries</h4><ul id="novomind-offline-list"></ul>', document.body.appendChild(popup);
        let list = document.getElementById("novomind-offline-list");
        function actionButton(cls, text, title, onClick) {
          let b = document.createElement("button");
          return b.className = "novomind-offline-action " + cls, b.textContent = text, b.title = title, b.addEventListener("click", onClick), b;
        }
        function renderPopup() {
          let entries = getEntries();
          list.innerHTML = "", entries.forEach(function(entry2) {
            let li = document.createElement("li"), label = document.createElement("span");
            label.textContent = entryLabel(entry2), li.appendChild(label), li.appendChild(actionButton("novomind-offline-open", "↗", "Open the form and fill this entry", function() {
              openFormFor(entry2.id);
            })), li.appendChild(actionButton("novomind-offline-delete", "✓", "Mark as submitted (removes it)", function() {
              removeEntry(entry2.id), renderPopup();
            })), list.appendChild(li);
          }), popup.style.display = entries.length ? "block" : "none";
        }
        function startTracking() {
          startTime = /* @__PURE__ */ new Date(), btn.style.background = "#d83b01", btn.textContent = "00:00", timerInterval = setInterval(function() {
            btn.textContent = elapsed(startTime);
          }, 1e3);
        }
        function stopTracking() {
          clearInterval(timerInterval), timerInterval = null;
          let endTime = /* @__PURE__ */ new Date(), entry2 = { id: newId(), date: formatDate(startTime), startTime: formatTime(startTime), endTime: formatTime(endTime) }, entries = getEntries();
          entries.push(entry2), saveEntries(entries), btn.style.background = "#007BFF", btn.textContent = "Start Offline", startTime = null, renderPopup(), openFormFor(entry2.id);
        }
        btn.addEventListener("click", function() {
          startTime ? stopTracking() : startTracking();
        }), typeof GM_addValueChangeListener == "function" && GM_addValueChangeListener(STORAGE_KEY2, function(_key, _oldVal, _newVal, remote) {
          remote && renderPopup();
        }), renderPopup();
      }
      function initAutofill() {
        if (window !== window.top) return;
        let entries = getEntries();
        if (!entries.length) return;
        let activeId = GM_getValue(ACTIVE_KEY, null), payload = entries.find(function(e) {
          return e.id === activeId;
        }) || entries[0], nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set, nativeTextareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
        function setInputValue(el, value) {
          el.tagName === "TEXTAREA" ? nativeTextareaSetter.call(el, value) : nativeSetter.call(el, value), el.dispatchEvent(new Event("input", { bubbles: !0 })), el.dispatchEvent(new Event("change", { bubbles: !0 }));
        }
        function inputById(labelId) {
          let label = document.getElementById(labelId);
          if (!label) return null;
          let item = label.closest('[data-automation-id="questionItem"]');
          return item ? item.querySelector('[data-automation-id="textInput"]') : null;
        }
        function inputByTitle(re) {
          let items = document.querySelectorAll('[data-automation-id="questionItem"]');
          for (let item of items) {
            let title = item.querySelector('[data-automation-id="questionTitle"]') || item;
            if (re.test(title.textContent || "")) {
              let input = item.querySelector('[data-automation-id="textInput"]');
              if (input) return input;
            }
          }
          return null;
        }
        function getDateInput() {
          return document.querySelector('input[aria-label="Date picker"]') || document.querySelector('input[id^="DatePicker"]') || document.querySelector('input[aria-label*="date" i]') || document.querySelector('input[aria-label*="datum" i]') || document.querySelector('input[role="combobox"][placeholder*="date" i]');
        }
        let fields = [
          { key: "date", label: "Date", value: payload.date, find: getDateInput },
          { key: "start", label: "Start", value: payload.startTime, find: function() {
            return inputById("QuestionId_rf9100a6a74ff4112915c0bfbfd56e1fb") || inputByTitle(/start|beginn/i);
          } },
          { key: "end", label: "End", value: payload.endTime, find: function() {
            return inputById("QuestionId_r0404689c70d543868fc0537de5b08483") || inputByTitle(/\bend|ende/i);
          } }
        ], filled = {};
        GM_addStyle(`
      #novomind-offline-status {
        position: fixed; top: 12px; right: 12px; z-index: 999999;
        width: 250px; background: #222; color: #fff;
        border: 1px solid #444; border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.6);
        font: 13px Arial, sans-serif; padding: 10px; box-sizing: border-box;
      }
      #novomind-offline-status h4 {
        margin: 0 0 6px 0; font-size: 11px; color: #aaa;
        text-transform: uppercase; letter-spacing: 0.5px;
      }
      #novomind-offline-status .nots-fields { margin: 6px 0 8px; color: #ccc; }
      #novomind-offline-status .nots-ok { color: #5cd65c; }
      #novomind-offline-status .nots-miss { color: #ff6b6b; }
      #novomind-offline-status button {
        background: #333; color: #fff; border: 1px solid #555; border-radius: 5px;
        padding: 4px 8px; margin-right: 6px; cursor: pointer; font-size: 12px;
      }
      #novomind-offline-status button:hover { background: #444; }
    `);
        let panel = document.createElement("div");
        panel.id = "novomind-offline-status", panel.innerHTML = '<h4>Offline time autofill</h4><div class="nots-entry"></div><div class="nots-fields"></div><div class="nots-actions"></div>', panel.querySelector(".nots-entry").textContent = entryLabel(payload);
        let fieldsEl = panel.querySelector(".nots-fields"), actionsEl = panel.querySelector(".nots-actions"), refillBtn = document.createElement("button");
        refillBtn.textContent = "Refill", refillBtn.title = "Fill the fields again from this entry", refillBtn.addEventListener("click", function() {
          Object.keys(filled).forEach(function(k) {
            delete filled[k];
          }), fillAvailable(), renderStatus();
        });
        let doneBtn = document.createElement("button");
        doneBtn.textContent = "Mark submitted", doneBtn.title = "Remove this entry from the pending list", doneBtn.addEventListener("click", markSubmitted), actionsEl.appendChild(refillBtn), actionsEl.appendChild(doneBtn);
        function renderStatus() {
          fieldsEl.innerHTML = "", fields.forEach(function(f) {
            let s = document.createElement("span");
            s.className = filled[f.key] ? "nots-ok" : "nots-miss", s.textContent = f.label + (filled[f.key] ? " ✓  " : " ✗  "), fieldsEl.appendChild(s);
          });
        }
        let submitted = !1;
        function markSubmitted() {
          submitted || (submitted = !0, removeEntry(payload.id), fieldsEl.innerHTML = '<span class="nots-ok">Submitted — removed from pending</span>', actionsEl.remove());
        }
        function fillAvailable() {
          let changed = !1;
          fields.forEach(function(f) {
            if (filled[f.key]) return;
            let el = f.find();
            el && (setInputValue(el, f.value), filled[f.key] = !0, changed = !0);
          }), changed && renderStatus();
        }
        function allFilled() {
          return fields.every(function(f) {
            return filled[f.key];
          });
        }
        function isThankYouPage() {
          if (document.querySelector('[data-automation-id="thankYouPage"], [data-automation-id="thankYouMessage"], [data-automation-id="submitAnother"]')) return !0;
          let text = document.body.innerText || "";
          return /your response was submitted|thanks!|ihre antwort wurde übermittelt|vielen dank/i.test(text) && !document.querySelector('[data-automation-id="submitButton"]');
        }
        let fillDeadline = Date.now() + 2 * 60 * 1e3, observer = new MutationObserver(function() {
          if (!submitted && isThankYouPage()) {
            markSubmitted(), observer.disconnect();
            return;
          }
          !allFilled() && Date.now() < fillDeadline && document.querySelector('[data-automation-id="questionItem"]') && fillAvailable();
        });
        function start12() {
          document.body.appendChild(panel), renderStatus(), document.querySelector('[data-automation-id="questionItem"]') && fillAvailable(), observer.observe(document.body, { childList: !0, subtree: !0 });
        }
        start12();
      }
      location.hostname.includes("novomind") ? initTracker() : FORMS_HOSTS.some(function(h) {
        return location.hostname === h || location.hostname.endsWith("." + h);
      }) && initAutofill();
    })();
  }

  // scripts/novomind-toggle-extra-time/src/main.js
  var STORAGE_KEY = "novomind_extra_time_enabled", LINK = "#wacTimerExt > a";
  var TOGGLE_ID = "vm-extra-time-toggle", LOG3 = "[work-browser-tools:novomind-toggle-extra-time]";
  function isVisible(el, win = window) {
    if (!el || !el.isConnected) return !1;
    if (typeof el.checkVisibility == "function") return el.checkVisibility({ visibilityProperty: !0, opacityProperty: !0 });
    let s = win.getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && el.getClientRects().length > 0;
  }
  function start9(doc = document, win = window, storage = win.localStorage, random = Math.random) {
    let enabled = () => storage.getItem(STORAGE_KEY) !== "false", lastClick = -1 / 0, clickTimer = null, check = null, wasVisible = !1;
    function tick() {
      let link = doc.querySelector(LINK);
      if (!link) {
        stopChecking();
        return;
      }
      let vis = isVisible(link, win);
      if (vis && !wasVisible && console.info(LOG3, enabled() ? "+ is showing" : "+ is showing, but extra time is switched off"), wasVisible = vis, !vis || clickTimer !== null || !enabled() || Date.now() - lastClick < 3e4) return;
      let delay = 1e3 + random() * 4e3;
      clickTimer = setTimeout(() => {
        clickTimer = null;
        let el = doc.querySelector(LINK);
        !enabled() || !isVisible(el, win) || (lastClick = Date.now(), el.click(), console.info(LOG3, `clicked + after ${Math.round(delay)} ms`));
      }, delay);
    }
    function startChecking() {
      check === null && (check = setInterval(tick, 1e3), tick());
    }
    function stopChecking() {
      check !== null && clearInterval(check), check = null, wasVisible = !1;
    }
    function injectToggle() {
      let answerBtn = doc.querySelector('td.maintoolbar[aria-label^="Annehmen"]');
      if (!answerBtn || doc.getElementById(TOGGLE_ID)) return;
      let td = doc.createElement("td");
      td.id = TOGGLE_ID;
      let title = () => {
        td.title = enabled() ? "Extra time: ON" : "Extra time: OFF";
      };
      title(), td.style.cssText = "width:30px;cursor:pointer;";
      let dot = doc.createElement("div");
      dot.style.cssText = "width:14px;height:14px;border-radius:2px;display:inline-block;vertical-align:middle;", td.append(dot), td.addEventListener("click", () => {
        storage.setItem(STORAGE_KEY, String(!enabled())), title(), console.info(LOG3, "extra time switched", enabled() ? "on" : "off");
      }), td.addEventListener("mouseenter", title), answerBtn.insertAdjacentElement("beforebegin", td);
    }
    let scan = () => {
      injectToggle(), check === null && doc.querySelector(LINK) && startChecking();
    }, scheduled = !1, observer = new MutationObserver(() => {
      scheduled || (scheduled = !0, requestAnimationFrame(() => {
        scheduled = !1, scan();
      }));
    });
    return observer.observe(doc.body || doc.documentElement, { childList: !0, subtree: !0 }), scan(), { stop: () => {
      observer.disconnect(), stopChecking(), clickTimer !== null && clearTimeout(clickTimer);
    } };
  }

  // scripts/novomind-update-email-bookingnumber-mybooking/src/main.js
  function start10() {
    (function() {
      "use strict";
      let TRIGGER_SENDER_DOMAIN = "@property.booking.com", BOOKING_NR_REGEX = /(?:Buchungsnummer|Reservierungsnummer|booking\s*(?:number|reference|no\.?)|confirmation\s*(?:number|code))\s*[:\-#]?\s*(\d{6,})/i, CLOSE_BUTTON_SELECTORS = [".mceClose", ".mceOk", ".close", ".mceButton", "a#okBtn"], updateCanceled = !1, popupActive = !1, senderObserver = null, lastSenderHtml = null, senderCheckTimer = null;
      function fireEvents(el) {
        el.setAttribute("value", el.value), el.dispatchEvent(new Event("input", { bubbles: !0 })), el.dispatchEvent(new Event("change", { bubbles: !0 }));
      }
      function walkDocs(doc, fn) {
        fn(doc);
        try {
          doc.querySelectorAll("iframe, frame").forEach((frame) => {
            try {
              let fd = frame.contentDocument;
              fd && walkDocs(fd, fn);
            } catch {
            }
          });
        } catch {
        }
      }
      function extractBookingNumber() {
        let found = null;
        return walkDocs(document, (doc) => {
          if (found) return;
          let text = doc.body && doc.body.innerText;
          if (!text) return;
          let m = text.match(BOOKING_NR_REGEX);
          m && (console.log("[Novomind] Booking number found:", m[1], "— matched:", JSON.stringify(m[0])), found = m[1]);
        }), found || (console.log("[Novomind] No booking number found. Searched docs:"), walkDocs(document, (doc) => {
          let text = doc.body && doc.body.innerText;
          if (!text || text.trim().length < 10) return;
          let url = (() => {
            try {
              return doc.location.href;
            } catch {
              return "?";
            }
          })();
          console.log(`[Novomind]  doc(${url.slice(-50)}): first 300 chars:`, JSON.stringify(text.slice(0, 300)));
        })), found;
      }
      function findSenderElement() {
        let bySelector = document.getElementById("fromAddr") || document.querySelector("a.emailaddr.clickable");
        if (bySelector) return bySelector;
        let found = null;
        return walkDocs(document, (doc) => {
          if (!found) {
            for (let el of doc.querySelectorAll("a, span, td, div, p"))
              if (el.children.length === 0 && el.textContent.toLowerCase().includes(TRIGGER_SENDER_DOMAIN.toLowerCase())) {
                found = el;
                return;
              }
          }
        }), found;
      }
      function findOwnSenderElement() {
        return document.getElementById("fromAddr") || document.querySelector("a.emailaddr.clickable");
      }
      function senderMatchesTrigger() {
        let el = findOwnSenderElement();
        return el ? el.textContent.trim().toLowerCase().includes(TRIGGER_SENDER_DOMAIN.toLowerCase()) : !1;
      }
      function updateEmailDropdown(doc, newEmail) {
        let hiddenInput = doc.querySelector("[id='address.input']"), visibleInput = doc.querySelector("[id='address.fSelInput']");
        if (!hiddenInput && !visibleInput) {
          console.log("[Novomind] No email input fields found in document.");
          return;
        }
        hiddenInput && (hiddenInput.value = newEmail, fireEvents(hiddenInput)), visibleInput && (visibleInput.value = newEmail, fireEvents(visibleInput)), console.log("[Novomind] Set email fields to:", newEmail);
      }
      function fillModalAndClose(doc, newEmail, clickOkWhenDone) {
        if (doc.querySelectorAll("input, select, textarea").forEach((el) => {
          console.log(`[Novomind] Modal field: <${el.tagName.toLowerCase()} id="${el.id}" name="${el.name}" type="${el.type || ""}" class="${el.className}"> value="${el.value}"`);
        }), updateEmailDropdown(doc, newEmail), clickOkWhenDone) {
          let okBtn = doc.querySelector("a.mceOk, input[value='OK'], button.ok, [id$='okBtn']");
          okBtn ? (okBtn.click(), console.log("[Novomind] Clicked modal OK.")) : console.log("[Novomind] Modal OK button not found – close manually.");
        }
      }
      function monitorDocumentForDropdown(doc, newEmail, clickOkWhenDone = !1) {
        if (!doc || !doc.body) return;
        let hasFields = () => !!(doc.querySelector("[id='address.input']") || doc.querySelector("[id='address.fSelInput']")), tryFill = (obs) => {
          hasFields() && (obs && obs.disconnect(), fillModalAndClose(doc, newEmail, clickOkWhenDone));
        };
        if (hasFields()) {
          fillModalAndClose(doc, newEmail, clickOkWhenDone);
          return;
        }
        new MutationObserver((_, obs) => tryFill(obs)).observe(doc.body, { childList: !0, subtree: !0 });
      }
      function waitForModalIframe(timeout = 8e3) {
        let searchDoc = (() => {
          try {
            return window.top.document;
          } catch {
            return document;
          }
        })();
        return new Promise((resolve, reject) => {
          let elapsed = 0, poller = setInterval(() => {
            elapsed += 500;
            let iframe = searchDoc.querySelector('iframe[id^="mce_modal_ifr"]');
            if (iframe) {
              clearInterval(poller), resolve(iframe);
              return;
            }
            elapsed >= timeout && (clearInterval(poller), reject(new Error("Modal iframe timed out.")));
          }, 500);
        });
      }
      function showCustomPopup(newEmail, onOK, onCancel) {
        if (popupActive) return;
        popupActive = !0;
        let overlay = document.createElement("div");
        Object.assign(overlay.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "99999"
        });
        let modal = document.createElement("div");
        Object.assign(modal.style, {
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "5px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          maxWidth: "420px",
          width: "80%",
          textAlign: "center",
          fontFamily: "sans-serif"
        });
        let bookingNr = newEmail.split("@")[0], message = document.createElement("p");
        Object.assign(message.style, { fontSize: "15px", marginBottom: "20px", lineHeight: "1.5" }), message.innerHTML = `Booking number found.<br>Change sender address to:<br><strong><span id="nm-copy-nr" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px;" title="Click to copy">${bookingNr}</span>@my.booking.com</strong>?`, modal.appendChild(message);
        let copyNrEl = modal.querySelector("#nm-copy-nr");
        copyNrEl.addEventListener("click", () => {
          navigator.clipboard.writeText(bookingNr).then(() => {
            copyNrEl.textContent = "✓ Copied!", setTimeout(() => {
              copyNrEl.textContent = bookingNr;
            }, 1500);
          });
        });
        let btnRow = document.createElement("div");
        Object.assign(btnRow.style, { display: "flex", justifyContent: "center", gap: "10px" });
        let okBtn = document.createElement("button");
        okBtn.textContent = "OK", okBtn.style.cssText = "padding:8px 20px;cursor:pointer;font-size:14px;";
        let cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel", cancelBtn.style.cssText = "padding:8px 20px;cursor:pointer;font-size:14px;", btnRow.appendChild(okBtn), btnRow.appendChild(cancelBtn), modal.appendChild(btnRow), overlay.appendChild(modal), document.body.appendChild(overlay);
        let removePopup = () => {
          overlay.parentNode && overlay.parentNode.removeChild(overlay), popupActive = !1;
        };
        okBtn.addEventListener("click", () => {
          removePopup(), onOK && onOK();
        }), cancelBtn.addEventListener("click", () => {
          removePopup(), onCancel && onCancel();
        }), okBtn.addEventListener("keydown", (e) => {
          (e.key === " " || e.key === "Spacebar") && (removePopup(), onOK && onOK());
        }), okBtn.focus();
      }
      function openSystemPopupAndSetEmail(newEmail) {
        let senderBubble = findSenderElement();
        if (!senderBubble) {
          console.log("[Novomind] Sender bubble not found – cannot open system popup.");
          return;
        }
        senderBubble.dispatchEvent(new MouseEvent("click", { bubbles: !0, cancelable: !0 })), console.log("[Novomind] Clicked sender bubble. Waiting for modal iframe..."), waitForModalIframe(8e3).then((emailIframe) => {
          let attachObserver = () => {
            let iframeDoc = emailIframe.contentDocument || emailIframe.contentWindow && emailIframe.contentWindow.document;
            if (!iframeDoc) {
              console.log("[Novomind] Modal iframe doc not accessible.");
              return;
            }
            console.log("[Novomind] Modal iframe loaded. Body text:", JSON.stringify((iframeDoc.body && iframeDoc.body.innerText || "").slice(0, 200))), console.log("[Novomind] div#address:", iframeDoc.querySelector("div#address")), console.log("[Novomind] address.input:", iframeDoc.querySelector("[id='address.input']")), console.log("[Novomind] address.fSelInput:", iframeDoc.querySelector("[id='address.fSelInput']")), iframeDoc.querySelectorAll("input, select, textarea").forEach((el) => {
              console.log(`[Novomind] Modal field: <${el.tagName.toLowerCase()} id="${el.id}" name="${el.name}" class="${el.className}"> value="${el.value}"`);
            }), monitorDocumentForDropdown(
              iframeDoc,
              newEmail,
              /* clickOkWhenDone= */
              !0
            );
          };
          emailIframe.contentDocument && emailIframe.contentDocument.readyState === "complete" ? attachObserver() : emailIframe.addEventListener("load", attachObserver);
        }).catch((err) => console.log("[Novomind] System popup error:", err));
      }
      function checkAndUpdateEmail(retryCount = 0) {
        if (!senderMatchesTrigger()) {
          console.log("[Novomind] Sender is not @property.booking.com – skipping.");
          return;
        }
        if (updateCanceled) {
          console.log("[Novomind] Update canceled for this session.");
          return;
        }
        let senderEl = findSenderElement(), currentEmail = senderEl ? senderEl.textContent.trim() : "", bookingNr = extractBookingNumber();
        if (!bookingNr) {
          retryCount < 6 ? (console.log(`[Novomind] Booking number not ready – retry ${retryCount + 1}/6 in 1.5s...`), setTimeout(() => checkAndUpdateEmail(retryCount + 1), 1500)) : console.log("[Novomind] Could not extract booking number after retries – giving up.");
          return;
        }
        let newEmail = `${bookingNr}@my.booking.com`;
        if (currentEmail === newEmail) {
          console.log("[Novomind] Sender already set to", newEmail, "– nothing to do.");
          return;
        }
        showCustomPopup(
          newEmail,
          () => openSystemPopupAndSetEmail(newEmail),
          () => {
            console.log("[Novomind] User canceled."), updateCanceled = !0;
          }
        );
      }
      function startMonitoringSenderField() {
        senderObserver && (senderObserver.disconnect(), senderObserver = null), clearTimeout(senderCheckTimer), senderCheckTimer = null, senderObserver = new MutationObserver(() => {
          senderCheckTimer || (senderCheckTimer = setTimeout(onSenderMutation, 200));
        });
        function onSenderMutation() {
          senderCheckTimer = null;
          let senderEl = findOwnSenderElement();
          if (!senderEl) {
            if (document.body.classList.contains("modalblocker")) return;
            updateCanceled = !1, lastSenderHtml = null;
            return;
          }
          if (lastSenderHtml === null) {
            lastSenderHtml = senderEl.innerHTML, checkAndUpdateEmail();
            return;
          }
          senderEl.innerHTML !== lastSenderHtml && (lastSenderHtml = senderEl.innerHTML, updateCanceled = !1, console.log("[Novomind] Sender field changed – re-checking..."), checkAndUpdateEmail());
        }
        senderObserver.observe(document.body, {
          childList: !0,
          subtree: !0,
          characterData: !0
        });
      }
      function diagDoc(doc, label) {
        let url = (() => {
          try {
            return doc.location.href;
          } catch {
            return "(cross-origin)";
          }
        })();
        console.log(`[Novomind][Diag] ${label} — URL: ${url.slice(0, 120)}`);
        let bodyText = doc.body && doc.body.innerText;
        if (!bodyText)
          console.log(`[Novomind][Diag] ${label} — no body text`);
        else {
          for (let kw of ["buchungsnummer", "reservierungsnummer", "booking number", "confirmation", "@property.booking.com"]) {
            let idx = bodyText.toLowerCase().indexOf(kw);
            idx !== -1 && console.log(
              `[Novomind][Diag] ${label} — found "${kw}" at ${idx}:`,
              JSON.stringify(bodyText.slice(Math.max(0, idx - 20), idx + 80))
            );
          }
          console.log(`[Novomind][Diag] ${label} — first 200 chars:`, JSON.stringify(bodyText.slice(0, 200)));
        }
        for (let el of doc.querySelectorAll("*"))
          el.children.length === 0 && el.textContent.toLowerCase().includes("property.booking.com") && console.log(
            `[Novomind][Diag] ${label} — SENDER EL: <${el.tagName.toLowerCase()} id="${el.id}" class="${el.className}">`,
            JSON.stringify(el.textContent.trim().slice(0, 100))
          );
        for (let el of doc.querySelectorAll("[id*='from' i], [id*='sender' i], [id*='absender' i], [class*='from' i], [class*='sender' i]"))
          console.log(
            `[Novomind][Diag] ${label} — SENDER CANDIDATE: <${el.tagName.toLowerCase()} id="${el.id}" class="${el.className}">`,
            JSON.stringify(el.textContent.trim().slice(0, 100))
          );
        doc.querySelectorAll("iframe, frame").forEach((frame, i) => {
          let name = frame.name || frame.id || `#${i}`;
          try {
            let fd = frame.contentDocument;
            if (!fd) {
              console.log(`[Novomind][Diag] ${label} > iframe[${name}]: cross-origin/unloaded.`);
              return;
            }
            diagDoc(fd, `${label} > iframe[${name}]`);
          } catch (e) {
            console.warn(`[Novomind][Diag] ${label} > iframe[${name}] error:`, e);
          }
        });
      }
      function doSinglePassScan() {
        console.log("[Novomind][Diag] === Single-pass scan ==="), console.log("[Novomind][Diag] findSenderElement():", findSenderElement()), console.log("[Novomind][Diag] senderMatchesTrigger():", senderMatchesTrigger()), console.log("[Novomind][Diag] extractBookingNumber():", extractBookingNumber()), diagDoc(document, "TOP"), console.log("[Novomind][Diag] === End of scan ===");
      }
      function init() {
        console.log("[Novomind] Script v5.10 initializing..."), updateCanceled = !1, popupActive = !1, lastSenderHtml = null, startMonitoringSenderField();
      }
      init(), typeof GM_registerMenuCommand == "function" && (GM_registerMenuCommand("Run Single-Pass Diagnostics", doSinglePassScan), GM_registerMenuCommand("Restart Email Updater", () => {
        init(), console.log("[Novomind] Restarted.");
      })), console.log("[Novomind] v5.10 loaded. Watching for @property.booking.com emails with booking number.");
    })();
  }

  // scripts/reply-forge/src/main.js
  function start11() {
    (function() {
      "use strict";
      if (window.top !== window.self || document.querySelector("#reply-forge")) {
        console.log("Reply Forge UI already exists or not in top window.");
        return;
      }
      function validateDeepSeekKey(key, callback) {
        GM_xmlhttpRequest({
          method: "POST",
          url: "https://api.deepseek.com/chat/completions",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + key
          },
          data: JSON.stringify({
            model: "deepseek-v4-flash",
            messages: [{ role: "user", content: "test" }],
            max_tokens: 1,
            thinking: { type: "disabled" }
          }),
          timeout: 3e4,
          onload: (r) => callback(r.status === 200),
          onerror: () => callback(!1),
          ontimeout: () => callback(!1)
        });
      }
      let GIST_ID_KEY = "reply-forge:gist_id", AGENT_NAME_KEY = SIGNATURE_SETTING.key;
      function gistApiUrl() {
        return "https://api.github.com/gists/" + readSetting(GIST_ID_KEY);
      }
      function gistIdFrom(text) {
        let m = /([0-9a-f]{20,})/i.exec(text || "");
        return m ? m[1] : "";
      }
      function validateGitHubPAT(pat, callback) {
        GM_xmlhttpRequest({
          method: "GET",
          url: gistApiUrl(),
          headers: {
            Authorization: "Bearer " + pat,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          },
          timeout: 3e4,
          onload: (r) => callback(r.status === 200),
          onerror: () => callback(!1),
          ontimeout: () => callback(!1)
        });
      }
      function runSetupFlow(attempts) {
        if (attempts >= 3) {
          alert("Setup failed after 3 attempts. Reload the page to try again.");
          return;
        }
        let deepseekKey = prompt("Enter your DeepSeek API key:");
        if (deepseekKey === null) return;
        let githubPat = prompt("Enter your GitHub Personal Access Token (classic, with gist scope):");
        if (githubPat === null) return;
        let gistAnswer = prompt("Enter the templates gist (its address or its id):", readSetting(GIST_ID_KEY));
        if (gistAnswer === null) return;
        let gistId = gistIdFrom(gistAnswer);
        if (!gistId) {
          alert("That is not a gist address or id."), runSetupFlow(attempts + 1);
          return;
        }
        GM_setValue(GIST_ID_KEY, gistId);
        let agentName = prompt("Your name, to sign replies with:", readSetting(AGENT_NAME_KEY));
        agentName === null || !agentName.trim() || (GM_setValue(AGENT_NAME_KEY, agentName.trim()), validateDeepSeekKey(deepseekKey, function(dsValid) {
          if (!dsValid) {
            alert("DeepSeek API key validation failed. Please check your key and try again."), runSetupFlow(attempts + 1);
            return;
          }
          validateGitHubPAT(githubPat, function(ghValid) {
            if (!ghValid) {
              alert("GitHub PAT validation failed. Please check your token and try again."), runSetupFlow(attempts + 1);
              return;
            }
            GM_setValue("reply-forge:deepseek_key", deepseekKey), GM_setValue("reply-forge:github_pat", githubPat), injectUI();
          });
        }));
      }
      function injectUI() {
        if (document.getElementById("reply-forge")) return;
        function fullSystemInstructions(name) {
          return `
You are a professional service center agent for a hostel chain. Your name is **${name}**, and you respond to customer inquiries via emails and chats about hostel bookings and related information.

### Response Formatting Guidelines

#### Emails:
- **Start** with a greeting (e.g., "Hello," or "Dear guest,") followed by a line break.
- **Acknowledge** the customer's message with "Thank you for your message." (or "Vielen Dank für Ihre Nachricht." in German).
- **Answer naturally and concisely** without excessively repeating the question.
- **Before signing off**, include:
  - "If you have any questions, feel free to ask!"
  OR
  - "We look forward to hearing from you."
- **Sign off** as:
  Kind regards,
  ${name}
  (Do **not** add a team signature such as "… Customer Service Team".)

#### Chats:
- Keep responses **concise** but still professional.
- You may skip the formal email layout in a chat context if appropriate.

### Language Considerations
- If responding in German, adapt greeting, acknowledgment, and sign-off accordingly:
  - "Vielen Dank für Ihre Nachricht."
  - "Mit freundlichen Grüßen, ${name}"
- Otherwise, respond in English.

### Important
- **Always sign as ${name}.**
- **Never add a team signature** (such as "… Customer Service Team").
`.trim();
        }
        let MODEL = "deepseek-v4-flash", API_URL = "https://api.deepseek.com/chat/completions", currentMaxTokens = parseInt(GM_getValue("reply-forge:max_tokens", 4096)) || 4096;
        document.body.insertAdjacentHTML("beforeend", `
        <div id="reply-forge">
            <div id="reply-forge-header">
                <span id="reply-forge-title">Reply Forge</span>
                <div>
                    <button id="minimize" title="Minimize">−</button>
                    <button id="close" title="Close">×</button>
                </div>
            </div>

            <div class="sections-container">
                <div class="section">
                    <div class="section-title">Response Type:</div>
                    <div class="vertical-options">
                        <label><input type="radio" name="responseType" value="chat" checked> Chat</label>
                        <label><input type="radio" name="responseType" value="email"> Email</label>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Requested Action:</div>
                    <div class="vertical-options">
                        <label><input type="radio" name="actionType" value="improve" checked> Improve</label>
                        <label><input type="radio" name="actionType" value="respond"> Respond</label>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Response Language:</div>
                    <div class="vertical-options">
                        <label><input type="radio" name="responseLanguage" value="en" checked> EN</label>
                        <label><input type="radio" name="responseLanguage" value="de"> DE</label>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Max Tokens:</div>
                    <div class="vertical-options">
                        <select id="reply-forge-max-tokens" style="width:100%;background:#333;color:#fff;border:1px solid #555;border-radius:5px;padding:5px;font-size:12px;">
                            <option value="1024">1024</option>
                            <option value="2048">2048</option>
                            <option value="4096">4096</option>
                            <option value="8192">8192</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="input-block">
                <label for="reply-forge-input"><strong>Input:</strong></label>
                <textarea id="reply-forge-input" placeholder="Enter your question here..." rows="4"></textarea>
            </div>

            <div id="instructions-container" style="display:none;" class="input-block">
                <label for="reply-forge-instructions"><strong>Response Instructions:</strong></label>
                <textarea id="reply-forge-instructions" placeholder="Provide specific response instructions..." rows="3"></textarea>
            </div>

            <div id="buttons">
                <button id="send">Send</button>
                <button id="regenerate">Regenerate</button>
                <button id="save-to-gist" style="display:none;background:#28a745;">Save to Gist</button>
                <button id="copy">Copy</button>
            </div>

            <div id="output-container" style="display: none;">
                <label for="output"><strong>Output:</strong></label>
                <div id="output"></div>
            </div>
            <div id="reply-forge-token-info" style="display:none;text-align:right;font-size:11px;color:#888;margin-top:5px;"></div>
            <div id="reply-forge-loading" style="display: none;">⏳ Generating...</div>
        </div>

        <div id="reply-forge-circle">Reply<br>Forge</div>
    `), GM_addStyle(`
        #reply-forge {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #222;
            color: #fff;
            border: 1px solid #444;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.6);
            display: none;
            z-index: 10000;
            width: 480px;
        }
        #reply-forge-circle {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 70px;
            height: 70px;
            background: #007BFF;
            color: #fff;
            border: 1px solid #444;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            cursor: pointer;
            z-index: 10000;
        }
        #reply-forge-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        #reply-forge-title {
            font-size: 20px;
            font-weight: bold;
            text-decoration: underline;
            white-space: nowrap;
        }
        #reply-forge-header button {
            font-size: 22px;
            color: white;
            border: none;
            background: none;
            cursor: pointer;
            padding: 10px;
        }
        #reply-forge-header button:hover {
            color: #ff6961;
        }
        .sections-container {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .section {
            flex: 1;
            border: 1px solid #444;
            border-radius: 5px;
            padding: 10px;
            box-sizing: border-box;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
            white-space: nowrap;
        }
        .vertical-options label {
            display: block;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .input-block {
            margin-bottom: 15px;
        }
        .input-block label {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            display: block;
        }
        textarea {
            width: calc(100% - 20px);
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 5px;
            padding: 10px;
            font-size: 14px;
        }
        #buttons {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            gap: 8px;
        }
        #buttons.dynamic-padding {
            margin-bottom: 15px;
        }
        #buttons button {
            flex: 1;
            padding: 12px;
            background: #007BFF;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }
        #buttons button.flash-green {
            background-color: green !important;
            color: white !important;
        }
        #output-container {
            margin-top: 15px;
        }
        #output-container label {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            display: block;
        }
        #output {
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 5px;
            padding: 10px;
            max-height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
        #reply-forge-loading {
            text-align: center;
            padding: 10px;
            color: #aaa;
            font-style: italic;
            margin-bottom: 10px;
            animation: reply-forge-pulse 1.5s ease-in-out infinite;
        }
        @keyframes reply-forge-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
        }
        #buttons button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `);
        let elements = {
          helper: document.getElementById("reply-forge"),
          circle: document.getElementById("reply-forge-circle"),
          minimize: document.getElementById("minimize"),
          close: document.getElementById("close"),
          send: document.getElementById("send"),
          saveGist: document.getElementById("save-to-gist"),
          copy: document.getElementById("copy"),
          regenerate: document.getElementById("regenerate"),
          output: document.getElementById("output"),
          outputContainer: document.getElementById("output-container"),
          tokenInfo: document.getElementById("reply-forge-token-info"),
          buttons: document.getElementById("buttons"),
          input: document.getElementById("reply-forge-input"),
          instructions: document.getElementById("reply-forge-instructions"),
          instructionsContainer: document.getElementById("instructions-container"),
          respondRadio: document.querySelector('input[value="respond"][name="actionType"]'),
          loading: document.getElementById("reply-forge-loading")
        }, lastRequestParams = null, useStoredParams = !1;
        elements.circle.addEventListener("click", () => {
          elements.helper.style.display = "block", elements.circle.style.display = "none";
        }), elements.minimize.addEventListener("click", () => {
          elements.helper.style.display = "none", elements.circle.style.display = "flex";
        }), elements.close.addEventListener("click", () => {
          elements.helper.style.display = "none", elements.circle.style.display = "flex";
        }), document.querySelectorAll('input[name="actionType"]').forEach((radio) => {
          radio.addEventListener("change", () => {
            elements.instructionsContainer.style.display = elements.respondRadio.checked ? "block" : "none";
          });
        });
        let maxTokensSelect = document.getElementById("reply-forge-max-tokens");
        maxTokensSelect && (maxTokensSelect.value = String(currentMaxTokens), maxTokensSelect.addEventListener("change", () => {
          currentMaxTokens = parseInt(maxTokensSelect.value), GM_setValue("reply-forge:max_tokens", currentMaxTokens);
        })), elements.input.addEventListener("keydown", (e) => {
          e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendRequest());
        }), elements.instructions.addEventListener("keydown", (e) => {
          e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendRequest());
        }), elements.send.addEventListener("click", sendRequest), elements.saveGist.addEventListener("click", function() {
          this.dataset.saving !== "true" && (this.dataset.saving = "true", this.textContent = "Saving...", this.disabled = !0, saveToGist());
        }), elements.copy.addEventListener("click", () => {
          GM_setClipboard(elements.output.textContent), elements.copy.classList.add("flash-green"), setTimeout(() => elements.copy.classList.remove("flash-green"), 600);
        }), elements.regenerate.addEventListener("click", () => {
          lastRequestParams && (useStoredParams = !0, sendRequest());
        }), elements.regenerate.disabled = !0;
        function sendRequest() {
          let isRegenerate = useStoredParams;
          if (useStoredParams = !1, !GM_getValue("reply-forge:deepseek_key")) {
            alert("API key not configured. Reinstall the script to set it up.");
            return;
          }
          let userInput = isRegenerate ? lastRequestParams.userInput : elements.input.value.trim();
          if (!userInput) {
            alert("Input text is required.");
            return;
          }
          let responseType = isRegenerate ? lastRequestParams.responseType : document.querySelector('input[name="responseType"]:checked').value, responseLanguage = isRegenerate ? lastRequestParams.responseLanguage : document.querySelector('input[name="responseLanguage"]:checked').value, actionType = isRegenerate ? lastRequestParams.actionType : document.querySelector('input[name="actionType"]:checked').value, extraInstructions = isRegenerate ? lastRequestParams.extraInstructions : elements.instructions.value.trim();
          isRegenerate || (lastRequestParams = { userInput, responseType, responseLanguage, actionType, extraInstructions }), elements.loading.style.display = "block", elements.outputContainer.style.display = "none", elements.tokenInfo.style.display = "none", elements.send.disabled = !0, elements.regenerate.disabled = !0;
          let hideLoading = () => {
            elements.loading.style.display = "none", elements.send.disabled = !1, elements.regenerate.disabled = !lastRequestParams;
          }, finalSystemPrompt = fullSystemInstructions(readSetting(AGENT_NAME_KEY));
          responseType === "email" ? finalSystemPrompt += `

The user wants a **professionally formatted email** response.` : finalSystemPrompt += `

The user wants a **concise chat response**.`, responseLanguage === "de" ? finalSystemPrompt += `

Respond in **German**.` : finalSystemPrompt += `

Respond in **English**.`, actionType === "improve" ? finalSystemPrompt += `

The user wants to **improve the provided text**.` : finalSystemPrompt += `

The user wants a **response to the provided text**.`, isRegenerate && (finalSystemPrompt += ` [seed: ${Math.random().toString(36).substring(2, 6)}]`);
          let messages = [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: userInput }
          ];
          actionType === "respond" && extraInstructions && (messages[1].content += `

Additional instructions: ${extraInstructions}`), GM_xmlhttpRequest({
            method: "POST",
            url: API_URL,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GM_getValue("reply-forge:deepseek_key")}`
            },
            data: JSON.stringify({
              model: MODEL,
              messages,
              temperature: 0.3,
              max_tokens: currentMaxTokens,
              thinking: { type: "disabled" }
            }),
            timeout: 3e4,
            onload: (response) => {
              if (hideLoading(), elements.outputContainer.style.display = "block", elements.buttons.classList.add("dynamic-padding"), response.status !== 200) {
                let errorMsg;
                response.status === 401 ? errorMsg = "Invalid DeepSeek API key. Reinstall the script to reconfigure." : response.status === 402 ? errorMsg = "DeepSeek account balance depleted. Please top up your account." : response.status === 429 ? errorMsg = "Rate limited by DeepSeek. Please wait and try again." : errorMsg = `Error: ${response.status}

${response.responseText}`, elements.output.textContent = errorMsg, console.error(`API Error ${response.status}:`, response.responseText), elements.saveGist.style.display = "none";
                return;
              }
              try {
                let data = JSON.parse(response.responseText);
                if (data.choices && data.choices.length > 0) {
                  if (!data.choices[0].message.content) {
                    elements.output.textContent = "Empty response from API (possibly filtered).", elements.saveGist.style.display = "none";
                    return;
                  }
                  elements.output.textContent = data.choices[0].message.content, elements.saveGist.style.display = "inline-block";
                  let finishReason = data.choices[0].finish_reason;
                  if (finishReason === "length" ? elements.output.textContent += `

[⚠ Truncated: max_tokens limit reached]` : finishReason === "insufficient_system_resource" ? elements.output.textContent += `

[⚠ Truncated: server resource limit]` : finishReason === "content_filter" && (elements.output.textContent += `

[⚠ Filtered: response may be incomplete]`), data.usage) {
                    let { prompt_tokens, completion_tokens, total_tokens } = data.usage, inputCost = prompt_tokens * 0.14 / 1e6, outputCost = completion_tokens * 0.28 / 1e6, totalCost = inputCost + outputCost;
                    elements.tokenInfo.textContent = `Tokens: ${total_tokens} (in: ${prompt_tokens}, out: ${completion_tokens}) — ~$${totalCost.toFixed(4)}`, elements.tokenInfo.style.display = "block";
                  }
                } else
                  console.error("Unexpected API response:", data), elements.output.textContent = "No response received from API.", elements.saveGist.style.display = "none";
              } catch (err) {
                console.error("JSON parsing error:", err), console.error("Raw API Response:", response.responseText), elements.output.textContent = "Error processing API response. Check console for details.", elements.saveGist.style.display = "none";
              }
            },
            onerror: () => {
              hideLoading(), elements.outputContainer.style.display = "block", elements.buttons.classList.add("dynamic-padding"), elements.output.textContent = "Network request failed. Check your connection and API key.", elements.saveGist.style.display = "none";
            },
            ontimeout: () => {
              hideLoading(), elements.outputContainer.style.display = "block", elements.buttons.classList.add("dynamic-padding"), elements.output.textContent = "Request timed out after 30s.", elements.saveGist.style.display = "none";
            }
          });
        }
        function saveToGist() {
          let githubPAT = GM_getValue("reply-forge:github_pat");
          if (!githubPAT) {
            saveGistError("GitHub PAT not configured. Reinstall the script.");
            return;
          }
          GM_xmlhttpRequest({
            method: "GET",
            url: gistApiUrl(),
            headers: {
              Authorization: "Bearer " + githubPAT,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28"
            },
            onload: function(fetchResponse) {
              if (fetchResponse.status !== 200) {
                saveGistError("Failed to fetch gist (HTTP " + fetchResponse.status + "). Check your GitHub PAT.");
                return;
              }
              try {
                let gistData = JSON.parse(fetchResponse.responseText), templates = [], fileData = gistData.files && gistData.files["MyToolkit-template_index.json"], rawContent = fileData && fileData.content ? fileData.content.trim() : "";
                if (rawContent && (templates = JSON.parse(rawContent), !Array.isArray(templates))) {
                  saveGistError("Gist content is not a valid JSON array.");
                  return;
                }
                let responseLanguage = document.querySelector('input[name="responseLanguage"]:checked').value, currentOutput = elements.output.textContent, targetLang = responseLanguage === "en" ? "de" : "en";
                translateText(currentOutput, responseLanguage === "en" ? "English" : "German", targetLang === "en" ? "English" : "German", function(translatedText) {
                  if (translatedText === null) {
                    saveGistError("Translation failed. Please try again.");
                    return;
                  }
                  generateTitleAndTags(currentOutput, function(title, tags) {
                    if (title === null) {
                      saveGistError("Title generation failed. Please try again.");
                      return;
                    }
                    let finalTitle = title, dupCount = 1;
                    for (; templates.some(function(t) {
                      return t.title === finalTitle;
                    }) && dupCount <= 10; )
                      dupCount++, finalTitle = title + " (" + dupCount + ")";
                    if (dupCount > 10) {
                      var now2 = /* @__PURE__ */ new Date();
                      finalTitle = title + " (" + now2.toISOString().substring(0, 16).replace("T", " ") + ")";
                    }
                    var newEntry = {
                      title: finalTitle,
                      tags,
                      text: {}
                    };
                    newEntry.text[responseLanguage] = currentOutput, newEntry.text[targetLang] = translatedText, templates.push(newEntry), updateGist(templates);
                  });
                });
              } catch (e) {
                saveGistError("Failed to parse gist content: " + e.message);
              }
            },
            onerror: function() {
              saveGistError("Network error fetching gist. Check your connection.");
            }
          });
        }
        function translateText(text, sourceLang, targetLang, callback) {
          var dsKey = GM_getValue("reply-forge:deepseek_key");
          if (!dsKey) {
            callback(null);
            return;
          }
          GM_xmlhttpRequest({
            method: "POST",
            url: "https://api.deepseek.com/chat/completions",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + dsKey
            },
            data: JSON.stringify({
              model: "deepseek-v4-flash",
              messages: [
                { role: "system", content: "You are a translator. Translate the following text from " + sourceLang + " to " + targetLang + ". Return ONLY the translated text, no explanations." },
                { role: "user", content: text }
              ],
              temperature: 0.1,
              max_tokens: 4096,
              thinking: { type: "disabled" }
            }),
            onload: function(r) {
              if (r.status !== 200) {
                callback(null);
                return;
              }
              try {
                var data = JSON.parse(r.responseText);
                callback(data.choices[0].message.content.trim());
              } catch {
                callback(null);
              }
            },
            onerror: function() {
              callback(null);
            }
          });
        }
        function generateTitleAndTags(text, callback) {
          var dsKey = GM_getValue("reply-forge:deepseek_key");
          if (!dsKey) {
            callback(null, null);
            return;
          }
          GM_xmlhttpRequest({
            method: "POST",
            url: "https://api.deepseek.com/chat/completions",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + dsKey
            },
            data: JSON.stringify({
              model: "deepseek-v4-flash",
              messages: [
                { role: "system", content: 'Generate a short, descriptive title (max 60 chars) and 3-5 relevant keyword tags for this customer service reply template. Return ONLY valid JSON: {"title": "...", "tags": ["...", "..."]}' },
                { role: "user", content: text }
              ],
              temperature: 0.3,
              max_tokens: 200,
              thinking: { type: "disabled" },
              response_format: { type: "json_object" }
            }),
            onload: function(r) {
              if (r.status !== 200) {
                callback(null, null);
                return;
              }
              try {
                var data = JSON.parse(r.responseText), parsed = JSON.parse(data.choices[0].message.content);
                callback(parsed.title, parsed.tags);
              } catch {
                var fallbackTitle = text.substring(0, 60) + " (" + (/* @__PURE__ */ new Date()).toLocaleString() + ")";
                callback(fallbackTitle, ["general"]);
              }
            },
            onerror: function() {
              callback(null, null);
            }
          });
        }
        function updateGist(templates) {
          var githubPAT = GM_getValue("reply-forge:github_pat");
          GM_xmlhttpRequest({
            method: "PATCH",
            url: gistApiUrl(),
            headers: {
              Authorization: "Bearer " + githubPAT,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "Content-Type": "application/json"
            },
            data: JSON.stringify({
              files: {
                "MyToolkit-template_index.json": {
                  content: JSON.stringify(templates, null, 2)
                }
              }
            }),
            onload: function(r) {
              r.status === 200 ? saveGistSuccess() : saveGistError("Failed to update gist (HTTP " + r.status + "). Check your GitHub PAT has gist scope.");
            },
            onerror: function() {
              saveGistError("Network error updating gist. Check your connection.");
            }
          });
        }
        function saveGistSuccess() {
          elements.saveGist.textContent = "Saved ✓", elements.saveGist.classList.add("flash-green"), elements.saveGist.dataset.saving = "false", setTimeout(() => {
            elements.saveGist.textContent = "Save to Gist", elements.saveGist.classList.remove("flash-green"), elements.saveGist.disabled = !1;
          }, 2e3);
        }
        function saveGistError(msg) {
          elements.saveGist.textContent = "Save to Gist", elements.saveGist.dataset.saving = "false", elements.saveGist.disabled = !1, elements.output.textContent = "Failed to save to gist: " + msg, elements.outputContainer.style.display = "block";
        }
      }
      let storedDsKey = GM_getValue("reply-forge:deepseek_key"), storedGhPat = GM_getValue("reply-forge:github_pat");
      GM_registerMenuCommand("Reply Forge: set up…", function() {
        runSetupFlow(0);
      }), storedDsKey && storedGhPat && readSetting(GIST_ID_KEY) && readSetting(AGENT_NAME_KEY) ? injectUI() : console.info('[reply-forge] not set up yet: Violentmonkey menu, "Reply Forge: set up…"');
    })();
  }

  // work-browser-tools:registry
  var TOOLS = [
    { id: "assd-autofill", label: "ASSD autofill", match: ["https://*.assd.com/*", "https://*.assd.com:9443/*"], include: [], timing: "document-end", frames: !0, start },
    { id: "assd-house-index", label: "House index", match: ["https://*.assd.com/*", "https://botfriendsx.com/project/*/handover/tool/handover"], include: [], timing: "document-end", frames: !1, start: start2 },
    { id: "assd-login", label: "ASSD login", match: [], include: ["/^https:\\/\\/[^\\/]*-[^\\/]*\\.assd\\.com\\//"], timing: "document-end", frames: !0, start: start3 },
    { id: "assd-ocr-assist", label: "ASSD OCR assist", match: ["https://*.assd.com/*", "https://*.assd.com:9443/*"], include: [], timing: "document-start", frames: !0, start: start4 },
    { id: "novomind-confirm-delete", label: "Confirm delete", match: ["https://*.novomind.com/*"], include: [], timing: "document-end", frames: !0, start: start5 },
    { id: "novomind-email-response-index", label: "Email templates", match: ["https://*.novomind.com/*"], include: [], timing: "document-end", frames: !0, start: start6 },
    { id: "novomind-house-contact-index", label: "House contact index", match: ["https://*.novomind.com/*"], include: ["/^https?:\\/\\/[^\\/@]*novomind[^\\/@]*\\//"], timing: "document-end", frames: !0, start: start7 },
    { id: "novomind-offline-time-tracker", label: "Offline time tracker", match: ["https://*.novomind.com/*", "*://forms.office.com/*", "*://forms.cloud.microsoft/*", "*://forms.microsoft.com/*"], include: [], timing: "document-end", frames: !0, start: start8 },
    { id: "novomind-toggle-extra-time", label: "Toggle extra time", match: ["https://*.novomind.com/*"], include: [], timing: "document-end", frames: !0, start: start9 },
    { id: "novomind-update-email-bookingnumber-mybooking", label: "Booking number to MyBooking", match: ["https://*.novomind.com/*"], include: [], timing: "document-end", frames: !0, start: start10 },
    { id: "reply-forge", label: "Reply Forge", match: ["https://*.novomind.com/agent/client/index.imail"], include: [], timing: "document-end", frames: !0, start: start11 }
  ];

  // build/match.mjs
  var ESC_GLOB_RE = /[\\.?+[\]{}()|^$]/g, RE_URL_PARTS = /^([^:]*):\/\/([^/]*)\/(.*)/, RE_MATCH_PARTS = /^(\*|http([s*])?|file|ftp|urn):\/\/([^/]*)\/(.*)$/s, RE_STR_ANY = "(?:|[^:/]*?\\.)", str2RE = (str3) => str3.replace(ESC_GLOB_RE, "\\$&").replace(/\*/g, ".*?");
  function hostMatcher(host) {
    return host.startsWith("*.") ? new RegExp(`^${RE_STR_ANY}${str2RE(host.slice(2))}$`, "i") : new RegExp(`^${str2RE(host)}$`, "i");
  }
  function pathMatcher(tail) {
    let iQuery = tail.indexOf("?"), hasHash = tail.indexOf("#", iQuery + 1) >= 0;
    return new RegExp(`^${str2RE(tail)}${hasHash ? "$" : `($|${iQuery >= 0 ? "#" : "[?#]"})`}`);
  }
  function matchTest(rule) {
    if (rule === "<all_urls>") return () => !0;
    let parts = RE_MATCH_PARTS.exec(rule);
    if (!parts) throw new Error(`bad @match ${rule}`);
    let [, scheme, httpMod, host, path] = parts, schemes = scheme === "*" || httpMod === "*" ? ["http", "https"] : [scheme], hostRe = host === "*" ? null : hostMatcher(host), pathRe = path === "*" ? null : pathMatcher(path);
    return (url) => {
      let u = RE_URL_PARTS.exec(url);
      return u ? schemes.includes(u[1]) && (!hostRe || hostRe.test(u[2])) && (!pathRe || pathRe.test(u[3])) : !1;
    };
  }
  function includeTest(rule) {
    if (!(rule.length > 1 && rule.startsWith("/") && rule.endsWith("/")))
      throw new Error(`@include ${rule} is not in regex form ("/…/")`);
    let re = new RegExp(rule.slice(1, -1), "i");
    return (url) => re.test(url);
  }
  function siteTest({ match = [], include = [] }) {
    let tests = [...match.map(matchTest), ...include.map(includeTest)];
    return (url) => tests.some((t) => t(url));
  }

  // bundle/page-watch.js
  var KEEP_S = 300, SLOW_INPUT_MS = 104;
  function safePath(url, ownOrigin) {
    let u;
    try {
      u = new URL(url);
    } catch {
      return "?";
    }
    let path = u.pathname.replace(/;[^/]*/g, "").replace(/\d{4,}/g, "#");
    return ownOrigin && u.origin !== ownOrigin ? `${path} (other site)` : path;
  }
  var on = null;
  function startWatch(win = globalThis) {
    if (on) return;
    let doc = win.document, origin = win.location.origin, w = {
      since: Date.now(),
      changes: 0,
      requests: 0,
      bytes: 0,
      slowInputs: 0,
      slowestInputMs: 0,
      inputs: /* @__PURE__ */ new Map(),
      paths: /* @__PURE__ */ new Map(),
      seconds: /* @__PURE__ */ new Map(),
      stop: []
    }, sec = () => {
      let s = Math.floor(Date.now() / 1e3), b = w.seconds.get(s);
      if (!b) {
        b = { c: 0, r: 0 }, w.seconds.set(s, b);
        for (let k of w.seconds.keys()) {
          if (k > s - KEEP_S) break;
          w.seconds.delete(k);
        }
      }
      return b;
    }, mo = new native.MutationObserver((records) => {
      w.changes += records.length, sec().c += records.length;
    });
    mo.observe(doc.documentElement, { childList: !0, subtree: !0, attributes: !0, characterData: !0 }), w.stop.push(() => mo.disconnect());
    let PO = win.PerformanceObserver, types = PO?.supportedEntryTypes ?? [];
    if (types.includes("resource")) {
      let po = new PO((list) => {
        for (let e of list.getEntries()) {
          w.requests += 1, w.bytes += e.transferSize || 0, sec().r += 1;
          let key = `${safePath(e.name, origin)} [${e.initiatorType || "?"}]`, p = w.paths.get(key) ?? { n: 0, bytes: 0 };
          p.n += 1, p.bytes += e.transferSize || 0, w.paths.set(key, p);
        }
      });
      po.observe({ type: "resource" }), w.stop.push(() => po.disconnect());
    }
    if (types.includes("event")) {
      let po = new PO((list) => {
        for (let e of list.getEntries())
          w.slowInputs += 1, w.slowestInputMs = Math.max(w.slowestInputMs, e.duration), w.inputs.set(e.name, (w.inputs.get(e.name) ?? 0) + 1);
      });
      po.observe({ type: "event", durationThreshold: SLOW_INPUT_MS }), w.stop.push(() => po.disconnect());
    }
    on = w;
  }
  function stopWatch() {
    if (on) {
      for (let f of on.stop) f();
      on = null;
    }
  }
  function pageSnapshot(win = globalThis) {
    if (!on) return null;
    let elements = 0;
    try {
      elements = win.document.getElementsByTagName("*").length;
    } catch {
    }
    return {
      since: on.since,
      changes: on.changes,
      requests: on.requests,
      bytes: on.bytes,
      elements,
      slowInputs: on.slowInputs,
      slowestInputMs: on.slowestInputMs,
      inputs: Object.fromEntries(on.inputs),
      paths: Object.fromEntries(on.paths),
      seconds: [...on.seconds].map(([s, b]) => [s, b.c, b.r])
    };
  }

  // bundle/page-report.js
  var fmt = (n, d = 0) => Number.isFinite(n) ? n.toFixed(d) : "–", perMin = (n, ms) => n / (Math.max(ms, 1e3) / 6e4);
  function summarizeLoads(loads2, fromMs, nowMs) {
    let list = loads2.filter((l) => l.t >= fromMs), boot2 = list.map((l) => l.bootMs).filter((x) => Number.isFinite(x)), byFrame = /* @__PURE__ */ new Map();
    for (let l of list) byFrame.set(l.frame, (byFrame.get(l.frame) ?? 0) + 1);
    return {
      n: list.length,
      perMin: perMin(list.length, nowMs - fromMs),
      avgBootMs: boot2.length ? boot2.reduce((a, b) => a + b, 0) / boot2.length : NaN,
      maxBootMs: boot2.length ? Math.max(...boot2) : NaN,
      byFrame
    };
  }
  function summarizePage(replies, loads2, stalls2, nowMs) {
    let frames2 = /* @__PURE__ */ new Map(), paths = /* @__PURE__ */ new Map(), inputs = /* @__PURE__ */ new Map(), since2 = nowMs;
    for (let r of replies) {
      let p = r.page;
      if (!p) continue;
      since2 = Math.min(since2, p.since);
      let ms = nowMs - p.since, f = frames2.get(r.frame) ?? { frame: r.frame, loads: 0, changesPerMin: 0, elements: 0, requestsPerMin: 0, kbPerMin: 0, slowInputs: 0, seconds: [] };
      f.changesPerMin += perMin(p.changes, ms), f.requestsPerMin += perMin(p.requests, ms), f.kbPerMin += perMin(p.bytes / 1024, ms), f.elements += p.elements, f.slowInputs += p.slowInputs, f.seconds.push(...p.seconds), frames2.set(r.frame, f);
      for (let [k, v] of Object.entries(p.paths)) {
        let q = paths.get(k) ?? { path: k, perMin: 0, kbPerMin: 0 };
        q.perMin += perMin(v.n, ms), q.kbPerMin += perMin(v.bytes / 1024, ms), paths.set(k, q);
      }
      for (let [k, v] of Object.entries(p.inputs)) inputs.set(k, (inputs.get(k) ?? 0) + v);
    }
    let l = summarizeLoads(loads2, since2, nowMs);
    for (let f of frames2.values()) f.loads = l.byFrame.get(f.frame) ?? 0;
    let slowest = Math.max(0, ...replies.map((r) => r.page?.slowestInputMs ?? 0));
    return {
      since: since2,
      frames: [...frames2.values()].sort((a, b) => b.changesPerMin - a.changesPerMin || b.requestsPerMin - a.requestsPerMin),
      paths: [...paths.values()].sort((a, b) => b.perMin - a.perMin).slice(0, 10),
      inputs: [...inputs].sort((a, b) => b[1] - a[1]),
      slowestInputMs: slowest,
      stalls: stalls2.filter((s) => s.end >= since2).map((s) => ({ ...s, before: s.before ?? busiestBefore(s, [...frames2.values()], loads2) }))
    };
  }
  function busiestBefore(stall, frames2, loads2) {
    let from = Math.floor((stall.end - stall.ms) / 1e3) - 2, to = Math.floor(stall.end / 1e3), best = null;
    for (let f of frames2) {
      let c = 0, r = 0;
      for (let [s, bc, br] of f.seconds) s >= from && s <= to && (c += bc, r += br);
      c + r > 0 && (!best || c + r * 50 > best.changes + best.requests * 50) && (best = { frame: f.frame, changes: c, requests: r });
    }
    let reloads = [...new Set(loads2.filter((x) => x.t >= from * 1e3 && x.t <= stall.end).map((x) => x.frame))];
    return { busiest: best, reloads };
  }
  function clock(ms) {
    let d = new Date(ms);
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  }
  function stallText(s) {
    let b = s.before, busy2 = b.busiest ? `most page activity just before: ${b.busiest.frame} (${b.busiest.changes} changes, ${b.busiest.requests} requests)` : "no page changes or requests just before", re = b.reloads.length ? `; frames (re)loaded: ${b.reloads.join(", ")}` : "";
    return `${clock(s.end - s.ms)} · ${fmt(s.ms)} ms · ${busy2}${re}`;
  }
  var FRAME_COLUMNS = [
    ["Frame", (f) => f.frame],
    ["Loads", (f) => String(f.loads)],
    ["Changes/min", (f) => fmt(f.changesPerMin)],
    ["Elements", (f) => String(f.elements)],
    ["Requests/min", (f) => fmt(f.requestsPerMin, 1)],
    ["KB/min", (f) => fmt(f.kbPerMin, 1)],
    ["Slow inputs", (f) => String(f.slowInputs)]
  ], PATH_COLUMNS = [
    ["Request (path)", (p) => p.path],
    ["Per min", (p) => fmt(p.perMin, 1)],
    ["KB/min", (p) => fmt(p.kbPerMin, 1)]
  ];
  function inputText(page) {
    return page.inputs.length ? `Slow inputs (key/click handling over 100 ms): ${page.inputs.map(([k, n]) => `${k} ${n}×`).join(", ")}; slowest ${fmt(page.slowestInputMs)} ms` : "Slow inputs (key/click handling over 100 ms): none";
  }
  function pageText(page, nowMs) {
    let row = (cols, x) => cols.map(([, f]) => f(x)).join("	");
    return [
      `Page — watched for ${fmt((nowMs - page.since) / 6e4, 1)} min`,
      `Stalls over 200 ms: ${page.stalls.length}`,
      ...page.stalls.map(stallText),
      "",
      FRAME_COLUMNS.map(([h]) => h).join("	"),
      ...page.frames.map((f) => row(FRAME_COLUMNS, f)),
      "",
      PATH_COLUMNS.map(([h]) => h).join("	"),
      ...page.paths.map((p) => row(PATH_COLUMNS, p)),
      "",
      inputText(page)
    ].join(`
`);
  }

  // bundle/monitor-panel.js
  var POLL = "work-browser-tools.monitor.poll", REPLY = "work-browser-tools.monitor.reply", RESET = "work-browser-tools.monitor.reset", BOOTED = "work-browser-tools.monitor.booted", WATCH = "work-browser-tools.monitor.watch", KEEP = 2e3, loads = [], stalls = [], watchOn = !1, keep = (list, x) => {
    list.push(x), list.length > KEEP && list.splice(0, list.length - KEEP);
  }, WAIT_MS = 400, REFRESH_MS = 2e3, COLLAPSED_REFRESH_MS = 1e4, TICK_MS = 500;
  function frameName(win, href) {
    let path;
    try {
      path = new URL(href).pathname.replace(/;[^/]*/g, "").replace(/\d{4,}/g, "#");
    } catch {
      path = "?";
    }
    let own = String(win.location.href);
    if (!/^(about|blob|data):/i.test(own)) return path;
    let kind = /^about:/i.test(own) ? own.split(/[?#]/)[0] : own.split(":")[0].toLowerCase();
    return `${path} (${kind} frame)`;
  }
  function installResponder(win, state, href, bootMs2 = NaN) {
    let frame = frameName(win, href), isTop = win === win.top;
    if (isTop) keep(loads, { frame, t: Date.now(), bootMs: bootMs2 });
    else
      try {
        win.top.postMessage({ type: BOOTED, frame, bootMs: bootMs2 }, "*");
      } catch {
      }
    win.addEventListener("message", (e) => {
      let d = e.data;
      if (!(!d || typeof d != "object")) {
        if (d.type === RESET && reset(), d.type === WATCH) {
          d.on ? startWatch(win) : stopWatch();
          return;
        }
        if (d.type === BOOTED && isTop) {
          keep(loads, { frame: String(d.frame), t: Date.now(), bootMs: Number(d.bootMs) }), watchOn && e.source && e.source.postMessage({ type: WATCH, on: !0 }, "*");
          return;
        }
        d.type !== POLL || !e.source || e.source.postMessage({ type: REPLY, id: d.id, frame, started: [...state.started], bootMs: bootMs2, page: pageSnapshot(win), ...snapshot() }, "*");
      }
    });
  }
  function broadcastWatch(win, on2) {
    watchOn = on2;
    for (let w of allFrames2(win.top))
      try {
        w.postMessage({ type: WATCH, on: on2 }, "*");
      } catch {
      }
  }
  function startsText(l) {
    return l.n ? `Bundle starts (a frame loading a document runs the bundle again): ${l.n}, ${fmt2(l.perMin, 1)}/min; start-up ${fmt2(l.avgBootMs, 1)} ms on average, at worst ${fmt2(l.maxBootMs, 1)} ms (not counting parse time)` : "Bundle starts: none yet";
  }
  function allFrames2(top) {
    let out = [], walk = (w, depth) => {
      if (out.push(w), depth > 10) return;
      let n = 0;
      try {
        n = w.frames.length;
      } catch {
        return;
      }
      for (let i = 0; i < n; i += 1)
        try {
          walk(w.frames[i], depth + 1);
        } catch {
        }
    };
    return walk(top, 0), out;
  }
  function collect(win, waitMs = WAIT_MS) {
    let id = `${Date.now()}-${Math.random()}`, replies = [], onMessage = (e) => {
      e.data?.type === REPLY && e.data.id === id && replies.push(e.data);
    };
    win.addEventListener("message", onMessage);
    for (let w of allFrames2(win.top))
      try {
        w.postMessage({ type: POLL, id }, "*");
      } catch {
      }
    return new Promise((resolve) => {
      native.setTimeout.call(globalThis, () => {
        win.removeEventListener("message", onMessage), resolve(replies);
      }, waitMs);
    });
  }
  function broadcastReset(win) {
    for (let w of allFrames2(win.top))
      try {
        w.postMessage({ type: RESET }, "*");
      } catch {
      }
  }
  function summarize(replies, labels = {}) {
    let by = /* @__PURE__ */ new Map(), longest = 0;
    for (let r of replies) {
      let min = Math.max(r.elapsedMs, 1) / 6e4;
      r.elapsedMs > longest && (longest = r.elapsedMs);
      for (let [id, s] of Object.entries(r.tools)) {
        let row = by.get(id);
        row || (row = { id, label: labels[id] ?? id, frames: 0, calls: 0, ms: 0, perMin: 0, msPerMin: 0, maxMs: 0, records: 0, observers: 0, intervals: 0, timers: 0 }, by.set(id, row)), r.started.includes(id) && (row.frames += 1), row.calls += s.calls, row.ms += s.ms, row.perMin += s.calls / min, row.msPerMin += s.ms / min, row.maxMs = Math.max(row.maxMs, s.maxMs), row.records += s.records, row.observers += s.observers, row.intervals += s.intervals, row.timers += s.timers;
      }
    }
    let rows = [...by.values()].sort((a, b) => b.msPerMin - a.msPerMin || a.label.localeCompare(b.label)), total = { id: "", label: "All tools", frames: replies.length, calls: 0, ms: 0, perMin: 0, msPerMin: 0, maxMs: 0, records: 0, observers: 0, intervals: 0, timers: 0 };
    for (let r of rows) {
      for (let k of ["calls", "ms", "perMin", "msPerMin", "records", "observers", "intervals", "timers"]) total[k] += r[k];
      total.maxMs = Math.max(total.maxMs, r.maxMs);
    }
    return { rows, total, minutes: longest / 6e4, frames: replies.length };
  }
  var fmt2 = (n, d = 0) => Number.isFinite(n) ? n.toFixed(d) : "–", busy = (msPerMin) => `${fmt2(msPerMin / 600, 2)} %`, COLUMNS = [
    ["Tool", (r) => r.label],
    ["Frames", (r) => String(r.frames)],
    ["Callbacks/min", (r) => fmt2(r.perMin)],
    ["Busy ms/min", (r) => fmt2(r.msPerMin, 1)],
    ["Busy", (r) => busy(r.msPerMin)],
    ["Slowest ms", (r) => fmt2(r.maxMs, 1)],
    ["Observers", (r) => String(r.observers)],
    ["Intervals", (r) => String(r.intervals)],
    ["Timers", (r) => String(r.timers)]
  ];
  function asText(sum, replies, lag, labels = {}, extra = []) {
    let line = (r) => COLUMNS.map(([, f]) => f(r)).join("	"), out = [
      `Work Browser Tools resource monitor — ${fmt2(sum.minutes, 1)} min counted, ${sum.frames} frames`,
      COLUMNS.map(([h]) => h).join("	"),
      ...sum.rows.map(line),
      line(sum.total),
      lagText(lag),
      ...extra,
      "",
      "By frame:"
    ];
    for (let r of replies) {
      let s = summarize([r], labels);
      out.push(`${r.frame}: ${fmt2(s.total.msPerMin, 1)} ms/min, ${fmt2(s.total.perMin)} callbacks/min, ${s.total.observers} observers; started: ${r.started.join(", ") || "none"}`);
    }
    return out.join(`
`);
  }
  function lagText(lag) {
    return lag.n ? `Page: a ${TICK_MS} ms timer fires on average ${fmt2(lag.sum / lag.n, 1)} ms late, at worst ${fmt2(lag.max)} ms (${lag.n} ticks while open)` : "Page: measuring…";
  }
  var CSS = `.box{position:fixed;top:16px;right:16px;z-index:2147483647;background:#fff;color:#1f2937;
  font:12px/1.4 system-ui,sans-serif;border:1px solid #d1d5db;border-radius:8px;
  box-shadow:0 8px 24px rgba(0,0,0,.18);padding:12px 14px;max-width:min(860px,calc(100vw - 32px));
  box-sizing:border-box;max-height:calc(100vh - 32px);display:flex;flex-direction:column}
.scroll{overflow:auto;min-height:0;flex:1 1 auto}.row{flex:none}
h2{font-size:14px;margin:0 0 4px}p{margin:4px 0;color:#4b5563}
table{border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums}
th,td{padding:3px 8px;text-align:right;border-bottom:1px solid #e5e7eb;white-space:nowrap}
th:first-child,td:first-child{text-align:left}tr.total td{font-weight:600;border-top:2px solid #d1d5db}
.row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
button{font:inherit;padding:4px 10px;border-radius:6px;border:1px solid #d1d5db;background:#f9fafb;cursor:pointer}
.pill{position:fixed;top:16px;right:16px;z-index:2147483647;font:12px/1.4 system-ui,sans-serif;color:#fff;
  background:#1f2937;border:0;border-radius:999px;padding:4px 12px;box-shadow:0 4px 12px rgba(0,0,0,.25)}
[hidden]{display:none!important}`;
  function pillText(sum, lag, nStalls = null) {
    let page = lag.n ? `page +${fmt2(lag.sum / lag.n, 1)} ms` : "page …";
    return `Tools ${fmt2(sum.total.msPerMin, 1)} ms/min · ${page}${nStalls == null ? "" : ` · ${nStalls} stalls`}`;
  }
  var openPanel = null;
  function openMonitor(win, tools) {
    openPanel?.close();
    let doc = win.document, labels = Object.fromEntries(tools.map((t) => [t.id, t.label]));
    labels[OTHER] = OTHER;
    let el = (tag, text) => {
      let n = doc.createElement(tag);
      return text != null && (n.textContent = text), n;
    };
    doc.getElementById("work-browser-tools-monitor")?.remove();
    let host = el("div");
    host.id = "work-browser-tools-monitor";
    let root = host.attachShadow({ mode: "open" }), style = el("style", CSS), box = el("div");
    box.className = "box", box.setAttribute("role", "dialog"), box.setAttribute("aria-label", "Work Browser Tools resource monitor");
    let head = el("p"), table = el("table"), page = el("p"), starts = el("p"), pageBox = el("div");
    pageBox.hidden = !0;
    let pageHead = el("h2", "The page"), pageInfo = el("p"), stallBox = el("div"), frameTable = el("table"), pathTable = el("table"), inputsP = el("p");
    pageBox.append(pageHead, pageInfo, stallBox, frameTable, pathTable, inputsP);
    let note = el("p", "Counts timers and page-change observers per tool, in every frame. Key and click handlers are not counted. Firefox times in whole milliseconds: one short callback reads 0 or 1 ms, but the totals add up."), buttons = el("div");
    buttons.className = "row";
    let mk = (text, fn) => {
      let b = el("button", text);
      return b.addEventListener("click", fn), buttons.append(b), b;
    }, scroll = el("div");
    scroll.className = "scroll", scroll.append(head, table, page, starts, pageBox, note), box.append(el("h2", "Work Browser Tools: resources"), scroll, buttons);
    let pill = el("button");
    pill.className = "pill", pill.title = "Work Browser Tools resource monitor: still measuring. Click to expand.", pill.hidden = !0, root.append(style, box, pill);
    let lag = { n: 0, sum: 0, max: 0 }, expected = win.performance.now() + TICK_MS, tick = native.setInterval.call(globalThis, () => {
      let t = win.performance.now(), late = Math.max(0, t - expected);
      lag.n += 1, lag.sum += late, lag.max = Math.max(lag.max, late), late > 200 && keep(stalls, { end: Date.now(), ms: late }), expected = t + TICK_MS, collapsed && (pill.textContent = pillText(last.sum, lag, watching ? stallsSince().length : null));
    }, TICK_MS), last = { sum: summarize([], labels), replies: [] }, refresh = 0, closed = !1, collapsed = !1, gen = 0, watching = !1, countFrom = Math.round(win.performance.timeOrigin || Date.now()), stallsSince = () => stalls.filter((x) => x.end >= countFrom), tableOf = (t, cols, rows) => {
      t.replaceChildren();
      let tr = (cells, tag) => {
        let r = el("tr");
        for (let c of cells) r.append(el(tag, c));
        t.append(r);
      };
      tr(cols.map(([h]) => h), "th");
      for (let x of rows) tr(cols.map(([, f]) => f(x)), "td");
    }, settleStalls = () => {
      let ps = pageNow(), old = Date.now() - 3e3;
      for (let st of stallsSince()) {
        if (st.before || st.end > old) continue;
        let m = ps.stalls.find((x) => x.end === st.end && x.ms === st.ms);
        m && (st.before = m.before);
      }
    }, pageNow = () => summarizePage(last.replies, loads.filter((x) => x.t >= countFrom), stallsSince(), Date.now()), render = () => {
      let { sum } = last;
      if (pill.textContent = pillText(sum, lag, watching ? stallsSince().length : null), collapsed) return;
      if (starts.textContent = startsText(summarizeLoads(loads, countFrom, Date.now())), pageBox.hidden = !watching, watching) {
        let ps = pageNow();
        pageInfo.textContent = `Watched for ${fmt2((Date.now() - ps.since) / 6e4, 1)} min. Stalls (the page blocked for over ${200} ms): ${ps.stalls.length}. Each is matched to the frame with the most page changes and requests just before it: a lead, not proof. Script that changes nothing (a busy loop) only shows in the Firefox Profiler. Latest:`, stallBox.replaceChildren(...ps.stalls.slice(-8).reverse().map((x) => el("p", stallText(x)))), tableOf(frameTable, FRAME_COLUMNS, ps.frames.slice(0, 12)), tableOf(pathTable, PATH_COLUMNS, ps.paths), inputsP.textContent = inputText(ps);
      }
      head.textContent = `${fmt2(sum.minutes, 1)} min counted (since the page loaded or Reset), ${sum.frames} frames answering.`, table.replaceChildren();
      let tr = (cells, cls, tag = "td") => {
        let r = el("tr");
        cls && (r.className = cls);
        for (let c of cells) r.append(el(tag, c));
        table.append(r);
      };
      tr(COLUMNS.map(([h]) => h), "", "th");
      for (let r of sum.rows) tr(COLUMNS.map(([, f]) => f(r)));
      tr(COLUMNS.map(([, f]) => f(sum.total)), "total"), page.textContent = lagText(lag);
    }, update = async () => {
      let g = gen, replies = await collect(win);
      closed || g !== gen || (last = { sum: summarize(replies, labels), replies }, watching && settleStalls(), render(), refresh = native.setTimeout.call(globalThis, update, collapsed ? COLLAPSED_REFRESH_MS : REFRESH_MS));
    }, setCollapsed = (on2) => {
      collapsed = on2, box.hidden = on2, pill.hidden = !on2, render(), on2 || (gen += 1, native.clearTimeout.call(globalThis, refresh), update());
    };
    pill.addEventListener("click", () => setCollapsed(!1));
    let close = () => {
      closed || (closed = !0, openPanel === handle && (openPanel = null), watching && broadcastWatch(win, !1), native.clearTimeout.call(globalThis, refresh), native.clearInterval.call(globalThis, tick), host.remove());
    };
    mk("Reset", () => {
      broadcastReset(win), lag.n = 0, lag.sum = 0, lag.max = 0, countFrom = Date.now();
    });
    let watchBtn = mk("Watch the page", () => {
      watching = !watching, broadcastWatch(win, watching), watchBtn.textContent = watching ? "Stop watching" : "Watch the page", render();
    });
    mk("Copy", () => {
      let extra = [startsText(summarizeLoads(loads, countFrom, Date.now()))];
      watching && extra.push("", pageText(pageNow(), Date.now()));
      let text = asText(last.sum, last.replies, lag, labels, extra);
      typeof GM_setClipboard == "function" ? GM_setClipboard(text, "text") : win.navigator.clipboard?.writeText(text);
    }), mk("Collapse", () => setCollapsed(!0)), mk("Close", close), render(), (doc.body || doc.documentElement).append(host), update();
    let handle = { root, close, collapse: () => setCollapsed(!0), expand: () => setCollapsed(!1), watch: () => watchBtn.click() };
    return openPanel = handle, handle;
  }

  // bundle/loader.js
  var DISABLED_KEY = "work-browser-tools.disabled", LOG4 = "[work-browser-tools]";
  function plan(tools, { href, isTop, disabled }) {
    let off = new Set(disabled), matched = tools.filter((t) => (isTop || t.frames) && siteTest(t)(href));
    return {
      matched,
      toStart: matched.filter((t) => !off.has(t.id)),
      switchedOff: matched.filter((t) => off.has(t.id))
    };
  }
  function whenTiming(timing, fn, doc = document, win = window) {
    if (timing === "document-start") return void fn();
    if (timing === "document-idle") {
      if (doc.readyState === "complete") return void fn();
      win.addEventListener("load", () => fn(), { once: !0 });
      return;
    }
    if (doc.readyState !== "loading") return void fn();
    doc.addEventListener("DOMContentLoaded", () => fn(), { once: !0 });
  }
  function runTool(tool, state, log = console) {
    let tag = `[work-browser-tools:${tool.id}]`;
    try {
      let r = runAs(tool.id, () => tool.start());
      state.started.push(tool.id), r && typeof r.then == "function" && r.then(void 0, (e) => {
        state.failed.push(tool.id), log.error(tag, "failed after starting:", e);
      });
    } catch (e) {
      state.failed.push(tool.id), log.error(tag, "failed to start:", e);
    }
  }
  function pageHref(win) {
    let w = win;
    for (let i = 0; i < 20; i += 1) {
      let href;
      try {
        href = w.location.href;
      } catch {
        return win.location.href;
      }
      if (!/^(about|blob|data):/i.test(href)) return href;
      let parent;
      try {
        parent = w.parent;
      } catch {
        return href;
      }
      if (!parent || parent === w) return href;
      w = parent;
    }
    return win.location.href;
  }
  var bootMs = () => typeof __wbtT0 == "number" ? globalThis.performance.now() - __wbtT0 : NaN;
  function boot(tools, gm, win = window) {
    let isTop = win === win.top, disabled = readDisabled(gm), p = plan(tools, { href: pageHref(win), isTop, disabled }), state = { matched: p.matched.map((t) => t.id), started: [], failed: [], switchedOff: p.switchedOff.map((t) => t.id) };
    Object.defineProperty(globalThis, "__workBrowserTools", { value: state, configurable: !0 });
    for (let t of p.toStart) whenTiming(t.timing, () => runTool(t, state), win.document, win);
    return p.matched.length && installResponder(win, state, pageHref(win), bootMs()), isTop && p.matched.length && (gm.registerMenuCommand("Tools on this page…", () => openSwitchboard(p.matched, gm, win)), gm.registerMenuCommand("Resource monitor…", () => openMonitor(win, tools))), p.switchedOff.length && console.info(LOG4, "switched off here:", state.switchedOff.join(", ")), state;
  }
  function readDisabled(gm) {
    let v = gm.getValue(DISABLED_KEY, []);
    return Array.isArray(v) ? v.filter((x) => typeof x == "string") : [];
  }
  var CSS2 = `.box{position:fixed;top:16px;right:16px;z-index:2147483647;background:#fff;color:#1f2937;
  font:13px/1.4 system-ui,sans-serif;border:1px solid #d1d5db;border-radius:8px;
  box-shadow:0 8px 24px rgba(0,0,0,.18);padding:12px 14px;min-width:240px}
h2{font-size:14px;margin:0 0 8px}label{display:flex;gap:8px;align-items:center;padding:3px 0}
.row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
button{font:inherit;padding:4px 10px;border-radius:6px;border:1px solid #d1d5db;background:#f9fafb;cursor:pointer}
button.primary{background:#2563eb;border-color:#2563eb;color:#fff}
p{margin:8px 0 0;color:#6b7280;font-size:12px}`;
  function openSwitchboard(matched, gm, win) {
    let doc = win.document, el = (tag, props = {}, ...kids) => {
      let n = doc.createElement(tag);
      for (let [k, v] of Object.entries(props))
        k === "class" ? n.className = v : k === "text" ? n.textContent = v : n.setAttribute(k, v);
      return n.append(...kids), n;
    };
    doc.getElementById("work-browser-tools-switchboard")?.remove();
    let host = el("div", { id: "work-browser-tools-switchboard" }), root = host.attachShadow({ mode: "open" }), off = new Set(readDisabled(gm)), boxes = matched.map((t) => {
      let box = el("input", { type: "checkbox", "data-id": t.id });
      return box.checked = !off.has(t.id), box;
    }), cancel = el("button", { class: "cancel", text: "Cancel" }), save = el("button", { class: "primary save", text: "Save and reload" });
    return root.append(
      el("style", { text: CSS2 }),
      el(
        "div",
        { class: "box", role: "dialog", "aria-label": "Work Browser Tools on this page" },
        el("h2", { text: "Work Browser Tools on this page" }),
        el("div", { class: "list" }, ...matched.map((t, i) => el("label", {}, boxes[i], doc.createTextNode(t.label)))),
        el("p", { text: "Applies everywhere, after a reload." }),
        el("div", { class: "row" }, cancel, save)
      )
    ), cancel.addEventListener("click", () => host.remove()), save.addEventListener("click", () => {
      for (let box of boxes)
        box.checked ? off.delete(box.dataset.id) : off.add(box.dataset.id);
      gm.setValue(DISABLED_KEY, [...off].sort()), win.location.reload();
    }), (doc.body || doc.documentElement).append(host), root;
  }

  // bundle/entry.js
  boot(TOOLS, {
    getValue: (k, d) => GM_getValue(k, d),
    setValue: (k, v) => GM_setValue(k, v),
    registerMenuCommand: (caption, fn) => GM_registerMenuCommand(caption, fn)
  });
})();
