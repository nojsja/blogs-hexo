---
title: "基于Electron的smb客户端文件上传优化探索"
catalog: true
toc_nav_num: true
date: 2020-08-16 22:30:00
subtitle: "smb samba client upload"
header-img: "article_header.png"
tags:
- upload
- smb
categories:
- Electron
updateDate: 2020-08-16 22:30:00
top: 2
---


### 前言
---------------

![RhinoDisk](smb_upload_now.jpg)

上一篇文章[《基于Electron的smb客户端开发记录》](https://nojsja.gitee.io/blogs/2020/07/17/%E5%9F%BA%E4%BA%8EElectron%E7%9A%84smb%E5%AE%A2%E6%88%B7%E7%AB%AF%E5%BC%80%E5%8F%91%E8%AE%B0%E5%BD%95/)，大致描述了整个SMB客户端开发的核心功能、实现难点、项目打包这些内容，这篇文章呢单独把其中的`文件分片上传模块`拿出来进行分享，提及一些与Electron主进程、渲染进程和文件上传优化相关的功能点。  

项目精简版[DEMO](https://github.com/NoJsJa/electron-react-template)

### Electron进程架构
-------------------

#### 主进程和渲染进程的区别

![electron](electron1.png)

Electron 运行 package.json 的 main 脚本的进程被称为主进程。在主进程中运行的脚本通过创建web页面来展示用户界面，一个 Electron 应用总是有且只有一个主进程。  
主进程使用 BrowserWindow 实例创建页面，每个 BrowserWindow 实例都在自己的渲染进程里运行页面，当一个 BrowserWindow 实例被销毁后，相应的渲染进程也会被终止。
主进程管理所有的web页面和它们对应的渲染进程，每个渲染进程都是独立的，它只关心它所运行的 web 页面。  

在普通的浏览器中，web页面通常在沙盒环境中运行，并且无法访问操作系统的原生资源。 然而 Electron 的用户在 Node.js 的 API 支持下可以在页面中和操作系统进行一些底层交互。
在页面中调用与 GUI 相关的原生 API 是不被允许的，因为在 web 页面里操作原生的 GUI 资源是非常危险的，而且容易造成资源泄露。 如果你想在 web 页面里使用 GUI 操作，其对应的渲染进程必须与主进程进行通讯，请求主进程进行相关的 GUI 操作。

#### 主进程和渲染进程之间的通信

1. 使用remote远程调用
remote模块为渲染进程和主进程通信提供了一种简单方法，使用remote模块, 你可以调用main进程对象的方法, 而不必显式发送进程间消息。示例如下，代码通过remote远程调用主进程的BrowserWindows创建了一个渲染进程，并加载了一个网页地址：  
```js
/* 渲染进程中(web端代码) */
const { BrowserWindow } = require('electron').remote
let win = new BrowserWindow({ width: 800, height: 600 })
win.loadURL('https://github.com')
```
注意：remote底层是基于ipc的同步进程通信(同步=阻塞页面)，都知道Node.js的最大特性就是异步调用，非阻塞IO，因此remote调用不适用与主进程和渲染进程频繁通信的情况，否则会引起严重的程序性能问题。

2. 使用ipc信号通信  
基于事件触发的ipc双向信号通信，渲染进程中的ipcRenderer可以监听一个事件通道，也能向主进程或其它渲染进程直接发送消息(需要知道其它渲染进程的webContentsId)，同理主进程中的ipcMain也能监听某个事件通道和向任意一个渲染进程发送消息。
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

### 文件上传架构
---------------
文件上传主要逻辑控制部分是前端的JS脚本代码，位于主窗口所在的render渲染进程，负责用户获取系统目录文件、生成上传任务队列、动态展示上传任务列表详情、任务列表的增删查改等；主进程Electron端的Node.js代码主要负责响应render进程的控制命令进行文件上传任务队列数据的增删查改、上传任务在内存和磁盘的同步、文件系统的交互、系统原生组件调用等。

#### 文件上传源和上传目标

* 在用户界面上使用`Input`组件获取到的FileList(HTML5 API，用于web端的简单文件操作)即为上传源；

* 上传目标地址是远端集群某个节点的smb服务，因为Node.js NPM生态对smb的支持有限，目前并未发现一个可以支持通过smb协议进行文件分片上传的npm库，所以考虑使用Node.js的FS API进行文件分段读取然后将分片数据逐步增量写入目标地址来模拟文件分片上传过程，从而实现在界面上单个大文件上传任务的启动、暂停、终止和续传等操作，所以这里的解决方案是使用Windows UNC命令连接后端共享后，可以像访问本地文件系统一样访问远程一个远程smb共享路径，比如文件路径`\\[host]\[sharename]\file1`上的file1在执行了unc连接后就可以通过Node.js FS API进行操作，跟操作本地文件完全一致。整个必须依赖smb协议的上传流程即精简为将本地拿到的文件数据复制到可以在本地访问的另一个smb共享路径这一流程，而这一切都得益于Windows `UNC`命令。

```js
/* 使用unc命令连接远程smb共享 */
_uncCommandConnect_Windows_NT({ host, username, pwd }) {
    const { isThirdUser, nickname, isLocalUser } = global.ipcMainProcess.userModel.info;
    const commandUse = `net use \\\\${host}\\ipc$ "${pwd}" /user:"${username}"`;
    return new Promise((resolve) => {
      this.sudo.exec(commandUse).then((res) => {
        resolve({
          code: 200,
        });
      }).catch((err) => {
        resolve({
          code: 600,
          result: global.lang.upload.unc_connection_failed
        });
      });
    });
  }
```

#### 上传流程概述

下图描述了整个前端部分的控制逻辑：

![upload](shards_upload.jpg)

1. 页面上使用`<Input />`组件拿到FileList对象(Electron环境下拿到的File对象会额外附加一个`path`属性指明文件位于系统的绝对路径)  
2. 缓存拿到的FileList，等待点击上传按钮后开始读取FileList列表并生成自定义的File文件对象数组用于存储上传任务列表信息  
3. 页面调用init请求附带上选中的文件信息初始化文件上传任务  
4. Node.js拿到init请求附带的文件信息后，将所有信息存入临时存放在内存中的文件上传列表中，并尝试打开待上传文件的文件描述符用于即将开始的文件切片分段上传工作，最后返回给页面上传任务ID，Node.js端完成初始化处理  
5. 页面拿到init请求成功的回调后，存储返回的上传任务ID，并将该文件加入文件待上传队列，在合适的时机开始上传，开始上传的时候向Node.js端发送upload请求，同时请求附带上任务ID和当前的分片索引值(表示需要上传第几个文件分片)  
6. Node.js拿到upload请求后根据携带的任务ID读取内存中的上传任务信息，然后使用第二步打开的文件描述符和分片索引对本地磁盘中的目标文件进行分片切割，最后使用FS API将分片递增写入目标位置，即本地可直接访问的SMB共享路径  
7. upload请求成功后页面判断是否已经上传完所有分片，如果完成则向Node.js发送complete请求，同时携带上任务ID  
8. Node.js根据任务ID获取文件信息，关闭文件描述符，更新文件上传任务为上传完成状态  
9. 界面上传任务列表全部完成后，向后端发送sync请求，把当前任务上传列表同步到历史任务(磁盘存储)中，表明当前列表中所有任务已经完成  
10. Node.js拿到sync请求后，把内存中存储的所有文件上传列表信息写入磁盘，同时释放内存占用，完成一次列表任务上传  

#### Node.js实现的文件分片管理工厂

* 文件初始化的时候调用`open`方法临时存储文件描述符和文件绝对路径的映射关系；
* 文件上传的时候调用`read`方法根据文件读取位置、读取容量大小进行分片切割；
* 文件上传完成的时候调用`close`关闭文件描述符；

三个方法均通过文件绝对路径`path`参数建立关联：

```js
/**
  * readFileBlock [读取文件块]
  */
exports.readFileBlock = () => {

  const fdStore = {};
  const smallFileMap = {};

  return {
    /* 打开文件描述符 */
    open: (path, size, minSize=1024*2) => {
      return new Promise((resolve) => {
        try {
          // 小文件不打开文件描述符，直接读取写入
          if (size <= minSize) {
            smallFileMap[path] = true;
            return resolve({
              code: 200,
              result: {
                fd: null
              }
            });
          }
          // 打开文件描述符，建议绝对路径和fd的映射关系
          fs.open(path, 'r', (err, fd) => {
            if (err) {
              console.trace(err);
              resolve({
                code: 601,
                result: err.toString()
              });
            } else {
              fdStore[path] = fd;
              resolve({
                code: 200,
                result: {
                  fd: fdStore[path]
                }
              });
            }
          });
        } catch (err) {
          console.trace(err);
          resolve({
            code: 600,
            result: err.toString()
          });
        }
      })
    },
  
    /* 读取文件块 */
    read: (path, position, length) => {
      return new Promise((resolve, reject) => {
        const callback = (err, data) => {
          if (err) {
            resolve({
              code: 600,
              result: err.toString()
            });
          } else {
            resolve({
              code: 200,
              result: data
            });
          }
        };
        try {
          // 小文件直接读取，大文件使用文件描述符和偏移量读取
          if (smallFileMap[path]) {
            fs.readFile(path, (err, buffer) => {
              callback(err, buffer);
            });
          } else {
            // 空文件处理
            if (length === 0) return callback(null, '');
            fs.read(fdStore[path], Buffer.alloc(length), 0, length, position, function(err, readByte, readResult){
              callback(err, readResult);
            });
          }
        } catch (err) {
          console.trace(err);
          resolve({
            code: 600,
            result: err.toString()
          });
        }
      });
    },

    /* 关闭文件描述符 */
    close: (path) => {
      return new Promise((resolve) => {
        try {
          if (smallFileMap[path]) {
            delete smallFileMap[path];
            resolve({
              code: 200
            });
          } else {
            fs.close(fdStore[path], () => {
              resolve({code: 200});
              delete fdStore[path];
            });
          }
        } catch (err) {
          console.trace(err);
          resolve({
            code: 600,
            result: err.toString()
          });
        }
      });
    },

    fdStore

  }

}

```

### 基于Electron的文件上传卡顿优化踩坑
----------------------

优化是一件头大的事儿，因为你需要先通过很多测试手法找到现有代码的性能瓶颈，然后编写优化解决方案。我觉得找到性能瓶颈这一点就特别难，因为是自己写的代码所以容易陷入一些先入为主的刻板思考模式。不过最最主要的一点还是你如果自己都弄不清楚你使用的技术栈的话，那就无从谈起优化，所以前面有很大篇幅分析了Electron进程方面的知识以及梳理了整个上传流程。

#### 使用Electron自带的Devtools进行性能分析

在文件上传过程中打开性能检测工具`Performance`进行录制，分析整个流程：

![upload_performance.jpg](upload_performance.jpg)

在文件上传过程中打开内存工具`Memory`进行快照截取分析一个时刻的内存占用情况：

![upload_memory.jpg](upload_memory.jpg)

#### 第一次尝试解决问题：替换Antd Table组件

在编写完成文件上传模块后，初步进行了压力测试，结果发现添加1000个文件上传任务到任务队列，且同时上传的文件上传任务数量为6时，上下滑动查看文件上传列表时出现了卡顿的情况，这种卡顿不局限于某个界面组件的卡顿，而且当前窗口的所有操作都卡了起来，初步怀疑是Antd Table组件引起的卡顿，因为Antd Table组件是个很复杂的高阶组件，在处理大量的数据时可能会有性能问题，遂我将Antd Table组件换成了原生的table组件，且Table列表只显示每个上传任务的任务名，其余的诸如上传进度这些都不予显示，从而想避开这个问题。令人吃惊的是测试结果是即使换用了原生Table组件，卡顿情况仍然毫无改善！

#### 第二次尝试解决问题：改造Electron主进程同步阻塞代码

先看下chromium的架构图，每个渲染进程都有一个全局对象RenderProcess，用来管理与父浏览器进程的通信，同时维护着一份全局状态。浏览器进程为每个渲染进程维护一个RenderProcessHost对象，用来管理浏览器状态和与渲染进程的通信。浏览器进程和渲染进程使用Chromium的IPC系统进行通信。在chromium中，页面渲染时，UI进程需要和main process不断的进行IPC同步，若此时main process忙，则UIprocess就会在IPC时阻塞。

![upload_memory.jpg](chromium.jpg)

综上所述：如果主进程持续进行消耗CPU时间的任务或阻塞同步IO的任务的话，主进程就会在一定程度上阻塞，从而影响主进程和各个渲染进程之间的IPC通信，IPC通信有延迟或是受阻，自然渲染界面的UI绘制和更新就会呈现卡顿的状态。

我分析了一下Node.js端的文件任务管理的代码逻辑，把一些操作诸如获取文件大小、获取文件类型和删除文件这类的同步阻塞IO调用都换成了Node.js提倡的异步调用模式，即FS callback或Fs Promise链式调用。改动后发现卡顿情况改善不明显，遂进行了第三次尝试。

#### 第三次尝试解决问题：编写Node.js进程池分离上传任务管理逻辑

这次是大改(苦笑脸~)，抱着学习的态度实现了Electron多进程池，主要逻辑是使用Node.js的`child_process`模块(具体使用请看[文档](http://nodejs.cn/api/child_process.html))创建指定数量的多个子进程，外部通过进程池获取一个可用的进程，在进程中执行需要的代码逻辑，而在进程池内部其实就是按照顺序依次将已经创建的多个子进程中的某一个返回给外部调用即可，从而避免了其中某个进程被过度使用，所有进程负载均匀分配。

```js
const electron = require('electron');
const { app, BrowserWindow, Menu, Tray, dialog } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const url = require('url');
const os = require('os');
const { EventEmitter } = require('events');
const { getRandomString } = require(path.join(app.getAppPath(), 'app/utils/utils'));

/**
  * ChildProcessPool [进程池]
  * @author nojsja
  * @param  {[String]} path [用于创建进程的可执行文件]
  * @param  {[Number]} max [可创建的进程数量最大值]
  * @param  {[String]} cwd [进程执行的起始目录]
  * @param  {[Object]} env [环境变量配置]
  */
class ChildProcessPool {
  constructor({ path, max=6, cwd, env })
  {
    this.cwd = cwd || undefined;
    this.env = env || undefined;
    this.inspectStartIndex = 5858;
    this.callbacks = {};
    this.pidMap = new Map();
    this.collaborationMap = new Map();
    this.event = new EventEmitter();
    this.forked = [];
    this.forkedPath = path;
    this.forkIndex = 0;
    this.forkMaxIndex = max;
    // 子进程回调事件
    this.event.on('fork-callback', (data) => {
      if (this.collaborationMap.get(data.id) !== undefined) {
        this.dataRespondAll(data)
      } else {
        this.dataRespond(data);
      }
    })
  }
  
  /* 子进程数据回调 */
  dataRespond = (data) => {
    if (data.id && this.callbacks[data.id]) {
      this.callbacks[data.id](data.result);
      delete this.callbacks[data.id];
    };
  }

  /* 所有子进程协同数据回调 */
  dataRespondAll = (data) => {
    let resultAll = this.collaborationMap.get(data.id);
    if (!data.id) return;
    if (resultAll !== undefined) {
      this.collaborationMap.set(data.id, [...resultAll, data.result]);
    } else {
      this.collaborationMap.set(data.id, [data.result]);
    }
    resultAll = this.collaborationMap.get(data.id);
    if (resultAll.length === this.forked.length) {
      this.callbacks[data.id](resultAll);
      delete this.callbacks[data.id];
      this.collaborationMap.delete(data.id);
    }
  }

  /* 从子进程池中获取一个进程 */
  getForkedFromPool(id="default") {
    let forked;
    if (!this.pidMap.get(id)) {
      if (this.forked.length < this.forkMaxIndex) {
        this.inspectStartIndex ++;
        forked = fork(
          this.forkedPath,
          // 开发环境下启动inspect进程远程调试端口
          this.env.NODE_ENV === "development" ? [`--inspect=${this.inspectStartIndex}`] : [],
          {
            cwd: this.cwd,
            env: this.env,
          }
        );
        this.forked.push(forked);
        this.forkIndex += 1;
        forked.on('message', (data) => {
          this.event.emit('fork-callback', data);
        });
        this.pidMap.set(id, forked.pid);
      } else {
        this.forkIndex = this.forkIndex % this.forkMaxIndex;
        forked = this.forked[this.forkIndex];
        this.pidMap.set(id, forked.pid);
        this.forkIndex += 1;
      }
    } else {
      forked = this.forked.filter(f => f.pid === this.pidMap.get(id))[0];
      if (!forked) throw new Error(`Get forked process from pool failed! the process pid: ${this.pidMap.get(id)}.`);
    }

    return forked;
  }

  /* 向子进程发送请求 */
  send(params, givenId) {
    const id = givenId || getRandomString();
    const forked = this.getForkedFromPool(id);
    return new Promise(resolve => {
      this.callbacks[id] = resolve;
      forked.send({...params, id});
    });
  }

  /* 向所有进程发送请求 */
  sendToAll(params) {
    const id = getRandomString(); 
    return new Promise(resolve => {
      this.callbacks[id] = resolve;
      this.collaborationMap.set(id, []);
      if (this.forked.length) {
        this.forked.forEach((forked) => {
          forked.send({...params, id});
        })
      } else {
        this.getForkedFromPool().send({...params, id});
      }
    });
  }
}

module.exports = ChildProcessPool;

```

1. 其中`send`和`sendToAll`方法，前者是向某个进程发送请求信号，如果请求参数指定了id则表明需要明确使用之前与此id建立过映射的某个进程，并期望拿到此进程的回应结果；后者是向所有进程池中的进程发送信号，并期望拿到所有进程返回的结果。

2. 其中`dataRespond`和`dataRespondAll`方法对应上面的两个信号发送方法的进程返回数据回调函数，前者拿到进程池中指定的某个进程的回调结果，后者拿到进程池中所有进程的回调结果。

3. `getForkedFromPool`方法是从进程池中拿到一个进程，如果进程池还没有一个子进程或是已经创建的子进程数量小于设置的可创建子进程数最大值，那么会优先新创建一个子进程放入进程池，然后返回这个子进程以供调用。

4. `getForkedFromPool`方法中值得注意的是这行代码：```this.env.NODE_ENV === "development" ? [`--inspect=${this.inspectStartIndex}`] : []```，使用Node.js运行js脚本时加上`- -inspect=端口号` 参数可以开启所运行进程的远程调试端口，多进程程序状态追踪往往比较困难，所以采取这种方式后可以使用浏览器Devtools单独调试每个进程，具体可以在浏览器输入地址：`chrome://inspect/#devices`然后打开调试配置项，配置我们这边指定的调试端口号，最后点击蓝字`Open dedicated DevTools for Node`就能打开一个调试窗口，可以对代码进程断点调试、单步调试、步进步出、运行变量查看等操作，十分便利！
![upload_memory.jpg](inspect.jpg)

5. 另外创建进程池时传入的`path`参数即为以下脚本代码的绝对路径，这段文件上传逻辑被单独分离到子进程中处理，其中CPU耗时的操作为`uploadStore`函数块处理的部分，主要是维护整个文件上传列表，对上传任务列表进行增删查改操作；另外的频繁利用io读写文件的逻辑被封装到`fileBlock`函数块，不过都是异步IO读写，应该对性能影响不大，具体可以查看一下源码进行详细了解：
[源码](https://github.com/NoJsJa/electron-react-template/blob/master/server/app/services/child/upload.js)
```js
  const fs = require('fs');
  const fsPromise = fs.promises;
  const path = require('path');
  const utils = require('./child.utils');
  const requireLang = require('../../lang');
  const { readFileBlock, uploadRecordStore, unlink } = utils;
  const fileBlock = readFileBlock();
  const uploadStore = uploadRecordStore();
  requireLang(process.env.LANG);

  process.on('message', ({action, params, id }) => {
    switch (action) {
      case 'init-works':
        initWorks(params).then((rsp) => {
          process.send({result: rsp, id});
        });
        break;
      case 'upload-works':
        uploadWorks(params, id).then(rsp => {
          process.send({result: rsp, id});
        });
        break;
      case 'close':
        close(params, id).then(rsp => {
          process.send({result: rsp, id});
        });
        break;
      case 'record-set':
        uploadStore.set(params);
        process.send({result: null, id});
        break;
      case 'record-get':
        process.send({result: uploadStore.get(params), id});
        break;
      case 'record-get-all':
        process.send({result: uploadStore.getAll(params), id});
        break;
      case 'record-update':
        uploadStore.update(params);
        process.send({result: null, id});
        break;
      case 'record-remove':
        uploadStore.remove(params);
        process.send({result: null, id});
        break;
      case 'record-reset': 
        uploadStore.reset(params);
        process.send({result: null, id});
      break;
      case 'unlink': 
        unlink(params).then(rsp => {
          process.send({result: rsp, id});
        })
      break;
      default:
        break;
    }
  });

  // 已省略
  ...

```

#### 第四次尝试解决问题：重新审视渲染进程前端代码

* 很遗憾，第三次优化对卡顿的改善依然不明显，我开始怀疑是否是前端代码直接影响的渲染进程卡顿，毕竟前端并非采用懒加载模式进行文件载入上传的(这一怀疑之前被我否定，因为前端代码完全沿用了之前浏览器端对象存储文件分片上传开发时的逻辑，而在对象存储文件上传中并未察觉到界面卡顿，属实奇怪)。我摒弃了先入为主的思想，其实Electron跟浏览器环境还是有些不同，不能排除前端代码就没有问题。  
* 在详细查看了可能耗费CPU计算的代码逻辑后，发现有一段关于刷新上传任务的函数`refreshTasks`，主要逻辑是遍历所有未经上传文件原始对象数组，然后选取固定某个数量的文件(数量取决于设置的同时上传任务个数)放入待上传文件列表中，我发现如果`待上传文件列表的文件数量 = 设置的同时上传任务个数` 的情况下就不用继续遍历剩下的文件原始对象数组了。就是少写了这个判断条件导致`refreshTasks`这个频繁操作的函数在每次执行时可能多执行数千遍for循环内层判断逻辑(具体执行次数呈O(n)次增长，n为当前任务列表任务数量)。
* 加上一行检测逻辑代码后，之前1000个上传任务增长到10000个左右都不会太卡了，虽然还有略微卡顿，但没有到不能使用的程度，后续还有优化空间！

![refreshTasks](refreshTasks.jpg)

### 总结
--------

第一次把Electron技术应用到实际项目中，踩了挺多坑：render进程和主进程通信的问题、跨平台兼容的问题、多平台打包的问题、窗口管理的问题... 总之获得了很多经验，也整理出了一些通用解决方法。  
Electron现在应用的项目还是挺多的，是前端同学跨足桌面软件开发领域的又一里程碑，不过需要转换一下思维模式，单纯写前端代码多是处理一些简单的界面逻辑和少量的数据，涉及到文件、系统操作、进程线程、原生交互方面的知识比较少，可以多了解一下计算机操作系统方面的知识、掌握代码设计模式和一些基本的算法优化方面的知识能让你更加胜任Electron桌面软件开发任务！
