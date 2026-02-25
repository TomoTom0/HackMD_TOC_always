"use strict";

const default_settings = {
    opacity: 0.5,
    hidden: false,
    width: 150,
    expandMode: "always",
    officialTOC: {
        opacity: 1.0,
        persist: true,
        width: ""
    }
};

const getSyncStorage = (key = null) => new Promise(resolve => {
    chrome.storage.sync.get(key || default_settings, resolve);
});

const setSyncStorage = (key) => new Promise(resolve => {
    chrome.storage.sync.set(key, resolve);
});

// DOM utility functions
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

function setStyles(element, styles) {
    if (!element) return;
    if (typeof styles === 'string') {
        element.style.cssText = styles;
    } else {
        Object.entries(styles).forEach(([key, value]) => {
            element.style[key] = value;
        });
    }
}

/**
 * Flash highlight an element temporarily
 * @param {HTMLElement} element - Element to highlight
 * @param {number} duration - Duration in milliseconds (default: 1500)
 */
function flashHighlight(element, duration = 1500) {
    if (!element) return;

    const originalBackground = element.style.backgroundColor;
    const originalTransition = element.style.transition;

    element.style.transition = 'background-color 0.3s ease-in-out';
    element.style.backgroundColor = 'rgba(255, 235, 59, 0.5)'; // Yellow highlight

    setTimeout(() => {
        element.style.backgroundColor = originalBackground;
        setTimeout(() => {
            element.style.transition = originalTransition;
        }, 300);
    }, duration);
}

/**
 * Check if HackMD is in dark mode
 * @returns {boolean}
 */
function isDarkMode() {
    const body = document.body;
    const bgColor = window.getComputedStyle(body).backgroundColor;
    // Parse rgb(r, g, b) format
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        // If background is dark (all values < 128), it's dark mode
        return r < 128 && g < 128 && b < 128;
    }
    return false;
}

function createElement(tag, options = {}) {
    const elem = document.createElement(tag);
    if (options.class) elem.className = options.class;
    if (options.id) elem.id = options.id;
    if (options.style) setStyles(elem, options.style);
    if (options.attr) Object.entries(options.attr).forEach(([k, v]) => elem.setAttribute(k, v));
    if (options.html) elem.innerHTML = options.html;
    if (options.text) elem.textContent = options.text;
    if (options.children) {
        options.children.forEach(child => elem.appendChild(child));
    }
    return elem;
}

