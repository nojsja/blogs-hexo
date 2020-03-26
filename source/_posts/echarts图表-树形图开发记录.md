---
title: "echarts图表-树形图开发记录"
catalog: true
toc_nav_num: true
date:   2020-03-22 18:24:00
subtitle: "Echarts Tree"
header-img: "/blogs/img/article_header/article_header.png"
tags:
- Echarts
- React
catagories:
- Echarts
updateDate: 2020-03-22 18:24:00
top: 
---

### 目录

1. 前言

2. 树形图功能需求以及遇到的问题分析

3. 问题I：V4版本label自定义效果设置不生效

4. 问题II：tree图使用自定义图片加载显示不完全

5. 问题III：tree图自定义节点选中效果和组件自带渲染效果冲突

### 前言

-------------
Echarts树形图Tree可以用来展示树形数据结构各节点的层级关系，比如一个使用情况就是文件系统存在多个快照，每一级快照基于上一级生成，存在父级和子级关系对应关系，且Root根只有一个，即文件系统本身，完全适用于树形图的使用场景。

![snapshot](/blogs/img/article/snapshot.png)

### 树形图功能需求以及遇到的问题分析

-------------------------------

1. 文件系统快照每一层级的节点支持单个选中，很多操作都是基于某一个快照节点的，比
如快照的恢复、删除、设置，考虑选中效果的区别使用label自定义富文本样式实现，但是会遇到渲染的时侯echarts一些自己的状态更新和我们我们自定义的选中状态的更新冲突问题，且V4版本echarts tree的富文本配置后也并未生效。

![snapshot_select](/blogs/img/article/snapshot_select.png)

2. 文件系统快照每一层级的节点标识(Symbol)可能不同，需要支持使用自定义图片，echarts的symbol是直接支持使用img-src和base64 img-str的，但是会遇到图片在某些时候不能完全被渲染(图片像是被设置了半透明)或直接完全不能被渲染出来的问题。

![tree-1](/blogs/img/article/tree-1.png)
![tree-2](/blogs/img/article/tree-2.png)
![tree-3](/blogs/img/article/tree-3.png)


### 问题I：V4版本label自定义效果设置不生效

-------------------------------

series-tree.label.formatter
>标签内容格式器，支持字符串模板和回调函数两种形式，字符串模板与回调函数返回的字符串均支持用 \n 换行。

#### 字符串模板的使用  

1. 模板变量有：  
* {a}：系列名。
* {b}：数据名。
* {c}：数据值。
* {d}：百分比。
* {@xxx}：数据中名为'xxx'的维度的值，如{@product}表示名为'product'` 的维度的值。
* {@[n]}：数据中维度n的值，如{@[3]}` 表示维度 3 的值，从 0 开始计数。

2. 示例：  
formatter: '{b}: {d}'

3. 回调函数格式：  
(params: Object|Array) => string，
参数 params 是 formatter 需要的单个数据集，格式如下：
```js
{
    componentType: 'series',
    // 系列类型
    seriesType: string,
    // 系列在传入的 option.series 中的 index
    seriesIndex: number,
    // 系列名称
    seriesName: string,
    // 数据名，类目名
    name: string,
    // 数据在传入的 data 数组中的 index
    dataIndex: number,
    // 传入的原始数据项
    data: Object,
    // 传入的数据值。在多数系列下它和 data 相同。在一些系列下是 data 中的分量（如 map、radar 中）
    value: number|Array|Object,
    // 坐标轴 encode 映射信息，
    // key 为坐标轴（如 'x' 'y' 'radius' 'angle' 等）
    // value 必然为数组，不会为 null/undefied，表示 dimension index 。
    // 其内容如：
    // {
    //     x: [2] // dimension index 为 2 的数据映射到 x 轴
    //     y: [0] // dimension index 为 0 的数据映射到 y 轴
    // }
    encode: Object,
    // 维度名列表
    dimensionNames: Array<String>,
    // 数据的维度 index，如 0 或 1 或 2 ...
    // 仅在雷达图中使用。
    dimensionIndex: number,
    // 数据图形的颜色
    color: string,
}
```

