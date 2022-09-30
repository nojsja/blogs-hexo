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

## Contents

- [Contents](#contents)
- [## I. 前言](#i-%E5%89%8D%E8%A8%80)
  - [一、名词定义](#%E4%B8%80%E5%90%8D%E8%AF%8D%E5%AE%9A%E4%B9%89)
    - [1. 进程](#1-%E8%BF%9B%E7%A8%8B)
    - [2. 线程](#2-%E7%BA%BF%E7%A8%8B)
  - [二、Node.js 异步机制](#%E4%BA%8Cnodejs-%E5%BC%82%E6%AD%A5%E6%9C%BA%E5%88%B6)
    - [1. Node.js 内部线程池、异步机制以及宏任务优先级划分](#1-nodejs-%E5%86%85%E9%83%A8%E7%BA%BF%E7%A8%8B%E6%B1%A0%E5%BC%82%E6%AD%A5%E6%9C%BA%E5%88%B6%E4%BB%A5%E5%8F%8A%E5%AE%8F%E4%BB%BB%E5%8A%A1%E4%BC%98%E5%85%88%E7%BA%A7%E5%88%92%E5%88%86)
    - [2. Node.js 宏任务和微任务的执行时机](#2-nodejs-%E5%AE%8F%E4%BB%BB%E5%8A%A1%E5%92%8C%E5%BE%AE%E4%BB%BB%E5%8A%A1%E7%9A%84%E6%89%A7%E8%A1%8C%E6%97%B6%E6%9C%BA)
  - [三、Node.js 的多进程](#%E4%B8%89nodejs-%E7%9A%84%E5%A4%9A%E8%BF%9B%E7%A8%8B)
    - [1. 使用 child_process 方式手动创建进程](#1-%E4%BD%BF%E7%94%A8-childprocess-%E6%96%B9%E5%BC%8F%E6%89%8B%E5%8A%A8%E5%88%9B%E5%BB%BA%E8%BF%9B%E7%A8%8B)
    - [2. 使用 cluster 方式半自动创建进程](#2-%E4%BD%BF%E7%94%A8-cluster-%E6%96%B9%E5%BC%8F%E5%8D%8A%E8%87%AA%E5%8A%A8%E5%88%9B%E5%BB%BA%E8%BF%9B%E7%A8%8B)
    - [3. 使用基于 Cluster 封装的 PM2 工具全自动创建进程](#3-%E4%BD%BF%E7%94%A8%E5%9F%BA%E4%BA%8E-cluster-%E5%B0%81%E8%A3%85%E7%9A%84-pm2-%E5%B7%A5%E5%85%B7%E5%85%A8%E8%87%AA%E5%8A%A8%E5%88%9B%E5%BB%BA%E8%BF%9B%E7%A8%8B)
- [## II. Node.js 中进程池和线程池的适用场景](#ii-nodejs-%E4%B8%AD%E8%BF%9B%E7%A8%8B%E6%B1%A0%E5%92%8C%E7%BA%BF%E7%A8%8B%E6%B1%A0%E7%9A%84%E9%80%82%E7%94%A8%E5%9C%BA%E6%99%AF)
  - [一、进程池](#%E4%B8%80%E8%BF%9B%E7%A8%8B%E6%B1%A0)
  - [二、线程池](#%E4%BA%8C%E7%BA%BF%E7%A8%8B%E6%B1%A0)
- [## III. 进程池](#iii-%E8%BF%9B%E7%A8%8B%E6%B1%A0)
  - [一、要点](#%E4%B8%80%E8%A6%81%E7%82%B9)
  - [二、流程设计](#%E4%BA%8C%E6%B5%81%E7%A8%8B%E8%AE%BE%E8%AE%A1)
    - [1. 架构图](#1-%E6%9E%B6%E6%9E%84%E5%9B%BE)
    - [2. 关键流程](#2-%E5%85%B3%E9%94%AE%E6%B5%81%E7%A8%8B)
  - [三、示例](#%E4%B8%89%E7%A4%BA%E4%BE%8B)
    - [1. Electron网页代理工具中多进程的应用](#1-electron%E7%BD%91%E9%A1%B5%E4%BB%A3%E7%90%86%E5%B7%A5%E5%85%B7%E4%B8%AD%E5%A4%9A%E8%BF%9B%E7%A8%8B%E7%9A%84%E5%BA%94%E7%94%A8)
    - [2. 多进程文件分片上传Electron客户端](#2-%E5%A4%9A%E8%BF%9B%E7%A8%8B%E6%96%87%E4%BB%B6%E5%88%86%E7%89%87%E4%B8%8A%E4%BC%A0electron%E5%AE%A2%E6%88%B7%E7%AB%AF)
- [## IV. 线程池](#iv-%E7%BA%BF%E7%A8%8B%E6%B1%A0)
  - [一、要点](#%E4%B8%80%E8%A6%81%E7%82%B9-1)
  - [二、详细设计](#%E4%BA%8C%E8%AF%A6%E7%BB%86%E8%AE%BE%E8%AE%A1)
    - [任务流转过程](#%E4%BB%BB%E5%8A%A1%E6%B5%81%E8%BD%AC%E8%BF%87%E7%A8%8B)
    - [模块说明](#%E6%A8%A1%E5%9D%97%E8%AF%B4%E6%98%8E)
  - [三、示例](#%E4%B8%89%E7%A4%BA%E4%BE%8B-1)
- [## V. 结尾](#v-%E7%BB%93%E5%B0%BE)
- [VI. 参考链接](#vi-%E5%8F%82%E8%80%83%E9%93%BE%E6%8E%A5)

## I. 前言
---

> 本文论点主要面向 Node.js 开发语言

[>> Show Me Code](https://github.com/nojsja/electron-re/tree/development/src/libs/WorkerThreadPool)，目前代码正在 dev 分支，已完成单元测试，尚待测试所有场景、进行性能测试之后发布到 npm 线上版本更新，考虑单独将线程池部分拆分成独立项目维护。

[>> 建议通读 Node.js 官方文档 -【不要阻塞事件循环】](https://nodejs.org/zh-cn/docs/guides/dont-block-the-event-loop/)

Node.js 即服务端Javascript，得益于宿主环境的不同，它拥有比在浏览器上更多的能力。比如：完整的文件系统访问权限、网络协议、套接字编程、进程和线程操作、C++插件源码级的支持、Buffer二进制、Crypto加密套件的天然支持。

Node.js 的是一门单线程的语言，它基于V8引擎开发，v8 在设计之初是在浏览器端对JavaScript 语言的解析运行引擎，其最大的特点是单线程，这样的设计避免了一些多线程状态同步问题，使得其更轻量化易上手。

### 一、名词定义

#### 1. 进程

学术上说，进程是一个具有一定独立功能的程序在一个数据集上的一次动态执行的过程，是操作系统进行资源分配和调度的一个独立单位，是应用程序运行的载体。我们这里将进程比喻为工厂的车间，它代表CPU所能处理的单个任务。任一时刻，CPU总是运行一个进程，其他进程处于非运行状态。

进程具有以下特性：

- 进程是拥有资源的基本单位，资源分配给进程，同一进程的所有线程共享该进程的所有资源；
- 进程之间可以并发执行；
- 在创建或撤消进程时，系统都要为之分配和回收资源，与线程相比系统开销较大；
- 一个进程可以有多个线程，但至少有一个线程；

#### 2. 线程

在早期的操作系统中并没有线程的概念，进程是能拥有资源和独立运行的最小单位，也是程序执行的最小单位。任务调度采用的是时间片轮转的抢占式调度方式，而进程是任务调度的最小单位，每个进程有各自独立的一块内存，使得各个进程之间内存地址相互隔离。

后来，随着计算机的发展，对CPU的要求越来越高，进程之间的切换开销较大，已经无法满足越来越复杂的程序的要求了。于是就发明了线程，线程是程序执行中一个单一的顺序控制流程，是程序执行流的最小单元。这里把线程比喻一个车间的工人，即一个车间可以允许由多个工人协同完成一个任务，即一个进程中可能包含多个线程。

线程具有以下特性：

- 线程作为调度和分配的基本单位；
- 多个线程之间也可并发执行；
- 线程是真正用来执行程序的，执行计算的；
- 线程不拥有系统资源，但可以访问隶属于进程的资源，一个线程只能属于一个进程；

**Node.js 的多进程有助于充分利用CPU等资源，Node.js 的多线程提升了单进程上任务的并行处理能力。**

**在 Node.js 中，每个 worker 线程都有他自己的 V8 实例和事件循环机制 (Event Loop)。但是，和进程不同，workers 之间是可以共享内存的。**

### 二、Node.js 异步机制

#### 1. Node.js 内部线程池、异步机制以及宏任务优先级划分

Node.js 的单线程是指程序的主要执行线程是单线程，这个主线程同时也负责事件循环。而其实语言内部也会创建线程池来处理主线程程序的 `网络IO/文件IO/定时器` 等调用产生的异步任务。一个例子就是定时器Timer的实现：在Node.js中使用定时器时，Node.js 会开启一个定时器线程进行计时，计时结束时，定时器回调函数会被放入位于主线程的宏任务队列。当事件循环系统执行完主线程同步代码和当前阶段的所有微任务时，该回调任务最后再被取出执行。所以 Node.js 的定时器其实是不准确的，只能保证在预计时间时我们的回调任务被放入队列等待执行，而不是直接被执行。

![event loop details](http://nojsja.gitee.io/static-resources/images/interview/browser_eventloop.png)

多线程机制配合 Node.js 的 evet loop 事件循环系统让开发者在一个线程内就能够使用异步机制，包括定时器、IO、网络请求。但为了实现高响应度的高性能服务器，Node.js 的 Event Loop 在宏任务上进一步划分了优先级。

![event loop](http://nojsja.gitee.io/static-resources/images/interview/node_eventloop.png)

Node.js 宏任务之间的优先级划分：Timers > Pending > Poll > Check > Close。

- Timers Callback： 涉及到时间，肯定越早执行越准确，所以这个优先级最高很容易理解。
- Pending Callback：处理网络、IO 等异常时的回调，有的 unix 系统会等待发生错误的上报，所以得处理下。
- Poll Callback：处理 IO 的 data，网络的 connection，服务器主要处理的就是这个。
- Check Callback：执行 setImmediate 的回调，特点是刚执行完 IO 之后就能回调这个。
- Close Callback：关闭资源的回调，晚点执行影响也不到，优先级最低。

Node.js 微任务之间的优化及划分：process.nextTick > Promise。

#### 2. Node.js 宏任务和微任务的执行时机

node 11 之前，Node.js 的 Event Loop 并不是浏览器那种一次执行一个宏任务，然后执行所有的微任务，而是执行完一定数量的 Timers 宏任务，再去执行所有微任务，然后再执行一定数量的 Pending 的宏任务，然后再去执行所有微任务，剩余的 Poll、Check、Close 的宏任务也是这样。node 11 之后改为了每个宏任务都执行所有微任务了。

而 Node.js 的 宏任务之间也是有优先级的，如果 Node.js 的 Event Loop 每次都是把当前优先级的所有宏任务跑完再去跑下一个优先级的宏任务，那么会导致“饥饿”状态的发生。如果某个阶段宏任务太多，下个阶段就一直执行不到了，所以每个类型的宏任务有个执行数量上限的机制，剩余的交给之后的 Event Loop 再继续执行。

最终表现就是：也就是执行一定数量的 Timers 宏任务，每个宏任务之间执行所有微任务，再一定数量的 Pending Callback 宏任务，每个宏任务之间再执行所有微任务。

### 三、Node.js 的多进程

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

以下是使用 `Cluster` 模块创建一个 http 服务集群的简单示例。示例中创建 Cluster 时使用同一个 Js 执行文件，在文件内使用 `cluster.isPrimary` 判断当前执行环境是在主进程还是子进程，如果是主进程则使用当前执行文件创建子进程实例，如果时子进程则进入子进程的业务处理流程。

```js
/*
  简单示例：使用同一个JS执行文件创建子进程集群Cluster
*/
const cluster = require('node:cluster');
const http = require('node:http');
const numCPUs = require('node:os').cpus().length;
const process = require('node:process');

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  // Workers can share any TCP connection
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('hello world\n');
  }).listen(8000);
  console.log(`Worker ${process.pid} started`);
}
```

`Cluster` 模块允许设立一个主进程和若干个子进程，使用 `child_process.fork()` 在内部隐式创建子进程，由主进程监控和协调子进程的运行。

子进程之间采用进程间通信交换消息，Cluster 模块内置一个负载均衡器，采用 Round-robin 算法（轮流执行）协调各个子进程之间的负载。运行时，所有新建立的连接都由主进程完成，然后主进程再把TCP连接分配给指定的子进程。

使用集群创建的子进程可以使用同一个端口，Node.js 内部对 `http/net` 内置模块进行了特殊支持。Node.js 主进程负责监听目标端口，收到请求后根据负载均衡策略将请求分发给某一个子进程。

#### 3. 使用基于 Cluster 封装的 PM2 工具全自动创建进程

PM2是常用的node进程管理工具，它可以提供node.js应用管理能力，如自动重载、性能监控、负载均衡等。

其主要用于`独立应用`的进程化管理，在 Node.js 单机服务部署方面笔记适合。可以用于生产环境下启动同个应用的多个实例提高CPU利用率、抗风险、热加载等能力。

由于是外部库，需要使用 npm 包管理器安装：

```bash
$: npm install -g pm2
```

pm2支持直接运行 server.js 启动项目，如下：

```bash
$: pm2 start server.js
```

即可启动Node.js应用，成功后会看到打印的信息：

```bash
┌──────────┬────┬─────────┬──────┬───────┬────────┬─────────┬────────┬─────┬───────────┬───────┬──────────┐
│ App name │ id │ version │ mode │ pid   │ status │ restart │ uptime │ cpu │ mem       │ user  │ watching │
├──────────┼────┼─────────┼──────┼───────┼────────┼─────────┼────────┼─────┼───────────┼───────┼──────────┤
│ server   │ 0  │ 1.0.0   │ fork │ 24776 │ online │ 9       │ 19m    │ 0%  │ 35.4 MB   │ 23101 │ disabled │
└──────────┴────┴─────────┴──────┴───────┴────────┴─────────┴────────┴─────┴───────────┴───────┴──────────┘
```

pm2 也支持配置文件启动，通过配置文件 `ecosystem.config.js` 可以定制 pm2 的各项参数：

```js
module.exports = {
  apps : [{
    name: 'API', // 应用名
    script: 'app.js', // 启动脚本
    args: 'one two', // 命令行参数
    instances: 1, // 启动实例数量
    autorestart: true, // 自动重启
    watch: false, // 文件更改监听器
    max_memory_restart: '1G', // 最大内存使用亮
    env: { // development 默认环境变量
      // pm2 start ecosystem.config.js --watch --env development
      NODE_ENV: 'development'
    },
    env_production: { // production 自定义环境变量
      NODE_ENV: 'production'
    }
  }],

  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
```

pm2 logs 日志功能也十分强大：

```bash
$: pm2 logs
```

## II. Node.js 中进程池和线程池的适用场景
---

一般我们使用计算机执行的任务包含以下几种类型的任务：

- 计算密集型任务：任务包含大量计算，CPU占用率高。
- IO密集型任务：任务包含频繁的、持续的网络IO和磁盘IO。
- 混合型任务：既有计算也有IO。

### 一、进程池

**使用进程池的最大意义在于充分利用多核CPU资源，同时减少子进程创建和销毁的人资源消耗**。

为了应对 CPU-Sensitive 场景，以及充分发挥 CPU 多核性能，Node 提供了 child_process 模块用于创建子进程。
子进程的创建和销毁需要较大的资源成本，因此池化子进程的创建和销毁过程，利用进程池来管理所有子进程。

除了这一点，Node.js 中子进程是唯一的执行二进制文件的方式。

### 二、线程池

**使用线程池的最大意义在于多任务并行，同时为主线程降压**。单个CPU密集性的计算任务使用线程执行并不会更快，甚至线程的创建、销毁、上下文切换、线程通信、数据序列化等操作还会额外增加资源消耗。

但是如果一个计算机程序中有很多同一类型的阻塞任务需要执行，那么将他们交给线程池可以成倍的减少任务总的执行时间，因为在同一时刻多个线程在并行进行计算。如果多个任务只使用主线程执行，那么最终消耗的时间是线性叠加的，同时主线程阻塞之后也会影响其它任务的处理。

特别是对 Node.js 这种单主线程的语言来讲，主线程如果消耗了过多的时间来执行这些耗时任务，那么对整个 Node.js 单个进程实例的性能影响将是致命的。这些占用着CPU时间的操作将导致其它任务获取的CPU时间不足或CPU响应不够及时，被影响的任务将进入“饥饿”状态。

因此 Node.js 启动后主线程应尽量承担调度的角色，批量重型CPU占用任务的执行应交由额外的工作线程处理，主线程最后拿到工作线程的执行结果再返回给任务调用方。另一方面由于IO操作 Node.js 内部作了优化和支持，因此IO操作应该直接交给主线程，主线程再使用内部线程池处理。

**Node.js 的异步能不能解决过多占用CPU任务的执行问题？**

答案是：不能，过多的异步CPU占用任务会阻塞事件循环。

Node.js 的异步在 `网络IO/磁盘IO` 处理上很有用，宏任务微任务系统+内部线程调用能分担主进程的执行压力。但是如果单独将CPU占用任务放入宏任务队列或微任务队列，对任务的执行速度提升没有任何帮助，只是一种任务调度方式的优化而已。

我们只是延迟了任务的执行或是将巨大任务分散成多个再分批执行，但是任务最终还是要在主线程被执行。如果这类任务过多，那么任务分片和延迟的效果将完全消失，一个任务可以，那十个一百个呢？量变将会引起质变。

以下是 Node.js 官方博客中的原文：
> “ 如果你需要做更复杂的任务，拆分可能也不是一个好选项。这是因为拆分之后任务仍然在事件循环线程中执行，并且你无法利用机器的多核硬件能力。 请记住，事件循环线程只负责协调客户端的请求，而不是独自执行完所有任务。 对一个复杂的任务，最好把它从事件循环线程转移到工作线程池上。”

1. 场景：**间歇性**让主进程**瘫痪**
> 每一秒钟，主线程有一半时间被占用
```js
// this task costs 100ms
function doHeavyTask() { ... }

setInterval(() => {
  doHeavyTask(); // 100ms
  doHeavyTask(); // 200ms
  doHeavyTask(); // 300ms
  doHeavyTask(); // 400ms
  doHeavyTask(); // 500ms
}, 1e3);
```

2. 场景：**高频性**让主进程**半瘫痪**
> 每200ms，主线程有一半时间被占用
```js
// this task costs 100ms
function doHeavyTask() { ... }

setInterval(() => {
  doHeavyTask();
}, 1e3);

setInterval(() => {
  doHeavyTask();
}, 1.2e3);

setInterval(() => {
  doHeavyTask();
}, 1.4e3);

setInterval(() => {
  doHeavyTask();
}, 1.6e3);

setInterval(() => {
  doHeavyTask();
}, 1.8e3);
```

以下是官方博客的原文摘录：
> “ 因此，你应该保证永远不要阻塞事件轮询线程。换句话说，每个 JavaScript 回调应该快速完成。这些当然对于 await，Promise.then 也同样适用。”

## III. 进程池
---

进程池是对进程的创建、执行任务、销毁等流程进行管控的一个应用或是一套程序逻辑。之所以称之为池是因为其内部包含多个进程实例，进程实例随时都在进程池内进行着状态流转，多个创建的实例可以被重复利用，而不是每次执行完一系列任务后就被销毁。因此，进程池的部分存在目的是为了减少进程创建的资源消耗。

此外进程池最重要的一个作用就是负责将任务分发给各个进程执行，各个进程的任务执行优先级取决于进程池上的负载均衡运算，由算法决定应该将当前任务派发给哪个进程，以达到最高的CPU和内存利用率。常见的负载均衡算法有：

- POLLING - 轮询：子进程轮流处理请求
- WEIGHTS - 权重：子进程根据设置的权重来处理请求
- RANDOM - 随机：子进程随机处理请求
- SPECIFY - 指定：子进程根据指定的进程 id 处理请求
- WEIGHTS_POLLING - 权重轮询：权重轮询策略与轮询策略类似，但是权重轮询策略会根据权重来计算子进程的轮询次数，从而稳定每个子进程的平均处理请求数量。
- WEIGHTS_RANDOM - 权重随机：权重随机策略与随机策略类似，但是权重随机策略会根据权重来计算子进程的随机次数，从而稳定每个子进程的平均处理请求数量。
- MINIMUM_CONNECTION - 最小连接数：选择子进程上具有最小连接活动数量的子进程处理请求。
- WEIGHTS_MINIMUM_CONNECTION - 权重最小连接数：权重最小连接数策略与最小连接数策略类似，不过各个子进程被选中的概率由连接数和权重共同决定。

### 一、要点

「 对单一任务的控制不重要，对单个进程宏观的资源占用更需关注 」

### 二、流程设计

#### 1. 架构图

进程池架构图参考之前的进程管理工具开发相关[文章](https://nojsja.github.io/2021/12/22/1deae768.html/)，本文只需关注进程池部分。

![archtecture](http://nojsja.gitee.io/static-resources/images/electron-re/electron-re_arch.png)

#### 2. 关键流程

1. 

### 三、示例

#### 1. Electron网页代理工具中多进程的应用

1）shadowsocks 基本代理原理：

![shadow_working_principle.png](https://nojsja.gitee.io/static-resources/images/shadowsocks/shadow_working_principle.png)

2）单进程下客户端执行原理：

- 通过用户预先保存的服务器配置信息，使用 node.js 子进程来启动 ss-local 可执行文件建立和 shadowsocks 服务器的连接来代理用户本地电脑的流量，每个子进程占用一个 socket 端口。
- 其它支持 socks5 代理的 proxy 工具比如：浏览器上的 SwitchOmega 插件会和这个端口的 tcp 服务建立连接，将 tcp 流量加密后通过代理服务器转发给我们需要访问的目标服务器。

![ssr-single.png](https://nojsja.gitee.io/static-resources/images/shadowsocks/ssr-single.png?v=2)

3）多进程下客户端执行原理：

以上描述的是客户端连接单个节点的工作模式，节点订阅组中的负载均衡模式需要同时启动多个子进程，每个子进程启动 ss-local 执行文件占用一个本地端口并连接到远端一个服务器节点。

每个子进程启动时选择的端口是会变化的，因为某些端口可能已经被系统占用，程序需要先选择未被使用的端口。并且浏览器 proxy 工具也不可能同时连接到我们本地启动的子进程上的多个 ss-local 服务上。因此需要一个占用固定端口的中间节点接收 proxy 工具发出的连接请求，然后按照某种分发规则将 tcp 流量转发到各个子进程的 ss-local 服务的端口上。

![ssr-cluster.png](https://nojsja.gitee.io/static-resources/images/shadowsocks/ssr-cluster.png)

#### 2. 多进程文件分片上传Electron客户端

之前做过一个支持SMB协议多文件分片上传的客户端，Node.js 端的上传任务管理、IO操作等都使用多进程实现过一版本，不过是在 gitlab 实验分支自己搞得（逃）。

![upload](https://nojsja.gitee.io/static-resources/images/upload/upload.png)

## IV. 线程池
---

为了减小 CPU 密集型任务计算的系统开销，Node.js 引入了新的特性：工作线程 worker_threads，其首次在 `v10.5.0` 作为实验性功能出现。通过 worker_threads 可以在进程内创建多个线程，主线程与 worker 线程使用 parentPort 通信，worker 线程之间可通过 MessageChannel 直接通信。worker_threads 做为开发者使用线程的重要特性，在 `v12.11.0` 稳定版已经能正常在生产环境使用了。

但是线程的创建需要额外的CPU和内存资源，如果要多次使用一个线程的话，应该将其保存起来，当该线程完全不使用时需要及时关闭以减少内存占用。想象我们在需要使用线程时直接创建，使用完后立刻销毁，可能线程自身的创建和销毁成本已经超过了使用线程本身节省下的资源成本。Node.js 内部虽然有使用线程池，但是对于开发者而言是完全透明不可见的，因此封装一个能够维护线程生命周期的线程池工具的重要性就体现了。

为了强化多异步任务的调度，线程池除了提供维护线程的能力，也提供维护任务队列的能力。当发送请求给线程池让其执行一个异步任务时，如果线程池内没有空闲线程，那该任务就会被直接丢弃了，显然这不是想要的效果。

因此可以考虑为线程池添加一个任务队列的调度逻辑：当线程池没有空闲线程时，将该任务放入待执行任务队列(FIFO)，线程池在某个时机取出任务交由某个空闲线程执行，执行完成后触发异步回调函数，将执行结果返回给请求调用方。但是线程池的任务队列内的任务数量应该考虑限制到一个特殊值，防止线程池负载过大影响 Node.js 应用整体运行性能。

### 一、要点

「 对单一任务的控制重要，对单个线程的资源占用无需关注 」

### 二、详细设计

![archtecture](http://nojsja.gitee.io/static-resources/images/nodejs/worker-thread-pool.jpg)

#### 任务流转过程

1. 调用者可通过 `StaticPool/StaticExcutor/DynamicPool/DynamicExcutor` 实例向线程池派发任务（以下有关键名词说明），各种实例的之间最大的不同点就是参数动态化能力。
2. 任务由线程池内部生成，生成后任务做为主要的流转载体，一方面承载用户传入的任务计算参数，另一方面记录任务流转过程中的状态变化，比如：任务状态、开始时间、结束时间、任务ID、任务重试次数、任务是否支持重试、任务类型等。
3. 任务生成后，首先判断当前线程池的线程数是否已达上限，如果未达上限，则新建线程并将其放入线程存储区，然后使用该线程直接执行当前任务。
4. 如果线程池线程数超限，则判断是否有未执行任务的空闲线程，拿到空闲线程后，使用该线程直接执行当前任务。
5. 如果没有空闲线程，则判断当前等待任务队列是否已满，任务队列已满则抛出错误，第一时间让调用者感知任务未执行成功。
6. 如果任务队列未满的话，将该任务放入任务队列，等待任务循环系统取出将其执行。
7. 以上4/5/6步的三种情况下任务执行后，判断该任务是否执行成功，成功时触发成功的回调函数，Promise 状态为 fullfilled。如果失败，则判断是否支持重试，支持重试的情况下，将该任务重试次数+1后重新放入任务队列尾部。任务不支持重试的情况下，直接失败，并触发失败的异步回调函数，Promise 状态为 rejected。
8. 整个线程池生命周期中，存在一个任务循环系统，以一定的周期频率从任务队列首部获取任务，并从线程存储区域获取空闲线程后使用该线程执行任务，该流程也符合第7步的描述。
9. 任务循环系统除了取任务执行，如果线程池设置了任务超时时间的话，也会判断正在执行中的任务是否超时，超时后会终止该线程的所有运行中的代码。

#### 模块说明

- **StaticPool**
  - 定义：静态线程池，可使用固定的`execFunction/execString/execFile`执行参数来启动工作线程，执行参数在进程池创建后不能更改。
  - 进程池创建之后除了执行参数不可变外，其它参数比如：任务超时时间、任务重试次数、线程池任务轮询间隔时间、最大任务数、最大线程数、是否懒创建线程等都可以通过 API随时更改。
- **StaticExcutor**
  - 定义：静态线程池的执行器实例，继承所属线程池的固定执行参数`execFunction/execString/execFile`且不可更改。
  - 执行器实例创建之后除了执行参数不可变外，其它参数比如：任务超时时间、任务重试次数、线程池任务轮询间隔时间、最大任务数、最大线程数、是否懒创建线程等都可以通过 API 随时更改。
  - 静态线程池的各个执行器实例的参数设置互不影响，参数默认继承于所属线程池，参数在执行器上更改后具有比所属线程池同名参数更高的优先级。
- **DynamicPool**
  - 定义：动态线程池，无需使用`execFunction/execString/execFile`执行参数即可创建线程池。执行参数在调用 `exec()` 方法时动态传入，因此执行参数可能不固定。
  - 线程池创建之后执行参数默认为 `null`，其它参数比如：任务超时时间、任务重试次数、线程池任务轮询间隔时间、最大任务数、最大线程数、是否懒创建线程等都可以通过 API 随时更改。
- **DynamicExcutor**
  - 定义：动态线程池的执行器实例，继承所属线程池的其它参数，执行参数为 `null`。
  - 执行器实例创建之后，其它参数比如：任务超时时间、任务重试次数、线程池任务轮询间隔时间、最大任务数、最大线程数、是否懒创建线程等都可以通过 API 随时更改。
  - 动态线程池的各个执行器实例的参数设置互不影响，参数默认继承于所属线程池，参数在执行器上更改后具有比所属线程池同名参数更高的优先级。
  - 动态执行器实例在执行任务时需要传入执行参数`execFunction/execString/execFile`，因此执行参数可能不固定。
- **ThreadGenerator**
  - 定义：线程创建的工厂方法，会进行参数校验。
- **Thread**
  - 定义：线程实例，内部简单封装了 `worker_threads` API。
- **TaskGenerator**
  - 定义：任务创建的工厂方法，会进行参数校验。
- **Task**
  - 定义：单个任务，记录了任务执行状态、任务开始结束时间、任务重试次数、任务携带参数等。
- **TaskQueue**
  - 定义：任务队列，在数组中存放任务，以先入先出方式(FIFO)向线程池提供任务，使用Map来存储 taskId 和 task 之间的映射关系。
- **Task Loop**
  - 任务循环，每个循环的默认时间间隔为2S，每次循环中会处理超时任务、将新任务派发给空闲线程等。

### 三、示例

暂无实际使用，可考虑在前端图片像素处理、音视频转码处理等 CPU 密集性任务中进行实践。

## V. 结尾
---

结尾

## VI. 参考链接

1. [Node.js Doc - worker_threads](https://nodejs.org/docs/latest-v14.x/api/worker_threads.html#worker-threads)
2. [Node.js Doc - child_process](https://nodejs.org/docs/latest-v14.x/api/child_process.html)
3. [Node.js multithreading: Worker threads and why they matter](https://blog.logrocket.com/node-js-multithreading-worker-threads-why-they-matter/****)
4. [不要阻塞你的事件循环（或是工作线程池）](https://nodejs.org/zh-cn/docs/guides/dont-block-the-event-loop/)
5. [Node.js 之深入理解特性](https://segmentfault.com/a/1190000008961775)
6. [Java线程池实现原理及其在美团业务中的实践](https://tech.meituan.com/2020/04/02/java-pooling-pratice-in-meituan.html)
7. [美团动态线程池实践](https://juejin.cn/post/7063408526894301192)
8. [Python的进程、线程和协程的适用场景和使用技巧](https://bbs.huaweicloud.com/blogs/289318)