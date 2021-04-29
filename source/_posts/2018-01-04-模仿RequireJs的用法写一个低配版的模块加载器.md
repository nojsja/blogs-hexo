---
title: 模仿RequireJs的用法写一个低配版的模块加载器
catalog: true
comments: true
indexing: true
header-img: "https://nojsja.gitee.io/static-resources/images/hexo/article_header/article_header.jpg"
top: false
tocnum: true
date: 2018-01-04 15:25:39
subtitle: RequireJs Implementation
tags: 
- devtools
categories:
- Javascript
---

#### Contents
1. 前言
2. 回顾RequireJs的基本用法
3. 实现原理
4. 使用方法
5. 总结

#### 前言
________

前段时间一直想用单页开发技术写一个自己的个人网站(使用es2015)，写了一部分之后，发现单页应用因为只有一个页面，所以第一次加载index.html时就要下载所有js文件，并且为了好管理各个部分的状态，需要划分页面的各个功能区为各个模块，es2015本身是不支持一些模块规范的(比如AMD、CMD、CommonJs等)，所以只能这样模拟实现：  

```js
  // global
  var spa = (function(){...})();

  // module blog
  spa.blog = (function(){
    ...
    return {
      do1: do1,
      do2: do2,
    };
  })();

  // module model
  spa.model = (function(){...})();

  // module shell
  spa.model = (function(){...})();
```

并且各个模块之间又存在一些依赖关系，在index.html里面写script标签来载入模块时需要写很多个，同时也要根据依赖关系来确定书写顺序，页面逻辑混乱，如下：  

```html
  <script type="text/javascript" src="/javascripts/spa.utils.js"></script>
  <script type="text/javascript" src="/javascripts/spa.model.js"></script>
  <script type="text/javascript" src="/javascripts/spa.mock.js"></script>
  <script type="text/javascript" src="/javascripts/spa.chat.js"></script>
  <script type="text/javascript" src="/javascripts/spa.blog.js"></script>
  <script type="text/javascript" src="/javascripts/spa.action.js"></script>
  <script type="text/javascript" src="/javascripts/spa.shell.js"></script>
```

之前用过RequireJs(一个流行的JavaScript模块加载器)，它是用同构js的架构来写的，所以node.js环境下也能使用。我想自己可以尝试一下写一个低配版的js模块加载器 [requireJs-nojsja](https://github.com/nojsja/requireJs-nojsja) 来应付一下我这个单页网站，当然只是大致模仿了主要功能。  

#### 回顾RequireJs的基本用法
__________________________

1. 配置模块信息  
```js
  requirejs.config({
      baseUrl: '/javascripts',  // 配置根目录
      paths: {
        moduleA: 'a.js',
        moduleB: 'b.js',
        moduleC: 'c.js',
      },
      shim: {  // 配置不遵循amd规范的模块
        moduleC: {
          exports: 'log',
          deps: ['moduleA']
        }
      },
  });
```
2. 定义一个模块  
```js
  define(name, ['moduleA', 'moduleB'], function(a, b){
    ...
    return {
      do: function() {
        a.doSomething();
        b.doAnother();
      }
    };
  });
```
3. 引用一个模块  
```js
  // 引用模块
  require(['moduleA', 'moduleB'], function(a, b) {
    a.doSomething();
    b.doAnother();
  });
```

#### 实现原理
____________

1. config方法确定各个模块的依赖关系  
```js
  /* 记录模块访问地址和模块的依赖等信息 */
  Require.config({
    baseUrl: '/javascripts/',
    paths: {
      'moduleA': './moduleA.js',  // 相对于当前目录
      'moduleB': '/javascripts/moduleB.js',  // 不使用baseUrl
      'moduleC': 'moduleC.js',

      'moduleD': {
        url: 'moduleD.js',
        deps: ['moduleE', 'moduleF'],
      },
      ...
    },
    shim: {
      'moduleH': {
        url: 'moduleH.js',
        exports: 'log',
      },
    }
  });
```

2. 数据请求过程分析  

(1) config配置模块信息时并不会触发网络请求  
(2) 在index.js主入口文件里使用require方法引用多个模块时，根据config配置文件构造一下所有模块的依赖分析树。按深度优先或是广度优先来遍历这个依赖树，将所有依赖按照依赖顺序放进一个数组，最后进行数组去重处理，因为会出现依赖重复的情况    

```js
  var dependsTree = new Tree('dependsTree');
  var dependsArray = [];
  var dependsFlag = {};  // 解决循环依赖

  // 创建树
  setDepends(depends, dependsTree);
  // 得到依赖数组
  sortDepends(dependsArray, dependsTree);
  // 数据去重
  arrayFilter(dependsArray);

  return dependsArray;
```

(3) 创建XHR对象异步下载数组里面的所有js文件，按照依赖顺序挨个解析js代码，解析完成后触发回调函数，回调函数里传入各个模块的引用  
  ```js
    // ajax下载代码文件
    Utils.request(url, 'get', null, function(responseText){
      // 暂时保存
      _temp[module_name] = responseText;
    });

    // 文件下载完成后eval解析代码
    array.map(function(jsText){
      ...
      eval(jsText);
      ...
    });

    // 调用回调函数
    callback.apply(null, [dep1, dep2, dep3]);
  ```

#### 使用方法
___________
详细说明: github [README.md](https://github.com/nojsja/requireJs-nojsja)

#### 总结
________

1. 下载js代码时我用了ajax来实现，所以对于跨域文件和CDN会有点问题，这个可以改成创建script标签，指定标签src，最后将document.head.appendChild(script)，这样来解决，其它的诸如使用XMLHttpRequest 2.0，iframe等也可以的，可以实验一下。
2. 解析代码时我用了eval的方法，这个eval在JavaScript里面是众说纷纭，可以看看[这个](https://www.zhihu.com/question/20591877)，如果是用了上面创建script标签的方法的话，就不用自己eval了。
3. 发现一个bug，存在循环依赖时，代码会报错，还没去解决。RequireJs是这样处理的：模块a依赖b，同时b依赖a，这种情况下b的模块函数被调用时，被传入的a是undefined，所以需要自己在b里面手动require一下a。