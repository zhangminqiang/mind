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
                elem.addEventListener(type === "focusin" ? "focus" : 
                    type === "focusout" ? "blur" : type, data.dispatcher, type === "focusin" || type === "focusout");
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
            elem.removeEventListener(type === "focusin" ? "focus" : type === "focusout" ? "blur" : type, data.dispatcher, type === "focusin" || type === "focusout");
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

// 事情委托：修复浏览器的不足
/**
 * 在很多浏览器中，submit、change、focus以及blur事情的冒泡实现都有严重的问题
 */

// 检测一个事件是否可以冒泡至父元素
// 通过在<div>元素上检查是否已经存在ontype属性来判断
function isEventSupported(eventName){
    var element = document.createElement('div'),
        isSupported;

    eventName = "on"+eventName;
    isSupported = (eventName in element);

    // 侵入式检测，创建一个ontype特性并给它一点代码，然后再判断该元素
    // 是否可以将其转换成一个函数。如果可以转成一个函数，则可以很好地说明
    // 该元素知道如何解释冒泡事件。
    if(!isSupported){
        element.setAttribute(eventName, 'return;');
        isSupported = typeof element[eventName] = 'function';
    }

    element = null;
    return isSupported;
}

(function(){
    var isSubmitEventSupported = isEventSupported("submit");

    function isInForm(elem){
        var parent = elem.parentNode;

        while(parent){
            if(parent.nodeName.toLowerCase() === "form"){
                return true;
            }
            parent = parent.parentNode;
        }

        return false;
    }

    function trigggerSubmitOnClick(e){
        var type = e.target.type;
        if((type === "submit" || type === "image") && 
            isInForm(e.target)){
            return triggerEvent(this, "submit");
        }
    }

    function triggerSubmitOnKey(e){
        var type = e.target.type;

        if((type === "text" || type === "password") &&
            isInForm(e.target) && e.keyCode === 13){
                return triggerEvent(this, "submit");
            }
    }

    this.addSubmit = function(elem, fn){
        addEvent(elem, "submit", fn);

        if(isSubmitEventSupported) return;

        if(elem.nodeName.toLowerCase() !== "form" &&
            getData(elem).handlers.submit.length === 1){
            addEvent(elem, "click", triggerSubmitOnClick);
            addEvent(elem, "keypress", triggerSubmitOnKey)
        }
    }

    this.addSubmit = function(elem, fn){
        removeEvent(elem, "submit", fn);

        if(isSubmitEventSupported) return;

        var data = getData(elem);

        if(elem.nodeName.toLowerCase() !== "form" &&
            !data || !data.events || !data.events.submit){
            removeEvent(elem, "click", triggerSubmitOnClick);
            removeEvent(elem, "keypress", triggerSubmitOnKey)
        }
    }
})();

// 冒泡change事件，必须绑定不同的事件：
/**
 * 1. focusout事件用于检查表单元素失去焦点之后的值
 * 2. click和keydown事件用于检查元素值的瞬时改变
 * 3. beforeactivate事件获取一个元素被替换之前的旧值
 */
(function(){
    var isChangeEventSupported = isEventSupported("change");

    this.addChange = function(elem, fn){
        addEvent(elem, "change", fn);

        if(isChangeEventSupported) return;

        if(getData(elem).events.change.length === 1){
            addEvent(elem, "focusout", triggerChangeIfValueChanged);
            addEvent(elem, "click", triggerChangeOnClick);
            addEvent(elem, "keydown", triggerChangeOnKeyDown);
            addEvent(elem, "beforeactivate", triggerChangeOnBefore);
        }
    };

    this.removeChange = function(elem, fn){
        removeEvent(elem, "change", fn);

        if(isChangeEventSupported) return;

        var data = getData(elem);

        if(!data || !data.events || !data.events.submit){
            removeEvent(elem, "focusout", triggerChangeIfValueChanged);
            removeEvent(elem, "click", triggerChangeOnClick);
            removeEvent(elem, "keydown", triggerChangeOnKeyDown);
            removeEvent(elem, "beforeactivate", triggerChangeOnBefore);
        }
    };

    function triggerChangeOnClick(e){
        var type=e.target.type;
        if(type === "radio" || type === "checkbox" ||
            e.target.nodeName.toLowerCase() === "select"){
            return triggerChangeIfValueChanged.call(this, e);
        }
    }

    function triggerChangeOnKeyDown(e){
        var type = e.target.type,
            key = e.keyCode;
        if(key === 13 && e.target.nodeName.toLowerCase() !== "textarea" ||
            key === 32 (type === "checkbox" || type==="radio") ||
            type === "select-multiple"){
            return triggerChangeIfValueChanged.call(this, e);        
        }
    }

    function triggerChangeOnbefore(e){
        getData(e.target)._change_data = getVal(e.target);
    }

    function getVal(elem){
        var type = elem.type,
            val = elem.value;

        if(type === "radio" || type === "checkbox"){
            val = elem.checked;
        }else if(type === "select-multiple"){
            val = "";
            if(elem.selectedIndex > -1){
                for(var i=0;i<elem.options.length;i++){
                    val += "-" + elem.options[i].selected;
                }
            }
        }else if (elem.nodeName.toLowerCase() === "select"){
            val = elem.selectedIndex;
        }

        return val;
    }

    function triggerChangeIfValueChanged(e){
        var elem = e.target, data, val;
        var formElems = /texttarea|input|select/i;

        if(!formElems.test(elem.nodeName) || elem.readOnly){
            return;
        }
        data = getData(elem)._change_data;
        val = getVal(elem);
        if(e.type !== "focusout" || elem.type !== "radio"){
            getData(elem)._change_data = val;
        }

        if(data === undefined || val === data){
            return;
        }
        if(data != null || val){
            return triggerEvent(elem, "change");
        }
    }
})();

(function(){
    if(isEventSupported("mouseenter")){
        this.hover = function(elem, fn){
            addEvent(elem, "mouseenter", function(){
                fn.call(elem,"mouseenter");
            });

            addEvent(elem, "mouseleave", function(){
                fn.call(elem, "mouseleave");
            });
        }
    }else {
        this.hover = function(elem, fn){
            addEvent(elem, "mouseover", function(e){
                withinElement(this, e, "mouseenter", fn);
            });

            addEvent(elem, "mouseout", function(e){
                withinElement(this, e, "mouseleave", fn);
            });
        };
    }

    // 在mouseover和mouseout事件中检查relatedTarget，也就是mouseout事件发生时要进入的元素
    // 或者mouseover事件发生时要离开的元素。在这两种情况下，如果该相关元素在悬停元素内，就忽略它，
    // 否则，该元素就是要离开或进入的悬停元素，那么就触发处理程序。
    function withinElement(elem, event, type, handle){
        var parent = event.relatedTarget;
        while(parent && parent != elem){
            try{
                parent = parent.parentNode;
            }
            catch(e){
                break;
            }
        }

        if(parent != elem){
            handle.call(elem, type);
        }
    }
})();

