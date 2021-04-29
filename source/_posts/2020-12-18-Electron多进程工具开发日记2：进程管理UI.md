---
title: Electron多进程工具开发日记2：进程管理UI
catalog: true
toc_nav_num: true
subtitle: electron/node multi-process tool development
header-img: >-
  https://nojsja.gitee.io/static-resources/images/hexo/article_header/article_header.jpg
tags:
  - electron
  - node
  - process
categories:
  - Electron
  - Node
top: 2
abbrlink: 927d467e
date: 2020-12-18 17:36:40
updateDate: 2020-12-18 17:36:40
---

> 文中实现的部分工具方法正处于早期/测试阶段，仍在持续优化中，仅供参考...

> 在Ubuntu20.04上进行开发/测试，可直接用于Electron项目，测试版本：Electron@8.2.0 / 9.3.5

### Contents
------------
```sh
├── Contents (you are here!)
│
├── I. 前言
├── II. 架构图
│
├── III.electron-re 可以用来做什么？
│   ├── 1) 用于Electron应用
│   └── 2) 用于Electron/Nodejs应用
│
├── IV.UI功能介绍
│   ├── 主界面
│   ├── 功能1：Kill进程
│   ├── 功能2：一键开启DevTools
│   ├── 功能3：查看进程日志
│   └── 功能4：查看进程CPU/Memory占用趋势
│
├── V. 使用&原理
│   ├── 引入
│   ├── 怎样捕获进程资源占用？
│   ├── 怎样在主进程和UI之间共享数据？
│   └── 怎样在UI窗口中绘制折线图？
│
├── VI. 存在的已知问题
│
├── VII. Next To Do
│
├── VIII. 几个实际使用示例
│   ├── 1) Service/MessageChannel示例
│   ├── 2) ChildProcessPool/ProcessHost示例
│   └── 3) test测试目录示例
```


### I. 前言
---------------

最近在做一个多文件分片并行上传模块的时候(基于Electron和React)，遇到了一些性能问题，主要体现在：前端同时添加大量文件(1000-10000)并行上传时(文件同时上传数默认为6)，在不做懒加载优化的情况下，引起了整个应用窗口的卡顿。所以针对Electron/Nodejs多进程这方面做了一些学习，尝试使用多进程架构对上传流程进行优化。