// # on load (content scripts run after DOM is ready)
(async () => {
    let GLOBAL_now_href = location.href;
    await initialSetting();
    // remake TOC per 1 minutes
    setInterval(async function () {
        await remake_TOC();
    }, 60 * 1000);

    const observer = new MutationObserver(async records => {
        const GLOBAL_settings = await getSyncStorage();
        const toc_out = $("#toc_out_ChEx");
        if (toc_out) {
            const mode = obtainMode();
            if (!mode.edit) return;
            if (GLOBAL_settings.expandMode === "always") {
                toc_out.classList.add("chex-expand");
                // Force all ul elements to be visible
                $$('ul', toc_out).forEach(ul => {
                    ul.style.display = 'block';
                });
            } else {
                toc_out.classList.remove("chex-expand");
            }
        }
    });

    // if keypress -> remake TOC
    document.addEventListener("keypress", async function (e) {
        await remake_TOC();
    });

    const observeTrigger = setInterval(() => {
        const toc_out = $("#toc_out_ChEx");
        if (toc_out) {
            observer.observe(toc_out, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
            clearInterval(observeTrigger);
        }
    });

    const obtainMode = () => ({
        edit: location.href.includes('?edit') || !!$(".CodeMirror"),
        view: !location.href.includes('?edit') && !$(".CodeMirror")
    });

    document.addEventListener("click", async function (e) {
        const e_class = e.target.className;
        const mode = obtainMode();
        // if change mode, remake TOC
        if (GLOBAL_now_href !== location.href) {
            await remake_TOC();
            addNaviButtons();
            GLOBAL_now_href = location.href;
        }
        // adjust TOC
        let GLOBAL_settings = await getSyncStorage();
        const classList = e.target.classList;
        if (classList && classList.contains('menu_TOCAlways')) {
            if (classList.contains('menu_hideTOC')) {
                GLOBAL_settings.hidden = !GLOBAL_settings.hidden;
                // Update menu text
                const menuLink = e.target.closest('a');
                if (menuLink) {
                    const icon = GLOBAL_settings.hidden ? 'ph-eye' : 'ph-eye-slash';
                    const label = GLOBAL_settings.hidden ? 'Show TOC' : 'Hide TOC';
                    menuLink.innerHTML = `<i class="ph ${icon}"></i> ${label}`;
                }
            } else if (classList.contains('menu_openTOCSettings')) {
                await updateModalTheme(GLOBAL_settings);
                const modal = $(".tocAdjust-modal");
                if (modal) {
                    modal.style.display = "block";
                    modal.classList.add("in");
                }
            } else if (classList.contains('menu_adjustTOC_opacity')) {
                GLOBAL_settings.opacity = GLOBAL_settings.opacity <= 0.5 ? GLOBAL_settings.opacity * 2 : 0.25;
            } else if (classList.contains('menu_adjustTOC_width')) {
                GLOBAL_settings.width = GLOBAL_settings.width <= 150 ? GLOBAL_settings.width + 50 : 100;
            }
            await updateModalTheme(GLOBAL_settings);
            const sidenav = $(".sidenav.main-sidenav");
            const sidenavMenu = $(".sidenav.sidenav-menu");
            if (sidenav) sidenav.classList.remove("in");
            if (sidenavMenu) sidenavMenu.classList.remove("in");
        }
        // toc jump in edit mode
        const tocOut = $("#toc_out_ChEx");
        if (tocOut && e.target.closest("#toc_out_ChEx")) {
            const anchor = e.target.closest("a");
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const href_id = href.substring(1);
                    const targetElem = document.getElementById(href_id);
                    if (targetElem) {
                        // Flash highlight the target heading
                        flashHighlight(targetElem);

                        // In edit mode (not view mode), also scroll CodeMirror
                        if (mode.edit && !mode.view) {
                            const line_num = parseInt(targetElem.getAttribute('data-startline') || '0');
                            if (line_num > 0) {
                                const firstLine = $(".CodeMirror-line");
                                if (firstLine) {
                                    const lineHeight = firstLine.offsetHeight;
                                    // data-startline is 1-based, so subtract 1 for 0-based calculation.
                                    EditScroll((line_num - 1) * lineHeight);
                                }
                            }
                        }
                    }
                }
            }
        }
        if (e.target.closest('button.close')) {
            const modal = e.target.closest('.modal.fade.in');
            if (modal) {
                modal.removeAttribute('style');
                modal.classList.remove('in');
            }
        } else if (e.target.closest('button.btn_opacity')) {
            const btn = e.target.closest('button.btn_opacity');
            const IsPls = btn.classList.contains('btn_opacityPls') ? 1 : -1;
            const opacityOrder = Math.min(4, Math.max(1, Math.floor(GLOBAL_settings.opacity / 0.25) + IsPls));
            GLOBAL_settings.opacity = opacityOrder * 0.25;
            await updateModalTheme(GLOBAL_settings);
        } else if (e.target.closest('button.btn_width')) {
            const btn = e.target.closest('button.btn_width');
            const IsPls = btn.classList.contains('btn_widthPls') ? 1 : -1;
            const widthOrder = Math.min(4, Math.max(0, Math.floor((GLOBAL_settings.width - 80) / 30) + IsPls));
            GLOBAL_settings.width = widthOrder * 30 + 80;
            await updateModalTheme(GLOBAL_settings);
        } else if (e.target.closest('button.btn_menuTOCShowHide')) {
            GLOBAL_settings.hidden = !GLOBAL_settings.hidden;
            const showSpan = $$('button.btn_menuTOCShowHide span')[0];
            if (showSpan) showSpan.textContent = GLOBAL_settings.hidden ? "SHOW/hide" : "show/HIDE";
            await updateModalTheme(GLOBAL_settings);
        } else if (e.target.closest('input.btn_expandMode')) {
            const radio = e.target.closest('input.btn_expandMode');
            GLOBAL_settings.expandMode = radio.value;
            await updateModalTheme(GLOBAL_settings);
        } else if (e.target.closest('button.btn_officialTOC_opacity')) {
            const btn = e.target.closest('button.btn_officialTOC_opacity');
            if (!GLOBAL_settings.officialTOC) GLOBAL_settings.officialTOC = { ...default_settings.officialTOC };
            const IsPls = btn.classList.contains('btn_officialTOC_opacityPls') ? 1 : -1;
            const opacityOrder = Math.min(4, Math.max(1, Math.floor(GLOBAL_settings.officialTOC.opacity / 0.25) + IsPls));
            GLOBAL_settings.officialTOC.opacity = opacityOrder * 0.25;
            await updateModalTheme(GLOBAL_settings);
        } else if (e.target.closest('button.btn_officialTOC_width')) {
            const btn = e.target.closest('button.btn_officialTOC_width');
            if (!GLOBAL_settings.officialTOC) GLOBAL_settings.officialTOC = { ...default_settings.officialTOC };
            const IsPls = btn.classList.contains('btn_officialTOC_widthPls') ? 1 : -1;
            const currentWidth = GLOBAL_settings.officialTOC.width || 250;
            const widthOrder = Math.min(6, Math.max(0, Math.floor((currentWidth - 150) / 50) + IsPls));
            GLOBAL_settings.officialTOC.width = widthOrder * 50 + 150;
            await updateModalTheme(GLOBAL_settings);
        } else if (e.target.closest('input.btn_officialTOC_persist')) {
            const radio = e.target.closest('input.btn_officialTOC_persist');
            if (!GLOBAL_settings.officialTOC) GLOBAL_settings.officialTOC = { ...default_settings.officialTOC };
            GLOBAL_settings.officialTOC.persist = (radio.value === 'persist');
            await updateModalTheme(GLOBAL_settings);
        } else if (e.target.closest('.tab-btn')) {
            const tabBtn = e.target.closest('.tab-btn');
            const tabId = tabBtn.getAttribute('data-tab');
            const modal = tabBtn.closest('.tocAdjust-modal');

            // Update tab buttons
            $$('.tab-btn', modal).forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');

            // Update tab panes
            $$('.tab-pane', modal).forEach(pane => pane.classList.remove('active'));
            const activePane = $(`#tab-${tabId}`, modal);
            if (activePane) activePane.classList.add('active');
        }
    });
})();