#### 字符串模板不生效问题1
直接将formatter自定义函数和富文本标识配置在`series[0].label`下，结果以上配置都无效，正确方法是在`series[0].label.normal`下配置富文本标识声明，而formatter需要定义在数据集data的各个数据项中，`normal`表示常规效果，与之对应的`emphasis`是鼠标划过高亮效果。
![tree-4](/blogs/img/article/tree-4.png)

series-tree.label.rich支持的所有CSS属性：
```js
{
  color , fontStyle , fontWeight , fontFamily , fontSize , align , verticalAlign , lineHeight , backgroundColor , borderColor , borderWidth , borderRadius , padding , shadowColor , shadowBlur , shadowOffsetX , shadowOffsetY , width , height , textBorderColor , textBorderWidth , textShadowColor , textShadowBlur , textShadowOffsetX , textShadowOffsetY
} 
```

series-tree.data.label中配置label.formatter：

```js
const rawTreeData = {
          name: 'snapshotA',
          selected: false, // 自定义选择控制属性selected
          collapsed: false, // 覆盖组件自带的collapsed效果
          label: {
            // * 直接引用上层定义的formatter即可，复用函数对象
            formatter: this.echartsInitData.series[0].label.normal.formatter,
          },
          children: [
            ...
          ],
}
```

![tree-5](/blogs/img/article/tree-5.png)

### 问题II：tree图使用自定义图片加载显示不完全

-------------------------------

#### 解决方案1(无效)：使用对象深比较函数避免多次渲染
> 使用此方法在React生命周期componentDidUpdate里判断options是否发生改变，从而避免了echarts组件多次render的情况，但验证后发现避免了一些组件卡顿的情况，但也存在自定义tree 节点图片加载不完全的情况，此解决方案无效。

1. Js对象深比较函数deepComparison定义

```js
/**
 * [deepComparison 深比较]
 * @param  {[any]} data [any]
 * @return {[Boolean]}      [是否相同]
 */
export function deepComparison(data1, data2) {
  const { hasOwnProperty } = Object.prototype;
  // 获取变量类型
  const getType = (d) => {
    if (typeof d === 'object') {
      if (!(d instanceof Object)) {
        return 'null';
      }
      if (d instanceof Date) {
        return 'date';
      }
      if (d instanceof RegExp) {
        return 'regexp';
      }
      // object / array //
      return 'object';
    }
    if (d !== d) return 'nan';
    return (typeof d).toLowerCase();
  };
  // 基本类型比较
  const is = (d1, d2, type) => {
    if (type === 'nan') return true;
    if (type === 'date' || type === 'regexp') return d1.toString() === d2.toString();
    return (d1 === d2);
  };
  // 递归比较
  const compare = (d1, d2) => {
    const type1 = getType(d1);
    const type2 = getType(d2);
    if (type1 !== type2) {
      return false;
    }
    if (type1 === 'object') {
      const keys1 = Object.keys(d1).filter(k => hasOwnProperty.call(d1, k));
      const keys2 = Object.keys(d2).filter(k => hasOwnProperty.call(d2, k));
      if (keys1.length !== keys2.length) {
        return false;
      }
      for (let i = 0; i < keys1.length; i += 1) {
        if (
          !keys2.includes(keys1[i]) ||
          !compare(d1[keys1[i]], d2[keys1[i]])) {
          return false;
        }
      }
      return true;
    }
    return is(d1, d2, type1);
  };

  return compare(data1, data2);
}
```

2.深度比较函数使用

```js
  componentDidUpdate() {
    console.log('update');
    const { treeData } = this.props;
    const rawTreeData = toJS(treeData);
    if (!deepComparison(this.echartsTreeData, rawTreeData)) {
      console.log('change');
      this.echartsTreeData = rawTreeData;
      const optionData = this.echartsElement.getOption();
      optionData.series[0].data = [rawTreeData];
      console.log(optionData);
      // this.echartsElement.clear();
      this.echartsElement.setOption(optionData, true);
    }
  }
```

#### 解决方案2(无效)：使用base64字符串替换img url
>由于方案1无效，判断可能是由于图片异步加载引起的渲染问题，对小图片尝试直接使用base64硬编码在代码里，结果发现仍然无效。

