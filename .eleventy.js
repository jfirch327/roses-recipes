module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.svg": "favicon.svg" });

  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/_includes/svg/");

  const CATEGORY_META = require("./src/_data/categories.js");
  const COLLECTION_META = require("./src/_data/seasons.js");

  eleventyConfig.addFilter("categoryName", (slug) => {
    const found = CATEGORY_META.find((c) => c.slug === slug);
    return found ? found.name : slug;
  });

  eleventyConfig.addFilter("categoryGroup", (slug) => {
    const found = CATEGORY_META.find((c) => c.slug === slug);
    return found ? found.group : "";
  });

  eleventyConfig.addFilter("collectionName", (slug) => {
    const found = COLLECTION_META.find((c) => c.slug === slug);
    return found ? found.name : slug;
  });

  eleventyConfig.addFilter("isoDate", (value) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    return d.toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("readableTime", (iso) => {
    if (!iso) return "";
    const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
    if (!m) return iso;
    const h = parseInt(m[1] || "0", 10);
    const mm = parseInt(m[2] || "0", 10);
    const parts = [];
    if (h) parts.push(h + " hr");
    if (mm) parts.push(mm + " min");
    return parts.join(" ") || "0 min";
  });

  eleventyConfig.addFilter("recipesIn", (allRecipes, categorySlug) => {
    return (allRecipes || []).filter((r) => r.data.category === categorySlug);
  });

  eleventyConfig.addFilter("recipesTagged", (allRecipes, tagSlug) => {
    return (allRecipes || []).filter((r) => Array.isArray(r.data.tags) && r.data.tags.includes(tagSlug));
  });

  eleventyConfig.addFilter("featuredOne", (recipes) => {
    return (recipes || []).find((r) => r.data && r.data.featured) || null;
  });

  eleventyConfig.addFilter("isGrouped", (ingredients) => {
    return Array.isArray(ingredients) && ingredients.length > 0 && !!ingredients[0].group;
  });

  eleventyConfig.addFilter("ingredientsFlat", (ingredients) => {
    if (!Array.isArray(ingredients)) return [];
    if (!ingredients.length) return [];
    if (!ingredients[0].group) return ingredients;
    return ingredients.flatMap((g) => g.items || []);
  });

  // Wrap a leading quantity + unit in a <span class="qty"> and mark the number
  // in a data attribute for the client-side scaler.
  eleventyConfig.addFilter("ingredientQty", (line) => {
    if (!line) return "";
    // Handle a leading number like "2", "2 1/2", "1/2", "1.5"
    const m = line.match(/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.\d+)(\s+(?:cups?|c\.|teaspoons?|tsp\.?|tablespoons?|Tbsp\.?|T\.?|tbsp\.?|lbs?\.?|oz\.?|pounds?|ounces?|packages?|cans?|sticks?|small|large|medium|pinch|dash))?(\s+.*)?$/i);
    if (!m) return line;
    const num = m[1];
    const unit = (m[2] || "").trim();
    const rest = (m[3] || "").trim();
    const qtyText = unit ? `${num} ${unit}` : num;
    const restText = rest ? ` ${rest}` : "";
    return `<span class="qty" data-qty="${num}" data-qty-text="${qtyText.replace(/"/g, "&quot;")}">${qtyText}</span>${restText}`;
  });

  // Normalize an ingredient line down to its canonical noun for indexing.
  // Strips numeric quantities, word numbers, sized preambles (9-inch, 13x9),
  // units, and common preparation modifiers, in repeated passes.
  // Note: (\s+|$) at the tail so these also match when they are the ONLY thing left.
  const UNITS_RE = /^(cups?|c\.|teaspoons?|tsp\.?|tablespoons?|T\.?|Tbsp\.?|tbsp\.?|lbs?\.?|oz\.?|pounds?|ounces?|packages?|pkgs?\.?|pkg|cans?|sticks?|bags?|boxes|box|tubs?|jars?|bottles?|containers?|small|large|medium|average[-\s]?size|pinch|dash|handful|clove|cloves|scoop|scoops|slice|slices|piece|pieces|sprig|sprigs)(\s+of)?(\s+|$)/i;
  const MODS_RE  = /^(cold|melted|softened|room[-\s]?temperature|chopped|diced|minced|beaten|large|small|fresh|dried|hot|warm|thawed|crushed|shredded|grated|remaining|frozen|instant|baked|unbaked|prepared|packed|firmly|lightly|whole|halved|quartered|sifted|toasted|well[-\s]?beaten)(\s+|$)/i;

  function normalizeIngredient(line) {
    if (!line) return "";
    let s = String(line).trim();
    // Cut at first comma or parenthetical up front so trailing preparation
    // notes ("beaten", "softened") don't survive as ingredient-noun candidates.
    s = s.split(",")[0].split("(")[0].trim();
    // Strip a trailing "for X" clause ("for the top", "for dusting").
    s = s.replace(/\s+for\s+.+$/i, "").trim();

    let changed = true;
    while (changed) {
      changed = false;
      const before = s;
      // Sized preambles that read like numbers but describe a pan or size:
      // "13x9 pan", "9-inch pie", "8-oz Cool Whip".
      s = s.replace(/^\d+\s*[x×]\s*\d+\s+/i, "");
      s = s.replace(/^\d+\s*[-\s]?inch\s+/i, "");
      s = s.replace(/^\d+\s*[-\s]?oz\.?\s+/i, "");
      s = s.replace(/^\d+\s*[-\s]?qt\.?\s+/i, "");
      s = s.replace(/^\d+\s*[-\s]?lb\.?s?\s+/i, "");
      // Numeric quantity: mixed fraction, fraction, decimal, integer.
      s = s.replace(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)\s+/, "");
      // Word numbers.
      s = s.replace(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\s+/i, "");
      // "plus 1 teaspoon" style continuation ("5 T. plus 1 teaspoon cornstarch").
      s = s.replace(/^plus\s+/i, "");
      // Units.
      s = s.replace(UNITS_RE, "");
      // Modifiers.
      s = s.replace(MODS_RE, "");
      if (s !== before) changed = true;
    }

    // Canonical singular/plural consolidation for common forms.
    let key = s.toLowerCase().replace(/\.$/, "").trim();
    const canonical = {
      "egg": "egg",
      "eggs": "egg",
      "egg yolk": "egg yolk",
      "egg yolks": "egg yolk",
      "egg white": "egg white",
      "egg whites": "egg white",
      "onion": "onion",
      "onions": "onion",
      "hash brown": "hash browns",
      "hash browns": "hash browns",
      "yellow cake mix": "yellow cake mix",
      "yellow cake mix with pudding in the mix": "yellow cake mix",
      "instant lemon pudding mix": "lemon pudding mix",
      "lemon pudding mix": "lemon pudding mix",
      "pineapple or vanilla instant pudding": "vanilla or pineapple pudding mix",
      "pineapple or vanilla pudding": "vanilla or pineapple pudding mix",
      "cream cheese": "cream cheese",
      "cool whip": "cool whip",
      "pie shell": "pie shell",
      "chocolate": "chocolate",
      "semi-sweet chocolate": "semi-sweet chocolate",
      "marshmallow": "marshmallows",
      "marshmallows": "marshmallows",
      "cream of chicken soup": "cream of chicken soup",
      "cream of coconut": "cream of coconut",
      "cornstarch": "cornstarch",
      "sweetened condensed milk": "sweetened condensed milk",
      "up": "7 Up",
      "7 up": "7 Up"
    };
    if (canonical[key]) key = canonical[key];
    // If a line still starts with the word "of" or a stray "the", strip it.
    key = key.replace(/^(of|the)\s+/, "").trim();
    return key;
  }

  eleventyConfig.addFilter("ingredientKey", (line) => normalizeIngredient(line));

  // Build a nested map { "A": { "apple": [{title,url},...], ... }, ... } from all recipes.
  eleventyConfig.addFilter("ingredientMap", (allRecipes) => {
    const map = {};
    for (const r of (allRecipes || [])) {
      const ings = r.data.ingredients;
      let flat = [];
      if (Array.isArray(ings)) {
        if (ings.length && ings[0].group) flat = ings.flatMap((g) => g.items || []);
        else flat = ings;
      }
      for (const line of flat) {
        const key = normalizeIngredient(line);
        if (!key) continue;
        // Place under the first A–Z letter in the key so branded items like
        // "7 Up" bucket under "#" and "cocoa" under "C".
        const first = key[0].toUpperCase();
        const L = /[A-Z]/.test(first) ? first : "#";
        if (!map[L]) map[L] = {};
        if (!map[L][key]) map[L][key] = [];
        if (!map[L][key].some((x) => x.url === r.url)) {
          map[L][key].push({ title: r.data.title, url: r.url });
        }
      }
    }
    // Sort each letter's keys alphabetically
    const out = {};
    for (const L of Object.keys(map).sort()) {
      const sorted = {};
      for (const k of Object.keys(map[L]).sort()) sorted[k] = map[L][k];
      out[L] = sorted;
    }
    return out;
  });

  // Return N related recipes: same category first, then shared tags, excluding
  // the current URL.
  eleventyConfig.addFilter("related", (all, catSlug, tags, currentUrl, n) => {
    const t = Array.isArray(tags) ? tags : [];
    const others = (all || []).filter((r) => r.url !== currentUrl);
    const sameCat = others.filter((r) => r.data.category === catSlug);
    const sharedTag = others.filter(
      (r) =>
        r.data.category !== catSlug &&
        Array.isArray(r.data.tags) &&
        r.data.tags.some((x) => t.includes(x))
    );
    const seen = new Set();
    const out = [];
    for (const r of [...sameCat, ...sharedTag]) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      out.push(r);
      if (out.length >= (n || 3)) break;
    }
    return out;
  });

  eleventyConfig.addFilter("instructionsToSchema", (instructions) => {
    if (!Array.isArray(instructions)) return [];
    return instructions.map((step, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "text": step
    }));
  });

  const markdownIt = require("markdown-it")({ html: true, linkify: true, typographer: true });
  eleventyConfig.addFilter("md", (str) => (str ? markdownIt.render(str) : ""));
  eleventyConfig.addFilter("mdInline", (str) => (str ? markdownIt.renderInline(str) : ""));

  eleventyConfig.addShortcode("svg", function (name) {
    const fs = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "src", "_includes", "svg", name + ".svg");
    if (!fs.existsSync(file)) return "";
    return fs.readFileSync(file, "utf8");
  });

  eleventyConfig.addShortcode("dish", function (name) {
    const fs = require("fs");
    const path = require("path");
    if (!name) return "";
    const file = path.join(__dirname, "src", "_includes", "svg", "dish", "dish-" + name + ".svg");
    if (!fs.existsSync(file)) return "";
    return fs.readFileSync(file, "utf8");
  });

  eleventyConfig.addShortcode("medallion", function (n) {
    // Hand-drawn wobbly circle with the numeral inside (Fraunces italic).
    // Slight offsets on the circle path make it feel drawn, not machined.
    return `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<path d="M20 3 Q31 3 36 12 Q39 20 35 29 Q29 37 20 37 Q10 37 5 28 Q2 20 6 11 Q11 3 20 3 Z"/>
<text x="20" y="27" font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="500" font-size="18" text-anchor="middle" fill="currentColor" stroke="none">${n}</text>
</svg>`;
  });

  eleventyConfig.addCollection("recipe", (api) => {
    return api
      .getFilteredByGlob("src/recipes/**/*.md")
      .sort((a, b) => (a.data.title || "").localeCompare(b.data.title || ""));
  });

  // Build-time search index (title, url, category, description, ingredients).
  eleventyConfig.addCollection("searchIndex", (api) => {
    return api.getFilteredByGlob("src/recipes/**/*.md").map((r) => {
      const ings = r.data.ingredients;
      let flat = [];
      if (Array.isArray(ings)) {
        if (ings.length && ings[0].group) flat = ings.flatMap((g) => g.items || []);
        else flat = ings;
      }
      return {
        title: r.data.title,
        url: r.url,
        category: CATEGORY_META.find((c) => c.slug === r.data.category)?.name || r.data.category,
        desc: r.data.description || "",
        ingredients: flat.join(" | ")
      };
    });
  });

  eleventyConfig.addCollection("recentRecipes", (api) => {
    return api
      .getFilteredByGlob("src/recipes/**/*.md")
      .sort((a, b) => {
        const ad = a.data.datePublished || a.date;
        const bd = b.data.datePublished || b.date;
        return new Date(bd) - new Date(ad);
      })
      .slice(0, 6);
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["njk", "md", "html", "11ty.js"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
