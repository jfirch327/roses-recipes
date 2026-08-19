# Grandma Rose's Recipes

A family recipe site at [rosesrecipes.com](https://rosesrecipes.com), preserving handwritten recipes from a midwestern Ohio farm kitchen.

Built with [Eleventy](https://www.11ty.dev/), plain CSS, and hand-drawn SVGs. Deployed to GitHub Pages via GitHub Actions on every push to `main`.

## Local development

Requires Node 20 or newer.

```bash
npm install
npm run serve
```

Then open http://localhost:8080.

## Building

```bash
npm run build
```

Output is written to `_site/`.

## Adding a recipe

1. Drop the handwritten photo (HEIC or JPG) into `Recipes/Hand Written Recipes/`.
2. Run `npm run convert-images` to generate JPG and WebP variants at two sizes into `src/assets/images/recipes/`.
3. Create a new Markdown file in the right category folder under `src/recipes/`. Use an existing recipe as a template — every field in the frontmatter is used by the templates and the schema.org JSON-LD.
4. `npm run serve` will rebuild on save. Click through and confirm the page renders.
5. Commit and push. GitHub Actions will build and deploy in about a minute.

## Categories

The site organizes recipes into three groups and fifteen categories, defined in `src/_data/categories.js`. Recipes assign themselves to one category via the `category:` frontmatter field, and to zero or more seasonal collections via `tags:` (Holiday, Sunday Supper, Potluck, Canning Season) defined in `src/_data/collections.js`.

## Deploying to a custom domain

`src/CNAME` contains `rosesrecipes.com` and is copied straight into the built site so GitHub Pages picks it up.

DNS records at Namecheap:

- `A` `@` `185.199.108.153`
- `A` `@` `185.199.109.153`
- `A` `@` `185.199.110.153`
- `A` `@` `185.199.111.153`
- `CNAME` `www` `<github-username>.github.io.`

In the GitHub repo settings, enable Pages, set the custom domain to `rosesrecipes.com`, and check "Enforce HTTPS" once the Let's Encrypt certificate provisions.

## Waitlist form

The cookbook waitlist form posts to whichever email service you set in `src/_data/site.json` under `waitlist.endpoint`. The default value there is a placeholder. Replace it with a real Buttondown, ConvertKit, or MailerLite embed URL before launch.
