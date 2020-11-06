let GLOBAL_var={opacity:0.5, hide:false, width:150};
let GLOBAL_now_href=location.href;

$(function () {
    setInterval(function(){
        remake_TOC();
    }, 60000);
});

addEventListener("keypress", remake_TOC);

document.addEventListener("click", async function (e) {
    console.log("clicked", e.target)
    const e_class=$(e.target).attr("class");
    if (GLOBAL_now_href!= location.href) {
        remake_TOC();
        addNaviButtons();
        GLOBAL_now_href=location.href;
    }
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
    }
    if (/li_naviTOC/.test(e_class)){
        console.log("navi", e.target)
        if (/expand_toggle/.test(e_class)){
            console.log("toggle")
            $(".toc").each((ind, elem)=>{
                if ($(elem).attr("class").indexOf("expand")) $(elem).addClass("orig_expand");
                else $(elem).addClass("expand");
            }).each((ind, elem)=>{
                if ($(elem).attr("class").indexOf("orig_expand"))
                    $(elem).removeClass("orig_expand").removeClass("expand");
            })
        }
    }
})

window.onload=function(){
    const cm=$(".CodeMirror.cm-s-one-dark.CodeMirror-wrap");
    const scroll_ver=$("<div>", {class:"CodeMirror-overlayscroll-vertical",
        style:`width: ${GLOBAL_var.width-10}px; z-index:100; display: block;`, "cm-not-content":"true",
        id:"scbar_vertical_forTOC"})
    cm.prepend(scroll_ver);
    // insert toc-dropdown
    const div_toc=$("<div>", {"class":"ui-toc-dropdown ui-affix-toc unselectable hidden-print"})
    .css({"max-height":"", "background-color":"transparent", overflow:"hidden", margin:"5px",
     right:"10px" , top:"0px",width:`${GLOBAL_var.width}px`, "border":"none", height:"30%"});
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
    const toc_out=$("<div>", {class:"toc expand"});
    toc_out.html(toc_view.html());
    div_toc.append(toc_out.attr({"class":"toc expand", "id":"toc_out_ChEx"})
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
        const a_tmp=$("<a>", {href:"#", class:`${a_id.replace(/_/g, "-")}`});
        const img_path=chrome.runtime.getURL(img_paths[ind]);
        const img_tmp=$("<img>", {src:img_path, height:15});
        const li_tmp=$("<li>", {class:`li_naviTOC`});
        li_tmp.append(a_tmp);
        navi_bar.append(li_tmp);
        a_tmp.html();
        li_tmp.append(img_tmp);
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
