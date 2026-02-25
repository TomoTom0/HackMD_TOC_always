# HackMD_TOC_always

## Abstract

With this extension in HackMD, you can see TOC even in edit or split-view mode.

![](img/HackMDtoc_gif.gif)

## Features
These features work in every mode.
You can move by clicking an item in TOC

### TOC Menu
TOC settings are integrated into HackMD's dropdown menu (top-right menu button):
- **Show/Hide TOC**: Toggle TOC visibility
- **TOC Settings**: Open settings dialog
    - **Custom TOC Tab**:
        - Change opacity
        - Change width
        - Toggle visibility
        - Expand Mode:
            - **Always**: Always expand all sections
            - **Auto**: Show h1/h2 always, expand h3+ only for active section
    - **Official TOC Tab**:
        - Opacity: Change HackMD's official TOC transparency
        - Width: Change official TOC width
        - Visibility:
            - **Persist**: Keep TOC visible even when clicking outside (only toggle button closes it)
            - **Auto**: Default HackMD behavior (clicking outside closes TOC)

![](img/HackMDTOC_ss4.png)


## Contact Me

- Gmail: TomoIris427+GitHub@gmail.com

## License

MIT

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for third-party license information.

## Development

### Build

```bash
./scripts/build.sh
```

### Deploy

```bash
# Set DEPLOY_TARGET in .env
cp .env.example .env
# Edit .env and set DEPLOY_TARGET

./scripts/deploy.sh
```

### Project Structure

```
hackmd-toc/
├── src/                    # Source files
│   ├── manifest.json      # Extension manifest (Manifest V3)
│   ├── content_script.js  # Main logic (Vanilla JS)
│   ├── options.html       # Options page
│   └── options_script.js  # Options logic
├── scripts/               # Build & deploy scripts
│   ├── build.sh          # Build to dist/
│   └── deploy.sh         # Deploy to DEPLOY_TARGET
├── dist/                  # Build output (gitignored)
└── img/                   # Images
```

### Changes

#### v1.6.0 (2026-02-25)
- Add Official TOC control feature (separate tab in settings)
    - Opacity: Control HackMD's official TOC transparency
    - Width: Change official TOC width
    - Persist mode: Keep TOC visible even when clicking outside
- Settings dialog now uses tabs to separate Custom TOC and Official TOC settings

#### v1.5.0 (2026-02-24)
- Add Expand Mode setting (Always/Auto)
  - Always: Always expand all sections
  - Auto: Show h1/h2 always, expand h3+ only for active section
- Use custom CSS classes (chex-*) to avoid conflicts with HackMD styles
- Improve dark mode: use light background for TOC in dark mode
- Reduce font size for better readability
- Fix selector syntax errors

#### v1.4.0 (2025-02-21)
- Generate TOC from headings (no longer depends on HackMD's existing TOC)
- Integrate TOC settings into HackMD's dropdown menu
- Fix selectors for current HackMD DOM structure
- Fix CSSStyleDeclaration error in setStyles function

#### v1.3.0 (2025-02-19)
- Migrate to Manifest V3
- Remove jQuery dependency (Vanilla JS rewrite)
- Update selectors for current HackMD DOM structure
- Add build and deploy scripts
