"use strict";

const default_settings = { opacity: 0.5, hidden: false, width: 150, expand: true };

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
            if (GLOBAL_settings.expand) toc_out.classList.add("expand");
            else toc_out.classList.remove("expand");
        }
    });

    // if keypress -> remake TOC
    document.addEventListener("keypress", async function (e) {
        await remake_TOC();
    });

    const observeTrigger = setInterval(() => {
        const toc_out = $("#toc_out_ChEx");
        if (toc_out) {
            observer.observe(toc_out, { childList: true, attributes: true });
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
            await remake_sampleTOC(GLOBAL_settings);
            const sidenav = $(".sidenav.main-sidenav");
            const sidenavMenu = $(".sidenav.sidenav-menu");
            if (sidenav) sidenav.classList.remove("in");
            if (sidenavMenu) sidenavMenu.classList.remove("in");
        }
        // toc jump in edit mode
        const tocOut = $("#toc_out_ChEx");
        if (tocOut && e.target.closest("#toc_out_ChEx") && mode.edit && !mode.view) {
            const anchor = e.target.closest("a");
            if (anchor) {
                let line_num = 0;
                // First, try to get data-startline from the anchor itself (set by generateTOCFromHeadings)
                const anchorLine = anchor.getAttribute("data-startline");
                if (anchorLine) {
                    line_num = parseInt(anchorLine || '0');
                } else {
                    // Fallback: get from href target
                    const href = anchor.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        const href_id = href.substring(1);
                        const targetElem = document.getElementById(href_id);
                        if (targetElem) {
                            line_num = parseInt(targetElem.getAttribute('data-startline') || '0');
                        }
                    }
                }
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
        if (e.target.closest('button.close')) {
            const modal = e.target.closest('.modal.fade.in');
            if (modal) {
                modal.removeAttribute('style');
                modal.classList.remove('in');
            }
        } else if (classList && classList.contains('btn_opacity')) {
            const IsPls = classList.contains('btn_opacityPls') ? 1 : -1;
            const opacityOrder = Math.min(4, Math.max(1, Math.floor(GLOBAL_settings.opacity / 0.25) + IsPls));
            GLOBAL_settings.opacity = opacityOrder * 0.25;
            await remake_sampleTOC(GLOBAL_settings);
        } else if (classList && classList.contains('btn_width')) {
            const IsPls = classList.contains('btn_widthPls') ? 1 : -1;
            const widthOrder = Math.min(4, Math.max(0, Math.floor((GLOBAL_settings.width - 80) / 30) + IsPls));
            GLOBAL_settings.width = widthOrder * 30 + 80;
            await remake_sampleTOC(GLOBAL_settings);
        } else if (e.target.closest('button.btn_menuTOCShowHide')) {
            GLOBAL_settings.hidden = !GLOBAL_settings.hidden;
            const showSpan = $$('button.btn_menuTOCShowHide span')[0];
            if (showSpan) showSpan.textContent = GLOBAL_settings.hidden ? "SHOW/hide" : "show/HIDE";
            await remake_sampleTOC(GLOBAL_settings);
        }
    });
})();

