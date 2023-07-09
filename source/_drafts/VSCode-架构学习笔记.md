---
title: VSCode 架构学习笔记
subtitle: VSCode 架构学习笔记
catalog: true
comments: true
indexing: true
header-img: >-
  https://nojsja.gitee.io/static-resources/images/hexo/article_header/article_header.jpg
top: false
tocnum: true
tags:
  - 标签1
categories:
  - 目录2
date: 2023-07-09 23:33:20
---

# VSCode 架构学习笔记

## 一、源码目录结构

### 1.1 子目录命名规则

- xxx
  - browser [渲染进程代码]
  - common [通用代码，可被其它模块调用]
  - electron-main [主进程代码]
  - node [node 代码]

### 1.2 目录解析

- src/vs/base [基础工具库]
- src/vs/platform [平台基本能力]
  - instantiation [实例化]
    - common/serviceCollection [服务集合]
    - common/instantiationService [类实例化服务 - 使用图算法分析服务依赖，递归地实例化一个服务的所有依赖服务]
    - common/instantiation [实例化工具 - 服务类型装饰器]
    - common/graph [图算法]
  - lifecycle [生命周期]
    - electron-main/lifecycleMainService [主进程生命周期服务]
    - node/sharedProcessLifecycleService [通用 node 进程生命周期服务]
  - state [状态管理]
  - storage [本地存储]

## 二、Electron 进程

VSCode 基于 Electron 开发，Electron 应用中的进程：

- 1 个主进程：一个 Electron App 只会启动一个主进程，它会运行 package.json 的 main 字段指定的脚本。
- N 个渲染进程：主进程代码可以调用 Chromium API 创建任意多个 web 页面，而 Chromium 本身是多进程架构，每个 web 页面都运行在属于它自己的渲染进程中。
- Node.js 子进程：Electron 主进程中也可以使用 Node.js 子进程创建 API 创建多个 Node.js 子进程。

### 2.1 进程间通讯

Render 进程之间的通讯本质上和多个 Web 页面之间通讯没有差别，可以使用各种浏览器能力如 localStorage。Render 进程与 Main 进程之间也可以通过 API 互相通讯 (ipcRenderer/ipcMain)

### 2.2 远程调用

普通 web 页面无法调用 native api，因此缺少一些能力。electron 的 web 页面所处的 Render 进程可以通过同步IPC通信将任务转发至运行在 NodeJS 环境的 Main 进程，从而实现 native API 调用。

这套架构大大扩展了 Electron app 相比 web app 的能力丰富度，但同时又保留了 web 快捷流畅的开发体验。

远程调用的相关内部逻辑也值得学习，可以看下 `electron/remote` 的实现源码，简单来讲就是 Electron 在 渲染进程 Clone 了一个和主进程 API 完全一致的对象，用户在渲染进程调用某个主进程同名 API 时会触发到主进程的同步 IPC 通信，主进程执行完成后再通过 IPC 将数据发送回来。

不过远程调用也有一些缺点，比如：同步 IPC 调用导致的线程阻塞，IPC 序列化/反序列化的性能损失等。

## 三、VSCode多进程架构

- 主进程：VSCode 的入口进程，负责一些类似窗口管理、进程间通信、自动更新等全局任务
- 渲染进程：负责一个 Web 页面的渲染
- 插件宿主进程：每个插件的代码都会运行在一个独属于自己的 NodeJS 环境的宿主进程中，插件不允许访问 UI
- Debug 进程：Debugger 相比普通插件做了特殊化
- Search 进程：搜索是一类计算密集型的任务，单开进程保证软件整体体验与性能

## 四、服务实例化

VSCode 中的所有基础功能都被视为服务 Service，比如：右键菜单 ContextMenuService、剪贴板 ClipboardService，大部分 Service 都继承自一个抽象类 - Disposable，而该抽象类继承自接口 IDisposable。

### 4.1 Service 的底层基类

**Interface Disposable**

> src/vs/base/common/lifecycle.ts

接口只有一个 dispose 方法，用于对象销毁时取消监听器或清理数据。

