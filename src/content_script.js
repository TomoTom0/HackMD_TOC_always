$(function () {

    document.addEventListener("keypress", first_remake);
});

window.onload=function(){
    const scroll_ver=$(".CodeMirror-overlayscroll-vertical");
    scroll_ver.css("width","10px");
    const div=$("<div>", {"class":"ui-toc-dropdown ui-affix-toc unselectable hidden-print scrollspy-view"})
    .css({"max-height":"", "background-color":"transparent", overflow:"hidden", width:"120px", padding:"10px", margin:"",
     right:"10px" , top:"0", width:"120px", "border":"none", height:"100%", top:"0", padding:"0", "z-index":"10"});
    scroll_ver.append(div);
    const scbar=$(".CodeMirror-overlayscroll-vertical div:eq(0)");
    scbar.css({opacity:"0.7","max-height":"50px", "background-color":"grey"});


    const inter=setInterval(function(){
        first_remake();
        if ($("#toc_out_ChEx").html()){
            clearInterval(inter);
        }
    }, 200);

}

function first_remake(){

    const scroll_ver=$(".CodeMirror-overlayscroll-vertical");
    const div=$(".ui-toc-dropdown", scroll_ver);
    div.empty();

    const css_dic={"max-height":"", "padding":"0", margin:"0","background":"white", opacity:"0.3","border":"none",
    height:""};

    const toc=$(".ui-view-area #ui-toc-affix .toc");
    toc.addClass("toc-expand");
    const toc_menu=$(".ui-view-area .toc-menu:eq(0)");
    console.log(toc, toc_menu);


    const toc_out=$("<div>", {class:"toc"});
    toc_out.html(toc.html());
    div.append(toc_out.attr({"class":"toc expand", "id":"toc_out_ChEx"}).css({...css_dic , "top":"82px"}));
    div.append(toc_menu.css({...css_dic ,"top":"2px", "id":"toc_menu_CHEx"}));

    console.log(4);
}

function remake_TOC(){
    console.log(5);
    const scroll_ver=$(".CodeMirror-overlayscroll-vertical");
    const div=$(".ui-toc-dropdown", scroll_ver)

    const toc=$(".ui-view-area #ui-toc-affix .toc");
    const toc_menu=$(".ui-view-area .toc-menu:eq(0)").clone();
    const toc_out=$("#toc_out_ChEx");
    toc_out.html(toc.html());
    

    const css_dic={"max-height":"", "padding":"0", margin:"0","background":"white", opacity:"0.3","border":"none",
    height:""}
    $("#toc_out_ChEx").css({...css_dic , "top":"80px"});
    $("#toc-menu_ChEx").css({...css_dic ,"top":"5px"});

}