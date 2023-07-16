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
  - vscode
categories:
  - Architecture
  - VSCode
date: 2023-07-09 23:33:20
---
# VSCode 架构学习笔记

> 持续更新中

## 一、源码目录结构

### 1.1 总览

**核心层**

* base: 提供通用服务和构建用户界面
* platform: 注入服务和基础服务代码
* editor: 微软 Monaco 编辑器，也可独立运行使用
* wrokbench: 配合 Monaco 并且给 viewlets 提供框架：如：浏览器状态栏，菜单栏利用 electron 实现桌面程序

**核心环境**

整个项目完全使用 typescript 实现，electron 中运行主进程和渲染进程，使用的 api 有所不同，所以在 core 中每个目录组织也是按照使用的 api 来安排，
运行的环境分为几类：

* common: 只使用 javascritp api 的代码，能在任何环境下运行。
* browser: 浏览器 api, 如操作 dom; 可以调用 common。
* node: 需要使用 node 的 api,比如文件 io 操作。
* electron-brower: 渲染进程 api, 可以调用 common, brower, node, 依赖 [electron renderer-process API](https://link.zhihu.com/?target=https%3A//github.com/electron/electron/tree/master/docs%23modules-for-the-renderer-process-web-page)。
* electron-main: 主进程 api, 可以调用: common, node 依赖于 [electron main-process AP](https://link.zhihu.com/?target=https%3A//github.com/electron/electron/tree/master/docs%23modules-for-the-main-process)。

### 1.2 目录解析

```bash
├── build         # gulp编译构建脚本
├── extensions    # 内置插件
├── product.json  # App meta信息
├── resources     # 平台相关静态资源
├── scripts       # 工具脚本，开发/测试
├── src           # 源码目录
└── typings       # 函数语法补全定义
└── vs
    ├── base        # 通用工具/协议和UI库
    │   ├── browser # 基础UI组件，DOM操作
    │   ├── common  # diff描述，markdown解析器，worker协议，各种工具函数
    │   ├── node    # Node工具函数
    │   ├── parts   # IPC协议（Electron、Node），quickopen、tree组件
    │   ├── test    # base单测用例
    │   └── worker  # Worker factory和main Worker（运行IDE Core：Monaco）
    ├── code        # VSCode应用主进程入口
    ├── editor        # IDE代码编辑器
    |   ├── browser     # 代码编辑器核心
    |   ├── common      # 代码编辑器核心
    |   ├── contrib     # vscode 与独立 IDE共享的代码
    |   └── standalone  # 独立 IDE 独有的代码
    ├── platform      # 支持注入服务和平台相关基础服务（文件、剪切板、窗体、状态栏）
    ├── workbench     # 工作区UI布局，功能主界面
    │   ├── api              #
    │   ├── browser          #
    │   ├── common           #
    │   ├── contrib          #
    │   ├── electron-browser #
    │   ├── services         #
    │   └── test             #
    ├── css.build.js  # 用于插件构建的CSS loader
    ├── css.js        # CSS loader
    ├── editor        # 对接IDE Core（读取编辑/交互状态），提供命令、上下文菜单、hover、snippet等支持
    ├── loader.js     # AMD loader（用于异步加载AMD模块）
    ├── nls.build.js  # 用于插件构建的NLS loader
    └── nls.js        # NLS（National Language Support）多语言loader=
```

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

## 四、Service 服务

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

抽象类对接口做了一层公包括：公用用方法和属性扩展。

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

### 4.2 Service 依赖注入

依赖注入作为一个设计模式，前端开发者可能使用的不多，但在 VSCode 的源码中随处可见，所以这里简单介绍下。首先看依赖注入的定义：

> 在软件工程中，依赖注入是一种为一类对象提供依赖的对象的设计模式。被依赖的对象称为 `Service`，注入则是指将被依赖的对象 `Service`传递给使用服务的对象(称为 `Client`)，从而客户 `Client`不需要主动去建立(new)依赖的服务 `Service`，也不需要通过工厂模式去获取依赖的服务 `Service`。

在典型的依赖注入模式中，存在以下几类角色：

* 被依赖和使用的对象，即 `Service`
* 使用服务的客户对象，即 `Client`
* 客户使用服务的接口定义，`Interface`
* 注入器：负责建立服务对象并提供给 Client，通常也负责建立客户对象

而依赖注入的实现有几种形态，其中常见的一种的构造函数式的依赖注入：Client 在其构造函数的参数中申明所依赖的 Service，如下 TypeScript 代码所示：

```tsx
class Client {
	constructor(serviceA: ServiceA, serviceB: ServiceB) {
		// 注入器在建立Client的时候，将依赖的 Service 通过构造函数参数传递给 Client
		// Client此时即可将依赖的服务保存在自身状态内：
		this.serviceA = serviceA;
		this.serviceB = serviceB;
	}
}
```

通过这种模式，Client 在使用的时候不需要去自己构造需要的 Service 对象，这样的好处之一就就是将对象的构造和行为分离，在引入接口后，Client 和 Service 的依赖关系只需要接口来定义，Client 在构造函数参数中主需要什么依赖的服务接口，结合注入器，能给客户对象更多的灵活性和解耦。

最后，在 VSCode 的源码中，大部分基础功能是被实现为服务对象，一个服务的定义分为两部分：

* 服务的接口
* 服务的标识：通过 TypeScript 中的装饰器实现

Client 在申明依赖的 Service 时，同样时在构造函数参数中申明，实例如下：

```ts
class Client {
	constructor(
		@IModelService modelService: IModelService,
		@optional(IEditorService) editorService: IEditorService,
	) {
		// ...
		this.modelService = modelService;
		this.editorService = editorService;
	}
}
```

这里，申明的客户对象 `Client`，所依赖的 `Service`有 `IModelService`和 `IEditorService`，其中装饰器 `@IModelService`是 ModelService 的标识，后面的 `IModelService`只是 TypeScript 中的接口定义；`@optional(IEditorService)`是 EditorService 的标识，同时通过 `optional`的装饰申明为可选的依赖。

最后，在代码中实际使用 `Client`对象时，需要通过注入器提供的 `instantiationService`来实例化的到 Client 的实例：

```ts
const myClient = instantiationService.createInstance(Client);
```

### 4.3 基本服务

#### 4.3.1 存储服务 - IStorageMainService

> src/vs/platform/storage/electron-main/storageMainService.ts

#### 4.3.2 配置服务 - IConfigurationService

> src/vs/platform/configuration/common/configurationService.ts

#### 4.3.3 状态服务 - IStateService

> src/vs/platform/state/node/stateService.ts

#### 4.3.4 生命周期服务 - ILifecycleMainService

> src/vs/platform/lifecycle/electron-main/lifecycleMainService.ts

### 4.4 窗口和视图(Webview)管理

#### 4.4.1 浏览器窗口 - ICodeWindow

> src/vs/platform/windows/electron-main/windowImpl.ts

#### 4.4.2 窗口管理服务 - IWindowsMainService

> src/vs/platform/windows/electron-main/windowsMainService.ts

#### 4.4.4 Webview 管理服务 - IWebviewManagerService

> src/vs/platform/webview/electron-main/webviewMainService.ts

## 五、服务实例化过程

5.2 InstantiationService：负责实例化 Service 的 Service

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

#### 5.2.1 ServiceCollection 服务集合

内部封装了 Map 用于存储 **ServiceIdentifier** 和 **InstanceOrDescriptor** 的映射关系。

ServiceIdentifier 即描述 Service 的标识符对象，对象上有一个 type 字段。其使用方式是作为 Service 构造函数**参数的装饰器**，TS 解析类定义时（非实例化阶段）会调用 ServiceIdentifier 内部逻辑来**收集依赖关系**，在类的实例化阶段会使用这些依赖信息来创建依赖图谱进行依赖分析，实现在实例化之前确保所有依赖服务已经被创建好了。

```ts
function storeServiceDependency(id: Function, target: Function, index: number): void {
	if ((target as any)[_util.DI_TARGET] === target) {
		(target as any)[_util.DI_DEPENDENCIES].push({ id, index });
	} else {
		(target as any)[_util.DI_DEPENDENCIES] = [{ id, index }];
		(target as any)[_util.DI_TARGET] = target;
	}
}
```

```ts
export class DialogMainService implements IDialogMainService {
	...
	constructor(
		@ILogService private readonly logService: ILogService,
		@IProductService private readonly productService: IProductService
	) {
	  ...
	}
}
```

InstanceOrDescriptor 即 Service 实例或 Service 描述对象。因为有些服务是需要延迟创建的，因此只需要临时存储一下创建过程。

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

#### 5.2.2 Graph 服务依赖图谱

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

#### 5.2.3 创建依赖服务

创建一个服务实例时，会先收集该服务的所有依赖服务（ServiceIdentifier 实现依赖分析），然后根据这些依赖服务来创建服务依赖图谱。图谱创建之后，会先选出出度为的 0 的根节点（无其它依赖服务）进行创建，创建好后将根节点从图谱中删除，过程中使用 while 循环重复上述过程直到图谱中没有任何节点。

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

#### 5.2.4 创建服务实例

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

## 六、VSCode 应用入口

### 6.1 CodeMain

> src/vs/code/electron-main/main.ts

VSCode 至多只会启用一个 CodeMain 实例，它是整个 VSCode 应用的入口，它的入口方法是 main 方法，会调用 `startup` 方法启动应用。

CodeMain 的主要职责：

- 调用 createServices 方法创建所有 `基础服务`和 `InstantiationService 实例化服务`。
- 调用 initServices 方法创建目录并初始化服务。
- 创建 mainProcessNodeIpcServer 主 IPC 服务器，如果此步骤出错，则表明已经有其它 VSCode 实例在运行了，立即结束当前进程。
- 通过 lifecycleMainService.onWillShutdown 方法监听应用退出事件用于关闭服务和清理数据。
- 开始创建 CodeApplication 服务并调用 startup() 初始化。

```ts
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

  ...

  // Files
  const fileService = new FileService(logService);
  services.set(IFileService, fileService);
  const diskFileSystemProvider = new DiskFileSystemProvider(logService);
  fileService.registerProvider(Schemas.file, diskFileSystemProvider);

  // FileUserDataProvider for atomic read / write operations.
  fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, logService));

  ...

  services.set(ILifecycleMainService, new SyncDescriptor(LifecycleMainService, undefined, false));

  return [new InstantiationService(services, true), instanceEnvironment, environmentMainService, configurationService, stateService, bufferLogger, productService, userDataProfilesMainService];
 }

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

### 6.2 CodeApplication

> src/vs/code/electron-main/app.ts

CodeApplication 也只会被初始化一次，其主要职责是：

- 配置 Electron Session 会话：
  - 使用 session.setPermissionRequestHandler/session.setPermissionCheckHandler 设置权限请求处理器。
  - 使用 session.webRequest.onBeforeRequest 绑定请求拦截器，禁止非法访问。
  - 使用 session.webRequest.onHeadersReceived 过滤非法 SVG 请求地址和 Content Type。
  - 通过 session.setCodeCachePath 设置代码缓存路径并与 Chrome 缓存地址隔离。
- 注册监听器 registerListeners：
  - 捕获进程 process 的 uncaughtException/unhandledRejection 事件，记录错误日志。
  - 通过 lifecycleMainService.onWillShutdown 监听应用退出事件，用于关闭服务和清理数据。
  - 使用 registerContextMenuListener 注册右键菜单事件监听器，通过异步事件异步菜单显示。
  - 监听 MacOS `activate` 事件，用于激活应用。
  - 监听 `web-contents-created` 事件拿到 webcontents，通过 contents.setWindowOpenHandler 来处理新窗口打开事件。
  - 监听并拦截 `open-file` 事件，使用 windowsMainService 内置服务来打开文件。
  - 监听 `new-window-for-tab` 事件，使用 windowsMainService 内置服务来打开新窗口。
  - 通过主进程 IPC 通信监听各种 `vscode:xxx` 内部事件，比如：`vscode:reloadWindow`。
- 调用 startup() 方法启动应用：
  - 创建 `ElectronIPCServer` 服务，并通过 lifecycleMainService.onWillShutdown 监听关闭事件。
  - 创建 sharedProcess 共享进程服务。
  - 初始化通道 initChannels（对通道还不太了解）。
  - 初始化内部服务，比如：更新服务 IUpdateService、窗口服务 IWindowsMainService、对话框服务 IDialogMainService、键盘布局服务 IKeyboardLayoutMainService、菜单栏服务 IMenubarMainService、存储服务 IStorageMainService... 值得注意的是大部分服务都是延迟创建的，可以降低瞬时CPU和内存占用。
  - 上一步中的所有服务集合将被当前 mainInstantiationService 的子服务实例 InstantiationService 管理。

```ts
/**
 * The main VS Code application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
export class CodeApplication extends Disposable {

 private windowsMainService: IWindowsMainService | undefined;
 private nativeHostMainService: INativeHostMainService | undefined;

 constructor(
  private readonly mainProcessNodeIpcServer: NodeIPCServer,
  private readonly userEnv: IProcessEnvironment,
  @IInstantiationService private readonly mainInstantiationService: IInstantiationService,
  @ILogService private readonly logService: ILogService,
  @ILoggerService private readonly loggerService: ILoggerService,
  @IEnvironmentMainService private readonly environmentMainService: IEnvironmentMainService,
  @ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
  @IConfigurationService private readonly configurationService: IConfigurationService,
  @IStateService private readonly stateService: IStateService,
  @IFileService private readonly fileService: IFileService,
  @IProductService private readonly productService: IProductService,
  @IUserDataProfilesMainService private readonly userDataProfilesMainService: IUserDataProfilesMainService,
 ) {
  super();

  this.configureSession();
  this.registerListeners();
 }

 private configureSession(): void {

  const isUrlFromWebview = (requestingUrl: string | undefined) => requestingUrl?.startsWith(`${Schemas.vscodeWebview}://`);
  const allowedPermissionsInWebview = new Set([
   'clipboard-read',
   'clipboard-sanitized-write',
  ]);

  session.defaultSession.setPermissionRequestHandler(() => {...});
  session.defaultSession.setPermissionCheckHandler(() => {...});
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
   const uri = URI.parse(details.url);
   if (uri.scheme === Schemas.vscodeWebview) {
    if (!isAllowedWebviewRequest(uri, details)) {
     this.logService.error('Blocked vscode-webview request', details.url);
     return callback({ cancel: true });
    }
   }
   ...

   return callback({ cancel: false });
  });

  // Configure SVG header content type properly
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {...});

  ...

  //#region Code Cache
  defaultSession.setCodeCachePath(join(this.environmentMainService.codeCachePath, 'chrome'));
 }

 private registerListeners(): void {

  // We handle uncaught exceptions here to prevent electron from opening a dialog to the user
  process.on('uncaughtException', error => {...});
  process.on('unhandledRejection', (reason: unknown) => onUnexpectedError(reason));

  // Dispose on shutdown
  this.lifecycleMainService.onWillShutdown(() => this.dispose());
  ...
  // macOS dock activate
  app.on('activate', async (event, hasVisibleWindows) => {
   this.logService.trace('app#activate');

   // Mac only event: open new window when we get activated
   if (!hasVisibleWindows) {
    await this.windowsMainService?.openEmptyWindow({ context: OpenContext.DOCK });
   }
  });

  app.on('web-contents-created', (event, contents) => {...});

  ...

  app.on('new-window-for-tab', async () => {
   await this.windowsMainService?.openEmptyWindow({ context: OpenContext.DESKTOP }); //macOS native tab "+" button
  });

  ...

  validatedIpcMain.on('vscode:reloadWindow', event => event.sender.reload());

 }

 async startup(): Promise<void> {
  ...

  // Main process server (electron IPC based)
  const mainProcessElectronServer = new ElectronIPCServer();
  this.lifecycleMainService.onWillShutdown(e => {
   if (e.reason === ShutdownReason.KILL) {
    mainProcessElectronServer.dispose();
   }
  });

  // Shared process
  const { sharedProcessReady, sharedProcessClient } = this.setupSharedProcess(machineId);

  // Services
  const appInstantiationService = await this.initServices(machineId, sharedProcessReady);

  // Init Channels
  appInstantiationService.invokeFunction(accessor => this.initChannels(accessor, mainProcessElectronServer, sharedProcessClient));

  // Signal phase: ready - before opening first window
  this.lifecycleMainService.phase = LifecycleMainPhase.Ready;

  // Open Windows
  await appInstantiationService.invokeFunction(accessor => this.openFirstWindow(accessor, initialProtocolUrls));

  // Signal phase: after window open
  this.lifecycleMainService.phase = LifecycleMainPhase.AfterWindowOpen;

  // Post Open Windows Tasks
  this.afterWindowOpen();

  // Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
  const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
   this._register(runWhenIdle(() => this.lifecycleMainService.phase = LifecycleMainPhase.Eventually, 2500));
  }, 2500));
  eventuallyPhaseScheduler.schedule();
 }

 private setupSharedProcess(machineId: string): { sharedProcessReady: Promise<MessagePortClient>; sharedProcessClient: Promise<MessagePortClient> } {
  ...
 }

 private async initServices(machineId: string, sharedProcessReady: Promise<MessagePortClient>): Promise<IInstantiationService> {
  const services = new ServiceCollection();
  // Windows
 services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService, [machineId, this.userEnv], false));
  ...

  return this.mainInstantiationService.createChild(services);
 }

 private initChannels(accessor: ServicesAccessor, mainProcessElectronServer: ElectronIPCServer, sharedProcessClient: Promise<MessagePortClient>): void {
  const launchChannel = ProxyChannel.fromService(accessor.get(ILaunchMainService), { disableMarshalling: true });
  this.mainProcessNodeIpcServer.registerChannel('launch', launchChannel);
    ...
 }

 private async openFirstWindow(accessor: ServicesAccessor, initialProtocolUrls: IInitialProtocolUrls | undefined): Promise<ICodeWindow[]> {
  const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
    ...
  // default: read paths from cli
  return windowsMainService.open({
   context,
   cli: args,
   forceNewWindow: args['new-window'] || (!hasCliArgs && args['unity-launch']),
   diffMode: args.diff,
   mergeMode: args.merge,
   noRecentEntry,
   waitMarkerFileURI,
   gotoLineMode: args.goto,
   initialStartup: true,
   remoteAuthority,
   forceProfile,
   forceTempProfile
  });
 }

 private afterWindowOpen(): void {
  // Windows: mutex
  this.installMutex();
  ...
 }
}
```
