$(function () {
    const scroll_ver=$(".CodeMirror-overlayscroll-vertical");
    scroll_ver.css("width","10px");

    const toc=$("div .toc:eq(1)").clone().addClass("expand");
    const toc_menu=$(".toc-menu:eq(1)");
    const div=$("<div>", {"class":"ui-toc-dropdown ui-affix-toc unselectable hidden-print scrollspy-view"})
    .css({"max-height":"", "background-color":"transparent", overflow:"hidden", width:"120px", padding:"10px", margin:"",
     right:"10px" , top:"0", width:"120px", "border":"none", height:"100%", top:"0", padding:"0", "z-index":"10"});
    div.append(toc);
    div.append(toc_menu);
    sc.append(div);
    $(".toc:eq(0)", div).css({"max-height":"", "padding":"0", margin:"0","background":"white", opacity:"0.3","border":"none",
      height:"", "top":"14%"})
    $(".toc-menu", div).css({"max-height":"", "padding":"0", margin:"0","background":"white", opacity:"0.3","border":"none",
      height:"", "top":"1%"})

    const scbar=$(".CodeMirror-overlayscroll-vertical div:eq(0)");
    scbar.css({opacity:"0.7","max-height":"50px", "background-color":"grey", "pointer-events":"none"}).css({"pointer-events":""});

});
