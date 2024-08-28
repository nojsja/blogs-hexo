---
title: 理解React：Fiber架构和新旧生命周期
catalog: true
comments: true
indexing: true
subtitle: 'Learning react: The fiber arch and old/new lifecycle'
header-img: >-
  https://nojsja.github.io/static-resources/images/hexo/article_header/article_header.jpg
top: false
tocnum: true
tags:
  - react
categories:
  - React
abbrlink: a33739d5
date: 2021-01-25 11:16:47
---

### ➣ React Fiber原理
--------------------

#### React架构

  - 1）Virtual DOM 层，描述页面长什么样  
  - 2）Reconciler 层，负责调用组件生命周期方法，进行Diff运算等  
  - 3）Renderer 层，根据不同的平台，渲染出相应的页面，如 ReactDOM 和 ReactNative

#### React15遗留问题

![StackReconciler](http://nojsja.github.io/static-resources/images/react/StackReconciler.jpg)
  - 1）浏览器的整体渲染是多线程的，包括GUI渲染线程、JS引擎线程、事件触发线程、定时触发器线程和异步http请求线程。页面绘制和JS运算是互斥的线程，两者不能同时进行。  
  - 2）React15使用JS的函数调用栈(Stack Reconciler)递归渲染界面，因此在处理DOM元素过多的复杂页面的频繁更新时，大量同步进行的任务(树diff和页面render)会导致界面更新阻塞、事件响应延迟、动画卡顿等，因此React团队在16版本重写了React Reconciler架构。

#### React16问题解决

![FiberReconciler](http://nojsja.github.io/static-resources/images/react/FiberReconciler.jpg)
 - 1）`Fiber Reconciler`架构可以允许同步阻塞的任务拆分成多个小任务，每个任务占用一小段时间片，任务执行完成后判断有无空闲时间，有则继续执行下一个任务，否则将控制权交由浏览器以让浏览器去处理更高优先级的任务，等下次拿到时间片后，其它子任务继续执行。整个流程类似CPU调度逻辑，底层是使用了浏览器API`requestIdleCallback`。  
- 2）为了实现整个Diff和Render的流程可中断和恢复，单纯的VirtualDom Tree不再满足需求，React16引入了采用单链表结构的Fiber树，如下图所示。
- 3）FiberReconciler架构将更新流程划分成了两个阶段：1.diff(由多个diff任务组成，任务时间片消耗完后被可被中断，中断后由requestIdleCallback再次唤醒) => 2.commit(diff完毕后拿到fiber tree更新结果触发DOM渲染，不可被中断)。左边灰色部分的树即为一颗fiber树，右边的workInProgress为中间态，它是在diff过程中自顶向下构建的树形结构，可用于断点恢复，所有工作单元都更新完成之后，生成的workInProgress树会成为新的fiber tree。
- 4）fiber tree中每个节点即一个工作单元，跟之前的VirtualDom树类似，表示一个虚拟DOM节点。workInProgress tree的每个fiber node都保存着diff过程中产生的effect list，它用来存放diff结果，并且底层的树节点会依次向上层merge effect list，以收集所有diff结果。注意的是如果某些节点并未更新，workInProgress tree会直接复用原fiber tree的节点(链表操作)，而有数据更新的节点会被打上tag标签。

```js
<FiberNode> : {
    stateNode,    // 节点实例
    child,        // 子节点
    sibling,      // 兄弟节点
    return,       // 父节点
}
```

![FiberTree](http://nojsja.github.io/static-resources/images/react/FiberTree.png)

### ➣ React新旧生命周期
--------------------

#### React16.3之前的生命周期

![](http://nojsja.github.io/static-resources/images/react/react-lifecycle-old.png)

1. componentWillMount()  
此生命周期函数会在在组件挂载之前被调用，整个生命周期中只被触发一次。开发者通常用来进行一些数据的预请求操作，以减少请求发起时间，建议的替代方案是考虑放入constructor构造函数中，或者componentDidMount后；另一种情况是在在使用了外部状态管理库时，如Mobx，可以用于重置Mobx Store中的的已保存数据，替代方案是使用生命周期componentWilUnmount在组件卸载时自动执行数据清理。

2. componentDidMount()  
此生命周期函数在组件被挂载之后被调用，整个生命周期中只触发一次。开发者同样可以用来进行一些数据请求的操作；除此之外也可用于添加事件订阅(需要在componentWillUnmount中取消事件订阅)；因为函数触发时dom元素已经渲染完毕，第三种使用情况是处理一些界面更新的副作用，比如使用默认数据来初始化一个echarts组件，然后在componentDidUpdate后进行echarts组件的数据更新。

3. componentWillReceiveProps(nextProps, nexState)  
此生命周期发生在组件挂载之后的组件更新阶段。最常见于在一个依赖于prop属性进行组件内部state更新的非完全受控组件中，非完全受控组件即组件内部维护state更新，同时又在某个特殊条件下会采用外部传入的props来更新内部state，注意不要直接将props完全复制到state，否则应该使用完全受控组件`Function Component`，一个例子如下：
```js
class EmailInput extends Component {
  state = { email: this.props.email };

  render() {
    return <input onChange={this.handleChange} value={this.state.email} />;
  }

  handleChange = e => his.setState({ email: e.target.value });

  componentWillReceiveProps(nextProps) {
    if (nextProps.userID !== this.props.userID) {
      this.setState({ email: nextProps.email });
    }
  }
}
```

4. shouldComponentUpdate(nextProps)  
此生命周期发生在组件挂载之后的组件更新阶段。  
值得注意的是子组件更新不一定是由于props或state改变引起的，也可能是父组件的其它部分更改导致父组件重渲染而使得当前子组件在props/state未改变的情况下重新渲染一次。  
函数被调用时会被传入即将更新的`nextProps`和`nextState`对象，开发者可以通过对比前后两个props对象上与界面渲染相关的属性是否改变，再决定是否允许这次更新(return `true`表示允许执行更新，否则忽略更新，默认为`true`)。常搭配对象深比较函数用于减少界面无用渲染次数，优化性能。在一些只需要简单浅比较props变化的场景下，并且相同的state和props会渲染出相同的内容时，建议使用`React.PureComponnet`替代，在props更新时React会自动帮你进行一次浅比较，以减少不必要渲染。
```js
class EmailInput extends Component {
  state = { email: this.props.email };

  render() {
    return <input onChange={this.handleChange} value={this.state.email} />;
  }

  handleChange = e => his.setState({ email: e.target.value });

  shouldComponentUpdate(nextProps, nextState) {
    if (
      nextProps.userID === this.props.userID &&
      nextState.email == this.state.email
    ) return false;
  }
}
```

5. componenetWillUpdate(newProps, newState)  
此生命周期发生在组件挂载之后的更新阶段。当组件收到新的props或state，并且`shouldComponentUpdate`返回允许更新时，会在渲染之前调此方法，不可以在此生命周期执行`setState`。在此生命周期中开发者可以在界面实际渲染更新之前拿到最新的`nextProps`和`nextState`，从而执行一些副作用：比如触发一个事件、根据最新的props缓存一些计算数据到组件内、平滑界面元素动画等：
```js
 // 需要搭配css属性transition使用
 componentWillUpdate : function(newProps,newState){
    if(!newState.show)
      $(ReactDOM.findDOMNode(this.refs.elem)).css({'opacity':'1'});
    else
      $(ReactDOM.findDOMNode(this.refs.elem)).css({'opacity':'0'});;
  },
  componentDidUpdate : function(oldProps,oldState){
    if(this.state.show)
      $(ReactDOM.findDOMNode(this.refs.elem)).css({'opacity':'1'});
    else
      $(ReactDOM.findDOMNode(this.refs.elem)).css({'opacity':'0'});;
  }
```

6. componenetDidUpdate(prevProps, prevState)  
此生命周期发生在组件挂载之后的更新阶段，组件初次挂载不会触发。当组件的props和state改变引起界面渲染更新后，此函数会被调用，不可以在此生命周期执行`setState`。我们使用它用来执行一些副作用：比如条件式触发必要的网络请求来更新本地数据、使用render后的最新数据来调用一些外部库的执行(例子：定时器请求接口数据动态绘制echarts折线图)：
```js
  ...
  componentDidMount() {
    this.echartsElement = echarts.init(this.refs.echart);
    this.echartsElement.setOption(this.props.defaultData);
    ...
  }
  componentDidUpdate() {
    const { treeData } = this.props;
    const optionData = this.echartsElement.getOption();
    optionData.series[0].data = [treeData];
    this.echartsElement.setOption(optionData, true);
  }
```


7. componentWillUnmount()  
此生命周期发生在组件卸载之前，组件生命周期中只会触发一次。开发者可以在此函数中执行一些数据清理重置、取消页面组件的事件订阅等。

#### React16.3之后的生命周期
![](http://nojsja.github.io/static-resources/images/react/react-lifecycle.png)

React16.3之后React的`Reconciler`架构被重写(Reconciler用于处理生命周期钩子函数和DOM DIFF)，之前版本采用函数调用栈递归同步渲染机制即Stack Reconciler，dom的diff阶段不能被打断，所以不利于动画执行和事件响应。React团队使用Fiber Reconciler架构之后，diff阶段根据虚拟DOM节点拆分成包含多个工作任务单元(FiberNode)的Fiber树(以链表实现)，实现了Fiber任务单元之间的任意切换和任务之间的打断及恢复等等。Fiber架构下的异步渲染导致了`componentWillMount`、`componentWillReceiveProps`、`componentWillUpdate`三个生命周期在实际渲染之前可能会被调用多次，产生不可预料的调用结果，因此这三个不安全生命周期函数不建议被使用。取而代之的是使用全新的两个生命周期函数：`getDerivedStateFromProps`和`getSnapshotBeforeUpdate`。

1. __getDerivedStateFromProps(nextProps, currentState)__  
- 1）定义  
此生命周期发生在组件初始化挂载和组件更新阶段，开发者可以用它来替代之前的`componentWillReceiveProps`生命周期，可用于根据props变化来动态设置组件内部state。  
函数为static静态函数，因此我们无法使用`this`直接访问组件实例，也无法使用`this.setState`直接对state进行更改，以此可以看出React团队想通过React框架的API式约束来尽量减少开发者的API滥用。函数调用时会被传入即将更新的props和当前组件的state数据作为参数，我们可以通过对比处理props然后返回一个对象来触发的组件state更新，如果返回null则不更新任何内容。  
- 2）滥用场景一：直接复制props到state上面  
这会导致父层级重新渲染时，SimpleInput组件的state都会被重置为父组件重新传入的props，不管props是否发生了改变。如果你说使用`shouldComponentUpdate`搭配着避免这种情况可以吗？代码层面上可以，不过可能导致后期`shouldComponentUpdate`函数的数据来源混乱，任何一个prop的改变都会导致重新渲染和不正确的状态重置，维护一个可靠的`shouldComponentUpdate`会更难。
```js
class SimpleInput extends Component {
  state = { attr: ''  };

  render() {
    return <input onChange={(e) => this.setState({ attr: e.target.value })} value={this.state.attr} />;
  }

  static getDerivedStateFromProps(nextProps, currentState) {
    // 这会覆盖所有组件内的state更新！
    return { attr: nextProps.attr };
  }
}
```

- 3）使用场景： 在props变化后选择性修改state  
```js
class SimpleInput extends Component {
  state = { attr: ''  };

  render() {
    return <input onChange={(e) => this.setState({ attr: e.target.value })} value={this.state.attr} />;
  }

  static getDerivedStateFromProps(nextProps, currentState) {
    if (nextProps.attr !== currentState.attr) return { attr: nextProps.attr };
    return null;
  }
}
```
可能导致的bug：在需要重置SimpleInput组件的情况下，由于`props.attr`未改变，导致组件无法正确重置状态，表现就是input输入框组件的值还是上次遗留的输入。

- 4）优化的使用场景一：使用完全可控的组件  
完全可控的组件即没有内部状态的功能组件，其状态的改变完全受父级props控制，这种方式需要将原本位于组件内的state和改变state的逻辑方法抽离到父级。适用于一些简单的场景，不过如果父级存在太多的子级状态管理逻辑也会使逻辑冗余复杂化。
```js
function SimpleInput(props) {
  return <input onChange={props.onChange} value={props.attr} />;
}
```
- 5）优化的使用场景二：使用有key值的非可控的组件  
如果我们想让组件拥有自己的状态管理逻辑，但是在适当的条件下我们又可以控制组件以新的默认值重新初始化，这里有几种方法参考：
```js
/* 
  1. 设置一个唯一值传入作为组件重新初始化的标志
     通过对比属性手动让组件重新初始化
*/
class SimpleInput extends Component {
  state = { attr: this.props.attr, id=""  }; // 初始化默认值

  render() {
    return <input onChange={(e) => this.setState({ attr: e.target.value })} value={this.state.attr} />;
  }

  static getDerivedStateFromProps(nextProps, currentState) {
    if (nextProps.id !== currentState.id)
      return { attr: nextProps.attr, id: nextProps.id };
    return null;
  }
}

/*
  2. 设置一个唯一值作为组件的key值
     key值改变后组件会以默认值重新初始化
  */
class SimpleInput extends Component {
  state = { attr: this.props.attr  }; // 初始化默认值

  render() {
    return <input onChange={(e) => this.setState({ attr: e.target.value })} value={this.state.attr} />;
  }
}

<SimpleInput
  attr={this.props.attr}
  key={this.props.id}
/>

/*
  3. 提供一个外部调用函数以供父级直接调用以重置组件状态
     父级通过refs来访问组件实例，拿到组件的内部方法进行调用
  */
class SimpleInput extends Component {
  state = { attr: this.props.attr  }; // 初始化默认值

  resetState = (value) => {
    this.setState({ attr: value });
  }

  render() {
    return <input onChange={(e) => this.setState({ attr: e.target.value })} value={this.state.attr} />;
  }
}

<SimpleInput
  attr={this.props.attr}
  ref={this.simpleInput}
/>


```


2. componentDidMount()  
...

3. shouldComponentUpdate(nextProps, nexState)  
...

4. __getSnapshotBeforeUpdate(prevProps, prevState)__  
此生命周期发生在组件初始化挂载和组件更新阶段，界面实际render之前。开发者可以拿到组件更新前的`prevProps`和`prevState`，同时也能获取到dom渲染之前的状态(比如元素宽高、滚动条长度和位置等等)。此函数的返回值会被作为`componentWillUpdate`周期函数的第三个参数传入，通过搭配`componentDidUpdate`可以完全替代之前`componentWillUpdate`部分的逻辑，见以下示例。  
```js
class ScrollingList extends Component {
  constructor(props) {
    super(props);
    this.listRef = React.createRef();
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    // 判断是否在list中添加新的items 
    // 捕获滚动​​位置以便我们稍后调整滚动位置。
    if (prevProps.list.length < this.props.list.length) {
      const list = this.listRef.current;
      return list.scrollHeight - list.scrollTop;
    }
    return null;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // 调整滚动位置使得这些新items不会将旧的items推出视图
    // snapshot是getSnapshotBeforeUpdate的返回值）
    if (snapshot !== null) {
      const list = this.listRef.current;
      list.scrollTop = list.scrollHeight - snapshot;
    }
  }

  render() {
    return (
      <div ref={this.listRef}>{/* ...list items... */}</div>
    );
  }
}
```

5. __componenetDidUpdate(prevProps, prevState, shot)__  
此生命周期新增特性：`getSnapshotBeforeUpdate`的返回值作为此函数执行时传入的第三个参数。

6. componenetWillUnmount  
...