/**
 * Update official TOC (#ui-toc) styles
 * @param {Object} settings - Settings object with officialTOC property
 */
function updateOfficialTOC(settings) {
    const officialTOC = $("#ui-toc");
    if (!officialTOC) return;

    const oSettings = settings.officialTOC || default_settings.officialTOC;

    // Apply opacity
    officialTOC.style.opacity = oSettings.opacity;

    // Apply width only if value is set
    officialTOC.style.width = oSettings.width !== "" ? `${oSettings.width}px` : "";
    officialTOC.style.maxWidth = oSettings.width !== "" ? `${oSettings.width}px` : "";
}

/**
 * Setup toggle button listener for persist mode
 */
function setupOfficialTOCClassObserver() {
    const checkToggleBtn = setInterval(() => {
        const toggleBtn = $("#tocLabel");
        if (!toggleBtn) return;

        clearInterval(checkToggleBtn);

        const officialTOC = $("#ui-toc");
        if (!officialTOC) return;

        const dropdown = officialTOC.closest('.dropdown');
        if (!dropdown) return;

        toggleBtn.addEventListener("click", async (e) => {
            const settings = await getSyncStorage();
            if (!settings.officialTOC?.persist) return;

            // In persist mode, use our own class to control visibility
            e.stopPropagation();

            if (officialTOC.classList.contains('chex-persist-open')) {
                officialTOC.classList.remove('chex-persist-open');
                dropdown.classList.remove('open');
            } else {
                officialTOC.classList.add('chex-persist-open');
                dropdown.classList.add('open');
            }
        }, true);
    }, 500);
}

/**
 * Inject styles for official TOC control
 */
