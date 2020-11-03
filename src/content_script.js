$(function () {

    document.addEventListener("keypress", remake_TOC());

});


window.onload=function(){
    // insert toc-dropdown
    const scroll_ver=$(".CodeMirror-overlayscroll-vertical");
    const div=$("<div>", {"class":"ui-toc-dropdown ui-affix-toc unselectable hidden-print"})
    .css({"max-height":"", "background-color":"transparent", overflow:"hidden", margin:"",
     right:"10px" , top:"0", width:"120px", "border":"none", height:"30%"});
    scroll_ver.append(div);
    // adjust scroll bar
    const scbar=$(".CodeMirror-overlayscroll-vertical div:eq(0)");
    scbar.css({opacity:"0.7","max-height":"50px" , "background-color":"grey"});

    // make TOC and TOC menu
    const inter=setInterval(function(){
        remake_TOC();
        addButtons();

        if ($("#toc_out_ChEx").html() ){
            clearInterval(inter);
        }
    }, 1000);
}

function remake_TOC(){
    const scroll_ver=$(".CodeMirror-overlayscroll-vertical");
    const div=$(".ui-toc-dropdown", scroll_ver);
    $("#toc_out_ChEx",div).remove(); // div.empty();

    const css_dic={"max-height":"","background":"white", opacity:"0.3","border":"none",
    height:"auto", "z-index":"100"};

    const toc=$(".ui-view-area #ui-toc-affix .toc");
    toc.addClass("toc-expand");

    const toc_out=$("<div>", {class:"toc expand"});
    toc_out.html(toc.html());
    div.append(toc_out.attr({"class":"toc expand", "id":"toc_out_ChEx"}).css({...css_dic}));
    div.css({height:toc_out.height()})

}

function addButtons(){
    const navi_bar=$("div.collapse.navbar-collapse .navbar-left:eq(1)");
    const a_ids=["expand_toggle", "back_to_top", "go_to_bottom"];
    const img_paths=["img/unfold_less_black_48dp.png", "img/north_black_48dp.png", "img/south_black_48dp.png"];
    $(".li_tmp", navi_bar).each((ind, elem)=>$(elem).remove());

    $(`.ui-view-area .ui-toc-dropdown .toc-menu:eq(0) a`)
    .each((ind, elem)=>{
        const img_path=chrome.runtime.getURL(img_paths[ind]);
        const img_tmp=$("<img>", {src:img_path, height:20});
        const li_tmp=$("<li>", {"data-offset":"0,5", class:"li_tmp"});
        $(elem).html("");
        $(elem).append(img_tmp);
        li_tmp.append($(elem).attr({class:"extension_add_button"}));
        navi_bar.append(li_tmp);
    })

}

