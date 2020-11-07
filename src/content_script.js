let GLOBAL_var={opacity:0.5, hide:false, width:150, expand:true};
let GLOBAL_now_href=location.href;

$(function () {
    setInterval(function(){
        remake_TOC();
    }, 60000);
});

addEventListener("keypress", remake_TOC);

document.addEventListener("click", async function (e) {
    const e_class=$(e.target).attr("class");
    const mode={edit:$(".ui-edit-area").css("display")!="none",
        view:$(".ui-view-area").css("display")!="none"};
    // if change mode, remake TOC
    if (GLOBAL_now_href!= location.href) {
        remake_TOC();
        addNaviButtons();
        GLOBAL_now_href=location.href;
    } //adjust TOC
    if (/menu_TOCAlways/.test(e_class)){
        if (/menu_hideTOC/.test(e_class)) {
            $(e.target).text(GLOBAL_var.hide ? "Hide TOC" : "Show TOC")
            GLOBAL_var.hide=!GLOBAL_var.hide;
        } else if (/menu_adjustTOC_opacity/.test(e_class) ) {
            GLOBAL_var.opacity=GLOBAL_var.opacity <= 0.5 ? GLOBAL_var.opacity*2 : 0.25;
        } else if (/menu_adjustTOC_width/.test(e_class) ) {
            GLOBAL_var.width=GLOBAL_var.width <= 150 ? GLOBAL_var.width + 50 : 100 ;
        }
        remake_TOC();
        $(".sidenav.main-sidenav").removeClass("in");
        $(".sidenav.sidenav-menu").removeClass("in");
    } // navi bar button
    if (/naviTOC_button/.test(e_class)){
        if (/expand_toggle/.test(e_class)){
            GLOBAL_var.expand=!GLOBAL_var.expand;
            $(".toc").each((ind, elem)=>{
                if ($(elem).attr("class").split(" ").indexOf("expand")!=-1) $(elem).removeClass("expand");
                else $(elem).addClass("expand");
            })
            remake_TOC();
        } else if (/back_to_top/.test(e_class)){
            if (mode.edit && !mode.view) EditScroll(0);
            else if(mode.edit && mode.view) ViewScroll(0);
            else $("html, body").stop(true, true).animate({
                scrollTop: 0
              }, 100, 'linear');
        } else if (/go_to_bottom/.test(e_class)){
            const posBottom= $(".CodeMirror-sizer").css("min-height").replace("px", "")
            -$(".CodeMirror-lines").css("padding-bottom").replace("px", "")
            -$(".CodeMirror-scroll").height();
            if (mode.edit && ! mode.view) EditScroll(posBottom);
            else if(mode.edit && mode.view) ViewScroll($(".ui-view-area .markdown-body").height());
            else $("html, body").stop(true, true).animate({
                scrollTop: $(".ui-view-area .markdown-body").height()
              }, 100, 'linear');
        }
    }
    if ($(e.target).parents("#toc_out_ChEx").length>0 && mode.edit && !mode.view){
        const href_id=$(e.target).attr("href").match(/(?<=^#).*/);
        const line_num=$(`#${href_id}`).attr("data-startline")-0;
        const line_hegiht=$(".CodeMirror>div>textarea").css("height").replace("px", "");
        EditScroll(line_num*line_hegiht*1.2-15);
    }
})

window.onload=function(){
    const cm=$(".CodeMirror.cm-s-one-dark.CodeMirror-wrap");
    const scroll_ver=$("<div>", {class:"CodeMirror-overlayscroll-vertical",
        style:`width: ${GLOBAL_var.width-10}px; z-index:100;`, "cm-not-content":"true",
        id:"scbar_vertical_forTOC"})
    cm.prepend(scroll_ver);
    // insert toc-dropdown
    const div_toc=$("<div>", {"class":"ui-toc-dropdown ui-affix-toc unselectable hidden-print"})
    .css({"max-height":"", "background-color":"transparent", overflow:"hidden", margin:"5px",
     right:"10px" , top:"0px", width:`${GLOBAL_var.width}px`, "border":"none", height:"30%"});
    scroll_ver.append(div_toc);
    // make TOC and TOC menu
    addMenuButton();
    const inter=setInterval(function(){
        remake_TOC();
        addNaviButtons();
        if ($("#toc_out_ChEx").html()!=""){
            clearInterval(inter);
        }
    }, 500);
}

function EditScroll(posTo=0){
    $(".CodeMirror-scroll").stop(true, true).animate({
        scrollTop: posTo
      }, 100, 'linear');
}

function ViewScroll(posTo=0){
    $(".ui-view-area").stop(true, true).animate({
        scrollTop: posTo
      }, 100, 'linear')
}

function remake_TOC(){
    const scroll_ver=$("#scbar_vertical_forTOC");
    const div_toc=$(".ui-toc-dropdown", scroll_ver);
    scroll_ver.css({"max-width":`${GLOBAL_var.width}px`,
     width:`${GLOBAL_var.width}px`});
    div_toc.css({"max-width":`${GLOBAL_var.width}px`,
     width:`${GLOBAL_var.width}px`});
    $("#toc_out_ChEx").remove(); // div.empty();
    if (GLOBAL_var.hide) return;
    const css_dic={"max-height":"","background":"white",
     opacity:GLOBAL_var.opacity,"border":"none", width:`${GLOBAL_var.width-10}px`,
    height:"auto", "z-index":"100"};
    const toc_view=$(".ui-view-area #ui-toc-affix .toc");
    const toc_out=$("<div>");
    toc_out.html(toc_view.html());
    div_toc.append(toc_out.attr({class:GLOBAL_var.expand ? "toc expand" : "toc", id:"toc_out_ChEx"})
    .css({...css_dic}));
    div_toc.css({height:toc_out.height()})
}

function addNaviButtons(){
    const navibar_class="div.collapse.navbar-collapse";
    const navi_bar=$(`${navibar_class} .navbar-left:eq(1)`).length>0 ?
        $(`${navibar_class} .navbar-left:eq(1)`) : $(`div.navbar-header .nav-mobile.pull-right:eq(1)`);
    const a_ids=["expand_toggle", "back_to_top", "go_to_bottom"];
    const img_paths=["img/unfold_less_black_48dp.png", "img/north_black_48dp.png", "img/south_black_48dp.png"];
    $(".li_naviTOC", navi_bar).each((ind, elem)=>$(elem).remove());

    a_ids.map((a_id, ind)=>{
        const img_path=chrome.runtime.getURL(img_paths[ind]);
        const img_tmp=$("<img>", {src:img_path, height:15, class:`naviTOC_button ${a_id}`});
        const li_tmp=$("<li>", {class:`li_naviTOC`});
        li_tmp.append($("<a>", {href:"#", class:`naviTOC_button ${a_id}`}).append(img_tmp));
        navi_bar.append(li_tmp);
    })
}

function addMenuButton(){
    const input_head="TOC Always";
    const input_comps=[{class:"menu_hideTOC", text:"Hide TOC"},
    {class:"menu_adjustTOC_opacity", text:"Adjust Opacity"},
    {class:"menu_adjustTOC_width", text:"Adjust Width"}];

    // menu heading
    const menu_ul=$("ul .dropdown-menu.list[aria-label=メニュー]");
    const sep=$("<li>", {role:"presentation", "aria-hidden":"true", class:"divider", id:"sep_TOC"});
    const heading=$("<li>", {class:"dropdown-header"}).append(input_head);
    menu_ul.append(sep);
    menu_ul.append(heading);

    // side menu heading
    const menu_side_ul=$(".sidenav.sidenav-menu");
    const side_heading=$("<div>", {class:"divider-header"}).append(input_head);
    menu_side_ul.append(side_heading);

    for (input_comp of input_comps){
        // menu comp
        const comp=$("<li>", {role:"presentation"});
        const comp_a=$("<a>", {role:"menuitem", class:`menu_TOCAlways ${input_comp.class}`, href:"#", tabindex:"-1"});
        comp_a.append(input_comp.text);
        comp.append(comp_a);
        menu_ul.append(comp);

        // side menu comp
        const side_comp=$("<a>", {class:`sidenav-item menu_TOCAlways ${input_comp.class}`,
            tabindex:"-1", href:"#"});
        const side_span=$("<span>").append(input_comp.text);
        side_comp.append(side_span);
        menu_side_ul.append(side_comp);
    }
}
