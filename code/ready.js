// DOMContentLoaded来实现
/**
 * 该就绪事件是在整个DOM文档加载完毕后触发，表明可以遍历和操作DOM文档了。该事件已经成为很多现代框架的一个组成部分，
 * 允许对代码进行非侵入式的分层。它在页面显示之前执行，并且不需要等待其他资源的加载————资源加载会延迟load事件的触发。
 * 支持IE9之前的版本
 */
(function(){
    var isReady = false,
        contentLoadedHandler;
    
    function ready(){
        if(!isReady){
            triggerEvent(document, "ready");
            isReady = true;
        }
    }

    // 已经加载完成
    if(document.readyState === "complete"){
        ready();
    }

    if(document.addEventListener){
        contentLoadedHandler = function(){
            document.removeEventListener("DOMContentLoaded", contentLoaderHandler, false);
            ready();
        };

        document.addEventListener("DOMContentLoaded", contentLoadedHandler, false);
    }
    else if(document.attachEvent){
        contentLoadedHandler = function(){
            // 文档加载时检查该属性，可以帮我们在DOM达到就绪状态时避免不必要的事件绑定
            if(document.readyState === "complete"){
                document.detachEvent("onreadystatechange", contentLoaderHandler);
                ready();
            }
        };

        // DOM就绪时，该事件会一直触发，但有时它会触发很长一段时间
        document.attachEvent("onreadystatechange", contentLoadedHandler);

        var toplevel = false;
        try{
            toplevel = window.frameElement == null;
        }catch(e){

        }

        // 不在iframe里就执行滚动检测
        if(document.documentElement.doScroll && toplevel){
            doScrollCheck();
        }
    }

    function doScrollCheck(){
        if(isReady) return;

        try{
            document.documentElement.doScroll("left");
        }
        catch(error){
            setTimeout(doScrollCheck, 1);
            return;
        }

        ready();
    }
})();