async function initialSetting() {
    const GLOBAL_settings = await getSyncStorage();

    // Hide existing TOC
    const existingTocAffix = $("#ui-toc-affix");
    if (existingTocAffix) {
        existingTocAffix.style.display = "none";
    }

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

    addModal();
    addNaviButtons();

    // Generate TOC after initial render, waiting for headings to appear
    const initialTocTrigger = setInterval(async () => {
        const headings = $$("h1, h2, h3, h4, h5, h6", $(".markdown-body"));
        if (headings.length > 0) {
            clearInterval(initialTocTrigger);
            await remake_TOC();
            await remake_sampleTOC();
        }
    }, 500);
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

async function remake_sampleTOC(GLOBAL_settingsIn = null) {
    const GLOBAL_settings = GLOBAL_settingsIn || await getSyncStorage();
    const output_opacity = $$(".output_opacitySample")[0];
    const output_width = $$(".output_widthSample")[0];
    if (output_opacity) output_opacity.textContent = GLOBAL_settings.opacity;
    if (output_width) output_width.textContent = GLOBAL_settings.width;

    const sampleTitle = $("#sampleTOCTitle");
    if (sampleTitle) sampleTitle.textContent = "# Sample" + (GLOBAL_settings.hidden ? ": Hidden" : "");

    const sampleTOC = $(".toc-sample");
    if (sampleTOC) {
        setStyles(sampleTOC, {
            width: `${GLOBAL_settings.width - 10}px`,
            opacity: GLOBAL_settings.opacity
        });
    }
    await remake_TOC(GLOBAL_settings);
    await setSyncStorage(GLOBAL_settings);
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

    const ul = createElement("ul", { class: "nav" });
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
            const childUl = createElement("ul", { class: "nav" });
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

    const css_dic = {
        maxHeight: '',
        background: 'white',
        opacity: GLOBAL_settings.opacity.toString(),
        border: 'none',
        width: `${GLOBAL_settings.width - 10}px`,
        height: 'auto',
        zIndex: '100'
    };

    const new_toc_out = createElement('div', {
        class: 'toc' + (GLOBAL_settings.expand ? ' expand' : ''),
        id: 'toc_out_ChEx',
        style: css_dic
    });
    new_toc_out.appendChild(tocNav);

    div_toc.appendChild(new_toc_out);
    div_toc.style.height = new_toc_out.offsetHeight + 'px';
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
    const rgba = "rgba(30,30,30,.93)";
    const adjustHTML = [
        `
    <div>
    <div class="h4">Opacity</div>
    <button type="button" class="btn btn_opacityPls"><span aria-hidden="true" class="btn_opacityPls">+</span></button>
    <button type="button" class="btn btn_opacityMns"><span aria-hidden="true" class="btn_opacityMns">-</span></button>
    <span class="output_opacitySample h5"></span>
    </div>
    <br>
    <div>
    <div class="h4">Width</div>
    <button type="button" class="btn btn_widthPls"><span aria-hidden="true" class="btn_widthPls">+</span></button>
    <button type="button" class="btn btn_widthMns"><span aria-hidden="true" class="btn_widthMns">-</span></button>
    <span class="output_widthSample h5"></span>
    </div>
    <br>
    <div>
    <div class="h4">Show / Hide</div>
    <button type="button" class="btn btn_menuTOCShowHide"><span aria-hidden="true" class="btn_menuTOCShowHide">show/HIDE</span></button>
    </div>
    `,
        `<div style="background: ${rgba}; height: 250px;">
    <span class="h4" id="sampleTOCTitle" style="color: #EDA35E"># Sample</span>
    <div class="toc_sample">
        <div class="ui-toc-dropdown ui-affix-toc unselectable hidden-print" style="background-color: transparent; width: 200px; border: none; height: 170.4px; max-width: 200px; top:70px; visibility: visible;">
        <div class="toc expand toc-sample" style="background: white; opacity: 0.5; border: none; width: 190px; height: auto; z-index: 100;">
        <ul class="nav">
        <li class="active"><a href="#" title="TOCSample" smoothhashscroll="">TOC Sample</a><ul class="nav">
        <li><a href="#" title="Section" smoothhashscroll="">Section</a>
        <ul class="nav">
        <li><a href="#" title="Subsection" smoothhashscroll="">Subsection</a></li>
        <li><a href="#" title="Subsection2" smoothhashscroll="">Subsection2</a></li>
        </ul>
        </li>
        <li><a href="#" title="H2" smoothhashscroll="">H2</a>
        <ul class="nav">
        <li><a href="#" title="H3" smoothhashscroll="">H3</a></li>
        <li><a href="#" title="H3" smoothhashscroll="">H3</a></li>
        </ul>
        </li>
        </ul>
        </li>
        </ul>
        </div></div>
    </div>
    </div>`
    ];

    const div_modal = createElement('div', {
        class: 'modal fade tocAdjust-modal',
        id: 'tocAdjust-modal',
        attr: { tabindex: '-1', role: 'dialog', 'aria-labelledby': 'myModalLabel', 'aria-hidden': 'true' }
    });
    const div_modal2 = createElement('div', { class: 'modal-dialog modal-sm' });
    const div_modal3 = createElement('div', { class: 'modal-content' });

    const mdoal_header = createElement('div', { class: 'modal-header' });
    const closeBtn = createElement('button', {
        class: 'close',
        attr: { type: 'button', 'data-dismiss': 'modal', 'aria-label': 'Close' }
    });
    closeBtn.appendChild(createElement('span', {
        attr: { 'aria-hidden': 'true' },
        text: 'x'
    }));
    mdoal_header.appendChild(closeBtn);
    mdoal_header.appendChild(createElement('h4', {
        class: 'modal-title',
        id: 'myModalLabel',
        text: 'Adjust TOC'
    }));

    const modal_body = createElement('div', {
        class: 'modal-body',
        style: { color: 'black' }
    });
    const adjustContent1 = createElement('div', {
        class: 'col-sx-12 col-sm-6 pl-0 pr-0',
        html: adjustHTML[0]
    });
    const adjustContent2 = createElement('div', {
        class: 'col-sx-12 col-sm-6 pl-0 pr-0 flex flex-column',
        html: adjustHTML[1]
    });
    modal_body.appendChild(adjustContent1);
    modal_body.appendChild(adjustContent2);

    div_modal3.appendChild(mdoal_header);
    div_modal3.appendChild(modal_body);
    div_modal2.appendChild(div_modal3);
    div_modal.appendChild(div_modal2);
    document.body.prepend(div_modal);
}