```ts
/**
 * An object that performs a cleanup operation when `.dispose()` is called.
** Some examples of how disposables are used:
*
* - An event listener that removes itself when `.dispose()` is called.
* - A resource such as a file system watcher that cleans up the resource when `.dispose()` is called.
* - The return value from registering a provider. When `.dispose()` is called, the provider is unregistered.
*/

export  interface  IDisposable {
    dispose(): void;
}
```

**Abstract Class IDisposable**

> src/vs/base/common/lifecycle.ts

抽象类对接口做了一层公用方法和属性扩展，包括：

- None：一个空的 disposable 对象
- _store：管理多个 disposable 对象的存储空间，一个 Service 可能会存放多个 disposable 对象（*内部实现的 Emitter 事件触发器也属于 disposable，后面会专门说明 Emitter 的几种实现方式*），使用 Store 统一管理起来，当服务实例销毁时会自动调用这些 disposable 对象。_store 自身也是 disposable 的。
- dispose：用于触发所有 disposable 对象的 dispose 方法。
- _register：向 store 注册 disposables 对象。

```ts
/**
 * Abstract base class for a {@link IDisposable disposable} object.
 *
 * Subclasses can {@linkcode _register} disposables that will be automatically cleaned up when this object is disposed of.
 */
export abstract class Disposable implements IDisposable {

    /**
     * A disposable that does nothing when it is disposed of.
     *
     * TODO: This should not be a static property.
     */
    static readonly None = Object.freeze<IDisposable>({ dispose() { } });

    protected readonly _store = new DisposableStore();

    constructor() {
        trackDisposable(this);
        setParentOfDisposable(this._store, this);
    }

    public dispose(): void {
        markAsDisposed(this);

        this._store.dispose();
    }

    /**
     * Adds `o` to the collection of disposables managed by this object.
     */
    protected _register<T extends IDisposable>(o: T): T {
        if ((o as unknown as Disposable) === this) {
            throw new Error('Cannot register a disposable on itself!');
        }
        return this._store.add(o);
    }
}
```

### 4.2 InstantiationService：负责实例化 Service 的 Service

负责实例化 Service 的模块也被封装为一个 Service 即 InstantiationService - 实例化服务。

> src/vs/platform/instantiation/common/instantiation.ts

```ts
export interface IInstantiationService {

    readonly _serviceBrand: undefined;

    /**
     * Synchronously creates an instance that is denoted by the descriptor
     */
    createInstance<T>(descriptor: descriptors.SyncDescriptor0<T>): T;
    createInstance<Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(ctor: Ctor, ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>): R;

    /**
     * Calls a function with a service accessor.
     */
    invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R;

    /**
     * Creates a child of this service which inherits all current services
     * and adds/overwrites the given services.
     */
    createChild(services: ServiceCollection): IInstantiationService;
}
```

实例化服务的逻辑稍稍复杂一点，大致解读一下关键点和主流程：

**ServiceCollection 服务集合**

内部封装了 Map 用于存储 serviceIdentifier 和 instanceOrDescriptor 的映射关系。
serviceIdentifier 即描述 Service 标识对象，对象上有一个 type 字段；stanceOrDescriptor 即 Service 实例或 Service 描述对象。因为有些服务是需要延迟创建的，因此只需要临时存储一下创建过程。

Service 实例不必多说，由 Service 类实例化而来。以下是一个 Service 描述对象的结构，包含实例化 Service 时用到的参数和构造器函数：

> src/vs/platform/instantiation/common/descriptors.ts

```ts
export class SyncDescriptor<T> {

    readonly ctor: any;
    readonly staticArguments: any[];
    readonly supportsDelayedInstantiation: boolean;

    constructor(ctor: new (...args: any[]) => T, staticArguments: any[] = [], supportsDelayedInstantiation: boolean = false) {
        this.ctor = ctor;
        this.staticArguments = staticArguments;
        this.supportsDelayedInstantiation = supportsDelayedInstantiation;
    }
}
```

**Graph 服务依赖图谱**

简单的图算法，图数据结构中包含多个图节点，每个节点拥有**入度**和**出度**分别表明依赖当前节点的前置节点和当前节点依赖的后置节点。

Graph 结构中可以执行这些操作：新建图节点、查找图节点、获取所有根节点（出度为0，不依赖后置节点）、检测是否存在环、移除图节点等。