![tree-6](/blogs/img/article/tree-6.png)

#### 解决方案3(有效)：禁用动画加载
>由解决方案2可知，问题原因排除img异步加载的问题，问题定位到echarts组件自身的渲bug，通过多次设置setOption方法的参数，发现设置动画取消可以避免由于echarts图自身的渲染过程引起的图片加载不全问题。

```js
const chartOption = {
  animation: true, // 解决渲染不全的问题
  tooltip: {
    trigger: 'item',
    triggerOn: 'mousemove',
  },
  series: [
    ...
  ],
};
```

#### 解决方案4(有效)：组件渲染完成后重新手动渲染
>echarts初始化后的组件可以挂载钩子函数和监听一些浏览器事件，其中有一个事件名为finished，表示echarts图表本次渲染完成。既然我们之前的最后一次渲染导致图片未完全加载，那么可以在最后这次渲染完成之后再读取echarts组件自带的options然后重新渲染一次，即可解决问题，需要注意的是，finished事件可能在短时间内被调用数次，在监听时注意使用函数防抖的思想让短时间内的多次finished事件回调只执行一次。

1. 函数防抖声明  
函数节流和函数防抖在浏览器渲染优化方面还是用得挺多：
```js
/**
   * @param  {Function} fn         [回调函数]
   * @param  {[Time]}   delayTime  [延迟时间(ms)]
   * @param  {Boolean}  isImediate [是否需要立即调用]
   * @param  {[type]}   args       [回调函数传入参数]
  */
export function fnDebounce() {
  const fnObject = {};
  let timer;

  return (fn, delayTime, isImediate, args) => {
    // 设置定时器方法
    const setTimer = () => {
      timer = setTimeout(() => {
        fn(args);
        // 清除定时器
        clearTimeout(timer);
        delete (fnObject[fn]);
      }, delayTime);

      fnObject[fn] = {
        delayTime,
        timer,
      };
    };
    // 立即调用
    if (!delayTime || isImediate) return fn(args);
    // 判断函数是否已经在调用中
    if (fnObject[fn]) {
      clearTimeout(timer);
      setTimer(fn, delayTime, args);
    } else {
      setTimer(fn, delayTime, args);
    }
  };
}
```

2. finished事件监听和函数防抖的应用  
其实在此基础上还能做的优化就是在组件第一次加载自定义symbol图片后就将`finished`事件监听取消掉，减少渲染次数。
```js
class FsPageSnapShotBody extends Component {
  echartsElement= null
  echartsTreeData = null;

  // 初始化事件防抖
  fnDebounce = fnDebounce();

  pendingEventsTrigger = (nodeName) => {
    const optionData = this.echartsElement.getOption();
    this.echartsElement.setOption(optionData, true);
  };

  componentDidMount() {
    const { snapshot } = this.props;
    this.echartsElement = echarts.init(this.refs.fsSnapShot);
    this.echartsElement.setOption(snapshot.echartsInitData);
    // finished事件监听
    this.echartsElement.on('finished', (params) => {
      // 延迟时间设置为200ms
      this.fnDebounce(this.pendingEventsTrigger, 200, false, null);
    });
    window.addEventListener('resize', this.resizeCharts);
  }
  componentDidUpdate() {
    ...
  }
  resizeCharts = () => {
    this.echartsElement.resize();
  }
  componentWillUnmount() {
    echarts.dispose(this.echartsElement);
    window.removeEventListener('resize', this.resizeCharts);
  }
  onClickChart = (e) => {
    ...
  }
  onDoubleClickChart = (e) => {
    ...
  }
  render() {
    ...
  }
}
```


### 问题III：tree图自定义节点选中效果和组件自带渲染效果冲突

-------------------------------
节点选中效果原理是监听echarts的`dblclick`双击事件，双击后改变`options.series[0].data`数据项里的`selected`属性配置，然后label.formatter根据此属性能够应用富文本类名里声明的高亮或普通文本的类名。值得注意的是echarts渲染时自身已经对过长层级的tree数据做了渲染优化，导致过深层级的展开/折叠状态不被控制，每次重新渲染后会导致已经折叠的树层级展开或是已经展开的树层级折叠，非常影响用户操作，因此需要把树层级数据每一层的折叠纳入强制属性控制状态，即在`options.series[0].data`中额外声明`collapsed:[Boolean]`参数，同时禁用tree自带的折叠/展开控制。