function injectOfficialTOCStyles() {
    const styleId = 'official-toc-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        /* Persist mode: keep TOC visible even when clicking outside */
        #ui-toc.chex-persist-open {
            display: block !important;
        }
    `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}

async function initialSetting() {
    const GLOBAL_settings = await getSyncStorage();

    // Control official TOC
    updateOfficialTOC(GLOBAL_settings);
    setupOfficialTOCClassObserver();

    const cm = $(".CodeMirror-wrap");
    if (!cm) return;

    // make new scrollbar area for toc
    const scroll_ver = createElement('div', {
        class: 'CodeMirror-overlayscroll-vertical',
        style: `width: ${GLOBAL_settings.width - 10}px; z-index: 100;`,
        attr: { 'cm-not-content': 'true' },
        id: 'scbar_vertical_forTOC'
    });
    cm.prepend(scroll_ver);

    // insert toc-dropdown
    const div_toc = createElement('div', {
        class: 'ui-toc-dropdown ui-affix-toc unselectable hidden-print',
        style: `background-color: transparent; overflow: hidden; margin: 5px; right: 10px; top: 0px; width: ${GLOBAL_settings.width}px; border: none; height: 30%;`
    });
    scroll_ver.appendChild(div_toc);

    injectOfficialTOCStyles();
    addModal();
    addNaviButtons();

    // Generate TOC after initial render, waiting for headings to appear
    const initialTocTrigger = setInterval(async () => {
        const headings = $$("h1, h2, h3, h4, h5, h6", $(".markdown-body"));
        if (headings.length > 0) {
            clearInterval(initialTocTrigger);
            await remake_TOC();
            await updateModalTheme();
            // Start scroll sync for active heading highlight
            startScrollSync();
            // Start theme watcher for dark mode support
            startThemeWatcher();
        }
    }, 500);
}

/**
 * Highlight current heading in TOC based on scroll position
 */
function startScrollSync() {
    let ticking = false;

    const updateActiveHeading = async () => {
        const tocOut = $("#toc_out_ChEx");
        if (!tocOut) return;

        const GLOBAL_settings = await getSyncStorage();
        const headings = $$("h1, h2, h3, h4, h5, h6", $(".markdown-body"));
        if (headings.length === 0) return;

        // Remove all active classes first
        $$("li", tocOut).forEach(li => li.classList.remove("active"));

        // Find the heading closest to the top of viewport
        let activeHeading = null;
        let minDistance = Infinity;

        headings.forEach(heading => {
            const rect = heading.getBoundingClientRect();
            const distance = Math.abs(rect.top);
            if (rect.top <= 100 && distance < minDistance) {
                minDistance = distance;
                activeHeading = heading;
            }
        });

        if (activeHeading && activeHeading.id) {
            // Find corresponding TOC item
            const tocLink = $(`a[href="#${activeHeading.id}"]`, tocOut);
            if (tocLink) {
                const tocItem = tocLink.closest("li");
                if (tocItem) tocItem.classList.add("active");
            }
        }

        // Auto expand mode: expand only the active section (h3 and deeper)
        if (GLOBAL_settings.expandMode === "auto") {
            // First, ensure top-level ul and h2-level ul are always visible
            const topLevelUl = tocOut.querySelector(":scope > ul");
            if (topLevelUl) {
                topLevelUl.style.display = 'block';
                topLevelUl.querySelectorAll(":scope > li > ul").forEach(ul => {
                    ul.style.display = 'block';
                });
            }

            // Collapse all ul elements deeper than h2 level (h3, h4, etc.)
            $$("ul ul ul", tocOut).forEach(ul => {
                ul.style.display = 'none';
            });

            // Only expand path for h3 and deeper headings
            if (activeHeading && activeHeading.id) {
                const headingLevel = parseInt(activeHeading.tagName.substring(1));
                // Only expand children if active heading is h3 or deeper
                if (headingLevel >= 3) {
                    const tocLink = $(`a[href="#${activeHeading.id}"]`, tocOut);
                    if (tocLink) {
                        // Find all ancestor ul elements and expand them
                        let currentUl = tocLink.closest("ul");
                        while (currentUl && currentUl !== tocOut) {
                            // Only expand uls that are at h3 level or deeper
                            const parentUl = currentUl.parentElement?.closest("ul");
                            if (parentUl && parentUl !== topLevelUl) {
                                // This is h3 or deeper level
                                currentUl.style.display = 'block';
                            }
                            currentUl = parentUl;
                        }
                    }
                }
            }
        }

        ticking = false;
    };

    // Listen to scroll events on both CodeMirror and window
    const codeMirrorScroll = $(".CodeMirror-scroll");
    if (codeMirrorScroll) {
        codeMirrorScroll.addEventListener("scroll", () => {
            if (!ticking) {
                requestAnimationFrame(updateActiveHeading);
                ticking = true;
            }
        });
    }

    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(updateActiveHeading);
            ticking = true;
        }
    });
}

/**
 * Watch for theme changes and update TOC colors
 */
function startThemeWatcher() {
    let lastDarkMode = isDarkMode();

    const themeObserver = new MutationObserver(async () => {
        const currentDarkMode = isDarkMode();
        if (currentDarkMode !== lastDarkMode) {
            lastDarkMode = currentDarkMode;
            await remake_TOC();
            await updateModalTheme();
        }
    });

    // Observe body and html for class/attribute changes
    themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
    });
}

function EditScroll(posTo = 0) {
    const scrollElem = $(".CodeMirror-scroll");
    if (scrollElem) {
        animateScrollElem(scrollElem, posTo);
    }
}

function ViewScroll(posTo = 0) {
    // View mode: scroll the page
    animateScroll(posTo);
}

function animateScroll(posTo) {
    const htmlElem = document.documentElement;
    const bodyElem = document.body;
    const startPos = htmlElem.scrollTop || bodyElem.scrollTop;
    const distance = posTo - startPos;
    const duration = 100;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentPos = startPos + distance * progress;

        htmlElem.scrollTop = currentPos;
        bodyElem.scrollTop = currentPos;

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

function animateScrollElem(elem, posTo) {
    const startPos = elem.scrollTop;
    const distance = posTo - startPos;
    const duration = 100;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        elem.scrollTop = startPos + distance * progress;

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

async function updateModalTheme(GLOBAL_settingsIn = null) {
    const GLOBAL_settings = GLOBAL_settingsIn || await getSyncStorage();
    const output_opacity = $$(".output_opacitySample")[0];
    const output_width = $$(".output_widthSample")[0];
    if (output_opacity) output_opacity.textContent = GLOBAL_settings.opacity;
    if (output_width) output_width.textContent = GLOBAL_settings.width;

    const sampleTitle = $("#sampleTOCTitle");
    if (sampleTitle) sampleTitle.textContent = "# Sample" + (GLOBAL_settings.hidden ? ": Hidden" : "");

    // Update modal dark class
    const dark = isDarkMode();
    const modal = $(".tocAdjust-modal");
    if (modal) {
        if (dark) {
            modal.classList.add("dark");
        } else {
            modal.classList.remove("dark");
        }
    }

    // Update expand mode radio buttons
    const expandModeRadios = $$('input.btn_expandMode');
    expandModeRadios.forEach(radio => {
        radio.checked = (radio.value === GLOBAL_settings.expandMode);
    });

    // Update sample TOC expand state
    const sampleTOC = $(".chex-toc-sample");
    if (sampleTOC) {
        if (GLOBAL_settings.expandMode === "always") {
            sampleTOC.classList.add("chex-expand");
            $$('ul', sampleTOC).forEach(ul => {
                ul.style.display = 'block';
            });
        } else {
            sampleTOC.classList.remove("chex-expand");
        }
        setStyles(sampleTOC, {
            width: `${GLOBAL_settings.width - 10}px`,
            opacity: GLOBAL_settings.opacity,
            background: dark ? '#f5f5f5' : 'white',
            color: '#333'
        });
    }

    await remake_TOC(GLOBAL_settings);
    updateOfficialTOC(GLOBAL_settings);
    updateOfficialTOCModalDisplay(GLOBAL_settings);
    await setSyncStorage(GLOBAL_settings);
}

/**
 * Update official TOC modal display values
 * @param {Object} settings - Settings object with officialTOC property
 */
function updateOfficialTOCModalDisplay(settings) {
    const oSettings = settings.officialTOC || default_settings.officialTOC;

    const outputOpacity = $$(".output_officialTOC_opacity")[0];
    const outputWidth = $$(".output_officialTOC_width")[0];

    if (outputOpacity) outputOpacity.textContent = oSettings.opacity;
    if (outputWidth) outputWidth.textContent = oSettings.width !== "" ? oSettings.width : "auto";

    // Update persist radio buttons
    const persistRadios = $$('input.btn_officialTOC_persist');
    persistRadios.forEach(radio => {
        radio.checked = (radio.value === 'persist') === oSettings.persist;
    });
}

/**
 * Generate TOC from headings in markdown-body
 * @returns {HTMLElement|null} - TOC element or null if no headings found
 */
function generateTOCFromHeadings() {
    const markdownBody = $(".markdown-body");
    if (!markdownBody) return null;

    const headings = $$("h1, h2, h3, h4, h5, h6", markdownBody);
    if (headings.length === 0) return null;

    const ul = createElement("ul", { class: "chex-toc-list" });
    const stack = [{ ul, level: 0 }];

    headings.forEach(heading => {
        const level = parseInt(heading.tagName.substring(1));
        const text = heading.textContent.trim();
        const anchorId = heading.id;
        const startLine = heading.getAttribute("data-startline");

        if (!text) return;

        const li = createElement("li", {
            children: [
                createElement("a", {
                    attr: {
                        href: anchorId ? `#${anchorId}` : "#",
                        title: text,
                        smoothhashscroll: ""
                    },
                    text: text
                })
            ]
        });

        if (startLine) {
            const anchor = li.querySelector("a");
            if (anchor) anchor.setAttribute("data-startline", startLine);
        }

        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        const currentContainer = stack[stack.length - 1].ul;
        currentContainer.appendChild(li);

        if (level < 6) {
            const childUl = createElement("ul", { class: "chex-toc-list" });
            li.appendChild(childUl);
            stack.push({ ul: childUl, level });
        }
    });

    return ul;
}

