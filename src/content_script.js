let GLOBAL_var={opacity:0.5, hide:false, width:150};

$(function () {
    addMenuButton();
    const inter=setInterval(function(){
        remake_TOC();
        addButtons();
    }, 30000);
});

document.addEventListener("keypress", remake_TOC);

document.addEventListener("click", async function (e) {
    if (/menu_hideTOC/.test($(e.target).attr("class")) ) {
        GLOBAL_var.hide=!GLOBAL_var.hide;
    }
    else if (/menu_adjustTOC_opacity/.test($(e.target).attr("class")) ) {
        
        GLOBAL_var.opacity=GLOBAL_var.opacity <= 0.5 ? GLOBAL_var.opacity*2 : 0.25;
    }
    else if (/menu_adjustTOC_width/.test($(e.target).attr("class")) ) {
        GLOBAL_var.width=GLOBAL_var.width <= 150 ? GLOBAL_var.width + 50 : 100 ;
    }
    if (/menu_sideTOCAlways/.test($(e.target).attr("class")) ) {
        remake_TOC();
        $(".sidenav.main-sidenav").removeClass("in");
        $(".sidenav.sidenav-menu").removeClass("in");
    }


})


window.onload=function(){
    // insert toc-dropdown
    const div=$("<div>", {"class":"ui-toc-dropdown ui-affix-toc unselectable hidden-print"})
    .css({"max-height":"", "background-color":"transparent", overflow:"hidden", margin:"5px",
     right:"10px" , top:"0", width:`${GLOBAL_var.width}px`, "border":"none", height:"30%"});

    let scroll_ver=$(".CodeMirror-overlayscroll-vertical");
    if (scroll_ver.length==0) {
        scroll_ver=$("div.CodeMirror-vscrollbar");
        div.css({"top": 50})
    }
    scroll_ver.append(div);
    // adjust scroll bar -> no meaning
    //const scbar=$(".CodeMirror-overlayscroll-vertical div:eq(0)");
    //scbar.css({opacity:"0.7","max-height":"50px" , "background-color":"grey"});

    // make TOC and TOC menu
    const inter=setInterval(function(){
        remake_TOC();
        addButtons();

        if ($("#toc_out_ChEx").length==0 ){
            clearInterval(inter);
        }
    }, 500);
}

function remake_TOC(){
    let scroll_ver=$(".CodeMirror-overlayscroll-vertical");
    if (scroll_ver.length==0) scroll_ver=$("div.CodeMirror-vscrollbar");
    const div=$(".ui-toc-dropdown", scroll_ver);
    div.css({width:`${GLOBAL_var.width}px`});
    $("#toc_out_ChEx").remove(); // div.empty();

    if (GLOBAL_var.hide) return;
    const css_dic={"max-height":"","background":"white", opacity:GLOBAL_var.opacity,"border":"none",
    height:"auto", "z-index":"100"};

    const toc=$(".ui-view-area #ui-toc-affix .toc");
    toc.addClass("toc-expand");

    const toc_out=$("<div>", {class:"toc expand"});
    toc_out.html(toc.html());
    div.append(toc_out.attr({"class":"toc expand", "id":"toc_out_ChEx"}).css({...css_dic}));
    div.css({height:toc_out.height()})

}

function addButtons(){
    const navibar_class="div.collapse.navbar-collapse";
    const navi_bar=$(`${navibar_class} .navbar-left:eq(1)`).length>0 ?
        $(`${navibar_class} .navbar-left:eq(1)`) : $(`div.navbar-header .nav-mobile.pull-right:eq(1)`);
    const a_ids=["expand_toggle", "back_to_top", "go_to_bottom"];
    const img_paths=["img/unfold_less_black_48dp.png", "img/north_black_48dp.png", "img/south_black_48dp.png"];
    $(".li_tmp", navi_bar).each((ind, elem)=>$(elem).remove());

    /*a_ids.map((a_id, ind)=>{
        if (ind > 2) return;
        const elem=$("<a>", {href:"#", class:a_id});
        const img_path=chrome.runtime.getURL(img_paths[ind]);
        const img_tmp=$("<img>", {src:img_path, height:20});
        const li_tmp=$("<li>", {"data-offset":"0,5", class:"li_tmp"});
        //$(elem).html("");
        $(elem).append(img_tmp);
        li_tmp.append($(elem).attr({class:"extension_add_button"}));
        navi_bar.append(li_tmp);
    })*/
}

function addMenuButton(){
    const input_head="TOC Always";
    const input_comps=[{class:"menu_hideTOC", text:"Hide TOC"},
    {class:"menu_adjustTOC_opacity", text:"Adjust Opacity"},
    {class:"menu_asjustTOC_width", text:"Adjust Width"}];

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
        const comp_a=$("<a>", {role:"menuitem", class:input_comp.class, href:"#", tabindex:"-1"});
        const comp_i=$("<i>", {class:"fa fa-file-text fa-fw"});
        //comp_a.append(comp_i);
        comp_a.append(input_comp.text);
        comp.append(comp_a);
        menu_ul.append(comp);

        // side menu comp
        const side_comp=$("<a>", {class:`sidenav-item menu_sideTOCAlways ${input_comp.class}`,
            tabindex:"-1", href:"#"});
        const side_comp_i=$("<i>", {class:"fa fa-history fa-fw"});
        const side_span=$("<span>").append(input_comp.text);
        //side_comp.append(side_comp_i);
        side_comp.append(side_span);
        menu_side_ul.append(side_comp);
    }
}
