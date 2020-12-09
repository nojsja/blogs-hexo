---
title: Electron/Node多进程工具开发日记
catalog: true
toc_nav_num: true
date: 2020-12-08 16:34:01
subtitle: "electron/node multi-process tool development"
header-img: "/blogs/img/article_header/article_header.png"
tags:
- electron
- node
- process
categories:
- Electron
- Node
updateDate: 2020-12-08 16:34:01
---

> 文中实现的部分工具方法正处于早期/测试阶段，仍在持续优化中，仅供参考...

### Contents
------------
```sh
├── Contents (you are here!)
|
├── electron-re 可以用来做什么？
│   ├── 1)用于Electron应用
|   └── 2)用于Electron/Nodejs应用
|
├── 说明1：Service/MessageChannel
│   ├── Service的创建
│   ├── Service的自动刷新
│   ├── MessageChannel的引入
│   ├── MessageChannel提供的方法
│   └── 对比MessageChannel和原生ipc通信的使用
|       ├── 1)使用remote远程调用(原生)
|       ├── 2)使用ipc信号通信(原生)
|       └── 3)使用MessageChannel进行多向通信(扩展)
|
├── 说明2：ChildProcessPool/ProcessHost
│   ├── 进程池的创建
│   ├── 进程池的实例方法
│   ├── 子进程事务中心
│   └── 进程池和子进程事务中心的配合使用
|       ├── 1)主进程中使用进程池向子进程发送请求
|       └── 2)子进程中用事务中心处理消息
|
├── Next To Do
|
├── 几个实际使用实例
│   ├── 1)Service/MessageChannel示例
│   ├── 2)ChildProcessPool/ProcessHost示例
│   └── 3)test测试目录示例
```


### I. 前言
---------------

最近在做一个多文件分片并行上传模块的时候(基于Electron和React)，遇到了一些性能问题，主要体现在：前端同时添加大量文件(1000-10000)并行上传时(文件同时上传数默认为6)，在不做懒加载优化的情况下，引起了整个应用窗口的卡顿。所以针对Electron/Nodejs多进程这方面做了一些学习，尝试使用多进程架构对上传流程进行优化。

