---
title: Node.js 实现轻量化进程池和线程池
subtitle: Node.js 实现轻量化进程池和线程池
catalog: true
comments: true
indexing: true
header-img: >-
  https://nojsja.gitee.io/static-resources/images/hexo/article_header/article_header.jpg
top: false
tocnum: true
tags:
  -  child_process
  -  worker_threads
categories:
  - Node.js
  - Electron
date: 2022-09-20 10:44:18
---

## I. 前言
---

[>> Show Me Code](https://github.com/nojsja/electron-re/tree/development/src/libs/WorkerThreadPool)

Node.js 即服务端Javascript，得益于宿主环境的不同，它拥有比在浏览器上更多的能力。比如：完整的文件系统访问权限、网络协议、套接字编程、进程和线程操作、C++插件源码级的支持、Buffer二进制、Crypto加密套件的天然支持。

Node.js 的是一门单线程的语言，它基于V8引擎开发，v8 在设计之初是在浏览器端对JavaScript 语言的解析运行引擎，其最大的特点是单线程，这样的设计避免了一些多线程状态同步问题，使得其更轻量化易上手。

### 一、Node.js 异步机制

Node.js 的单线程是指程序的主要执行线程是单线程，而其实语言内部也会创建线程池来处理主线程程序的 `网络IO/文件IO/定时器` 等调用产生的异步任务。一个例子就是定时器Timer的实现：在Node.js中使用定时器时，Node.js 会开启一个定时器线程进行计时，计时结束时，定时器回调函数会被放入位于主线程的宏任务队列。当事件循环系统执行完主线程同步代码和当前阶段的所有微任务时，该回调任务最后再被取出执行。所以 Node.js 的定时器其实是不准确的，只能保证在预计时间时我们的回调任务被放入队列等待执行，而不是直接被执行。

多线程机制配合 Node.js 的 evet loop 事件循环系统让开发者在一个线程内就能够使用异步机制。配合异步任务队列的宏任务和微任务的设计，能够进一步划分任务之间执行的优先级，减少任务的无效抢占。

![event loop](http://nojsja.gitee.io/static-resources/images/interview/node_eventloop.png)

Node.js 宏任务之间的优先级划分：Timers > Pending > Poll > Check > Close。

- Timers Callback： 涉及到时间，肯定越早执行越准确，所以这个优先级最高很容易理解。
- Pending Callback：处理网络、IO 等异常时的回调，有的 unix 系统会等待发生错误的上报，所以得处理下。
- Poll Callback：处理 IO 的 data，网络的 connection，服务器主要处理的就是这个。
- Check Callback：执行 setImmediate 的回调，特点是刚执行完 IO 之后就能回调这个。
- Close Callback：关闭资源的回调，晚点执行影响也不到，优先级最低。

Node.js 微任务之间的优化及划分：process.nextTick > Promise。

### 二、Node.js 的多进程

#### 1. 使用 child_process 方式手动创建进程

Node.js 程序通过 child_process 模块提供了衍生子进程的能力，child_process 提供多种子进程的创建方式：

- __spawn__ 创建新进程，执行结果以流的形式返回，只能通过事件来获取结果数据，操作麻烦。

```js
const spawn = require('child_process').spawn;
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
```

- __execFile__ 创建新进程，按照其后面的File名字，执行一个可执行文件，可以带选项，以回调形式返回调用结果，可以得到完整数据，方便了很多。

```js
execFile('/path/to/node', ['--version'], function(error, stdout, stderr){
    if(error){
        throw error;
    }
    console.log(stdout);
});
```

- __exec__ 创建新进程，可以直接执行shell命令，简化了shell命令执行方式，执行结果以回调方式返回。

```js
exec('ls -al', function(error, stdout, stderr){
    if(error) {
        console.error('error: ' + error);
        return;
    }
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + typeof stderr);
});
```

- __fork__ 创建新进程，执行node程序，进程拥有完整的 V8 实例，创建后自动开启主进程到子进程的IPC通信，资源占用最多。

```js
var child = child_process.fork('./anotherSilentChild.js', {
    silent: true
});

child.stdout.setEncoding('utf8');
child.stdout.on('data', function(data){
    console.log(data);
});
```

其中，spawn 是所有方法的基础，exec 底层是调用了 execFile。

#### 2. 使用 cluster 方式半自动创建进程

#### 3. 使用基于 cluster 封装的 PM2 工具全自动创建进程

## II. 进程池和线程池的对比
---

### 一、适用场景

### 二、各自优缺点

## III. 进程池
---

### 一、要点

「 对单一任务的控制不重要，对单个进程宏观的资源占用更需关注 」

### 二、流程设计

### 三、示例

## IV. 线程池
---

Node.js 内部虽然有使用线程池，但是对于开发者而言是完全透明不可见的。worker_threads 做为开发者使用线程的重要特性，其首次在 Node.js `v10.5.0` 作为实验性功能出现，需要命令行带上 `--experimental-worker` 才能使用，然后在 `v12.11.0` 稳定版已经能正常在生产环境使用了。

但是线程的创建需要额外的CPU和内存资源，如果要多次使用一个线程的话，应该将其保存起来，当该线程完全不使用时需要及时关闭以减少内存占用。想象我们在需要使用线程时直接创建，使用完后立刻销毁，可能线程自身的创建和销毁成本已经超过了使用线程本身节省下的资源成本。因此封装一个能够维护线程生命周期的线程池工具的重要性就体现了。

为了强化多异步任务的调度，线程池除了提供维护线程的能力，也提供维护任务队列的能力。当我们发送请求给线程池让其执行一个异步任务时，如果线程池内没有空闲线程，那该任务就会被直接丢弃了，显然这不是想要的效果。可以考虑为线程池添加一个任务队列的维护逻辑，当线程池没有可用空闲线程时，将该任务放入待执行任务队列(FIFO)，线程池在某个时机取出任务交由某个空闲线程执行，执行完成后触发异步回调函数，将执行结果返回给请求调用方。

整个线程池工作流程和 Node.js 自身的事件循环系统类似。

### 一、要点

「 对单一任务的控制重要，对单个线程的资源占用无需关注 」

### 二、流程设计

### 三、示例

## V. 结尾
---

结尾

## VI. 参考链接

1. [Node.js Doc - worker_threads](https://nodejs.org/docs/latest-v14.x/api/worker_threads.html#worker-threads)
2. [Node.js Doc - child_process](https://nodejs.org/docs/latest-v14.x/api/child_process.html)
3. [Node.js multithreading: Worker threads and why they matter](https://blog.logrocket.com/node-js-multithreading-worker-threads-why-they-matter/****)
4. [Node.js 之深入理解特性](https://segmentfault.com/a/1190000008961775)
5. [Java线程池实现原理及其在美团业务中的实践](https://tech.meituan.com/2020/04/02/java-pooling-pratice-in-meituan.html)
6. [美团动态线程池实践](https://juejin.cn/post/7063408526894301192)