```ts
export class Node<T> {
    readonly incoming = new Map<string, Node<T>>();
    readonly outgoing = new Map<string, Node<T>>();
    
    constructor(
        readonly key: string,
        readonly data: T
    ) { }
}

export class Graph<T> {
    private readonly _nodes = new Map<string, Node<T>>();
    
    constructor(private readonly _hashFn: (element: T) => string) {
        // empty
    }

    roots(): Node<T>[] {...}
    insertEdge(from: T, to: T): void {...}
    removeNode(data: T): void {...}
    lookupOrInsertNode(data: T): Node<T> {...}
    lookup(data: T): Node<T> | undefined {...}
    isEmpty(): boolean {...}
    toString(): string {...}
    findCycleSlow() {...}
}

```

**创建依赖服务过程**

创建一个服务实例时，会先收集该服务的所有依赖服务，然后根据这些依赖服务来创建服务依赖图谱。图谱创建之后，会先选出出度为的 0 的根节点（无其它依赖服务）进行创建，创建好后将根节点从图谱中删除，过程中使用 while 循环重复上述过程直到图谱中没有任何节点。

```ts
    ...
    private _createAndCacheServiceInstance<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>, _trace: Trace): T {

        type Triple = { id: ServiceIdentifier<any>; desc: SyncDescriptor<any>; _trace: Trace };
        const graph = new Graph<Triple>(data => data.id.toString());

        let cycleCount = 0;
        const stack = [{ id, desc, _trace }];
        while (stack.length) {
            const item = stack.pop()!;
            graph.lookupOrInsertNode(item);

            // a weak but working heuristic for cycle checks
            if (cycleCount++ > 1000) {
                throw new CyclicDependencyError(graph);
            }

            // check all dependencies for existence and if they need to be created first
            for (const dependency of _util.getServiceDependencies(item.desc.ctor)) {

                const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id);
                if (!instanceOrDesc) {
                    this._throwIfStrict(`[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`, true);
                }

                // take note of all service dependencies
                this._globalGraph?.insertEdge(String(item.id), String(dependency.id));

                if (instanceOrDesc instanceof SyncDescriptor) {
                    const d = { id: dependency.id, desc: instanceOrDesc, _trace: item._trace.branch(dependency.id, true) };
                    graph.insertEdge(item, d);
                    stack.push(d);
                }
            }
        }

        while (true) {
            const roots = graph.roots();

            // if there is no more roots but still
            // nodes in the graph we have a cycle
            if (roots.length === 0) {
                if (!graph.isEmpty()) {
                    throw new CyclicDependencyError(graph);
                }
                break;
            }

            for (const { data } of roots) {
                // Repeat the check for this still being a service sync descriptor. That's because
                // instantiating a dependency might have side-effect and recursively trigger instantiation
                // so that some dependencies are now fullfilled already.
                const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id);
                if (instanceOrDesc instanceof SyncDescriptor) {
                    // create instance and overwrite the service collections
                    const instance = this._createServiceInstanceWithOwner(data.id, data.desc.ctor, data.desc.staticArguments, data.desc.supportsDelayedInstantiation, data._trace);
                    this._setServiceInstance(data.id, instance);
                }
                graph.removeNode(data);
            }
        }
        return <T>this._getServiceInstanceOrDescriptor(id);
    }
    ...
```

**创建 Service 服务实例**

> src/vs/platform/instantiation/common/instantiationService.ts

依赖服务都创建好后，可以开始创建 Service 实例了。Service 类有个参数叫 supportsDelayedInstantiation - 是否支持延迟实例化，这个参数将 Service 实例分为必须**立即创建**的服务和在实际使用或空闲时才创建的**延迟服务**。

**立即创建**服务逻辑在 _createInstance 方法中：先获取当前服务的所有依赖服务（已实例化），然后将所有依赖服务和静态参数组装成数组并调用 Reflect.construct API 使用构造函数创建对象：

```ts
private _createInstance<T>(ctor: any, args: any[] = [], _trace: Trace): T {

  // arguments defined by service decorators
  const serviceDependencies = _util.getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
  const serviceArgs: any[] = [];
  for (const dependency of serviceDependencies) {
   const service = this._getOrCreateServiceInstance(dependency.id, _trace);
   if (!service) {
    this._throwIfStrict(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`, false);
   }
   serviceArgs.push(service);
  }

  const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;

  // check for argument mismatches, adjust static args if needed
  if (args.length !== firstServiceArgPos) {
   console.trace(`[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`);

   const delta = firstServiceArgPos - args.length;
   if (delta > 0) {
    args = args.concat(new Array(delta));
   } else {
    args = args.slice(0, firstServiceArgPos);
   }
  }

  // now create the instance
  return Reflect.construct<any, T>(ctor, args.concat(serviceArgs));
 }