同时也编写了一个方便进行Electron/Node多进程管理和调用的工具[electron-re](https://github.com/nojsja/electron-re)，已经发布为npm组件，可以直接安装：
```sh
$: npm install electron-re --save
# or
$: yarn add electron-re
```

如果感兴趣是怎么一步一步解决性能问题的话可以查看这篇文章：[《基于Electron的smb客户端文件上传优化探索》](https://nojsja.gitee.io/blogs/2020/08/16/%E5%9F%BA%E4%BA%8EElectron%E7%9A%84smb%E5%AE%A2%E6%88%B7%E7%AB%AF%E6%96%87%E4%BB%B6%E4%B8%8A%E4%BC%A0%E4%BC%98%E5%8C%96%E6%8E%A2%E7%B4%A2/)。

![RhinoDisk](smb_upload_now.jpg)

### II. electron-re 可以用来做什么？
--------------

####  1. 用于Electron应用

- `BrowserService`
- `MessageChannel`

在Electron的一些“最佳实践”中，建议将占用cpu的代码放到渲染过程中而不是直接放在主过程中，这里先看下chromium的架构图：

![chromium.jpg](chromium.jpg)

每个渲染进程都有一个全局对象RenderProcess，用来管理与父浏览器进程的通信，同时维护着一份全局状态。浏览器进程为每个渲染进程维护一个RenderProcessHost对象，用来管理浏览器状态和与渲染进程的通信。浏览器进程和渲染进程使用Chromium的IPC系统进行通信。在chromium中，页面渲染时，UI进程需要和main process不断的进行IPC同步，若此时main process忙，则UIprocess就会在IPC时阻塞。所以如果主进程持续进行消耗CPU时间的任务或阻塞同步IO的任务的话，就会在一定程度上阻塞，从而影响主进程和各个渲染进程之间的IPC通信，IPC通信有延迟或是受阻，渲染进程窗口就会卡顿掉帧，严重的话甚至会卡住不动。

因此`electron-re`在Electron已有的`Main Process`主进程和`Renderer Process`渲染进程逻辑的基础上独立出一个单独的`Service`概念。`Service`即不需要显示界面的后台进程，它不参与UI交互，单独为主进程或其它渲染进程提供服务，它的底层实现为一个允许`node注入`和`remote调用`的渲染窗口进程。

这样就可以将代码中耗费cpu的操作(比如文件上传中维护一个数千个上传任务的队列)编写成一个单独的js文件，然后使用`BrowserService`构造函数以这个js文件的地址`path`为参数构造一个`Service`实例，从而将他们从主进程中分离。如果你说那这部分耗费cpu的操作直接放到渲染窗口进程可以嘛？这其实取决于项目自身的架构设计，以及对进程之间数据传输性能损耗和传输时间等各方面的权衡，创建一个`Service`的简单示例：
```js
const { BrowserService } = require('electron-re');
const myServcie = new BrowserService('app', path.join(__dirname, 'path/to/app.service.js'));
```

如果使用了`BrowserService`的话，要想在主进程、渲染进程、service进程之间任意发送消息就要使用`electron-re`提供的`MessageChannel`通信工具，它的接口设计跟Electron内建的`ipc`基本一致，也是基于`ipc`通信原理来实现的，简单示例如下：
```js
/* ---- main.js ---- */
const { BrowserService } = require('electron-re');
// 主进程中向一个service-app发送消息
MessageChannel.send('app', 'channel1', { value: 'test1' });
```

#### 2. 用于Electron/Nodejs应用
- `ChildProcessPool`
- `ProcessHost`

此外，如果要创建一些不依赖于Electron运行时的子进程（相关参考nodejs `child_process`），可以使用`electron-re`提供的专门为nodejs运行时编写的进程池`ChildProcessPool`类。因为创建进程本身所需的开销很大，使用进程池来重复利用已经创建了的子进程，将多进程架构带来的性能效益最大化，简单实例如下：
```js
const { ChildProcessPool } = require('electron-re');
global.ipcUploadProcess = new ChildProcessPool({
  path: path.join(app.getAppPath(), 'app/services/child/upload.js'), max: 6
});
```

一般情况下，在我们的子进程执行文件中(创建子进程时path参数指定的脚本)，如要想在主进程和子进程之间同步数据，可以使用`process.send('channel', params)`和`process.on('channel', function)`来实现。但是这样在处理业务逻辑的同时也强迫我们去关注进程之间的通信，你需要知道子进程什么时候能处理完毕，然后再使用`process.send`再将数据返回主进程，使用方式繁琐。

`electron-re`引入了`ProcessHost`的概念，我将它称之为"进程事务中心"。实际使用时在子进程执行文件中只需要将各个任务函数通过`ProcessHost.registry('task-name', function)`注册成多个被监听的事务，然后配合进程池的`ChildProcessPool.send('task-name', params)`来触发子进程的事务逻辑的调用即可，`ChildProcessPool.send()`同时会返回一个Promise实例以便获取回调数据，简单示例如下：
```js
/* --- 主进程中 --- */
...
global.ipcUploadProcess.send('task1', params);

/* --- 子进程中 --- */
const { ProcessHost } = require('electron-re');
ProcessHost
    .registry('task1', (params) => {
      return { value: 'task-value' };
    })
    .registry('init-works', (params) => {
      return fetch(url);
    });
```

### III. Service/MessageChannel
----------------------
用于Electron应用中 - Service进程分离/进程间通信

#### BrowserService的创建
>需要等待app触发`ready`事件后才能开始创建Service，创建后如果立即向Service发送请求可能接收不到，需要调用`service.connected()`异步方法来等待Service准备完成，支持Promise写法。

Electron主进程main.js文件中：
```js
/* --- in electron main.js entry --- */
const { app } = require('electron');
const {
  BrowserService,
  MessageChannel // must required in main.js even if you don't use it
} = require('electron-re');
const isInDev = process.env.NODE_ENV === 'dev';
...

// after app is ready in main process
app.whenReady().then(async () => {
    const myService = new BrowserService('app', 'path/to/app.service.js');
    const myService2 = new BrowserService('app2', 'path/to/app2.service.js');

    await myService.connected();
    await myService2.connected();

    // open devtools in dev mode for debugging
    if (isInDev) myService.openDevTools();
    ...
});
```

#### BrowserService的自动刷新
> 支持Service代码文件更新后自动刷新Service，简单设置两个配置项即可。

1.需要声明当前运行环境为开发环境  
2.创建Service时禁用web安全策略
```js
const myService = new BrowserService('app', 'path/to/app.service.js', {
  ...options,
  // 设置开发模式
  dev: true,
  // 关闭安全策略
  webPreferences: { webSecurity: false }
});
```

#### MessageChannel的引入
>注意必须在main.js中引入，引入后会自动进行初始化。

MessageChannel在`主进程/Service/渲染进程窗口`中的使用方式基本一致，具体请参考下文"对比MessageChannel和原生ipc通信的使用"。

```js
const {
  BrowserService,
  MessageChannel // must required in main.js even if you don't use it
} = require('electron-re');
```

#### MessageChannel提供的方法

1.公共方法，适用于 - 主进程/渲染进程/Service
```js
/* 向一个Service发送请求 */
MessageChannel.send('service-name', channel, params);
/* 向一个Servcie发送请求，并取得Promise实例 */
MessageChannel.invoke('service-name', channel, params);
/* 根据windowId/webContentsId，向渲染进程发送请求 */
MessageChannel.sendTo('windowId/webContentsId', channel, params);
/* 监听一个信号 */
MessageChannel.on(channel, func);
/* 监听一次信号 */
MessageChannel.once(channel, func);

```

2.仅适用于 - 渲染进程/Service
```js
/* 向主进程发送消息 */
MessageChannel.send('main', channel, params);
/* 向主进程发送消息，并取得Promise实例 */
MessageChannel.invoke('main', channel, params);
```

3.仅适用于 - 主进程/Service
```js
/* 
  监听一个信号，调用处理函数，
  可以在处理函数中返回一个异步的Promise实例或直接返回数据
*/
MessageChannel.handle(channel, processorFunc);
```

#### 对比MessageChannel和原生ipc通信的使用
> 1/2 - 原生方法，3 - 扩展方法

1.使用remote远程调用

remote模块为渲染进程和主进程通信提供了一种简单方法，使用remote模块, 你可以调用main进程对象的方法, 而不必显式发送进程间消息。示例如下，代码通过remote远程调用主进程的BrowserWindows创建了一个渲染进程，并加载了一个网页地址：  
```js
/* 渲染进程中(web端代码) */
const { BrowserWindow } = require('electron').remote
let win = new BrowserWindow({ width: 800, height: 600 })
win.loadURL('https://github.com')
```
注意：remote底层是基于ipc的同步进程通信(同步=阻塞页面)，都知道Node.js的最大特性就是异步调用，非阻塞IO，因此remote调用不适用于主进程和渲染进程频繁通信以及耗时请求的情况，否则会引起严重的程序性能问题。

2.使用ipc信号通信

基于事件触发的ipc双向信号通信，渲染进程中的ipcRenderer可以监听一个事件通道，也能向主进程或其它渲染进程直接发送消息(需要知道其它渲染进程的webContentsId)，同理主进程中的ipcMain也能监听某个事件通道和向任意一个渲染进程发送消息。  
Electron进程之间通信最常用的一系列方法，但是在向其它子进程发送消息之前需要知道目标进程的`webContentsId`或者能够直接拿到目标进程的实例，使用方式不太灵活。
```js
/* 主进程 */
ipcMain.on(channel, listener) // 监听信道 - 异步触发
ipcMain.once(channel, listener) // 监听一次信道，监听器触发后即删除 - 异步触发
ipcMain.handle(channel, listener) // 为渲染进程的invoke函数设置对应信道的监听器
ipcMain.handleOnce(channel, listener) // 为渲染进程的invoke函数设置对应信道的监听器，触发后即删除监听
browserWindow.webContents.send(channel, args); // 显式地向某个渲染进程发送信息 - 异步触发

/* 渲染进程 */
ipcRenderer.on(channel, listener); // 监听信道 - 异步触发
ipcRenderer.once(channel, listener); // 监听一次信道，监听器触发后即删除 - 异步触发
ipcRenderer.sendSync(channel, args); // 向主进程一个信道发送信息 - 同步触发
ipcRenderer.invoke(channel, args); // 向主进程一个信道发送信息 - 返回Promise对象等待触发
ipcRenderer.sendTo(webContentsId, channel, ...args); // 向某个渲染进程发送消息 - 异步触发
ipcRenderer.sendToHost(channel, ...args) // 向host页面的webview发送消息 - 异步触发
```

3.使用MessageChannel进行多向通信

* 1）main process - 主进程中
```js
const {
  BrowserService,
  MessageChannel // must required in main.js even if you don't use it
} = require('electron-re');
const isInDev = process.env.NODE_ENV === 'dev';
...

// after app is ready in main process
app.whenReady().then(async () => {
    const myService = new BrowserService('app', 'path/to/app.service.js');
    const myService2 = new BrowserService('app2', 'path/to/app2.service.js');

    await myService.connected();
    await myService2.connected();

    // open devtools in dev mode for debugging
    if (isInDev) myService.openDevTools();
    MessageChannel.send('app', 'channel1', { value: 'test1' });
    MessageChannel.invoke('app', 'channel2', { value: 'test2' }).then((response) => {
      console.log(response);
    });
    MessageChannel.on('channel3', (event, response) => {
      console.log(response);
    });

    MessageChannel.handle('channel4', (event, response) => {
      console.log(response);
      return { res: 'channel4-res' };
    });
});
```

* 2）app.service.js - 在一个service中
```js
const { ipcRenderer } = require('electron');
const { MessageChannel } = require('electron-re');

MessageChannel.on('channel1', (event, result) => {
  console.log(result);
});

MessageChannel.handle('channel2', (event, result) => {
  console.log(result);
  return { response: 'channel2-response' }
});

MessageChannel.invoke('app2', 'channel3', { value: 'channel3' }).then((event, result) => {
  console.log(result);
});

MessageChannel.send('app', 'channel4', { value: 'channel4' });
```

* 3）app2.service.js - 在另一个service中
```js
MessageChannel.handle('channel3', (event, result) => {
  console.log(result);
  return { response: 'channel3-response' }
});
MessageChannel.once('channel4', (event, result) => {
  console.log(result);
});
MessageChannel.send('main', 'channel3', { value: 'channel3' });
MessageChannel.invoke('main', 'channel4', { value: 'channel4' });
```

* 4）renderer process window - 在一个渲染窗口中
```js
const { ipcRenderer } = require('electron');
const { MessageChannel } = require('electron-re');
MessageChannel.send('app', 'channel1', { value: 'test1'});
MessageChannel.invoke('app2', 'channel3', { value: 'test2' });
MessageChannel.send('main', 'channel3', { value: 'test3' });
MessageChannel.invoke('main', 'channel4', { value: 'test4' });
```

### IV. ChildProcessPool/ProcessHost
----------------------
用于Electron和Nodejs应用中 - Node.js进程池/子进程事务中心

#### 进程池的创建
进程池基于nodejs的`child_process`模块，使用`fork`方式创建并管理多个独立的子进程。

创建进程池时提供`最大子进程实例个数`、`子进程执行文件路径`等参数即可，进程会自动接管进程的创建和调用。外部可以通过进程池向某个子进程发送请求，而在进程池内部其实就是按照顺序依次将已经创建的多个子进程中的某一个返回给外部调用即可，从而避免了其中某个进程被过度使用。

子进程是通过懒加载方式创建的，也就是说如果只创建进程池而不对进程池发起请求调用的话，进程池将不会创建任何子进程实例。

1.参数说明
```sh
|—— path 参数为可执行文件路径
|—— max 指明进程池创建的最大子进程实例数量
|—— env 为传递给子进程的环境变量
```
2.主进程中引入进程池类，并创建进程池实例
```js
/* main.js */
...
const ChildProcessPool = require('path/to/ChildProcessPool.class');

const processPool = new ChildProcessPool({
  path: path.join(app.getAppPath(), 'app/services/child/upload.js'),
  max: 3,
  env: { lang: global.lang }
});
...
```

#### 进程池的实例方法
>注意task-name即一个子进程注册的任务名，指向子进程的某个函数，具体请查看下面子进程事务中心的说明

__1.processPool.send('task-name', params, id)__

向某个子进程发送消息，如果请求参数指定了id则表明需要使用之前与此id建立过映射的某个进程(id将在send调用之后自动绑定)，并期望拿到此进程的回应结果。

id的使用情况比如：我第一次调用进程池在一个子进程里设置了一些数据(子进程之间数据不共享)，第二次时想拿到之前设置的那个数据，这时候只要保持两次`send()`请求携带的id一致即可，否则将不能保证两次请求发送给了同一个子进程。

```js
/**
  * send [Send request to a process]
  * @param  {[String]} taskName [task name - necessary]
  * @param  {[Any]} params [data passed to process - necessary]
  * @param  {[String]} id [the unique id bound to a process instance - not necessary]
  * @return {[Promise]} [return a Promise instance]
  */
 send(taskName, params, givenId) {...}
```

__2.processPool.sendToAll('task-name', params)__

向进程池中的所有进程发送信号，并期望拿到所有进程返回的结果，返回的数据为一个数组。

```js
  /**
  * sendToAll [Send requests to all processes]
  * @param  {[String]} taskName [task name - necessary]
  * @param  {[Any]} params [data passed to process - necessary]
  * @return {[Promise]} [return a Promise instance]
  */
  sendToAll(taskName, params) {...}
```

__3.processPool.disconnect(id)__

销毁进程池的子进程，如果不指定`id`调用的话就会销毁所有子进程，指定`id`参数可以单独销毁与此`id`值绑定过的某个子进程，销毁后再次调用进程池发送请求时会自动创建新的子进程。

需要注意的是`id`绑定操作是在`processPool.send('task-name', params, id)`方法调用后自动进行的。

__4.processPool.setMaxInstanceLimit(number)__

除了在创建进程池时使用`max`参数指定最大子进程实例个数，也能调用进程池的此方法来动态设置需要创建的子进程实例个数。

#### 子进程事务中心
>`ProcessHost` - 子进程事务中心，需要和ChildProcessPool协同工作，用来分离子进程通信逻辑和业务逻辑，优化子进程代码结构。

主要功能是使用api诸如 - `ProcessHost.registry(taskName, func)`来注册多种`任务`，然后在主进程中可以直接使用进程池向某个`任务`发送请求并取得`Promise`对象以拿到进程回调返回的数据，从而避免在我们的子进程执行文件中编写代码时过度关注进程之间数据的通信。
如果不使用`进程事务管理中心`的话我们就需要使用`process.send`来向一个进程发送消息并在另一个进程中使用`process.on('message', processor)`处理消息。需要注意的是如果注册的`task`任务是异步的则需要返回一个Promise对象而不是直接`return`数据，实例方法如下：  

- 1）registry用于子进程向事务中心注册自己的任务(支持链式调用)
- 2）unregistry用于取消任务注册(支持链式调用)

使用说明：
```js
/* in child process */
const { ProcessHost } = require('electron-re');
ProcessHost
  .registry('test1', (params) => {
    return params;
  });
```

#### 进程池和子进程事务中心的配合使用

示例：文件分片上传中，主进程中使用进程池来发送`初始化分片上传`请求，子进程拿到请求信号处理业务然后返回

__1.in main processs - 主进程中__
```js
 /**
    * init [初始化上传]
    * @param  {[String]} host [主机名]
    * @param  {[String]} username [用户名]
    * @param  {[Object]} file [文件描述对象]
    * @param  {[String]} abspath [绝对路径]
    * @param  {[String]} sharename [共享名]
    * @param  {[String]} fragsize [分片大小]
    * @param  {[String]} prefix [目标上传地址前缀]
    */
  init({ username, host, file, abspath, sharename, fragsize, prefix = '' }) {
    const date = Date.now();
    const uploadId = getStringMd5(date + file.name + file.type + file.size);
    let size = 0;

    return new Promise((resolve) => {
        this.getUploadPrepath
        .then((pre) => {
          /* 看这里看这里！look here! */
          return processPool.send(
            /* 进程事务名 */
            'init-works',
            /* 携带的参数 */
            {
              username, host, sharename, pre, prefix,
              size: file.size, name: file.name, abspath, fragsize
            },
            /* 指定一个进程调用id */
            uploadId
          )
        })
      .then((rsp) => {
        resolve({
          code: rsp.error ? 600 : 200,
          result: rsp.result,
        });
      }).catch(err => {
        resolve({
          code: 600,
          result: err.toString()
        });
      });
    });
  }
```

__2.child.js (in child process)中使用事务管理中心处理消息__
>child.js即为创建进程池时传入的`path`参数所在的nodejs脚本代码，在此脚本中我们注册多个任务来处理从进程池发送过来的消息  

其中：
 \> uploadStore - 主要用于在内存中维护整个文件上传列表，对上传任务列表进行增删查改操作(cpu耗时操作)  
 \> fileBlock - 利用FS API操作文件，比如打开某个文件的文件描述符、根据描述符和分片索引值读取一个文件的某一段Buffer数据、关闭文件描述符等等。虽然都是异步IO读写，对性能影响不大，不过为了整合整个上传处理流程也将其一同纳入子进程中管理。
```js
  const fs = require('fs');
  const path = require('path');

  const utils = require('./child.utils');
  const { readFileBlock, uploadRecordStore, unlink } = utils;
  const { ProcessHost } = require('electron-re');

  // read a file block from a path
  const fileBlock = readFileBlock();
  // maintain a shards upload queue
  const uploadStore = uploadRecordStore();

  global.lang = process.env.lang;

  /* *************** registry all tasks *************** */

  ProcessHost
    .registry('init-works', (params) => {
      return initWorks(params);
    })
    .registry('upload-works', (params) => {
      return uploadWorks(params);
    })
    ...

  /* *************** upload logic *************** */

  /* 上传初始化工作 */
  function initWorks({username, host, sharename, pre, prefix, name, abspath, size, fragsize }) {
    const remotePath = path.join(pre, prefix, name);
    return new Promise((resolve, reject) => {
      new Promise((reso) => fsPromise.unlink(remotePath).then(reso).catch(reso))
      .then(() => {
        const dirs = utils.getFileDirs([path.join(prefix, name)]);
        return utils.mkdirs(pre, dirs);
      })
      .then(() => fileBlock.open(abspath, size))
      .then((rsp) => {
        if (rsp.code === 200) {
          const newRecord = {
            ...
          };
          uploadStore.set(newRecord);
          return newRecord;
        } else {
          throw new Error(rsp.result);
        }
     })
     .then(resolve)
     .catch(error => {
      reject(error.toString());
     });
    })
  }

  /* 上传分片 */
  function uplaodWorks(){ ... };

  ...
```

### V. Next To Do
----------------------

- [x] BrowserService支持代码更新后自动重启
- [ ] 添加ChildProcessPool子进程调度逻辑
- [ ] 优化ChildProcessPool多进程console输出
- [ ] 增强ChildProcessPool进程池功能
- [ ] 增强ProcessHost事务中心功能

### VI. 一些实际使用示例
----------------------

1. [electronux](https://github.com/nojsja/electronux) - 我的一个Electron项目，使用了 `BroserService` and `MessageChannel`。

3. [file-slice-upload](https://github.com/nojsja/javascript-learning/tree/master/file-slice-upload) - 一个关于多文件分片并行上传的demo，使用了 `ChildProcessPool` and `ProcessHost`，基于 Electron@9.3.5。

3. 也能查看 `test` 目录下的测试样例文件，包含了完整的细节使用。