#### 冲突1：在设置了echarts渲染动画延迟更新的情况下节点选中效果无效
如果直接通过dblclick双击事件触发函数设置某个节点选中状态的属性`selected:true`，那么表现为：`selected`状态不常驻，变成了类似`mouseover`的鼠标划过状态触发；
1. 动画延迟更新属性声明  
```js
/* Tree的外层数据 */
echartsInitData= {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
    },
    series: [
      {
        {...},
        leaves: {...},
        expandAndCollapse: false,
        animationDuration: 100,
        animationDelayUpdate: 300, // 动画延迟更新
        animationDurationUpdate: 400,
      },
    ],
  }
```

2. 冲突效果表现

![tree-bug1](/blogs/img/article/tree-bug1.gif)

#### 冲突2：鼠标的悬浮操作导致选中效果无效
按照上述表现，我尝试在触发函数更新tree节点选中状态之前设置一个延迟，延迟时间大于tree组件的动画延迟更新设置时间(上面设置为了`300ms`)，结果发现：如果在双击tree节点的时候鼠标一直放在节点上的话，鼠标移开后，表现和上面一样，如果双击了tree节点之后马上把鼠标从该节点移开的话则选中状态正常(太不容易了！)，推测是我们触发echarts组件更新的时候，echarts自身的组件状态管理和我们自定义的组件更新函数(以上表现为设置tree节点数据的`selected`属性触发label.formatter的渲染效果变化)两者冲突。

1. 设置`selected`属性更改函数的延迟时间  
```js
/* React组件自定义方法-选中一个元素 */
onDoubleClickChart = (e) => {
    const { name } = e.data;
    this.selectedNodeName = name;
    setTimeout(() => {
      this.props.snapshot.chooseSnapShot(name);
    }, 400);
  }
```

2. 冲突效果表现
![tree-bug2](/blogs/img/article/tree-bug2.gif)

#### 解决方法
方法同于上面提到的`finished事件监听和函数防抖的应用`，在echarts组件最终渲染完成后增加一次额外渲染解决问题，但是也仍然会有`selected`状态稍稍延迟更新和`selected`状态闪烁一次的问题，不妨碍使用，但是应该有更优的解决办法尚待实现。

1. 代码概览  
```js
class FsPageSnapShotBody extends Component {
  echartsElement= null
  echartsTreeData = null;
  selectedNodeName = null;

  // 初始化事件防抖
  dblclickFnDebounce = fnDebounce();

  pendingEventsTrigger = (nodeName) => {
    const optionData = this.echartsElement.getOption();
    this.echartsElement.setOption(optionData, true);
  };

  componentDidMount() {
    const { snapshot } = this.props;
    this.echartsElement = echarts.init(this.refs.fsSnapShot);
    this.echartsElement.setOption(snapshot.echartsInitData);
    this.echartsElement.on('dblclick', this.onDoubleClickChart);
    this.echartsElement.on('click', this.onClickChart);
    // finished事件监听
    this.echartsElement.on('finished', (params) => {
      if (this.selectedNodeName) {
        // 防抖延迟时间设置为200ms
        this.dblclickFnDebounce(this.pendingEventsTrigger, 200, false, this.selectedNodeName);
      }
    });

    snapshot.getSnapShotRequest();
    window.addEventListener('resize', this.resizeCharts);
  }
  componentDidUpdate() {
    ...
  }
  resizeCharts = () => {
    this.echartsElement.resize();
  }
  componentWillUnmount() {
    echarts.dispose(this.echartsElement);
    window.removeEventListener('resize', this.resizeCharts);
  }
  onClickChart = (e) => {
    ...
  }
  onDoubleClickChart = (e) => {
    ...
  }
  render() {
    ...
  }
}
```

2. 效果演示
![tree-bug-fix](/blogs/img/article/tree-bug-fix.gif)