```

**延迟创建**服务的整体思路是先创建一个 **IdleValue** 空对象（内部通过 **requestIdleCallback** 在空闲时初始化构造函数）、创建事件监听器列表。返回一个 Proxy 代理对象，Proxy 对象监听目标 Service 对象 `get` 方法获取目标属性并返回 IdleValue 对象上相应的属性，如果此时 IdleValue 仍然没执行初始化构造函数逻辑，则会在此步中立即开始初始化构造函数。

Service 的一些特定异步回调函数比如 `onDidXXX / onWillXXX`等也是在 Proxy.get 监听方法中被添加到事件列表里，等待在构造函数初始化后被触发。

```ts
private _createServiceInstance<T>(id: ServiceIdentifier<T>, ctor: any, args: any[] = [], supportsDelayedInstantiation: boolean, _trace: Trace): T {
  if (!supportsDelayedInstantiation) {
   // eager instantiation
   return this._createInstance(ctor, args, _trace);

  } else {
   const child = new InstantiationService(undefined, this._strict, this, this._enableTracing);
   child._globalGraphImplicitDependency = String(id);

   // return "empty events" when the service isn't instantiated yet
   const earlyListeners = new Map<string, LinkedList<Parameters<Event<any>>>>();

   const idle = new IdleValue<any>(() => {
    const result = child._createInstance<T>(ctor, args, _trace);
    
    for (const [key, values] of earlyListeners) {
     const candidate = <Event<any>>(<any>result)[key];
     if (typeof candidate === 'function') {
      for (const listener of values) {
       candidate.apply(result, listener);
      }
     }
    }
    earlyListeners.clear();

    return result;
   });
   return <T>new Proxy(Object.create(null), {
    get(target: any, key: PropertyKey): any {

     if (!idle.isInitialized) {
      if (typeof key === 'string' && (key.startsWith('onDid') || key.startsWith('onWill'))) {
       let list = earlyListeners.get(key);
       if (!list) {
        list = new LinkedList();
        earlyListeners.set(key, list);
       }
       const event: Event<any> = (callback, thisArg, disposables) => {
        const rm = list!.push([callback, thisArg, disposables]);
        return toDisposable(rm);
       };
       return event;
      }
     }

     // value already exists
     if (key in target) {
      return target[key];
     }

     // create value
     const obj = idle.value;
     let prop = obj[key];
     if (typeof prop !== 'function') {
      return prop;
     }
     prop = prop.bind(obj);
     target[key] = prop;
     return prop;
    },
    set(_target: T, p: PropertyKey, value: any): boolean {
     idle.value[p] = value;
     return true;
    },
    getPrototypeOf(_target: T) {
     return ctor.prototype;
    }
   });
  }
 }
```

## VSCode 应用入口

> src/vs/code/electron-main/main.ts

CodeMain 类是 VSCode 应用的入口，它的 main 方法是整个应用的入口，它会创建所有的服务并初始化，然后调用 `startup` 方法启动应用：
- 调用 createServices 方法创建所有`基础服务`和 `InstantiationService 实例化服务`。
- 调用 initServices 方法创建目录并初始化服务。


```ts
/**
 * The main VS Code entry point.
 *
 * Note: This class can exist more than once for example when VS Code is already
 * running and a second instance is started from the command line. It will always
 * try to communicate with an existing instance to prevent that 2 VS Code instances
 * are running at the same time.
 */
class CodeMain {

 main(): void {
  try {
   this.startup();
  } catch (error) {
   console.error(error.message);
   app.exit(1);
  }
 }

