function async (u, c, tag, async) {
  var head = document.head ||
    document.getElementsByTagName('head')[0] ||
    document.documentElement;
  var d = document,
    t = tag || 'script',
    o = d.createElement(t),
    s = d.getElementsByTagName(t)[0];
  async = ['async', 'defer'].includes(async) ? async :!!async;

  switch (t) {
    case 'script':
      o.src = u;
      if (async) o[async] = true;
      break;
    case 'link':
      o.type = "text/css";
      o.href = u;
      o.rel = "stylesheet";
      break;
    default:
      o.src = u;
      break;
  }

  /* callback */

  if (c) {
    if (o.readyState) { //IE
      o.onreadystatechange = function (e) {
        if (o.readyState == "loaded" ||
          o.readyState == "complete") {
          o.onreadystatechange = null;
          c(null, e)();
        }
      };
    } else { //其他浏览器
      o.onload = function (e) {
        c(null, e);
      };
    }
  }

  s.parentNode.insertBefore(o, head.firstChild);
}

/* xhr */
function sendXMLHttpRequest(options) {
  var url = options.url;
  var method = (options.method || 'get').toUpperCase();
  var callback = options.callback;
  var async = ('async' in options) ? !!options.async : true;
  var xhr = null;

  if (!url) return;

  if (window.XMLHttpRequest) {
    xhr = new XMLHttpRequest();
  } else {
    xhr = new ActiveXObject("Microsoft.XMLHTTP");
  }
  xhr.open(method, url, async);
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (callback) callback(this.responseText);
      xhr.onreadystatechange = null;
    }
  };
  xhr.send(null);
}

/**
 * fnDebounce [去抖函数]
 * @author nojsja
 * @param  {Function} fn [需要被包裹的原始函数逻辑]
 * @param  {Numberl} timeout [延迟时间]
 * @return {Function} [高阶函数]
 */
var fnDebounce = function (fn, timeout) {
  var time = null;

  return function () {
    if (!time) return time = Date.now();
    if (Date.now() - time >= timeout) {
      time = null;
      return fn.apply(this, [].slice.call(arguments));
    } else {
      time = Date.now();
    }
  };
};

/**
 * fnThrottle [节流函数]
 * @author nojsja
 * @param  {Function} fn [需要被包裹的原始函数逻辑]
 * @param  {Numberl} timeout [延迟时间]
 * @return {Function} [高阶函数]
 */
var fnThrottle = function (fn, timeout) {
  var time = null;

  return function () {
    if (!time) return time = Date.now();
    if ((Date.now() - time) >= timeout) {
      time = null;
      return fn.apply(this, [].slice.call(arguments));
    }
  };
};

/* intersection-observer.js */
if ('IntersectionObserver' in window &&
  'IntersectionObserverEntry' in window &&
  'intersectionRatio' in window.IntersectionObserverEntry.prototype) {

  if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
    Object.defineProperty(window.IntersectionObserverEntry.prototype,
      'isIntersecting', {
        get: function () {
          return this.intersectionRatio > 0;
        }
      });
  }
} else {
  /* load polyfill sync */
  sendXMLHttpRequest({
    url: '/js/intersection-observer.js',
    async: false,
    method: 'get',
    callback: function (txt) {
      eval(txt);
    }
  });
}

/**
 * @name 事件委托
 * @param {*} parentSelector 委托的父层元素
 * @param {*} targetSelector 委托的目标元素
 * @param {*} events 事件
 * @param {*} foo 执行的函数
 * eventDelegate('#list', 'li', 'click', function () { console.log(this); });
 */
function eventDelegate(parentSelector, targetSelector, events, foo) {
  // 触发执行的函数
  function triFunction (e) {
    // 兼容性处理
    var event = e || window.event;

    // 获取到目标阶段指向的元素
    var target = event.target || event.srcElement;

    // 获取到代理事件的函数
    var currentTarget = event.currentTarget;

    // 处理 matches 的兼容性
    if (!Element.prototype.matches) {
      Element.prototype.matches =
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function(s) {
          var matches = (this.document || this.ownerDocument).querySelectorAll(s),
            i = matches.length;
          while (--i >= 0 && matches.item(i) !== this) {}
          return i > -1;
        };
    }

    // 遍历外层并且匹配
    while (target !== currentTarget) {
      // 判断是否匹配到我们所需要的元素上
      if (target.matches(targetSelector)) {
        var sTarget = target;
        // 执行绑定的函数，注意 this
        foo.call(sTarget, Array.prototype.slice.call(arguments))
      }

      target = target.parentNode;
    }
  }

  // 如果有多个事件的话需要全部一一绑定事件
  events.split('.').forEach(function (evt) {
    // 多个父层元素的话也需要一一绑定
    Array.prototype.slice.call(document.querySelectorAll(parentSelector)).forEach(function ($p) {
      $p.addEventListener(evt, triFunction);
    });
  });

  // 解绑事件
  return () => {
    events.split('.').forEach(function (evt) {
      Array.prototype.slice.call(document.querySelectorAll(parentSelector)).forEach(function ($p) {
        $p.removeEventListener(evt, triFunction);
      });
    });
  };
};
