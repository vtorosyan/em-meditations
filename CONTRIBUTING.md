# Contributing

Thanks for your interest in *EM Meditations*. This is a personal writing project, but the build is simple and the structure is easy to follow if you'd like to add a meditation, fix something, or tweak the site.

## Project layout

| Path | What it is |
|---|---|
| `meditations/` | The meditations, one Markdown file each. **Source of truth.** |
| `templates/meditation-template.md` | Starting point for a new entry. |
| `index.md` | Chronological list (reader-facing, on the site). |
| `themes.md` | Notes on themes. |
| `README.md` | Project intro — also rendered as the site's **About** page. |
| `build.js` | Zero-dependency static site generator. |
| `Makefile` | Convenience wrapper around the build. |
| `docs/` | **Generated output** served by GitHub Pages. Don't edit by hand — regenerate with `make build`. |

## Building locally

Requires Node (no `npm install` — there are no dependencies).

```sh
make build      # generate ./docs
make preview    # build, then open it in your browser
make serve      # build, then serve locally (make serve PORT=8080 to change port)
make rebuild    # clean + build from scratch
make clean      # remove ./docs
```

`make` with no target lists everything. You can also run `node build.js` directly.

## Adding a meditation

1. Copy the template to a new, numbered file in `meditations/`:

   ```sh
   cp templates/meditation-template.md meditations/010_your_title.md
   ```

   The filename prefix (`010_`) determines ordering — the build sorts files
   numerically, so keep the zero-padded number sequential.

2. Fill it in. The build reads structured bits from the top of the file, so keep
   this shape on the first lines:

   ```markdown
   # 010: Your Title

   *Date: 2026-06-23*
   *Theme: Control and Acceptance*

   ## Today's Quote
   ...
   ```

   - **Title** comes from the `# NNN: Title` heading.
   - **Date** and **Theme** come from the `*Date: ...*` / `*Theme: ...*` lines.
   - The Theme groups the entry on the [Themes](themes.md) page — reuse an
     existing theme name when it fits.

3. Add a matching line to `index.md` under **All Meditations** (links there use
   `.md` paths; the build rewrites them to `.html`).

4. `make preview` and check that the new entry shows on the home page, the
   themes page, and reads correctly.

## Style notes

- Keep entries grounded in real situations, not hypotheticals (see the usage
  notes at the bottom of the template).
- The Markdown converter in `build.js` is intentionally minimal — it supports
  headings, paragraphs, bold/italic, links, ordered/unordered lists,
  blockquotes, horizontal rules, and inline code. Exotic Markdown may not
  render; preview before committing.

## Pull requests

- Keep one meditation (or one focused change) per PR where you can.
- `docs/` is generated and serves the live site, so run `make build` and commit
  the regenerated output alongside your content change.