 private async startup(): Promise<void> {

  // Set the error handler early enough so that we are not getting the
  // default electron error dialog popping up
  setUnexpectedErrorHandler(err => console.error(err));

  // Create services
  const [instantiationService, instanceEnvironment, environmentMainService, configurationService, stateMainService, bufferLogService, productService, userDataProfilesMainService] = this.createServices();

  try {
   // Init services
    await this.initServices(environmentMainService, userDataProfilesMainService, configurationService, stateMainService, productService);

   // Startup
    await instantiationService.invokeFunction(async accessor => {
    const logService = accessor.get(ILogService);
    const lifecycleMainService = accessor.get(ILifecycleMainService);
    const fileService = accessor.get(IFileService);
    const loggerService = accessor.get(ILoggerService);

    const mainProcessNodeIpcServer = await this.claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, true);

    // Write a lockfile to indicate an instance is running
    FSPromises.writeFile(environmentMainService.mainLockfile, String(process.pid)).catch(err => {
     logService.warn(`app#startup(): Error writing main lockfile: ${err.stack}`);
    });

    // Lifecycle
    once(lifecycleMainService.onWillShutdown)(evt => {
     fileService.dispose();
     configurationService.dispose();
     evt.join('instanceLockfile', FSPromises.unlink(environmentMainService.mainLockfile).catch(() => { /* ignored */ }));
    });

    const instance = instantiationService.createInstance(CodeApplication, mainProcessNodeIpcServer, instanceEnvironment);

    return instance.startup();
   });
  } catch (error) {
   instantiationService.invokeFunction(this.quit, error);
  }
 }

 private createServices(): [IInstantiationService, IProcessEnvironment, IEnvironmentMainService, ConfigurationService, StateService, BufferLogger, IProductService, UserDataProfilesMainService] {
  const services = new ServiceCollection();
  const disposables = new DisposableStore();
  process.once('exit', () => disposables.dispose());

  // Product
  const productService = { _serviceBrand: undefined, ...product };
  services.set(IProductService, productService);

  // Environment
  const environmentMainService = new EnvironmentMainService(this.resolveArgs(), productService);
  const instanceEnvironment = this.patchEnvironment(environmentMainService); // Patch `process.env` with the instance's environment
  services.set(IEnvironmentMainService, environmentMainService);

  // Files
  const fileService = new FileService(logService);
  services.set(IFileService, fileService);
  const diskFileSystemProvider = new DiskFileSystemProvider(logService);
  fileService.registerProvider(Schemas.file, diskFileSystemProvider);

  // FileUserDataProvider for atomic read / write operations.
  fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, logService));
  // ...
  services.set(ILifecycleMainService, new SyncDescriptor(LifecycleMainService, undefined, false));

  return [new InstantiationService(services, true), instanceEnvironment, environmentMainService, configurationService, stateService, bufferLogger, productService, userDataProfilesMainService];
 }

 private patchEnvironment(environmentMainService: IEnvironmentMainService): IProcessEnvironment {...}

 private async initServices(environmentMainService: IEnvironmentMainService, userDataProfilesMainService: UserDataProfilesMainService, configurationService: ConfigurationService, stateService: StateService, productService: IProductService): Promise<void> {
  await Promises.settled<unknown>([
   // Environment service (paths)
   Promise.all<string | undefined>([
    environmentMainService.extensionsPath,
    ...
   ].map(path => path ? FSPromises.mkdir(path, { recursive: true }) : undefined)),

   // State service
   stateService.init(),

   // Configuration service
   configurationService.initialize()
  ]);

  // Initialize user data profiles after initializing the state
  userDataProfilesMainService.init();
 }

 private async claimInstance(logService: ILogService, environmentMainService: IEnvironmentMainService, lifecycleMainService: ILifecycleMainService, instantiationService: IInstantiationService, productService: IProductService, retry: boolean): Promise<NodeIPCServer> {

  // Try to setup a server for running. If that succeeds it means
  // we are the first instance to startup. Otherwise it is likely
  // that another instance is already running.
  let mainProcessNodeIpcServer: NodeIPCServer;
  ...

  return mainProcessNodeIpcServer;
 }

 ...

 private quit(accessor: ServicesAccessor, reason?: ExpectedError | Error): void {
  const logService = accessor.get(ILogService);
  const lifecycleMainService = accessor.get(ILifecycleMainService);

  let exitCode = 0;

  if (reason) {...}

  lifecycleMainService.kill(exitCode);
 }

  ...
}

// Main Startup
const code = new CodeMain();
code.main();

```