async function remake_TOC(GLOBAL_settingsIn = null) {
    const GLOBAL_settings = GLOBAL_settingsIn || await getSyncStorage();
    const scroll_ver = $("#scbar_vertical_forTOC");
    const div_toc = scroll_ver ? $(".ui-toc-dropdown", scroll_ver) : null;
    if (!scroll_ver || !div_toc) return;

    setStyles(scroll_ver, {
        maxWidth: `${GLOBAL_settings.width}px`,
        width: `${GLOBAL_settings.width}px`
    });
    setStyles(div_toc, {
        maxWidth: `${GLOBAL_settings.width}px`,
        width: `${GLOBAL_settings.width}px`
    });

    const toc_out = $("#toc_out_ChEx");
    if (toc_out) toc_out.remove();

    if (GLOBAL_settings.hidden) return;

    const tocNav = generateTOCFromHeadings();
    if (!tocNav) return;

    const dark = isDarkMode();
    const css_dic = {
        maxHeight: '',
        background: dark ? '#f5f5f5' : 'white',
        color: '#333',
        opacity: GLOBAL_settings.opacity.toString(),
        border: 'none',
        width: `${GLOBAL_settings.width - 10}px`,
        height: 'auto',
        zIndex: '100'
    };

    const new_toc_out = createElement('div', {
        class: 'chex-toc' + (GLOBAL_settings.expandMode === "always" ? ' chex-expand' : '') + (dark ? ' chex-toc-dark' : ''),
        id: 'toc_out_ChEx',
        style: css_dic
    });
    new_toc_out.appendChild(tocNav);

    div_toc.appendChild(new_toc_out);
    div_toc.style.height = new_toc_out.offsetHeight + 'px';

    // Set initial expand state based on expandMode
    if (GLOBAL_settings.expandMode === "always") {
        // Force expand all ul elements
        $$('ul', new_toc_out).forEach(ul => {
            ul.style.display = 'block';
        });
    } else if (GLOBAL_settings.expandMode === "auto") {
        // Show only h1 and h2 levels, collapse h3 and deeper
        const topLevelUl = new_toc_out.querySelector(":scope > ul");
        if (topLevelUl) {
            topLevelUl.style.display = 'block';
            topLevelUl.querySelectorAll(":scope > li > ul").forEach(ul => {
                ul.style.display = 'block';
            });
        }
        // Collapse all ul elements deeper than h2 level
        $$("ul ul ul", new_toc_out).forEach(ul => {
            ul.style.display = 'none';
        });
    }
}

