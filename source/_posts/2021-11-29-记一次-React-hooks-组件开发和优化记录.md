---
title: 记一次 React hooks 组件开发和优化记录
subtitle: 记一次 React hooks 组件开发和优化记录
catalog: true
comments: true
indexing: true
header-img: >-
  https://nojsja.gitee.io/static-resources/images/hexo/article_header/article_header.jpg
top: false
tocnum: true
tags:
  - react
  - hooks
categories:
  - React
abbrlink: adb1f235
date: 2021-11-29 10:30:21
---


## 一、Contents

- [一、Contents](#%E4%B8%80contents)
- [二、前言](#%E4%BA%8C%E5%89%8D%E8%A8%80)
- [三、组件功能描述](#%E4%B8%89%E7%BB%84%E4%BB%B6%E5%8A%9F%E8%83%BD%E6%8F%8F%E8%BF%B0)
  - [1. 查看模式](#1-%E6%9F%A5%E7%9C%8B%E6%A8%A1%E5%BC%8F)
  - [2. 编辑模式](#2-%E7%BC%96%E8%BE%91%E6%A8%A1%E5%BC%8F)
- [四、预备知识：Antd Form 组件的 initialValues 和 resetFields](#%E5%9B%9B%E9%A2%84%E5%A4%87%E7%9F%A5%E8%AF%86antd-form-%E7%BB%84%E4%BB%B6%E7%9A%84-initialvalues-%E5%92%8C-resetfields)
  - [I. 常见的 Antd Form 组件使用示例](#i-%E5%B8%B8%E8%A7%81%E7%9A%84-antd-form-%E7%BB%84%E4%BB%B6%E4%BD%BF%E7%94%A8%E7%A4%BA%E4%BE%8B)
  - [II. initialValues 不更新的情况](#ii-initialvalues-%E4%B8%8D%E6%9B%B4%E6%96%B0%E7%9A%84%E6%83%85%E5%86%B5)
- [五、开发过程](#%E4%BA%94%E5%BC%80%E5%8F%91%E8%BF%87%E7%A8%8B)
  - [I. 源码](#i-%E6%BA%90%E7%A0%81)
  - [II. 实现思路](#ii-%E5%AE%9E%E7%8E%B0%E6%80%9D%E8%B7%AF)
    - [1. 使用 Antd Table 组件进行整体渲染](#1-%E4%BD%BF%E7%94%A8-antd-table-%E7%BB%84%E4%BB%B6%E8%BF%9B%E8%A1%8C%E6%95%B4%E4%BD%93%E6%B8%B2%E6%9F%93)
    - [2. 使用 Antd Form 组件的校验功能实现实时验证字段](#2-%E4%BD%BF%E7%94%A8-antd-form-%E7%BB%84%E4%BB%B6%E7%9A%84%E6%A0%A1%E9%AA%8C%E5%8A%9F%E8%83%BD%E5%AE%9E%E7%8E%B0%E5%AE%9E%E6%97%B6%E9%AA%8C%E8%AF%81%E5%AD%97%E6%AE%B5)
    - [3. 使用 react-quill 富文本组件展示和编辑富文本](#3-%E4%BD%BF%E7%94%A8-react-quill-%E5%AF%8C%E6%96%87%E6%9C%AC%E7%BB%84%E4%BB%B6%E5%B1%95%E7%A4%BA%E5%92%8C%E7%BC%96%E8%BE%91%E5%AF%8C%E6%96%87%E6%9C%AC)
    - [4. 编辑模式和查看模式的状态切换处理](#4-%E7%BC%96%E8%BE%91%E6%A8%A1%E5%BC%8F%E5%92%8C%E6%9F%A5%E7%9C%8B%E6%A8%A1%E5%BC%8F%E7%9A%84%E7%8A%B6%E6%80%81%E5%88%87%E6%8D%A2%E5%A4%84%E7%90%86)
    - [5. 全选模式的处理](#5-%E5%85%A8%E9%80%89%E6%A8%A1%E5%BC%8F%E7%9A%84%E5%A4%84%E7%90%86)
  - [III. 组件优化点](#iii-%E7%BB%84%E4%BB%B6%E4%BC%98%E5%8C%96%E7%82%B9)
    - [1. 使用 React.memo 减少富文本组件的无用渲染](#1-%E4%BD%BF%E7%94%A8-reactmemo-%E5%87%8F%E5%B0%91%E5%AF%8C%E6%96%87%E6%9C%AC%E7%BB%84%E4%BB%B6%E7%9A%84%E6%97%A0%E7%94%A8%E6%B8%B2%E6%9F%93)
    - [2. 使用函数去抖合理化富文本组件输入时的 onChange 回调](#2-%E4%BD%BF%E7%94%A8%E5%87%BD%E6%95%B0%E5%8E%BB%E6%8A%96%E5%90%88%E7%90%86%E5%8C%96%E5%AF%8C%E6%96%87%E6%9C%AC%E7%BB%84%E4%BB%B6%E8%BE%93%E5%85%A5%E6%97%B6%E7%9A%84-onchange-%E5%9B%9E%E8%B0%83)
- [六、写在最后](#%E5%85%AD%E5%86%99%E5%9C%A8%E6%9C%80%E5%90%8E)

## 二、前言

最近在使用 hooks 开发业务组件的过程中，发现了一些值得记录的点，写这篇文章的目的是记下一些问题的解决思路，方便以后复盘。

## 三、组件功能描述

需要实现一个可编辑表格组件，表格内部由输入框和富文本框组成，表格支持编辑和查看两种模式。点击编辑进入编辑模式，编辑模式中点击取消返回查看模式，同时重置已经输入的数据为编辑前的数据。编辑模式中点击保存会保存当前输入的数据，并退出编辑模式。

### 1. 查看模式

![react-hooks1.png](https://nojsja.gitee.io/static-resources/images/react/react-hooks1.png)

### 2. 编辑模式

![react-hooks2.png](https://nojsja.gitee.io/static-resources/images/react/react-hooks2.png)

## 四、预备知识：Antd Form 组件的 initialValues 和 resetFields

Antd 表单组件中可以使用 initialValues 来设置表单的初始值，resetFields 来重置表单某些字段或全部字段的值。但是初始值只在第一次渲染的时候生效，不过可以配合 resetFields 来进行重置，以下示例描述了这个工作方式。

### I. 常见的 Antd Form 组件使用示例

代码使用 hooks 方式创建了一个简单的表单组件，组件挂载时请求接口获取数据更新组件内部 state，并把更新后的 state作为表单初始值填充。

```javascript
import React, { useState, useEffect } from 'react';
import {
  Form,
  Input
} from 'antd';

function FormDemo() {
  
  const [form] = Form.useForm();
  const [data, setData] = useState({
    attr1: '',
    attr2: ''
  });
  
  // [01] 根据关键数据进行表单重置
  useEffect(() => {
    form.resetFields();
  }, [data]);
  
  // [02] 组件挂载后获取关键数据用于表单渲染
  useEffect(() => {
    request('/url').then(res => {
      if (res.code === 200) {
        setData(res.data);
      }
    });
  }, []);
  
  // [03] 格式化默认值
  const getInitialValues = (data) => {
    return {
      a: data.attr1,
      b: data.attr2
    };
  };
  
  return (
    <Form form={form} initialValues={getInitialValues(data)}>
        <Form.Item
          label="属性1"
          name="a"
          rules={[{ required: true, message: '必填项' }]}
          wrapperCol={{ span: 22 }}
          labelCol={{ span: 2 }}
          labelAlign="right"
        >
          <Input />
        </Form.Item>
		</Form>
  );
}
```

### II. initialValues 不更新的情况

上诉代码中要有一个 [01]步骤，如果不执行这一步的话会发现在组件挂载后发送请求拿到数据更新内部 state 之后，Form 表单的 属性1 不会更新，仍然会使用刚开始的初始值 ''即空值。

其实 Form 组件的 initialValues 设计就是为了只使用最开始传入组件的默认初始值，后续如果初始值改变，并不会让组件重新渲染。只不过这里有个小技巧就是：Form 组件其实每次都能察觉到我们已经更新了初始值 initialValues，虽然不会实时更新，但是只要在合适的时机执行 form.resetFields() 就可以用最新的初始值重新初始化表单组件。

合适的时机比如：表单依赖的数据更新(可以使用上述 useEffect进行监听)、Modal 弹窗组件的显示/隐藏状态切换... 等等。

如果不使用这个小技巧，那么当我们需要重新设置默认值给表单时可以：

- 先销毁表单组件，一个例子是弹窗 Modal 隐藏后卸载 Modal 组件，不过这样会可能引起弹窗隐藏过于生硬(不推荐)。
- 使用 form.setFieldsValue 强制更新表单各个字段的值，这种情况需要注意用户已经在表单中填入的默认值的处理。

## 五、开发过程

### I. 源码

- [源码1：可编辑表格](https://github.com/nojsja/react-nojsja/tree/master/components/QuoteAddition)

- [源码2：表格中的的富文本组件](https://github.com/nojsja/react-nojsja/tree/master/components/QuillEditorWrapper)

### II. 实现思路

> 业务基于 Antd 开发

组件内部使用 hooks - useState 存储两种状态，查看模式(edit)和编辑模式(view)。点击按钮时切换到相应状态，然后使用已保存的数据重新渲染表格。

#### 1. 使用 Antd Table 组件进行整体渲染

表格的渲染分为表格自身的渲染和表格内容的渲染，这一点是基于 Antd 的 Table 组件自身的设计。不过由于我们引入了一些外部状态用于控制表格组件的展示状态比如：编辑状态、保存状态、全选状态，因此用于控制这些值的 state 更新时需要我们重新调用函数获取渲染参数并重新渲染表格。

```javascript
export default () => {
  const { value, disabled } = props;
  // 用于表格列中的数据渲染
  const [tableData, setTableData] = useState(value);
  // 用于表格列渲染
  const [columns, setColumns] = useState([]);
  // 用于控制表格组件的展示状态
  const [status, setStatus] = useState('view');
  // 用于控制表格组件的全选状态
  const [allChecked, setAllChecked] = useState(false);

  const isEdit = status === 'edit';
  const isView = status === 'view';

  ...

  // 状态改变时重新渲染表格列
  useEffect(() => {
    setColumns(
      getColumns({
        rows: fullKeys,
        onTableChange,
        setAllChecked: setAllCheckedAction,
        allChecked,
        disabled: isView,
      }),
    );
  }, [disabled, isView, allChecked]);

  ...

  return (
    <div className={props.className}>
      <div>
        {!disabled && (
          <>
            {status === 'view' && (
              <Button disabled={disabled} onClick={setEdit} type="primary">
                编辑
              </Button>
            )}
            {status === 'edit' && (
              <>
                <Button
                  className={style['margin__right__12']}
                  disabled={disabled}
                  onClick={saveEdit}
                  type="primary"
                >
                  保存
                </Button>
                <Button disabled={disabled} onClick={cancelEdit}>
                  取消
                </Button>
              </>
            )}
          </>
        )}
      </div>
      <Form form={form}>
        <Table columns={columns} dataSource={tableData} pagination={false} />
      </Form>
    </div>
  );
}
```

#### 2. 使用 Antd Form 组件的校验功能实现实时验证字段

因为要实现字段编辑实时校验功能，可以使用 Form 组件配合 Table 组件，Form.FormItem 自带字段验证功能：

![react-hooks3.png](https://nojsja.gitee.io/static-resources/images/react/react-hooks3.png)

因此在生成表格列的函数 getColumns 中需要使用 Form.FormItem 进行组件包裹，注意的是每个 Form.Item 都需要有唯一的 name 属性，否则不会触发字段验证功能：

```javascript

// 实时共享值
import { computeValues } from '../index';

...

export default props => {
  const { onTableChange, setAllChecked, allChecked, disabled, rows = keys } = props;

  const columns = {
    /* 表格中一列数据声明示例 */
    insureFeeRate: {
      // 表格头
      title: '费率',
      dataIndex: 'insureFeeRate',
      key: 'insureFeeRate',
      // 表格列数据
      render: (value, data) => {
        return (
          <Form.Item
            name={`insureFeeRate_${data.id}`}
            // 校验字段
            rules={[
              ({ getFieldValue }) => ({
                validator(rule, value) {
                  const now = computeValues.value ? computeValues.value[data.id] : false;
                  console.log('validator');
                  if (now && now.acceptInsurance) {
                    if (!costRateReg.test(now.insureFeeRate)) {
                      return Promise.reject(new Error('承保费率值为十万分之一到1之间的数'));
                    }
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            {!disabled ? (
              <InputNumber
                step={0.01}
                disabled={disabled}
                onChange={value => onTableChange('insureFeeRate', value, data)}
                defaultValue={value}
              />
            ) : (
              <span>{data.insureFeeRate}</span>
            )}
          </Form.Item>
        );
      },
    },

    ...

  };

  return return Object.keys(columns).map(item => columns[item]);
}
```

#### 3. 使用 react-quill 富文本组件展示和编辑富文本

react-quill 是富文本组件 quill 基于 react 封装的一个开源组件，支持 react 式声明调用。value 和 onChange 是这个组件的数据接收和数据回调外部接口。其实一般的 Form.Item 自定义组件也是这个原理，只要自定义组件中在合适的时机调用父级传入的 onChange 就能让自定义组件和表单组件按照预期工作。

```javascript
import React, { useEffect, useCallback } from 'react';
import QuillEditor from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Editor = React.memo(props => {
  return (
    <QuillEditor
      {...{
        ...props,
        value: props.value.current || '',
        onChange: value => {
          props.onChange.current(value);
        },
      }}
    />
  );
});
```

#### 4. 编辑模式和查看模式的状态切换处理

由于编辑模式可以临时取消，取消后未保存的数据可以重置到编辑前的状态，可以使用 Form 组件实例的 resetFields 方式将表格组件状态重置即可。

```javascript
...
  // 取消编辑
  const cancelEdit = id => {
    setStatus('view');
    editValues.value = null;
    getComputeValues(editValues.value);
    form.resetFields();
  };
```

考虑到编辑中的表格输入组件无须追踪数据输入状态，只需要在最后保存的时候提交组件内部实时缓存的编辑数据即可，因此表格组件设计为非完全受控组件。体现就是编辑中的表格输入时 onChange 触发的值只会被保存到 React 组件外部一个对象中，这个对象的更新不会引发组件重复渲染。

注意看下面我们同时使用 export 关键字将这个对象导出，这样子设计后有一个方便之处就是我们在 getColumns (获取最新的表格列渲染数据) 中可以读取实时缓存的编辑数据，而不会陷入 React Hooks 组件的闭包陷进中，因为我们知道 Hooks 组件的每次渲染过程中各个声明的函数只会读取当前这次渲染的数据，这样可能引发延迟更新的问题。

同时为了在 getColumns 函数中不重复计算一些值，我使用 `getComputeValues(editValues.value)` 在editValues.value 更新的时候手动生成一个计算值以供 getColumns 使用，它的具体使用可以查看 `5.全选模式的处理`。

```javascript
// React 组件外部的数据缓存
export const editValues = {
  value: null,
};

// 计算值
export const computeValues = {
  value: null,
};

const getComputeValues = values => {
  if (values && values.length) {
    computeValues.value = values.reduce((pre, cur) => {
      pre[cur.id] = cur;
      return pre;
    }, {});
  } else {
    computeValues.value = null;
  }
};

...

// React 组件
```

#### 5. 全选模式的处理

全选模式即我们在编辑模式中选择全选可以全部选中表格中的某一列，由于之前提到表格内部组件并非处于完全受控模式中，因此当触发全选操作的时候，我们需要设置 allChecked 属性，然后使用 useEffect 监听 allChecked 属性的更新，触发表格列的重新渲染即可。

![react-hooks4.png](https://nojsja.gitee.io/static-resources/images/react/react-hooks4.png)

```javascript

// 编辑状态改变时重新渲染表格列表
  useEffect(() => {
    setColumns(
      getColumns({
        rows: fullKeys,
        onTableChange,
        setAllChecked: setAllCheckedAction,
        allChecked,
        disabled: isView,
      }),
    );
  }, [disabled, isView, allChecked]);

// 选择所有承保项
  const setAllCheckedAction = status => {
    editValues.value = editValues.value
      ? editValues.value.map(item => {
          item.acceptInsurance = status;
          return item;
        })
      : null;
    setAllChecked(status);
    getComputeValues(editValues.value);
    if (editValues.value) {
      form.resetFields(editValues.value.map(item => `acceptInsurance_${item.id}`));
    }
  };

```

值得注意的是，即使重新渲染了表格列仍然之前未被勾选的列仍然不会切换为勾选状态，这是 Form.Item 组件的 defaultValue 的渲染机制造成的，我们需要使用 `form.resetFields` 重置被勾选列的状态，然后 Form.Item 组件会使用最新的勾选状态重新初始化组件，现在组件状态就正常了。

### III. 组件优化点

可编辑表格组件中有很多富文本组件作为多个单独的单元格进行渲染，如果不使用 React.memo 组件进行缓存优化的话，表格组件的多次更新会造成无用的富文本组件的重新创建和渲染，会造成无用的渲染，数据量过大时会存在性能问题。

因此这里我们使用自定义 React hooks 组件对原生的 react-quill 组件进行一层包裹，在组件内部通过 useRef、useCallback hooks 以及 React.memo 组件进行缓存优化，这样就可以避免每次渲染都重新创建富文本组件，从而提高性能。

![react-hooks1.png](https://nojsja.gitee.io/static-resources/images/react/react-hooks1.png)

整个组件实现代码如下：

```javascript
import React, { useEffect, useCallback } from 'react';
import QuillEditor from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { quillEmptyReg } from '@/utils/validator';
import style from '@/pages/index.less';
import { debounce } from '@/utils/utils';

const editorModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    [{ color: [] }, { background: [] }],
    ['link'],
    ['clean'],
  ],
};

const Editor = React.memo(props => {
  console.log('Editor Render');
  return (
    <QuillEditor
      {...{
        ...props,
        value: props.value.current || '',
        onChange: value => {
          props.onChange.current(value);
        },
      }}
    />
  );
});

export default function index(props) {
  const { disabled, name, ...others } = props;

  // 使用不可变对象同步 Editor.onChange 的正确指向
  const editorRef = React.useRef();
  // 使用不可变对象同步去抖函数内 onChange 的正确指向
  const fnRef = React.useRef();
  // 使用不可变对象不会触发编辑器组件的重复渲染
  const valueRef = React.useRef(props.value);

  // 去抖函数用于快速输入字符时造成编辑器组件重渲染的卡顿优化
  const debounceChange = useCallback(debounce((...args) => {
    fnRef.current(...args);
  }, 300), []);

  // 用于传入的编辑器文本变化时更新内部独立状态
  useEffect(() => {
    if (props.value && (props.value !== valueRef.current)) {
      valueRef.current = props.value;
    }
  }, [props.value]);

  // 每次渲染时更新各个不可变对象的正确指向
  fnRef.current = props.onChange;
  editorRef.current = value => {
    const data = quillEmptyReg.test(value) ? '' : value;
    valueRef.current = data;
    if (props.onChange) {
      debounceChange(data, name)
    }
  };

  return (
    <Editor
      {...others}
      theme="snow"
      modules={editorModules}
      value={valueRef}
      className={style['editor__minheight__200']}
      {...(disabled ? { readOnly: true } : { readOnly: false })}
      onChange={editorRef}
    />
  );
}
```

#### 1. 使用 React.memo 减少富文本组件的无用渲染

React.memo 包裹的组件会对每次传入的 props 做一次浅比较，如果 props 不变，则不会重新创建组件，这在优化富文本这种复杂组件中比较适合，如果是一些简单的展示组件反而不推荐使用 React.memo。

相对的使用了 React.memo 但是如果每次外层组件更新的时候我们没有保证不该变化的 props 属性不发生变化，这样子 React.memo 将毫无效果，甚至会造成负优化。

所谓的不该变化的 props 属性，这个组件中有这样几个属性可以认为是不该变化的：

1）onChange 回调执行函数

使用 useRef 生成不可变对象 editorRef 以替换原来的回调函数，每次只更新不可变函数的 current 属性用于指向最新的回调方法。位于 React.memo 包裹的内层富文本组件中使用 editorRef.current 来调用回调函数。

2）value 编辑器的内容字符

通常 value 属于一个受控属性，它的值的变化会触发组件的重新渲染。不过我们这个组件的实现中，Editor 组件无需采用完全受控的模式，因为在 Editor 组件中我们只关注输入时是否调用了外部的 onChange 函数来同步组件内部和外部值以保证数据一致，而无须将 Editor 的内部状态交由 props 传入的 value 控制，实际内部状态是由操作者的键盘作为输入源进行控制的。

如果不进行这个优化处理，组件在每次输入值的时候就会重新渲染自身，在界面上的表现就是如果一直按住某个按键不放，富文本输入框会暂时卡住，松手后，组件才会正常显示最终值。使用 useRef 优化传入值后，我们一直安装某个键，富文本输入框中的字符也会持续的将最新输入的字符显示到输入框中，而不会卡住。

3）editorModules 富文本静态配置对象

配置对象应该为一个静态不变对象，直接将其放入 React 组件外部，让组件在内层作用域借用作用域查找直接引用最外层的对象即可。

#### 2. 使用函数去抖合理化富文本组件输入时的 onChange 回调

想象用户在输入字符到富文本的过程中，短时间持续的输入字符会导致 onChange 事件在短时间内被多次触发。其实这是没有必要的，只需关注用户在短时间的快速输入之后，捕获最后富文本输入框中的字符内容然后调用 onChange 回调函数即可。这样即保证数据的一致性，也控制了组件合理的回调时机。

根据优化规则，可以简单的想到使用函数去抖和函数节流思想进行优化，这里使用函数去抖的思想，只采集在一段时间内持续输入的最终值。如果使用函数节流的话，效果是根据编程指定的时间间隔来触发回调函数，维持函数的触发频率，防止短时间内过度调用影响界面性能。

以下是函数去抖(debounce)和函数节流(throttle)的简单实现，具体使用的话可以参考上面的示例，示例中也使用了 useCallback 和 useRef 来防止 throttle 高阶函数的在每一次渲染时重复创建和绑定：

```javascript
/* 节流函数 */
export const throttle = (fn, delay) => {
  let timer = null;
  return function(...args) {
    if (timer) return;
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/* 去抖函数 */
export const debounce = (fn, delay) => {
  let timer = null;
  return function(...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
```

## 六、写在最后

这个组件编写过程中还是学到了挺多，比如 ES module 中 export 的变量是可以在其它模块读取的，而 commonJs 中的表现是完全不同的，它采用的是值复制，并不会进行变量引用和共享。同时对 useRef、React.memo、useCallback 等的使用也更加深刻了。