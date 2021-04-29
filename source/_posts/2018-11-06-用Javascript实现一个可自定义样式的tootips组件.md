---
title: "用Javascript实现一个可自定义样式的tootips组件"
catalog: true
toc_nav_num: true
date:  2018-11-06 19:16:00
subtitle: "animation javascript"
header-img: "https://nojsja.gitee.io/static-resources/images/hexo/article_header/article_header.jpg"
tags:
- javascript
categories:
- Javascript
updateDate: 2018-11-06 19:16:00
---

#### 前言

> 最近做的一个jQuery老项目经常会用tootips组件在一个html元素周围显示提示信息，虽然有现成的组件可以使用，但是很多tootips组件处理起来并不灵活，不能够自定义tootips样式和显示的内容及布局等等，而且tootips组件本身的样式可能会被目标组件的样式影响，所以想自己实现一个tootips组件：可以自定义显示内容，并且tootips的位置和布局完全不受页面元素影响。

![tootip.png](tootip.png)

#### 预览图
----------------

[=> 源代码](https://github.com/nojsja/javascript-learning/tree/master/code-challenge/es5-component/js-tooltips)

![animation.gif](tootips.gif)

#### 代码实现
------------

##### 组件结构
```js
 var Tootips = (function () {
  
  /* 工具函数 */
  var utils = {
    ...
  }
 

  /**
   * [renderContainer 构造html]
   * @param  {[Object]} options   [自定义参数]
   * @param  {[String]} type   [渲染类型 -> text | html]
   * @param  {[String]} target   [渲染字符串]
   */
  function renderContainer($selector, tootipKey) {
   ...
 };


 /**
  * [showTootips 操作页面属性显示一个元素]
  * @param  {[$Object]} $selector [一个页面元素]
  * @param  {[String]} tootipKey [可能已经生成过一次tooptips组件了]
  */
 function showTootips($selector) {
   ...
 };

 /**
  * [hideTooTips 操作页面属性隐藏一个元素]
  * @param  {[$Object]} $selector [一个页面元素]
  */
 function hideTooTips($selector) {
   ...
 };


 /**
  * [eventListen 进行事件监听]
  * @param  {[$Object]} $selector [一个页面元素]
  * @param  {[String]} trigger [触发事件监听类型]
  */
 function eventListen($selector, _trigger, $context) {
   ...
 }

 /**
  * [renderHtml 使用html字符串进行初始化]
  * @param  {[$Object]} $selector [一个页面元素]
  * @param  {[String]} htmlstr   [html字符串]
  * @param  {[Object]} options   [自定义参数]
  */
 function init(_$selector, _options) {
   ...
 }

 return {
   init: init,

   /**
   * [trigger 手动触发元素的显示和隐藏]
   * @param  {[$Object]} $selector [一个页面元素]
   */
   trigger: function($selector) {
    if (!utils.element.getData($selector, 'isActivated')) {
      showTootips($selector, utils.element.getAttr($selector, 'tootip-key'));
    }else {
      hideTooTips($selector);
    }
  },

  /**
  * [getStatus 获取某个元素的状态]
  * @param  {[$Object]} $selector [一个页面元素]
  */
   status: function ($selector) {
    return {
      isActivated: utils.element.getData($selector, 'isActivated') ? true : false,
      isInited: utils.element.getAttr($selector, 'tootip-key') ? true : false,
      key: utils.element.getAttr($selector, 'tootip-key') || null,
    };
  },
 }
})();

```

#### 工具函数封装

>主要用于简化dom操作，实现了一些类似jQuery的API；还封装了用于计算元素坐标的纯函数

```js
var utils = {
    actions: {
      // [symbol]: [Timer]
    },
    element: {
     jsonWrapper: function(target) {
       var jsonParseRule = /^\{"([\w\W])+\}$/;
       if (jsonParseRule.test(target)) return JSON.parse(target);
       return (typeof target === 'object' && target !== null) ?
         JSON.stringify(target) :
         target;
     },
     elementWrapper: function($element) {
       return (typeof $element === 'object') ? $element : document.querySelector($element);
     },
     setAttr: function($element, key, value) {
       $element = this.elementWrapper($element);
       (key) && $element.setAttribute(key, this.jsonWrapper(value));
       return this;
     },
     setCss: function($element, styleKey, styleValue, important) {
       $element = this.elementWrapper($element);
       $element.style.setProperty(styleKey, styleValue, important === 'important' ? important : undefined);
       return this;
     },
     getAttr: function($element, key) {
       $element = this.elementWrapper($element);
       return (key) ? this.jsonWrapper($element.getAttribute(key)) : undefined;
     },
     setData: function($element, key, value) {
       $element = this.elementWrapper($element);
       (key) && this.setAttr($element, 'data-' + key, value);
       return this;
     },
     getData: function($element, key) {
       $element = this.elementWrapper($element);
       return key ? this.getAttr($element, 'data-' + key) : undefined;
     },
     addClass: function($element, className) {
       $element = this.elementWrapper($element);
       var classes = $element.className.split(' ');
       if (!classes.includes(className)) {
         classes.push(className);
         $element.className = classes.join(' ');
       }
       return this;
     },
     removeClass: function($element, className) {
       $element = this.elementWrapper($element);
       var classes = $element.className.split(' ');
       var index = classes.indexOf(className);
       if (index !== -1) {
         classes.splice(index, 1);
         $element.className = classes.join(' ');
       }
       return this;
     },
     empty: function($element) {
       $element = this.elementWrapper($element);
       $element.innerHTML = '';
     },
     html: function($element, htmlStr) {
       $element = this.elementWrapper($element);
       $element.innerHTML = htmlStr;
     }
    },
   /* 根据宿主元素第一次计算横坐标和纵坐标 */
   renderX1: function (r, d) {
     if (d === 'top' || d === 'bottom')
       return (r.x + r.width / 2 + 'px');
     if (d === 'left')
       return (r.x - 6 + 'px');
     if (d === 'right')
       return (r.x + r.width + 6 + 'px');
     if (d === 'bottomleft' || d === 'topleft')
       return (r.x + 'px');
     if (d === 'bottomright' || d === 'topright')
       return (r.x + r.width + 'px');
   },
   renderY1: function (r, d) {
     if (d === 'top')
       return (r.y - 6 + 'px');
     if (d === 'left' || d === 'right')
       return (r.y + r.height / 2 + 'px');
     if (d === 'bottom')
       return (r.y + r.height + 6 + 'px');
     if (d === 'bottomleft' || d === 'bottomright')
       return (r.y + r.height + 'px');
     if (d === 'topleft' || d === 'topright')
       return (r.y + 'px');
   },
   /* 根据生成的tootips元素宽高第二次计算横坐标和纵坐标 */
   renderX2: function (r, d) {
     if (d === 'top' || d === 'bottom')
       return (r.x - r.width / 2 + 'px');
     if (d === 'left' || d === 'bottomleft' || d === 'topleft')
       return (r.x - r.width + 'px');
     if (d === 'right')
       return (r.x + 'px');
     if (d === 'bottomright' || d === 'topright')
      return (r.x + r.widht + 'px');
   },
   renderY2: function (r, d) {
     if (d === 'top' || d === 'topleft' || d === 'topright')
       return (r.y - r.height + 'px');
     if (d === 'left' || d === 'right')
       return (r.y - r.height / 2 + 'px');
     if (d === 'bottom' || d === 'bottomleft' || d === 'bottomright')
       return (r.y + 'px');
   },
   /* 使用函数去抖防止调用混乱 */
   actionDebounce: function(symbol, action, params) {
     var that = this;
     var timer = setTimeout(function() {
       action(params);
       clearTimeout(timer);
       delete that.actions[symbol];
     }, 300);
 
     if (!that.actions[symbol]) {
       that.actions[symbol] = timer;
     } else {
       clearTimeout(that.actions[symbol]);
       that.actions[symbol] = timer;
     }
   }
 }
```

##### 初始化一个元素
> 对一个html元素进行初始化，在元素上绑定数据和设置事件监听器

```js
/**
 * [renderHtml 使用html字符串进行初始化]
 * @param  {[$Object]} $selector [一个页面元素]
 * @param  {[String]} htmlstr   [html字符串]
 * @param  {[Object]} options   [自定义参数]
 */
function init(_$selector, _options) {

  var $selector = utils.element.elementWrapper(_$selector),
      trigger = _options['trigger'] ? _options['trigger'] : 'mouseover', // click | hover
      $context = utils.element.elementWrapper(_options['context']),
      key = utils.element.getAttr($selector, 'tootip-key');
   
   utils.element.setData($selector, 'tootip-target', _options.value)
     .setData($selector, 'tootip-type', _options.type)
     .setData($selector, 'tootip-options', _options)
     .setData($selector, 'tootip-trigger', _options.trigger)
     .setCss($selector, 'cursor', 'pointer');

  (!key) && eventListen($selector, trigger, $context);
}
```

##### 根据传入属性创建tootips组件

* 使用`getBoundingClientRect()`方法获取目标组件的位置和宽高
* tootips组件根据获取的位置和宽高进行窗口定位(`position: fixed`)
* 根据传入的属性设置tootips组件的样式
* 返回一个dom元素


```js
/**
   * [renderContainer 构造html]
   * @param  {[Object]} options   [自定义参数]
   * @param  {[String]} type   [渲染类型 -> text | html]
   * @param  {[String]} target   [渲染字符串]
   */
  function renderContainer($selector, tootipKey) {
   var type = utils.element.getData($selector, 'tootip-type'),
      options = utils.element.getData($selector, 'tootip-options'),
      trigger = utils.element.getData($selector, 'tootip-trigger'),
      target = utils.element.getData($selector, 'tootip-target');

   // 提取属性
   var randomKey = '_' + Math.random().toString(36).substr(2);
   var $wrapper = tootipKey ? utils.element.elementWrapper('div[tootip-key='+tootipKey+']') : document.createElement('div');
   var cssStyle = options.style || {};
   var styleSheet = options.css || '';
   var direction = options.direction || 'top';
   var triangleArray = ['top', 'left', 'right','bottom'];
   var triangleClass = 'triangle-' +
     triangleArray[triangleArray.length - 1 - triangleArray.indexOf(direction)];
   var shadowClassMap = {
     top: 'tootip-shadow-top-right',
     bottom: 'tootip-shadow-bottom-right',
     left: 'tootip-shadow-top-left',
     right: 'tootip-shadow-top-right',
   }
   var rect = $selector.getBoundingClientRect();

   utils.element.setCss($wrapper, 'border', 'solid 1px rgb(212, 212, 212)')
    .setCss($wrapper, 'position', 'fixed')
    .setCss($wrapper, 'left', utils.renderX1(rect, direction))
    .setCss($wrapper, 'top', utils.renderY1(rect, direction))
    .setAttr($wrapper, 'tootip-key', tootipKey || randomKey)
    .addClass($wrapper, triangleClass + ' abnormal-tips-container ' + shadowClassMap[direction] + ' ' + styleSheet);
    utils.element.setAttr($selector, 'tootip-key', tootipKey || randomKey);

   // 第一次创建dom结构
   if (!tootipKey && trigger === 'mouseover') {
     $wrapper.onmouseout = function () {
       utils.actionDebounce(randomKey, hideTooTips, $selector);
     };
     $wrapper.onmouseover = function () {
       utils.actionDebounce(randomKey, showTootips, $selector);
     };
   }

   Object.keys(cssStyle).forEach(function (attr) {
     utils.element.setCss($wrapper, attr, cssStyle[attr]);
   });

   utils.element.html($wrapper, type === 'html' ? target : ('<span>' + target +'</span>'));

   return $wrapper;
 };
```

##### 绑定事件监听器

> 对一个元素进行初始化后需要给tooltips组件绑定监听器(`click`或`mouse`事件)，让tootips组件能够响应鼠标的点击或是划过

注意`utils.actionDebounce`方法运用了函数去抖的思想，防止在短时间内高频触发Tootip显示/隐藏时发生的调用混乱问题，多次调用时只响应最新的触发事件。

```js
/**
  * [eventListen 进行事件监听]
  * @param  {[$Object]} $selector [一个页面元素]
  * @param  {[String]} trigger [触发事件监听类型]
  */
 function eventListen($selector, _trigger, $context) {

   var trigger = (_trigger instanceof Array) ? _trigger : [_trigger];

   // click事件监听
   if(trigger.includes('click')) {
     ($context || $selector)
       .onclick = function () {
         if (!utils.element.getData($selector, 'isActivated')) {
           utils.actionDebounce(utils.element.getAttr($selector, 'tootip-key'), showTootips, $selector);
         } else {
           utils.actionDebounce(utils.element.getAttr($selector, 'tootip-key'), hideTooTips, $selector);
         }
       };
   } 

   // 鼠标事件监听
   if(trigger.includes('mouseover')) {
     ($context || $selector)
       .onmouseout = function () {
         utils.actionDebounce(utils.element.getAttr($selector, 'tootip-key'), hideTooTips, $selector);
       };
     ($context || $selector)
       .onmouseover = function () {
         utils.actionDebounce(utils.element.getAttr($selector, 'tootip-key'), showTootips, $selector);
       };
   }
 }

```

* 实现showTootips方法  
在tootips组件中可以自定义显示html内容或text内容，tootips组件被添加到页面之前，tootips组件的宽度和高度是不可获取的，所以在show方法中需要对tootips元素进行二次定位，同样使用`getBoundingClientRect()`方法获取tootips元素坐标和宽高。

```js
/**
  * [showTootips 操作页面属性显示一个元素]
  * @param  {[$Object]} $selector [一个页面元素]
  * @param  {[String]} tootipKey [可能已经生成过一次tooptips组件了]
  */
 function showTootips($selector) {
   if (utils.element.getData($selector, 'isActivated')) return;
   var tootipKey = utils.element.getAttr($selector, 'tootip-key');
   var $dom = renderContainer($selector, tootipKey);
   if (!tootipKey) {
     document.body.appendChild($dom);
   } else {
    utils.element.removeClass($dom, 'hidden');
   }
   utils.element.setData($selector, 'isActivated', true);

   var options = utils.element.getData($selector, 'tootip-options');
   var rect = $dom.getBoundingClientRect();

   utils.element
     .setCss($dom, 'top', utils.renderY2(rect, options.direction))
     .setCss($dom, 'left', utils.renderX2(rect, options.direction));
 };
```

* 实现hideTootips方法  
hide方法的作用是将当前元素对应的tootips组件从页面移出，之前初始化的时候在目标元素和生成的tootips元素上设置了同一个`key`属性，现在可以根据`key`来移除每个目标元素对应的tootips元素。

```js
/**
  * [hideTooTips 操作页面属性隐藏一个元素]
  * @param  {[$Object]} $selector [一个页面元素]
  */
 function hideTooTips($selector) {
   var key = utils.element.getAttr($selector, 'tootip-key');
   var $element = utils.element.elementWrapper('div[tootip-key='+key+']');
   utils.element.addClass($element, 'hidden');
   utils.element.setData($selector, 'isActivated', '');
 };
```



##### 使用方式

> 设置tootips方向、显示内容字符串(可以是html字符串)、触发方式(click / mouseover)、自定义css属性、自定义样式表。

```js
Tootips.init(('#t1'), {
  trigger: 'mouseover', // 触发方式
  type: 'html', // 内容显示类型
  value: '<h3>header</h3><p>body</p>', // 内容显示值
  direction: 'top', // 显示方向
  style: { // tootips组件自定义样式
    'font-size': '1rem',
    'color': 'red',
    'min-width': '5rem',
    'padding': '5px 10px',
    'border-radius': '5px',
    'background-color': 'white',
  },
  css: '', // tootips组件自定义样式表
});
```

#### 总结
--------

* tootips组件的坐标完全使用javasript来获取和设置
* tootips组件的定位类型为`position: fixed`，不受页面布局影响
* `getBoundingClientRect()`方法可以获取目标元素的坐标、宽高等数据
* tootips组件支持传入自定义样式
* tootips组件支持显示含有html标签的字符串和普通字符串
* tootips组件支持设置触发方式(`click` / `mouseover`)

##### 感谢阅读
