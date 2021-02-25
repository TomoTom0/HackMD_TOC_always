const default_settings = { opacity: 0.5, hide: false, width: 150, expand: true };
let GLOBAL_settings;
chrome.storage.sync.get(default_settings, items => {
    GLOBAL_settings = items;
})
let GLOBAL_now_href = location.href;

$(function () {
    // remake TOC per 1 minutes
    setInterval(function () {
        remake_TOC();
    }, 60 * 1000);
});

// if keypress -> remake TOC
addEventListener("keypress", remake_TOC);

document.addEventListener("click", async function (e) {
    const e_class = $(e.target).attr("class");
    //console.log(e.target)
    const mode = {
        edit: $(".ui-edit-area").css("display") != "none",
        view: $(".ui-view-area").css("display") != "none"
    };
    // if change mode, remake TOC
    if (GLOBAL_now_href != location.href) {
        remake_TOC();
        addNaviButtons();
        GLOBAL_now_href = location.href;
    } //adjust TOC
    if (/menu_TOCAlways/.test(e_class)) {
        if (/menu_hideTOC/.test(e_class)) {
            $(e.target).text(GLOBAL_settings.hidden ? "Hide TOC" : "Show TOC")
            GLOBAL_settings.hidden = !GLOBAL_settings.hidden;
        } else if (/menu_adjustTOC_opacity/.test(e_class)) {
            GLOBAL_settings.opacity = GLOBAL_settings.opacity <= 0.5 ? GLOBAL_settings.opacity * 2 : 0.25;
        } else if (/menu_adjustTOC_width/.test(e_class)) {
            GLOBAL_settings.width = GLOBAL_settings.width <= 150 ? GLOBAL_settings.width + 50 : 100;
        }
        chrome.storage.sync.set(GLOBAL_settings);
        remake_sampleTOC();
        $(".sidenav.main-sidenav").removeClass("in");
        $(".sidenav.sidenav-menu").removeClass("in");
    } // navi bar button
    if (/naviTOC_button/.test(e_class)) {
        if (/expand_toggle/.test(e_class)) {
            GLOBAL_settings.expand = !GLOBAL_settings.expand;
            $(".toc").each((ind, elem) => {
                $(elem).toggleClass("expand");
            })
            remake_TOC();
            chrome.storage.sync.set(GLOBAL_settings);
        } else if (/back_to_top/.test(e_class)) {
            if (mode.edit && !mode.view) EditScroll(0);
            else if (mode.edit && mode.view) ViewScroll(0);
            else $("html, body").stop(true, true).animate({
                scrollTop: 0
            }, 100, 'linear');
        } else if (/go_to_bottom/.test(e_class)) {
            const posBottom = $(".CodeMirror-sizer").css("min-height").replace("px", "")
                - $(".CodeMirror-lines").css("padding-bottom").replace("px", "")
                - $(".CodeMirror-scroll").height();
            if (mode.edit && !mode.view) EditScroll(posBottom);
            else if (mode.edit && mode.view) ViewScroll($(".ui-view-area .markdown-body").height());
            else $("html, body").stop(true, true).animate({
                scrollTop: $(".ui-view-area .markdown-body").height()
            }, 100, 'linear');
        } else if (/open_toc_menu/.test(e_class)) {
            const modal = $(".tocAdjust-modal");
            modal.css({ display: "block" }).addClass("in");
        }
    } // toc jump in edit mode
    if ($(e.target).parents("#toc_out_ChEx").length > 0 && mode.edit && !mode.view) {
        const href_id = $(e.target).attr("href").match(/(?<=^#).*/);
        const line_num = $(`#${href_id}`).attr("data-startline") - 0;
        const line_hegiht = $(".CodeMirror>div>textarea").css("height").replace("px", "");
        EditScroll(line_num * line_hegiht * 1.2 - 15);
    }
    if ("close" == $(e.target).parent("button").attr("class")) {
        const modal = $(e.target).parents(".modal.fade.in");
        if (modal.length == 0) return;
        modal.attr({ style: "" }).removeClass("in");
    } else if (/btn_opacity/.test(e_class)) {
        console.log(e.target)
        const IsPls = (/Pls/.test(e_class)) ? +1 : -1;
        const opacityOrder = Math.min(4, Math.max(1, Math.floor(GLOBAL_settings.opacity / 0.25) + IsPls));
        GLOBAL_settings.opacity = opacityOrder * 0.25;
        remake_sampleTOC();
    } else if (/btn_width/.test(e_class)) {
        const IsPls = (/Pls/.test(e_class)) ? +1 : -1;
        const widthOrder = Math.min(4, Math.max(0, Math.floor((GLOBAL_settings.width-80)/30) + IsPls));
        GLOBAL_settings.width = widthOrder * 30 + 80;
        remake_sampleTOC();
    } else if (/btn_menuTOCShowHide/.test(e_class)) {
        GLOBAL_settings.hidden = !GLOBAL_settings.hidden;
        $(e.target).val(GLOBAL_settings.hidden ? "SHOW/hide" : "show/HIDE");
        remake_sampleTOC();
    }
})

window.onload = function () {
    // make new scrollbar area for toc
    const cm = $(".CodeMirror.cm-s-one-dark.CodeMirror-wrap");
    const scroll_ver = $("<div>", {
        class: "CodeMirror-overlayscroll-vertical",
        style: `width: ${GLOBAL_settings.width - 10}px; z-index:100;`, "cm-not-content": "true",
        id: "scbar_vertical_forTOC"
    })
    cm.prepend(scroll_ver);
    // insert toc-dropdown
    const div_toc = $("<div>", { "class": "ui-toc-dropdown ui-affix-toc unselectable hidden-print" })
        .css({
            "max-height": "", "background-color": "transparent", overflow: "hidden", margin: "5px",
            right: "10px", top: "0px", width: `${GLOBAL_settings.width}px`, "border": "none", height: "30%"
        });
    scroll_ver.append(div_toc);
    // make TOC and TOC menu
    // addMenuButton();
    addModal();

    const inter = setInterval(function () {
        remake_TOC();
        remake_sampleTOC();
        addNaviButtons();
        // check valid toc exists or not
        if ($("#toc_out_ChEx").html() != "") {
            clearInterval(inter);
        }
    }, 500);
}

function EditScroll(posTo = 0) {
    $(".CodeMirror-scroll").stop(true, true).animate({
        scrollTop: posTo
    }, 100, 'linear');
}

function ViewScroll(posTo = 0) {
    $(".ui-view-area").stop(true, true).animate({
        scrollTop: posTo
    }, 100, 'linear')
}

function remake_sampleTOC() {
    const sampleTOC = $(".toc-sample");
    ["opacity", "width"].forEach(key=>{
        const output=$(`.output_${key}Sample`);
        console.log(output)
        output.html(GLOBAL_settings[key]);
    })
    sampleTOC.css({ width: GLOBAL_settings.width - 10, opacity: GLOBAL_settings.opacity, visibility: (GLOBAL_settings.hidden) ? "hidden" : "visible" });
    remake_TOC();
    chrome.storage.sync.set(GLOBAL_settings)
}

function remake_TOC() {
    // scrollbar area for TOC
    const scroll_ver = $("#scbar_vertical_forTOC");
    const div_toc = $(".ui-toc-dropdown", scroll_ver);
    scroll_ver.css({
        "max-width": `${GLOBAL_settings.width}px`,
        width: `${GLOBAL_settings.width}px`
    });
    div_toc.css({
        "max-width": `${GLOBAL_settings.width}px`,
        width: `${GLOBAL_settings.width}px`
    });
    $("#toc_out_ChEx").remove(); // avoid double toc;
    if (GLOBAL_settings.hidden) return; // hide check
    const css_dic = {
        "max-height": "", "background": "white",
        opacity: GLOBAL_settings.opacity, "border": "none", width: `${GLOBAL_settings.width - 10}px`,
        height: "auto", "z-index": "100"
    };
    const toc_view = $(".ui-view-area #ui-toc-affix .toc");
    const toc_out = $("<div>");
    toc_out.html(toc_view.html()); // copy toc
    div_toc.append(toc_out.attr({ class: GLOBAL_settings.expand ? "toc expand" : "toc", id: "toc_out_ChEx" })
        .css({ ...css_dic }));
    div_toc.css({ height: toc_out.height() })
}

function addNaviButtons() {
    const navibar_class = "div.collapse.navbar-collapse";
    const navi_bar = $(`${navibar_class} .navbar-left:eq(1)`).length > 0 ?
        $(`${navibar_class} .navbar-left:eq(1)`) : $(`div.navbar-header .nav-mobile.pull-right:eq(1)`);
    const menu_contents = [
        { id: "expand_toggle", img: "img/unfold_less_black_48dp.png" },
        { id: "back_to_top", img: "img/north_black_48dp.png" },
        { id: "go_to_bottom", img: "img/south_black_48dp.png" },
        { id: "open_toc_menu", img: "img/baseline_build_black_48dp.png" }]

    // avoid double contents
    $(".li_naviTOC", navi_bar).each((ind, elem) => $(elem).remove());

    menu_contents.map(cont => {
        const img_path = chrome.runtime.getURL(cont.img);
        const img_tmp = $("<img>", { src: img_path, height: 15, class: `naviTOC_button ${cont.id}` });
        const li_tmp = $("<li>", { class: `li_naviTOC` });
        li_tmp.append($("<a>", { href: "#", class: `naviTOC_button ${cont.id}` }).append(img_tmp));
        navi_bar.append(li_tmp);
    })

}

function addModal(){
    const rgba = $("style:last-child", "head").html().match(/(?<=background:)[^;]+/)
    const adjustHTML = [`
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
    `, `<div style="background: ${rgba || "rgba(30,30,30,.93)"}; height: 250px;">
    <span class="h4" style="color: #EDA35E"># Sample</span>
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
    </div>`]
    const adjustContent = [$("<div>", { class: "col-sx-12 col-sm-6 pl-0 pr-0" }).append(adjustHTML[0]),
    $("<div>", { class: "col-sx-12 col-sm-6 pl-0 pr-0 flex flex-column" }).append(adjustHTML[1])]
    // add modal for adjust menu
    const div_modal = $("<div>", { class: "modal fade tocAdjust-modal", id: "tocAdjust-modal", tabindex: "-1", role: "dialog", "aria-labelledby": "myModalLabel", "aria-hidden": "true" });
    const div_modal2 = $("<div>", { class: "modal-dialog modal-sm" });
    const div_modal3 = $("<div>", { class: "modal-content" });
    const mdoal_header = $("<div>", { class: "modal-header" })
        .append($("<button>", { type: "button", class: "close", "data-dismiss": "modal", "aria-label": "Close" })
            .append($("<span>", { "aria-hidden": "true" }).append("x")))
        .append($("<h4>", { class: "modal-title", id: "myModalLabel" }).append("Adjust TOC"));
    const modal_body = $("<div>", { class: "modal-body", style: "color:black;" })
        .append(adjustContent[0]).append(adjustContent[1])
    //.append($("<h5>", { style: "font-weight: 500; font-size: 14px; text-align: left;" })
    //.append($("<a>", { target: "_blank", style: "word-break: break-all;", rel: "noopener" })));
    const modal_footer = $("<div", { class: "modal-footer" })
        .append($("<button>", { type: "button", class: "btn btn-default", "data-dismiss": "modal" }).append("Yes"));
    div_modal.append(div_modal2.append(div_modal3.append(mdoal_header).append(modal_body)));
    $("body").prepend(div_modal)
}

function addMenuButton() {
    const input_head = "TOC Always";
    const input_comps = [{ class: "menu_hideTOC", text: "Hide TOC" },
    { class: "menu_adjustTOC_opacity", text: "Adjust Opacity" },
    { class: "menu_adjustTOC_width", text: "Adjust Width" }];

    // menu heading
    const menu_ul = $("ul .dropdown-menu.list[aria-label=メニュー]");
    const sep = $("<li>", { role: "presentation", "aria-hidden": "true", class: "divider", id: "sep_TOC" });
    const heading = $("<li>", { class: "dropdown-header" }).append(input_head);
    menu_ul.append(sep);
    menu_ul.append(heading);

    // side menu heading
    const menu_side_ul = $(".sidenav.sidenav-menu");
    const side_heading = $("<div>", { class: "divider-header" }).append(input_head);
    menu_side_ul.append(side_heading);

    for (const input_comp of input_comps) {
        // menu comp
        const comp = $("<li>", { role: "presentation" });
        const comp_a = $("<a>", { role: "menuitem", class: `menu_TOCAlways ${input_comp.class}`, href: "#", tabindex: "-1" });
        comp_a.append(input_comp.text);
        comp.append(comp_a);
        menu_ul.append(comp);

        // side menu comp
        const side_comp = $("<a>", {
            class: `sidenav-item menu_TOCAlways ${input_comp.class}`,
            tabindex: "-1", href: "#"
        });
        const side_span = $("<span>").append(input_comp.text);
        side_comp.append(side_span);
        menu_side_ul.append(side_comp);
    }

    

}

