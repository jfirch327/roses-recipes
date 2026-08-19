/* site.js — global utilities: sticky header, mobile nav, reveal, back-to-top, filter chips, keepers list, search */
(function () {
  /* Sticky header — shrink after scroll, hide on scroll-down, reveal on scroll-up */
  var hdr = document.querySelector(".site-header");
  if (hdr) {
    var scrolled = false;
    var hidden = false;
    var lastY = window.scrollY;
    var HIDE_AFTER = 220;      // px — don't hide near the very top
    var HIDE_DELTA = 8;        // px — minimum scroll distance before toggling
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      var s = y > 60;
      if (s !== scrolled) { scrolled = s; hdr.classList.toggle("is-scrolled", s); }

      var dy = y - lastY;
      if (Math.abs(dy) < HIDE_DELTA) return;   // ignore tiny jitters
      if (y < HIDE_AFTER) {                     // near the top: always visible
        if (hidden) { hidden = false; hdr.classList.remove("is-hidden"); }
      } else if (dy > 0 && !hidden) {           // scrolling down: hide
        hidden = true; hdr.classList.add("is-hidden");
      } else if (dy < 0 && hidden) {            // scrolling up: reveal
        hidden = false; hdr.classList.remove("is-hidden");
      }
      lastY = y;
    }, { passive: true });
  }

  /* Mobile nav toggle */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("nav.primary");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Reveal on scroll */
  if ("IntersectionObserver" in window) {
    var els = document.querySelectorAll(".reveal");
    if (els.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e, i) {
          if (e.isIntersecting) {
            setTimeout(function () { e.target.classList.add("is-visible"); }, i * 70);
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -60px 0px", threshold: 0.05 });
      els.forEach(function (el) { io.observe(el); });
    }
  }

  /* Back-to-top chip */
  var back = document.getElementById("backToTop");
  if (back) {
    back.hidden = false;
    var lastShown = false;
    window.addEventListener("scroll", function () {
      var pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      var show = pct > 0.5;
      if (show !== lastShown) {
        lastShown = show;
        back.classList.toggle("is-visible", show);
      }
    }, { passive: true });
    back.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* Filter chips on category pages */
  var chips = document.querySelectorAll(".filter-chips button");
  if (chips.length) {
    var cards = document.querySelectorAll(".tile-grid .recipe-card");
    var active = "all";
    var applyFilter = function () {
      cards.forEach(function (c) {
        var tags = (c.dataset.tags || "").split(/\s+/);
        var total = (c.dataset.total || "");
        var totalMin = 0;
        var m = total.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (m) totalMin = (parseInt(m[1] || "0", 10) * 60) + parseInt(m[2] || "0", 10);
        var show = true;
        if (active === "all") show = true;
        else if (active === "quick") show = totalMin > 0 && totalMin <= 30;
        else if (active === "slow") show = totalMin >= 120;
        else show = tags.indexOf(active) >= 0;
        c.classList.toggle("is-hidden", !show);
      });
    };
    chips.forEach(function (b) {
      b.addEventListener("click", function () {
        chips.forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        active = b.dataset.filter || "all";
        applyFilter();
      });
    });
  }

  /* Keepers count badge in the primary nav */
  (function () {
    var badge = document.querySelector('[data-keepers-count]');
    if (!badge) return;
    var count = 0;
    try { count = (JSON.parse(localStorage.getItem('roses.keepers') || '[]')).length; } catch (e) {}
    if (count > 0) {
      badge.textContent = String(count);
      badge.hidden = false;
    }
  })();

  /* Keepers list rendering (on /keepers/) */
  var keepers = document.getElementById("keepersList");
  if (keepers) {
    var list = [];
    try { list = JSON.parse(localStorage.getItem("roses.keepers") || "[]"); } catch (e) { list = []; }
    if (!list.length) {
      keepers.innerHTML = '<p class="muted center" style="padding:2rem 0;">Nothing here yet. Open a recipe and tap Save to keep it in your list.</p>';
    } else {
      var html = '<ul style="list-style:none;padding:0;margin:0;">';
      list.sort(function (a, b) { return (b.saved || 0) - (a.saved || 0); });
      list.forEach(function (k) {
        html += '<li style="padding:0.75rem 0;border-bottom:1px dashed var(--linen-soft);">';
        html += '<a href="' + k.url + '" style="text-decoration:none;color:var(--ink);font-family:var(--font-display);font-size:1.2rem;">' + k.title + '</a>';
        html += '<button type="button" data-remove="' + k.url + '" style="float:right;background:none;border:0;color:var(--sage-deep);cursor:pointer;font-size:0.85rem;">Remove</button>';
        html += '</li>';
      });
      html += '</ul>';
      keepers.innerHTML = html;
      keepers.querySelectorAll("[data-remove]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var url = btn.getAttribute("data-remove");
          list = list.filter(function (k) { return k.url !== url; });
          localStorage.setItem("roses.keepers", JSON.stringify(list));
          location.reload();
        });
      });
    }
  }

  /* Search — icon toggles a panel below the header. Client-side fuzzy match
     over titles, descriptions, and ingredient names. */
  var searchToggle = document.getElementById("searchToggle");
  var searchPanel  = document.getElementById("siteSearchPanel");
  var searchInput  = document.getElementById("siteSearch");
  var searchResults = document.getElementById("siteSearchResults");
  var searchClose  = document.getElementById("searchClose");

  if (searchToggle && searchPanel && searchInput && searchResults) {
    var idx = null;
    var loadIndex = function () {
      return fetch("/search-index.json").then(function (r) { return r.json(); }).then(function (data) { idx = data; });
    };
    var render = function (q) {
      q = (q || "").trim().toLowerCase();
      if (!q) {
        searchResults.innerHTML = "";
        searchResults.hidden = true;
        return;
      }
      if (!idx) {
        searchResults.innerHTML = '<p class="muted" style="padding:1rem;">Loading…</p>';
        searchResults.hidden = false;
        return;
      }
      // Match against title, description, category name, and ingredient list.
      var recipeMatches = idx.filter(function (r) {
        return r.title.toLowerCase().indexOf(q) >= 0
          || (r.desc || "").toLowerCase().indexOf(q) >= 0
          || (r.category || "").toLowerCase().indexOf(q) >= 0
          || (r.ingredients || "").toLowerCase().indexOf(q) >= 0;
      }).slice(0, 10);

      // Also surface category pages that match by name.
      var catSet = {};
      idx.forEach(function (r) { if (r.category) catSet[r.category] = r.url.split("/")[1]; });
      var categoryMatches = Object.keys(catSet)
        .filter(function (name) { return name.toLowerCase().indexOf(q) >= 0; })
        .map(function (name) { return { name: name, slug: catSet[name] }; })
        .slice(0, 4);

      if (!recipeMatches.length && !categoryMatches.length) {
        searchResults.innerHTML = '<p class="muted" style="padding:1rem;">Nothing in the tin box matched that.</p>';
      } else {
        var html = "";
        if (categoryMatches.length) {
          html += '<div class="site-search-panel__group-label">Categories</div>';
          html += categoryMatches.map(function (c) {
            return '<a href="/' + c.slug + '/" class="site-search-panel__result">'
              + '<strong>' + c.name + '</strong>'
              + '<small class="muted">recipe drawer</small>'
              + '</a>';
          }).join("");
        }
        if (recipeMatches.length) {
          if (categoryMatches.length) html += '<div class="site-search-panel__group-label">Recipes</div>';
          html += recipeMatches.map(function (r) {
            return '<a href="' + r.url + '" class="site-search-panel__result">'
              + '<strong>' + r.title + '</strong>'
              + '<small class="muted">' + (r.category || "") + '</small>'
              + '</a>';
          }).join("");
        }
        searchResults.innerHTML = html;
      }
      searchResults.hidden = false;
    };

    var openSearch = function () {
      searchPanel.hidden = false;
      searchToggle.setAttribute("aria-expanded", "true");
      if (!idx) loadIndex().then(function () { render(searchInput.value); });
      // Wait one paint so hidden->false takes effect before focus + slide-in class
      requestAnimationFrame(function () {
        searchPanel.classList.add("is-open");
        searchInput.focus();
      });
    };
    var closeSearch = function () {
      searchPanel.classList.remove("is-open");
      searchToggle.setAttribute("aria-expanded", "false");
      searchPanel.hidden = true;
      searchResults.hidden = true;
      searchToggle.focus();
    };

    searchToggle.addEventListener("click", function () {
      if (searchPanel.hidden) openSearch();
      else closeSearch();
    });
    if (searchClose) searchClose.addEventListener("click", closeSearch);
    searchInput.addEventListener("input", function () { render(searchInput.value); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !searchPanel.hidden) closeSearch();
    });
    document.addEventListener("click", function (e) {
      if (searchPanel.hidden) return;
      if (searchPanel.contains(e.target) || searchToggle.contains(e.target)) return;
      closeSearch();
    });
  }
})();
