/* recipe.js — utilities for a single recipe page
 * Runs only when base.njk includes it (recipe layout).
 */
(function () {
  var article = document.querySelector("article.recipe");
  if (!article) return;

  var slug = article.dataset.slug || location.pathname;
  var title = article.dataset.title || document.title;

  /* --------------------------------------------------------
   * Scroll progress bar
   * -------------------------------------------------------- */
  var bar = document.getElementById("scrollProgress");
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var b = document.body;
      var max = (h.scrollHeight || b.scrollHeight) - h.clientHeight;
      var pct = max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
      bar.style.transform = "scaleX(" + pct + ")";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* --------------------------------------------------------
   * Jump to recipe
   * -------------------------------------------------------- */
  var jumpBtn = article.querySelector("[data-jump]");
  var body = document.getElementById("recipe-body");
  if (jumpBtn && body) {
    jumpBtn.addEventListener("click", function () {
      body.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* --------------------------------------------------------
   * Print and Save PDF (both open the browser print dialog;
   * Save PDF frames it as "choose Save as PDF for the destination")
   * -------------------------------------------------------- */
  var toast = document.getElementById("toast");
  var showToast = function (msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-visible");
    setTimeout(function () { toast.classList.remove("is-visible"); }, 2400);
  };
  var printBtn = article.querySelector("[data-print]");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  var pdfBtn = article.querySelector("[data-savepdf]");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", function () {
      showToast("Choose “Save as PDF” in the print dialog");
      setTimeout(function () { window.print(); }, 250);
    });
  }

  /* --------------------------------------------------------
   * Save to Keepers
   * -------------------------------------------------------- */
  var saveBtn = article.querySelector("[data-save]");
  var KEEP_KEY = "roses.keepers";
  var loadKeepers = function () {
    try { return JSON.parse(localStorage.getItem(KEEP_KEY) || "[]"); } catch (e) { return []; }
  };
  var saveKeepers = function (list) {
    try { localStorage.setItem(KEEP_KEY, JSON.stringify(list)); } catch (e) {}
  };
  var refreshSaveBtn = function () {
    var list = loadKeepers();
    var saved = list.some(function (k) { return k.url === location.pathname; });
    saveBtn.classList.toggle("is-on", saved);
    saveBtn.setAttribute("aria-pressed", saved ? "true" : "false");
    saveBtn.querySelector("span").textContent = saved ? "Saved" : "Save";
  };
  if (saveBtn) {
    refreshSaveBtn();
    saveBtn.addEventListener("click", function () {
      var list = loadKeepers();
      var idx = list.findIndex(function (k) { return k.url === location.pathname; });
      if (idx >= 0) { list.splice(idx, 1); showToast("Removed from keepers"); }
      else { list.push({ url: location.pathname, title: title, saved: Date.now() }); showToast("Saved to keepers"); }
      saveKeepers(list);
      refreshSaveBtn();
    });
  }

  /* --------------------------------------------------------
   * Ingredient checkboxes with localStorage
   * -------------------------------------------------------- */
  var CHECK_KEY = "roses.checks." + slug;
  var loadChecks = function () {
    try { return JSON.parse(localStorage.getItem(CHECK_KEY) || "[]"); } catch (e) { return []; }
  };
  var saveChecks = function (list) {
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(list)); } catch (e) {}
  };
  var boxes = article.querySelectorAll(".ingredient-list input[type=checkbox]");
  var clearBtn = article.querySelector("[data-clear-checks]");
  var stored = loadChecks();
  boxes.forEach(function (b, i) {
    if (stored.indexOf(i) >= 0) b.checked = true;
    b.addEventListener("change", function () {
      var list = [];
      boxes.forEach(function (bb, j) { if (bb.checked) list.push(j); });
      saveChecks(list);
      if (clearBtn) clearBtn.hidden = list.length === 0;
    });
  });
  if (clearBtn) {
    clearBtn.hidden = stored.length === 0;
    clearBtn.addEventListener("click", function () {
      boxes.forEach(function (b) { b.checked = false; });
      saveChecks([]);
      clearBtn.hidden = true;
    });
  }

  /* --------------------------------------------------------
   * Step click-to-mark-done
   * -------------------------------------------------------- */
  var STEP_KEY = "roses.steps." + slug;
  var loadSteps = function () {
    try { return JSON.parse(localStorage.getItem(STEP_KEY) || "[]"); } catch (e) { return []; }
  };
  var saveSteps = function (list) {
    try { localStorage.setItem(STEP_KEY, JSON.stringify(list)); } catch (e) {}
  };
  var steps = article.querySelectorAll(".instruction-list li");
  var storedSteps = loadSteps();
  steps.forEach(function (s, i) {
    if (storedSteps.indexOf(i) >= 0) s.classList.add("is-done");
    s.addEventListener("click", function (e) {
      // Don't toggle if the click was on a link inside the step.
      if (e.target.closest("a")) return;
      var isDone = s.classList.toggle("is-done");
      var list = loadSteps();
      var idx = list.indexOf(i);
      if (isDone && idx < 0) list.push(i);
      if (!isDone && idx >= 0) list.splice(idx, 1);
      saveSteps(list);
    });
  });

  /* --------------------------------------------------------
   * Servings scaler with smart-fraction rendering
   * -------------------------------------------------------- */
  var scaler = article.querySelector("[data-scaler]");
  if (scaler) {
    var val = scaler.querySelector("[data-scale-val]");
    var down = scaler.querySelector("[data-scale-down]");
    var up = scaler.querySelector("[data-scale-up]");
    var current = 1;

    var toFraction = function (num) {
      // Round to nearest 1/8, then render as a nice mixed number.
      var whole = Math.floor(num);
      var frac = num - whole;
      var eighths = Math.round(frac * 8);
      if (eighths === 8) { whole += 1; eighths = 0; }
      var map = { 0: "", 1: "⅛", 2: "¼", 3: "⅜", 4: "½", 5: "⅝", 6: "¾", 7: "⅞" };
      var fracStr = map[eighths] || "";
      if (whole === 0 && fracStr === "") return "0";
      if (whole === 0) return fracStr;
      if (fracStr === "") return String(whole);
      return whole + " " + fracStr;
    };

    var parseQty = function (s) {
      if (!s) return null;
      // "2 1/2" => 2.5, "1/2" => 0.5, "1.5" => 1.5, "2" => 2
      var m1 = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
      if (m1) return parseInt(m1[1], 10) + parseInt(m1[2], 10) / parseInt(m1[3], 10);
      var m2 = s.match(/^(\d+)\/(\d+)$/);
      if (m2) return parseInt(m2[1], 10) / parseInt(m2[2], 10);
      var m3 = s.match(/^(\d+(?:\.\d+)?)$/);
      if (m3) return parseFloat(m3[1]);
      return null;
    };

    var qtySpans = article.querySelectorAll(".ingredient-list .qty");
    // Cache original text and numeric value per span
    qtySpans.forEach(function (q) {
      var raw = q.getAttribute("data-qty");
      var unit = q.getAttribute("data-qty-text") || "";
      var base = parseQty(raw);
      q._base = base;
      q._original = q.textContent;
      // Unit portion is everything after the leading number.
      // Order matters: more-specific patterns first so "1/2" isn't eaten as just "1".
      var afterNum = unit.replace(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)\s*/, "");
      q._unit = afterNum;
    });

    var word = article.querySelector("[data-scale-word]");
    var yieldLabel = article.querySelector("[data-yield-label]");
    var originalYield = yieldLabel ? yieldLabel.textContent : "";

    var wordFor = function (n) {
      if (n === 1) return "full size";
      if (n === 0.5) return "half batch";
      if (n === 0.25) return "quarter batch";
      if (n === 0.75) return "three-quarter batch";
      if (n === 2) return "double batch";
      if (n === 3) return "triple batch";
      if (n < 1) return toFraction(n) + " of the recipe";
      return toFraction(n) + " batches";
    };

    var wordToNum = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, dozen:12 };

    var pluralize = function (s) {
      // Simple pluralization on the last word — "cake" → "cakes", "dish" → "dishes"
      var parts = s.split(/(\s+)/);
      for (var i = parts.length - 1; i >= 0; i--) {
        if (/[a-z]/i.test(parts[i])) {
          var w = parts[i];
          if (/s$/i.test(w)) break;
          if (/f$/i.test(w)) w = w.slice(0, -1) + "ves";
          else if (/(ch|sh|s|x|z)$/i.test(w)) w = w + "es";
          else if (/[^aeiou]y$/i.test(w)) w = w.slice(0, -1) + "ies";
          else w = w + "s";
          parts[i] = w;
          break;
        }
      }
      return parts.join("");
    };

    var scaleYield = function (s, n) {
      if (!s) return s;
      if (n === 1) return s;
      var m;
      // "About|Around|Roughly X" — recurse into the rest, keep the prefix
      m = s.match(/^(about|around|roughly)\s+(.+)$/i);
      if (m) return m[1] + " " + scaleYield(m[2], n);
      // "Enough to X" — leave verbatim with a multiplier hint
      m = s.match(/^(enough\s+.+)$/i);
      if (m) return "×" + toFraction(n) + " · " + m[1];
      // Leading digit with optional mixed fraction
      m = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)\s+(.+)$/);
      if (m) {
        var raw = m[1];
        var v;
        var mf = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        var mff = raw.match(/^(\d+)\/(\d+)$/);
        if (mf) v = parseInt(mf[1],10) + parseInt(mf[2],10)/parseInt(mf[3],10);
        else if (mff) v = parseInt(mff[1],10)/parseInt(mff[2],10);
        else v = parseFloat(raw);
        return toFraction(v * n) + " " + m[2];
      }
      // Leading word number
      m = s.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\s+(.+)$/i);
      if (m) {
        var val = wordToNum[m[1].toLowerCase()] || 1;
        var scaled = val * n;
        var rest = m[2];
        // If original was singular ("one") and new count > 1, pluralize the noun
        var newRest = (val === 1 && scaled > 1) ? pluralize(rest) : rest;
        // If rest starts with a digit, use a middle dot to separate the count from the descriptor
        if (/^\d/.test(newRest)) return toFraction(scaled) + " · " + newRest;
        return toFraction(scaled) + " " + newRest;
      }
      // Fallback — prefix with multiplier
      return "×" + toFraction(n) + " · " + s;
    };

    var render = function () {
      val.textContent = "×" + toFraction(current);
      if (word) word.textContent = wordFor(current);
      if (yieldLabel && originalYield) yieldLabel.textContent = scaleYield(originalYield, current);
      qtySpans.forEach(function (q) {
        if (q._base == null) return;
        var scaled = q._base * current;
        var pretty = toFraction(scaled);
        q.textContent = q._unit ? pretty + " " + q._unit : pretty;
      });
    };
    render();

    var setScale = function (n) {
      current = Math.max(0.25, Math.min(8, n));
      render();
    };

    down.addEventListener("click", function () {
      var next = current <= 1 ? current - 0.25 : current - 0.5;
      setScale(next);
    });
    up.addEventListener("click", function () {
      var next = current < 1 ? current + 0.25 : current + 0.5;
      setScale(next);
    });
  }

  /* --------------------------------------------------------
   * Handwritten card lightbox
   * -------------------------------------------------------- */
  var trigger = article.querySelector("[data-lightbox]");
  var dialog = document.getElementById("lightbox");
  var lbImg = document.getElementById("lightboxImg");
  if (trigger && dialog && lbImg) {
    trigger.addEventListener("click", function () {
      var src = trigger.getAttribute("data-lightbox");
      lbImg.src = src;
      lbImg.alt = trigger.querySelector("img").alt;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
    var closeBtn = dialog.querySelector("[data-lightbox-close]");
    if (closeBtn) closeBtn.addEventListener("click", function () { dialog.close(); });
  }
})();
