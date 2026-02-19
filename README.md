# HackMD_TOC_always

## Abstract

With this extension in HackMD, you can see TOC even in edit or split-view mode.

![](img/HackMDtoc_gif.gif)

## Features
These features work in every mode.
You can move by clicking an item in TOC

### navi-bar buttons
add toc-menu buttons in navi-bar
    - toggle-expand / back-to-top / go-to-bottom / open-adjust-dialog

### adjust TOC
adjust TOC in a modal dialog which you can open in the navi-bar icon
- change opacity
- change width
- hide/show TOC

![](img/HackMDTOC_ss4.png)


## Contact Me

- Gmail: TomoIris427+GitHub@gmail.com

## License

MIT

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

#### v1.3.0 (2025-02-19)
- Migrate to Manifest V3
- Remove jQuery dependency (Vanilla JS rewrite)
- Update selectors for current HackMD DOM structure
- Add build and deploy scripts