async function addNaviButtons() {
    // Add TOC menu items to the dropdown menu
    const dropdownMenu = $("ul.ui-extra-menu.dropdown-menu");
    if (!dropdownMenu) return;

    // Avoid double contents
    $$(".menu_TOCAlways", dropdownMenu).forEach((elem) => elem.remove());

    // Get current settings
    const settings = await getSyncStorage();

    // Add divider
    const divider = createElement('li', {
        attr: { 'aria-hidden': 'true' },
        class: 'divider menu_TOCAlways'
    });

    // Add TOC header
    const header = createElement('li', {
        class: 'dropdown-header menu_TOCAlways',
        text: 'TOC Settings'
    });

    // Add menu items based on current settings
    const hideIcon = settings.hidden ? 'ph-eye' : 'ph-eye-slash';
    const hideLabel = settings.hidden ? 'Show TOC' : 'Hide TOC';
    const menuItems = [
        { label: hideLabel, class: 'menu_TOCAlways menu_hideTOC', icon: hideIcon },
        { label: 'TOC Settings', class: 'menu_TOCAlways menu_openTOCSettings', icon: 'ph-wrench' }
    ];

    const items = menuItems.map(item => {
        const a = createElement('a', {
            attr: { role: 'menuitem', href: '#', tabindex: '-1' },
            class: item.class,
            html: `<i class="ph ${item.icon}"></i> ${item.label}`
        });
        return createElement('li', {
            attr: { role: 'presentation' },
            class: 'menu_TOCAlways',
            children: [a]
        });
    });

    // Insert after existing items
    dropdownMenu.appendChild(divider);
    dropdownMenu.appendChild(header);
    items.forEach(item => dropdownMenu.appendChild(item));
}

function addModal() {
    // Modal container
    const div_modal = createElement('div', {
        class: 'modal fade tocAdjust-modal',
        id: 'tocAdjust-modal',
        style: {
            display: 'none',
            position: 'fixed',
            top: '0',
            left: '0',
            zIndex: '1050',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            overflow: 'auto'
        },
        attr: { tabindex: '-1', role: 'dialog', 'aria-labelledby': 'myModalLabel', 'aria-hidden': 'true' }
    });

    // Modal dialog
    const div_modal2 = createElement('div', {
        class: 'modal-dialog modal-sm',
        style: {
            position: 'relative',
            margin: '30px auto',
            width: '520px',
            maxWidth: '90vw'
        }
    });

    // Modal content
    const div_modal3 = createElement('div', { class: 'modal-content' });

    // Modal header
    const modal_header = createElement('div', { class: 'modal-header' });

    const modal_title = createElement('h4', {
        class: 'modal-title',
        id: 'myModalLabel',
        text: 'Adjust TOC'
    });

    const closeBtn = createElement('button', {
        class: 'close',
        attr: { type: 'button', 'data-dismiss': 'modal', 'aria-label': 'Close' },
        html: '<span aria-hidden="true">&times;</span>'
    });

    modal_header.appendChild(modal_title);
    modal_header.appendChild(closeBtn);

    // Modal body
    const modal_body = createElement('div', { class: 'modal-body' });

    // Controls section
    const controlsSection = createElement('div', { class: 'controls-section' });

    // Opacity control
    const opacityGroup = createElement('div', { class: 'control-group' });
    opacityGroup.innerHTML = `
        <div class="control-label">Opacity</div>
        <button type="button" class="btn btn_opacity btn_opacityPls">+</button>
        <button type="button" class="btn btn_opacity btn_opacityMns">-</button>
        <span class="output_opacitySample output-value"></span>
    `;

    // Width control
    const widthGroup = createElement('div', { class: 'control-group' });
    widthGroup.innerHTML = `
        <div class="control-label">Width</div>
        <button type="button" class="btn btn_width btn_widthPls">+</button>
        <button type="button" class="btn btn_width btn_widthMns">-</button>
        <span class="output_widthSample output-value"></span>
    `;

    // Show/Hide control
    const showHideGroup = createElement('div', { class: 'control-group' });
    showHideGroup.innerHTML = `
        <div class="control-label">Visibility</div>
        <button type="button" class="btn btn_menuTOCShowHide"><span>show/HIDE</span></button>
    `;

    // Expand mode control
    const expandModeGroup = createElement('div', { class: 'control-group' });
    expandModeGroup.innerHTML = `
        <div class="control-label">Expand Mode</div>
        <div class="expand-mode-options">
            <label class="expand-mode-label">
                <input type="radio" name="expandMode" value="always" class="btn_expandMode">
                <span>Always</span>
            </label>
            <label class="expand-mode-label">
                <input type="radio" name="expandMode" value="auto" class="btn_expandMode">
                <span>Auto</span>
            </label>
        </div>
    `;

    controlsSection.appendChild(opacityGroup);
    controlsSection.appendChild(widthGroup);
    controlsSection.appendChild(showHideGroup);
    controlsSection.appendChild(expandModeGroup);

    // Official TOC controls section (for separate tab)
    const officialTOCSection = createElement('div', { class: 'controls-section official-toc-section' });

    // Official TOC Opacity control
    const officialOpacityGroup = createElement('div', { class: 'control-group' });
    officialOpacityGroup.innerHTML = `
        <div class="control-label">Opacity</div>
        <button type="button" class="btn btn_officialTOC_opacity btn_officialTOC_opacityPls">+</button>
        <button type="button" class="btn btn_officialTOC_opacity btn_officialTOC_opacityMns">-</button>
        <span class="output_officialTOC_opacity output-value"></span>
    `;

    // Official TOC Width control
    const officialWidthGroup = createElement('div', { class: 'control-group' });
    officialWidthGroup.innerHTML = `
        <div class="control-label">Width</div>
        <button type="button" class="btn btn_officialTOC_width btn_officialTOC_widthPls">+</button>
        <button type="button" class="btn btn_officialTOC_width btn_officialTOC_widthMns">-</button>
        <span class="output_officialTOC_width output-value"></span>
    `;

    // Official TOC Show/Hide control
    const officialShowHideGroup = createElement('div', { class: 'control-group' });
    officialShowHideGroup.innerHTML = `
        <div class="control-label">Visibility</div>
        <div class="expand-mode-options">
            <label class="expand-mode-label">
                <input type="radio" name="officialTOC_persist" value="persist" class="btn_officialTOC_persist">
                <span>Persist</span>
            </label>
            <label class="expand-mode-label">
                <input type="radio" name="officialTOC_persist" value="auto" class="btn_officialTOC_persist">
                <span>Auto</span>
            </label>
        </div>
    `;

    officialTOCSection.appendChild(officialOpacityGroup);
    officialTOCSection.appendChild(officialWidthGroup);
    officialTOCSection.appendChild(officialShowHideGroup);

    // Sample TOC section
    const sampleSection = createElement('div', { class: 'sample-section' });

    const sampleTitle = createElement('div', {
        id: 'sampleTOCTitle',
        class: 'sample-title',
        text: '# Sample'
    });

    const sampleTocContainer = createElement('div', { class: 'chex-toc-sample-container' });

    const sampleToc = createElement('div', { class: 'chex-toc chex-expand chex-toc-sample' });

    sampleToc.innerHTML = `
        <ul class="chex-toc-list">
            <li><a href="#">TOC Sample</a>
                <ul class="chex-toc-list">
                    <li><a href="#">Section</a>
                        <ul class="chex-toc-list">
                            <li><a href="#">Subsection</a></li>
                            <li><a href="#">Subsection2</a></li>
                        </ul>
                    </li>
                    <li><a href="#">H2</a>
                        <ul class="chex-toc-list">
                            <li><a href="#">H3</a></li>
                            <li><a href="#">H3</a></li>
                        </ul>
                    </li>
                </ul>
            </li>
        </ul>
    `;

    sampleTocContainer.appendChild(sampleToc);
    sampleSection.appendChild(sampleTitle);
    sampleSection.appendChild(sampleTocContainer);

    // Tab header
    const tabHeader = createElement('div', { class: 'tab-header' });
    tabHeader.innerHTML = `
        <button type="button" class="tab-btn active" data-tab="custom">Custom TOC</button>
        <button type="button" class="tab-btn" data-tab="official">Official TOC</button>
    `;

    // Tab content container
    const tabContent = createElement('div', { class: 'tab-content' });

    // Custom TOC tab pane
    const tabPaneCustom = createElement('div', { class: 'tab-pane active', id: 'tab-custom' });
    const rowContainer = createElement('div', {
        style: { display: 'flex', gap: '15px' }
    });
    const leftCol = createElement('div', {
        style: { flex: '0 0 45%' }
    });
    leftCol.appendChild(controlsSection);
    const rightCol = createElement('div', {
        style: { flex: '1' }
    });
    rightCol.appendChild(sampleSection);
    rowContainer.appendChild(leftCol);
    rowContainer.appendChild(rightCol);
    tabPaneCustom.appendChild(rowContainer);

    // Official TOC tab pane
    const tabPaneOfficial = createElement('div', { class: 'tab-pane', id: 'tab-official' });
    tabPaneOfficial.appendChild(officialTOCSection);

    tabContent.appendChild(tabPaneCustom);
    tabContent.appendChild(tabPaneOfficial);

    modal_body.appendChild(tabHeader);
    modal_body.appendChild(tabContent);

    div_modal3.appendChild(modal_header);
    div_modal3.appendChild(modal_body);
    div_modal2.appendChild(div_modal3);
    div_modal.appendChild(div_modal2);
    document.body.prepend(div_modal);

    injectTOCStyles();
}