同时也编写了一个方便进行Electron/Node多进程管理和调用的工具[electron-re](https://github.com/nojsja/electron-re)，已经发布为npm组件，可以直接安装：

[>> github地址](https://github.com/nojsja/electron-re)

```sh
$: npm install electron-re --save
# or
$: yarn add electron-re
```

前文[《Electron/Node多进程工具开发日记》](/blogs/2020/12/08/6d582478.html/)描述了`electron-re`的开发背景、针对的问题场景以及详细的使用方法，这篇文章不会对它的基础使用做过多说明，主要介绍新特性`多进程管理UI`的开发和使用相关。UI界面基于`electron-re`已有的`BrowserService/MessageChannel`和`ChildProcessPool/ProcessHost`基础架构驱动，使用React17 / Babel7开发，主界面：

![process-manager.main.png](http://nojsja.gitee.io/static-resources/images/electron-re/process-manager.main.png)

### II. electron-re架构图
--------------

![archtecture](http://nojsja.gitee.io/static-resources/images/electron-re/electron-re.png)

### III. electron-re 可以用来做什么？
--------------

#### 1. 用于Electron应用

- `BrowserService`
- `MessageChannel`

在Electron的一些“最佳实践”中，建议将占用cpu的代码放到渲染过程中而不是直接放在主过程中，这里先看下chromium的架构图：

![archtecture](http://nojsja.gitee.io/static-resources/images/electron-re/chromium.jpg)

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

此外，如果要创建一些不依赖于Electron运行时的子进程（相关参考nodejs `child_process`），可以使用`electron-re`提供的专门为nodejs运行时编写的进程池`ChildProcessPool`类。因为创建进程本身所需的开销很大，使用进程池来重复利用已经创建了的子进程，将多进程架构带来的性能效益最大化，简单示例如下：
```js
const { ChildProcessPool } = require('electron-re');
global.ipcUploadProcess = new ChildProcessPool({
  path: path.join(app.getAppPath(), 'app/services/child/upload.js'), max: 6
});
```

一般情况下，在我们的子进程执行文件中(创建子进程时path参数指定的脚本)，如要想在主进程和子进程之间同步数据，可以使用`process.send('channel', params)`和`process.on('channel', function)`来实现(前提是进程以以`fork`方式创建或者手动开启了`ipc`通信)。但是这样在处理业务逻辑的同时也强迫我们去关注进程之间的通信，你需要知道子进程什么时候能处理完毕，然后再使用`process.send`再将数据返回主进程，使用方式繁琐。

`electron-re`引入了`ProcessHost`的概念，我称之为"进程事务中心"。实际使用时在子进程执行文件中只需要将各个任务函数通过`ProcessHost.registry('task-name', function)`注册成多个被监听的事务，然后配合进程池的`ChildProcessPool.send('task-name', params)`来触发子进程事务逻辑的调用即可，`ChildProcessPool.send()`同时会返回一个Promise实例以便获取回调数据，简单示例如下：
```js
/* --- 主进程中 --- */
...
global.ipcUploadProcess
  .send('task1', params)
  .then(rsp => console.log(rsp));

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

### IV. UI功能介绍
--------
> II 描述了electron-re的主要功能，基于这些功能来实现多进程监控UI面板

#### 主界面
>UI参考`electron-process-manager`设计

预览图：

![process-manager.main.png](http://nojsja.gitee.io/static-resources/images/electron-re/process-manager.main.png)

主要功能如下：

1. 展示Electron应用中所有开启的进程，包括主进程、普通的渲染进程、Service进程(由electron-re引入)、ChildProcessPool创建的子进程(由electron-re引入)。

2. 进程列表中显示各个进程进程号、进程标识、父进程号、内存占用大小、CPU占用百分比等，所有进程标识分为：main(主进程)、service(服务进程)、renderer(渲染进程)、node(进程池子进程)，点击表格头可以针对对某项进行递增/递减排序。

3. 选中某个进程后可以Kill此进程、查看进程控制台Console数据、查看1分钟内进程CPU/内存占用趋势，如果此进程是渲染进程的话还可以通过`DevTools`按钮一键打开内置调试工具。

4. ChildProcessPool创建的子进程暂不支持直接打开DevTools进行调试，不过由于创建子进程时添加了`--inspect`参数，可以使用chrome的`chrome://inspect`进行远程调试。


#### 功能1：Kill进程

![kill.gif](http://nojsja.gitee.io/static-resources/images/electron-re/kill.gif)

#### 功能2：一键开启DevTools

![devtools.gif](http://nojsja.gitee.io/static-resources/images/electron-re/devtools.gif)

#### 功能3：查看进程日志

![console.gif](http://nojsja.gitee.io/static-resources/images/electron-re/console.gif)

#### 功能3：查看进程CPU/Memory占用趋势

![trends.gif](http://nojsja.gitee.io/static-resources/images/electron-re/trends.gif)

![trends2.gif](http://nojsja.gitee.io/static-resources/images/electron-re/trends2.gif)

### V. 使用&原理
-----------

#### 引入

1. 在Electron主进程入口文件中引入：
```js
const {
  MessageChannel, // must required in main.js even if you don't use it
  ProcessManager
} = require('electron-re');
```

2. 开启进程管理窗口UI
```js
ProcessManager.openWindow();
```

#### 怎样捕获进程资源占用？

1.使用ProcessManager监听多个进程号

- 1）在Electron窗口创建事件中将窗口进程id放入ProcessManager监听列表
```js
/* --- src/index.js --- */
...
app.on('web-contents-created', (event, webContents) => {
  webContents.once('did-finish-load', () => {
    const pid = webContents.getOSProcessId();
    if (
      exports.ProcessManager.processWindow &&
      exports.ProcessManager.processWindow.webContents.getOSProcessId() === pid
    ) { return; }

    exports.ProcessManager.listen(pid, 'renderer');

    webContents.once('closed', function(e) {
      exports.ProcessManager.unlisten(this.pid);
    }.bind({ pid }));
      ...
  })
});
```
- 2）在进程池fork子进程时将进程id放入监听列表
```js
/* --- src/libs/ChildProcessPool.class.js --- */
...
const { fork } = require('child_process');

class ChildProcessPool {
  constructor({ path, max=6, cwd, env }) {
    ...
    this.event = new EventEmitter();
    this.event.on('fork', (pids) => {
      ProcessManager.listen(pids, 'node');
    });
    this.event.on('unfork', (pids) => {
      ProcessManager.unlisten(pids);
    });
  }

  /* Get a process instance from the pool */
  getForkedFromPool(id="default") {
    let forked;
    ...
    forked = fork(this.forkedPath, ...);
    this.event.emit('fork', this.forked.map(fork => fork.pid));
    ...
    return forked;
  }
  ...
}

```
- 3）在Service进程注册时监听进程id
`BrowserService`进程创建时会向主进程`MessageChannel`发送`registry`请求来全局注册一个Service服务，此时将进程id放入监听列表即可：
```js
/* --- src/index.js --- */
...
exports.MessageChannel.event.on('registry', ({pid}) => {
  exports.ProcessManager.listen(pid, 'service');
});
...
exports.MessageChannel.event.on('unregistry', ({pid}) => {
  exports.ProcessManager.unlisten(pid)
});
```

2.使用兼容多平台的`pidusage`库每秒采集一次进程的负载数据：

```js
/* --- src/libs/ProcessManager.class.js --- */
...
const pidusage = require('pidusage');

class ProcessManager {
  constructor() {
    this.pidList = [process.pid];
    this.typeMap = {
      [process.pid]: 'main',
    };
    ...
  }

  /* -------------- internal -------------- */

  /* 设置外部库采集并发送到UI进程 */
  refreshList = () => {
    return new Promise((resolve, reject) => {
      if (this.pidList.length) {
        pidusage(this.pidList, (err, records) => {
          if (err) {
            console.log(`ProcessManager: refreshList -> ${err}`);
          } else {
            this.processWindow.webContents.send('process:update-list', { records, types: this.typeMap });
          }
          resolve();
        });
      } else {
        resolve([]);
      }
    });
  }

  /* 设置定时器进行采集 */
  setTimer() {
    if (this.status === 'started') return console.warn('ProcessManager: the timer is already started!');

    const interval = async () => {
      setTimeout(async () => {
        await this.refreshList()
        interval(this.time)
      }, this.time)
    }

    this.status = 'started';
    interval()
  }
  ...
```

3.监听进程输出来采集进程日志
> 进程池创建的子进程可以通过监听`stdout`标准输出流来进行日志采集；Electron渲染窗口进程则可以通过监听`ipc`通信事件`console-message`来进行采集；
```js
/* --- src/libs/ProcessManager.class.js --- */

class ProcessManager {
  constructor() {
    ...
  }

  /* pipe to process.stdout */
  pipe(pinstance) {
    if (pinstance.stdout) {
      pinstance.stdout.on(
        'data',
        (trunk) => {
          this.stdout(pinstance.pid, trunk);
        }
      );
    }
  }
  ...
}

/* --- src/index.js --- */

app.on('web-contents-created', (event, webContents) => {
    webContents.once('did-finish-load', () => {
      const pid = webContents.getOSProcessId();
      ...
      webContents.on('console-message', (e, level, msg, line, sourceid) => {
        exports.ProcessManager.stdout(pid, msg);
      });
      ...
    })
  });
```

#### 怎样在主进程和UI之间共享数据？
>基于Electron原生`ipc`异步通信

1.使用ProcessManager向UI渲染窗口发送日志数据

>每秒采集到的所有进程的console数据会被临时缓存到数组中，默认1秒钟向UI进程发送一次数据，然后清空临时数组。

在这里需要注意的是ChildProcessPool中的子进程是通过Node.js的`child_process.fork()`方法创建的，此方法会衍生shell，且创建子进程时参数`stdio`会被指定为'pipe'，指明在子进程和父进程之间创建一个管道，从而让父进程中可以直接监听子进程对象上的 `stdout.on('data')`事件来拿到子进程的标准输出流。
```js
/* --- src/libs/ProcessManager.class.js --- */

class ProcessManager {
  constructor() {
    ...
  }

  /* pipe to process.stdout */
  pipe(pinstance) {
    if (pinstance.stdout) {
      pinstance.stdout.on(
        'data',
        (trunk) => {
          this.stdout(pinstance.pid, trunk);
        }
      );
    }
  }

  /* send stdout to ui-processor */
  stdout(pid, data) {
    if (this.processWindow) {
      if (!this.callSymbol) {
        this.callSymbol = true;
        setTimeout(() => {
          this.processWindow.webContents.send('process:stdout', this.logs);
          this.logs = [];
          this.callSymbol = false;
        }, this.time);
      } else {
        this.logs.push({ pid: pid, data: String.prototype.trim.call(data) });
      }
    }
  }
  ...

}
```

2.使用ProcessManager向UI渲染窗口发送进程负载信息

```js
/* --- src/libs/ProcessManager.class.js --- */

class ProcessManager {
  constructor() {
    ...
  }

  /* 设置外部库采集并发送到UI进程 */
  refreshList = () => {
    return new Promise((resolve, reject) => {
      if (this.pidList.length) {
        pidusage(this.pidList, (err, records) => {
          if (err) {
            console.log(`ProcessManager: refreshList -> ${err}`);
          } else {
            this.processWindow.webContents.send('process:update-list', { records, types: this.typeMap });
          }
          resolve();
        });
      } else {
        resolve([]);
      }
    });
  }
  ...

}
```

3.UI窗口拿到数据后处理并临时存储

```js
  import { ipcRenderer, remote } from 'electron';
  ...

    ipcRenderer.on('process:update-list', (event, { records, types }) => {
      console.log('update:list');
      const { history } = this.state;
      for (let pid in records) {
        history[pid] = history[pid] || { memory: [], cpu: [] };
        if (!records[pid]) continue;
        history[pid].memory.push(records[pid].memory);
        history[pid].cpu.push(records[pid].cpu);
        // 存储最近的60条进程负载数据
        history[pid].memory = history[pid].memory.slice(-60); 
        history[pid].cpu = history[pid].cpu.slice(-60);
      }
      this.setState({
        processes: records,
        history,
        types
      });
    });

    ipcRenderer.on('process:stdout', (event, dataArray) => {
      console.log('process:stdout');
      const { logs } = this.state;
      dataArray.forEach(({ pid, data })=> {
        logs[pid] = logs[pid] || [];
        logs[pid].unshift(`[${new Date().toLocaleTimeString()}]: ${data}`);
      });
      // 存储最近的1000个日志输出
      Object.keys(logs).forEach(pid => {
        logs[pid].slice(0, 1000);
      });
      this.setState({ logs });
    });
```

#### 怎样在UI窗口中绘制折线图

1.注意使用React.PureComponent，会自动在属性更新进行浅比较，以减少不必要的渲染

```js
/* *************** ProcessTrends *************** */
export class ProcessTrends extends React.PureComponent {
  componentDidMount() {
    ...
  }

  ...

  render() {
    const { visible, memory, cpu } = this.props;
    if (visible) {
      this.uiDrawer.draw();
      this.dataDrawer.draw(cpu, memory);
    };

    return (
      <div className={`process-trends-container ${!visible ? 'hidden' : 'progressive-show' }`}>
        <header>
          <span className="text-button small" onClick={this.handleCloseTrends}>X</span>
        </header>
        <div className="trends-drawer">
          <canvas
            width={document.body.clientWidth * window.devicePixelRatio}
            height={document.body.clientHeight * window.devicePixelRatio}
            id="trendsUI"
          />
          <canvas
            width={document.body.clientWidth * window.devicePixelRatio}
            height={document.body.clientHeight * window.devicePixelRatio}
            id="trendsData"
          />
        </div>
      </div>
    )
  }
}
```

2.使用两个Canvas画布分别绘制坐标轴和折线线段

>设置两个画布相互重叠以尽可能保证静态的坐标轴不会被重复绘制，我们需要在组件挂载后初始化一个坐标轴绘制对象`uiDrawer`和一个数据折线绘制对象`dataDrawer`
```js
...
  componentDidMount() {
    this.uiDrawer = new UI_Drawer('#trendsUI', {
      xPoints: 60,
      yPoints: 100
    });
    this.dataDrawer = new Data_Drawer('#trendsData');
    window.addEventListener('resize', this.resizeDebouncer);
  }
...
```

以下是Canvas相关的基础绘制命令：
```js
this.canvas = document.querySelector(selector);
this.ctx =  this.canvas.getContext('2d');
this.ctx.strokeStyle = lineColor; // 设置线段颜色
this.ctx.beginPath(); // 创建一个新的路径
this.ctx.moveTo(x, y); // 移动到初始坐标点(不进行绘制)
this.ctx.lineTo(Math.floor(x), Math.floor(y)); // 描述从上一个坐标点到(x, y)的一条直线
this.ctx.stroke(); // 开始绘制
```

绘制类的源代码可以查看这里[Drawer](https://github.com/nojsja/electron-re/blob/master/src/ui/app/views/processManager/ProcessDrawer.js)，大概原理是：设置Canvas画布宽度width和高度height铺满窗口，设定横纵坐标轴到边缘的padding值为30，Canvas坐标原点[0,0]为绘制区域左上角顶点。这里以绘制折线图纵轴坐标为例，纵轴表示CPU占用0%-100%或内存占用0-1GB，我们可以将纵轴划分为100个基础单位，但是纵轴坐标点不用为100个，可以设置为10个方便查看，所以每个坐标点就可以表示为`[0, (height-padding) - ((height-(2*padding)) / index) * 100 ]`，index依次等于0,10,20,30...90，其中`(height-padding)`为最下面那个坐标点位置，`(height-(2*padding))`为整个纵轴的长度。

### VI. 存在的已知问题
------------

1. 生产环境下ChildProcessPool未按预期工作
Electron生产环境下，如果app被安装到系统目录，那么ChildProcessPool不能按照预期工作，解决办法有：将app安装到用户目录或者把进程池用于创建子进程的脚本(通过`path`参数指定)单独放到Electron用户数据目录下(Ubuntu20.04上是`~/.config/[appname]`)。

2. UI界面未监听主进程Console数据
主进程暂未支持此功能，正在寻找解决方案。

### VII. Next To Do
----------------------

- [x] 让Service支持代码更新后自动重启
- [ ] 添加ChildProcessPool子进程调度逻辑
- [x] 优化ChildProcessPool多进程console输出
- [x] 添加可视化进程管理界面
- [ ] 增强ChildProcessPool进程池功能
- [ ] 增强ProcessHost事务中心功能

### VIII. 几个实际使用示例
----------------------

1. [electronux](https://github.com/nojsja/electronux) - 我的一个Electron项目，使用了 `BrowserService/MessageChannel`，并且附带了`ChildProcessPool/ProcessHost`使用demo。

3. [file-slice-upload](https://github.com/nojsja/javascript-learning/tree/master/file-slice-upload) - 一个关于多文件分片并行上传的demo，使用了 `ChildProcessPool` and `ProcessHost`，基于 Electron@9.3.5开发。

3. 也查看 `test` 目录下的测试样例文件，包含了完整的细节使用。
