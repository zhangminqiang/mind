// 摘自忍者秘籍
function fixEvent(event) {
    function returnTrue() { return true; }
    function returnFalse() { return false; }

    if (!event || !event.stopPropagation) {
        var old = event || window.event;

        event = {};

        for (var porp in old) {
            event[prop] = old[prop];
        }

        // 修正事件源
        if (!event.target) {
            event.target = event.srcElement || document;
        }

        // 修正关联目标
        event.relatedTarget = event.fromElement === event.target ? event.toElement : event.fromElement;

        // 修正组值默认行为
        event.preventDefault = function () {
            event.returnValue = false;
            event.isDefaultPrevented = returnTrue;
        };
        event.isDefaultPrevented = returnFalse;

        // 修正阻止冒泡
        event.stopPropagation = function () {
            event.cancelBubble = true;
            event.isPropagationStopped = returnTrue;
        };
        event.isPropagationStopped = retrunFalse;

        event.stopImmediatePropagation = function () {
            event.isImmediatePropagationStopped = returnTrue;
            event.stopPropagation();
        }
        event.isImmediatePropagationStopped = returnFalse;

        // 鼠标位置
        if (event.clientX != null) {
            var doc = document.documentElement, body = document.body;

            event.pageX = event.clientX +
                (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
                (doc && doc.clientLeft || body && body.clientLeft || 0);

            event.pageY = event.clientY +
                (doc && doc.scrollTop || body && body.scrollTop || 0) -
                (doc && doc.clientTop || body && body.clientTop || 0);
        }

        // 键盘事件
        event.which = event.charCode || event.keyCode;

        // 鼠标按键
        if (event.button != null) {
            event.button = (event.button & 1 ? 0 :
                (event.buttom & 4 ? 1 :
                    (event.button & 2 ? 2 : 0)));
        }
    }

    return event;
}

(function () {
    var cache = {},
        guidCounter = 1,
        expando = "data" + (new Date).getTime();

    this.getData = function (elem) {
        var guid = elem[expando];
        if (!guid) {
            guid = elem[expando] = guidCounter++；
            cache[guid] = {};
        }

        return cache[guid];
    };

    this.removeData = function(elem){
        var guid = elem[expando];
        if(!guid) return;

        delete cache[guid];
        try{
            delete elem[expando];
        }
        catch(e){
            if(elem.removeAttribute){
                elem.removeAttribute(expando);
            }
        }
    }
})();

(function(){
    var nextGuid = 1;

    /**
     * 思路：1.找到缓存data，判断存在handlers属性；
     * 2. 判断存在handlers[type]属性;
     * 3. 添加fn到handlers[type]属性中；
     * 4. 构建dispatcher事件；
     * 5. 订阅事件
     * 实现无论在哪个平台都能做到如下事情：
     * 1. Event实例被修复；
     * 2. 将函数上下文设置成目标元素
     * 3. Event实例作为唯一的参数传递给处理程序
     * 4. 事件处理程序永远按照其绑定顺序进行执行
     */
    this.addEvent = function(elem, type, fn){
        var data = getData(elem);
        if(!data.handlers){
            data.handlers = {};
        }

        if(!data.handlers[type]){
            data.handlers[type] = [];
        }

        if(!fn.guid) fn.guid = nextGuid++;

        data.handlers[type].push(fn);

        if(!data.dispatcher){
            data.disabled = false;
            data.dispatcher = function(event){
                if(data.disabled) return;
                event = fixEvent(event);

                var handlers = data.handlers[event.type];

                if(handlers){
                    for(var n=0; n<handlers.length; n++){
                        handlers[n].call(elem, event);
                    }
                }
            }
        }

        if(data.handlers[type].length == 1){
            if(document.addEventListener){
                elem.addEventListener(type, data.dispatcher, false);
            }else if(document.attachEvent){
                elem.attachEvent("on"+type, data.dispatcher);
            }
        }
    };

    /**
     * 实现思路：
     * 1.根据参数个数实现不同的功能
     */
    this.removeEvent = function(elem, type, fn){
        var data = getData(elem);
        if(!data.handlers) return;

        var removeType = function(t){
            data.handlers[t] = [];
            tidyUp(elem, t);
        }

        // 清除元素上所有事件
        if(!type){
            for(var t in data.handlers){
                removeType(t);
            }
            return;
        }

        var handlers = data.handlers[type];
        if(!handlers) return;
        // 清除类型下所有事件
        if(!fn){
            removeType(type);
            return;
        }

        // 解绑单个事件
        if(fn.guid){
            for(var n=0;n<handlers.length;n++){
                if(handlers[n].guid = fn.guid){
                    handlers.splice(n--, 1);
                }
            }
        }

        tidyUp(elem, type);
    };
})();

function tidyUp(elem, type){
    function isEmpty(object){
        for(var prop in object){
            return false;
        }

        return true;
    }

    var data = getData(elem);
    // 清空handlers[type]数组，并解除事件监听
    if(data.handlers[type].length === 0){
        delete data.handlers[type];

        if(document.removeEventListener){
            elem.removeEventListener(type, data.dispatcher, false);
        }else if(document.detachEvent){
            elem.detachEvent("on"+type, data.dispatcher);
        }
    }

    if(isEmpty(data.handlers)){
        delete data.handlers;
        delete data.dispatcher;
    }

    if(isEmpty(data)){
        removeData(elem);
    }
}

/**
 * 在触发一个处理函数时，要确保发生如下事情：
 * 1. 触发绑定在该元素上的目标处理程序
 * 2. 让DOM事件进行冒泡，并触发其他的处理程序
 * 3. 触发该模板元素的默认行为
 */
function triggerEvent(elem, event){
    var elemData = getData(elem),
        parent = elem.parentNode || elem.ownerDocument;

    if(typeof event === "string"){
        event = {type:event, target:elem};
    }
    event = fixEvent(event);

    if(elemData.dispatcher){
        elemData.dispatcher.call(elem, event);
    }

    if(parent && !event.isPropagationStopped()){
        triggerEvent(parent, event);
    }else if(!parent && !event.isDefaultPrevented()){
        var targetData = getData(event.target);
        if(event.target[event.type]){
            targetData.disabled = true;
            event.target[event.type]();
            targetData.disabled = false;
        }
    }
}