function injectTOCStyles() {
    const styleId = 'toc-hover-styles';
    if (document.getElementById(styleId)) return;

    const css = `
        #toc_out_ChEx a {
            color: inherit;
            text-decoration: none;
        }
        #toc_out_ChEx a:hover {
            color: #EDA35E !important;
        }
        #toc_out_ChEx.chex-toc-dark a:hover {
            color: #FFD700 !important;
        }
        #toc_out_ChEx li.active > a {
            color: #EDA35E !important;
            font-weight: 500;
        }
        #toc_out_ChEx.chex-toc-dark li.active > a {
            color: #FFD700 !important;
        }
        #toc_out_ChEx.chex-expand ul {
            display: block !important;
        }
        /* TOC list styles */
        #toc_out_ChEx {
            font-size: 12px;
            line-height: 1.4;
        }
        #toc_out_ChEx .chex-toc-list {
            list-style: none;
            padding-left: 0;
            margin: 0;
        }
        #toc_out_ChEx .chex-toc-list .chex-toc-list {
            padding-left: 10px;
            margin: 1px 0;
        }
        #toc_out_ChEx .chex-toc-list li {
            margin: 1px 0;
        }
        #toc_out_ChEx .chex-toc-list a {
            display: block;
            padding: 1px 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        /* Modal visibility */
        .tocAdjust-modal.in {
            display: block !important;
        }
        /* Tab styles */
        .tocAdjust-modal .tab-header {
            display: flex;
            border-bottom: 1px solid #e5e5e5;
            margin-bottom: 15px;
        }
        .tocAdjust-modal .tab-btn {
            flex: 1;
            padding: 8px 16px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 14px;
            color: #666;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        .tocAdjust-modal .tab-btn:hover {
            color: #333;
            background: #f5f5f5;
        }
        .tocAdjust-modal .tab-btn.active {
            color: #333;
            border-bottom-color: #EDA35E;
            font-weight: 500;
        }
        .tocAdjust-modal .tab-pane {
            display: none;
        }
        .tocAdjust-modal .tab-pane.active {
            display: block;
        }
        /* Modal - Light mode (default) */
        .tocAdjust-modal .modal-content {
            background: #fff;
            color: #000;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            box-shadow: 0 3px 9px rgba(0, 0, 0, 0.5);
        }
        .tocAdjust-modal .modal-header {
            padding: 15px;
            border-bottom: 1px solid #e5e5e5;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fff;
        }
        .tocAdjust-modal .modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 500;
            color: #000;
        }
        .tocAdjust-modal .close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
            color: #000;
        }
        .tocAdjust-modal .modal-body {
            padding: 15px;
        }
        .tocAdjust-modal .controls-section {
            margin-bottom: 15px;
        }
        .tocAdjust-modal .control-group {
            margin-bottom: 12px;
        }
        .tocAdjust-modal .control-label {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
            color: #000;
        }
        .tocAdjust-modal .btn {
            padding: 4px 12px;
            font-size: 14px;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid #ccc;
            background: #fff;
            color: #000;
        }
        .tocAdjust-modal .btn:hover {
            background-color: #e6e6e6;
        }
        .tocAdjust-modal .output-value {
            font-weight: 600;
            color: #000;
        }
        .tocAdjust-modal .expand-mode-options {
            display: flex;
            gap: 10px;
            margin-top: 4px;
        }
        .tocAdjust-modal .expand-mode-label {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        .tocAdjust-modal .expand-mode-label input[type="radio"] {
            margin: 0;
            cursor: pointer;
        }
        .tocAdjust-modal .sample-section {
            background: #e8e8e8;
            padding: 10px;
            border-radius: 4px;
        }
        .tocAdjust-modal .sample-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #b8860b;
        }
        .tocAdjust-modal .chex-toc-sample {
            padding: 4px;
            border-radius: 4px;
            max-height: 180px;
            overflow: auto;
            font-size: 12px;
            line-height: 1.4;
        }
        .tocAdjust-modal .chex-toc-sample .chex-toc-list {
            list-style: none;
            padding-left: 0;
            margin: 0;
        }
        .tocAdjust-modal .chex-toc-sample .chex-toc-list .chex-toc-list {
            padding-left: 10px;
            margin: 1px 0;
        }
        .tocAdjust-modal .chex-toc-sample li {
            margin: 1px 0;
        }
        .tocAdjust-modal .chex-toc-sample a {
            text-decoration: none;
            display: block;
            padding: 1px 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        /* Section header for official TOC */
        .tocAdjust-modal .section-header {
            margin-top: 15px;
            margin-bottom: 8px;
            border-top: 1px solid #e5e5e5;
            padding-top: 12px;
        }
        .tocAdjust-modal .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #666;
        }
        /* Modal - Dark mode */
        .tocAdjust-modal.dark .modal-content {
            background: #1e1e1e;
            color: #f0f0f0;
        }
        .tocAdjust-modal.dark .modal-header {
            border-bottom: 1px solid #444;
            background: #1e1e1e;
        }
        .tocAdjust-modal.dark .modal-title {
            color: #f0f0f0;
        }
        .tocAdjust-modal.dark .close {
            color: #f0f0f0;
        }
        .tocAdjust-modal.dark .control-label {
            color: #f0f0f0;
        }
        .tocAdjust-modal.dark .btn {
            background: #333;
            color: #f0f0f0;
            border-color: #555;
        }
        .tocAdjust-modal.dark .btn:hover {
            background-color: #444;
        }
        .tocAdjust-modal.dark .output-value {
            color: #f0f0f0;
        }
        .tocAdjust-modal.dark .expand-mode-label {
            color: #f0f0f0;
        }
        .tocAdjust-modal.dark .sample-section {
            background: rgba(30,30,30,.93);
        }
        .tocAdjust-modal.dark .sample-title {
            color: #EDA35E;
        }
        .tocAdjust-modal.dark .chex-toc-sample {
            background: #f5f5f5;
            color: #333;
        }
        .tocAdjust-modal.dark .chex-toc-sample a {
            color: #333;
        }
        .tocAdjust-modal.dark .section-header {
            border-top-color: #444;
        }
        .tocAdjust-modal.dark .section-title {
            color: #aaa;
        }
        .tocAdjust-modal.dark .tab-header {
            border-bottom-color: #444;
        }
        .tocAdjust-modal.dark .tab-btn {
            color: #aaa;
        }
        .tocAdjust-modal.dark .tab-btn:hover {
            color: #f0f0f0;
            background: #333;
        }
        .tocAdjust-modal.dark .tab-btn.active {
            color: #f0f0f0;
            border-bottom-color: #FFD700;
        }
    `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}
