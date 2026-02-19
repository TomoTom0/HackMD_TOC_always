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
    Object.entries(styles).forEach(([key, value]) => {
        element.style[key] = value;
    });
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

// # on load
document.addEventListener('DOMContentLoaded', async () => {
    let GLOBAL_now_href = location.href;
    await initialSetting();
    // remake TOC per 1 minutes
    setInterval(async function () {
        await remake_TOC();
    }, 60 * 1000);

    const observer = new MutationObserver(async records => {
        const GLOBAL_settings = await getSyncStorage();
        $$(".toc").forEach((elem) => {
            const mode = obtainMode();
            if (!mode.edit) return;
            if (GLOBAL_settings.expand) elem.classList.add("expand");
            else elem.classList.remove("expand");
        });
    });

    const observeTrigger = setInterval(() => {
        const toc_view = $(".ui-view-area #ui-toc-affix");
        if (toc_view) {
            observer.observe(toc_view, { childList: true, attributes: true });
            // if keypress -> remake TOC
            document.addEventListener("keypress", async function (e) {
                await remake_TOC();
            });
            clearInterval(observeTrigger);
        }
    });

    const obtainMode = () => ({
        edit: $(".ui-edit-area") && $(".ui-edit-area").style.display !== "none",
        view: $(".ui-view-area") && $(".ui-view-area").style.display !== "none"
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
        if (typeof e_class === 'string' && e_class.includes('menu_TOCAlways')) {
            if (e_class.includes('menu_hideTOC')) {
                GLOBAL_settings.hidden = !GLOBAL_settings.hidden;
                e.target.textContent = GLOBAL_settings.hidden ? "Show TOC" : "Hide TOC";
            } else if (e_class.includes('menu_adjustTOC_opacity')) {
                GLOBAL_settings.opacity = GLOBAL_settings.opacity <= 0.5 ? GLOBAL_settings.opacity * 2 : 0.25;
            } else if (e_class.includes('menu_adjustTOC_width')) {
                GLOBAL_settings.width = GLOBAL_settings.width <= 150 ? GLOBAL_settings.width + 50 : 100;
            }
            await remake_sampleTOC(GLOBAL_settings);
            const sidenav = $(".sidenav.main-sidenav");
            const sidenavMenu = $(".sidenav.sidenav-menu");
            if (sidenav) sidenav.classList.remove("in");
            if (sidenavMenu) sidenavMenu.classList.remove("in");
        }
        // navi bar button
        if (typeof e_class === 'string' && e_class.includes('naviTOC_button')) {
            if (e_class.includes('expand_toggle') || e_class.includes('expand-toggle')) {
                console.log(GLOBAL_settings.expand);
                GLOBAL_settings.expand = !GLOBAL_settings.expand;
                $$(".toc").forEach((elem) => {
                    elem.classList.toggle("expand");
                });
                await remake_TOC();
                chrome.storage.sync.set(GLOBAL_settings);
            } else if (e_class.includes('back_to_top')) {
                if (mode.edit && !mode.view) EditScroll(0);
                else if (mode.edit && mode.view) ViewScroll(0);
                else animateScroll(0);
            } else if (e_class.includes('go_to_bottom')) {
                const codeMirrorSizer = $(".CodeMirror-sizer");
                const codeMirrorLines = $(".CodeMirror-lines");
                const codeMirrorScroll = $(".CodeMirror-scroll");
                if (codeMirrorSizer && codeMirrorLines && codeMirrorScroll) {
                    const posBottom = parseInt(codeMirrorSizer.style.minHeight || '0')
                        - parseInt(codeMirrorLines.style.paddingBottom || '0')
                        - codeMirrorScroll.offsetHeight;
                    if (mode.edit && !mode.view) EditScroll(posBottom);
                    else if (mode.edit && mode.view) {
                        const markdownBody = $(".ui-view-area .markdown-body");
                        if (markdownBody) ViewScroll(markdownBody.offsetHeight);
                    } else {
                        const markdownBody = $(".ui-view-area .markdown-body");
                        if (markdownBody) animateScroll(markdownBody.offsetHeight);
                    }
                }
            } else if (e_class.includes('open_toc_menu')) {
                const modal = $(".tocAdjust-modal");
                if (modal) {
                    modal.style.display = "block";
                    modal.classList.add("in");
                }
            }
        }
        // toc jump in edit mode
        const tocOut = $("#toc_out_ChEx");
        if (tocOut && e.target.closest("#toc_out_ChEx") && mode.edit && !mode.view) {
            const href = e.target.getAttribute('href');
            if (href && href.startsWith('#')) {
                const href_id = href.substring(1);
                const targetElem = document.getElementById(href_id);
                if (targetElem) {
                    const line_num = parseInt(targetElem.getAttribute('data-startline') || '0');
                    const codeMirrorTextarea = $(".CodeMirror>div>textarea");
                    if (codeMirrorTextarea) {
                        const line_height = parseInt(codeMirrorTextarea.style.height || '0');
                        EditScroll(line_num * line_height * 1.2 - 15);
                    }
                }
            }
        }
        if (e.target.parentElement && e.target.parentElement.tagName === 'BUTTON' && e.target.parentElement.classList.contains('close')) {
            const modal = e.target.closest('.modal.fade.in');
            if (modal) {
                modal.removeAttribute('style');
                modal.classList.remove('in');
            }
        } else if (typeof e_class === 'string' && e_class.includes('btn_opacity')) {
            const IsPls = e_class.includes('Pls') ? 1 : -1;
            const opacityOrder = Math.min(4, Math.max(1, Math.floor(GLOBAL_settings.opacity / 0.25) + IsPls));
            GLOBAL_settings.opacity = opacityOrder * 0.25;
            await remake_sampleTOC(GLOBAL_settings);
        } else if (typeof e_class === 'string' && e_class.includes('btn_width')) {
            const IsPls = e_class.includes('Pls') ? 1 : -1;
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
});

async function initialSetting() {
    const GLOBAL_settings = await getSyncStorage();
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
        style: {
            maxHeight: '',
            backgroundColor: 'transparent',
            overflow: 'hidden',
            margin: '5px',
            right: '10px',
            top: '0px',
            width: `${GLOBAL_settings.width}px`,
            border: 'none',
            height: '30%'
        }
    });
    scroll_ver.appendChild(div_toc);

    addModal();
    addNaviButtons();

    const inter = setInterval(async function () {
        const toc_view = $(".ui-view-area #ui-toc-affix .toc");
        const toc_out = $("#toc_out_ChEx");
        if (toc_view && toc_out && toc_out.innerHTML !== "") {
            await remake_TOC();
            await remake_sampleTOC();
            clearInterval(inter);
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
    const viewArea = $(".ui-view-area");
    if (viewArea) {
        animateScrollElem(viewArea, posTo);
    }
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

    const toc_view = $(".ui-view-area #ui-toc-affix .toc");
    if (!toc_view) return;

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
        html: toc_view.innerHTML,
        style: css_dic
    });

    div_toc.appendChild(new_toc_out);
    div_toc.style.height = new_toc_out.offsetHeight + 'px';
}

function addNaviButtons() {
    const navibar_class = "div.collapse.navbar-collapse";
    const navi_bar_elements = $$(`${navibar_class} nav .navbar-left`);
    const navi_bar = navi_bar_elements.length > 1 ? navi_bar_elements[1] : $("div.navbar-header .nav-mobile");
    if (!navi_bar) return;

    const menu_contents = [
        { id: "expand_toggle", img: "img/unfold_less_black_48dp.png" },
        { id: "back_to_top", img: "img/north_black_48dp.png" },
        { id: "go_to_bottom", img: "img/south_black_48dp.png" },
        { id: "open_toc_menu", img: "img/baseline_build_black_48dp.png" }
    ];

    // avoid double contents
    $$(".li_naviTOC", navi_bar).forEach((elem) => elem.remove());

    menu_contents.forEach(cont => {
        const img_path = chrome.runtime.getURL(cont.img);
        const img_tmp = createElement('img', {
            attr: { src: img_path },
            style: { height: '15px' },
            class: `naviTOC_button ${cont.id}`
        });
        const a_tmp = createElement('a', {
            attr: { href: '#' },
            class: `naviTOC_button ${cont.id}`
        });
        a_tmp.appendChild(img_tmp);
        const li_tmp = createElement('li', { class: 'li_naviTOC' });
        li_tmp.appendChild(a_tmp);
        navi_bar.appendChild(li_tmp);
    });
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
