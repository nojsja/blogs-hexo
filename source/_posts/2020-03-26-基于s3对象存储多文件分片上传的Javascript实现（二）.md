---
title: 基于s3对象存储多文件分片上传的Javascript实现（二）
catalog: true
toc_nav_num: true
subtitle: fileupload node fs
header-img: >-
  https://nojsja.gitee.io/static-resources/images/hexo/article_header/article_header.jpg
tags:
  - upload
  - node
categories:
  - Javascript
  - Node
abbrlink: '7507699'
date: 2020-03-26 16:18:00
updateDate: 2020-03-26 16:18:00
---

### 目录
------------

1. 概述

2. 文件上传-Js向中间层Node发送分片数据

3. 文件上传-中间层Node接收前端发送的分片数据

4. 文件下载-中间层Node获取后端文件数据的两种处理

5. 文件下载-Js下载中间层文件的两种不同方式

### 预览
-------

![upload](https://nojsja.gitee.io/static-resources/images/upload/upload.png)

### 概述
-------

Amazon S3 提供了一个简单 Web 服务接口，可用于随时在 Web 上的任何位置存储和检索任何数量的数据。此服务让所有开发人员都能访问同一个具备高扩展性、可靠性、安全性和快速价廉的数据存储基础设施， Amazon 用它来运行其全球的网站网络。此服务旨在为开发人员带来最大化的规模效益。  
前一篇文章[基于s3对象存储多文件分片上传的Javascript实现(一)](/blogs/2020/03/07/37469a41.html/)主要讲了前端Js多文件分片上传逻辑的实现，描述了浏览器端多文件分片异步上传状态管理方面的设计，这篇文章主要针对前端Coder文件操作的一些痛点，比如：前端分片是以怎样的数据形式发送到中间层的、中间层是怎样接收前端发送的分片数据的、文件下载时中间层怎样处理后端接口返回的大文件数据然后发送给前端、前端又是怎样拿到和下载中间层返回的文件数据的，主要包含这些方面。

### 文件上传-Js向中间层Node发送分片数据
----------------------------------

#### 创建Axios实例
```js
const XHR = axios.create({
  baseURl: '',
  timeout: 30e3,
  headers: originHeaders,
  validateStatus(status) {
    return status >= 200 && status < 300;
  },
});
```

#### 使用文件分片构造表单数据
>fileShardsData为File.slice接口对文件截取得到的部分文件数据
```js
const data = new FormData();
formData.append('file', fileShardsData, 'file');
```

#### 发送分片
>注意设置请求头的请求数据类型
```js
XHR({
  api,
  method,
  data,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
}).then((response) => {
  ...
});
```

### 文件上传-中间层Node接收前端发送的分片数据
>Express没有自带文件处理功能，需要使用第三方middleware

环境：
* Express V4框架
* Node.js V8

#### 方法1：使用formidable中间件处理文件请求
1. 编写公用中间处理组件
```js
const formidable = require('formidable');
/**
  * parseFile [使用formidable进行文件解析 - 性能一般]
  * @author nojsja
  * @param  {[Object]} req [req obj]
  * @param  {[Object]} res [res obj]
  */
exports.formidableParseFile = (req, res, callback) => {
  try {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (fs.existsSync(files.file.path)) {
        fs.readFile(files.file.path, (err, fileBuffer) => {
          fs.unlink(files.file.path, (err) => {
            if (err) console.log(err);
          });
          if (err) {
            return callback(err);
          }
          callback(null, fileBuffer);
        });
      } else {
        callback(null, '');
      }
    });
  } catch (error) {
    console.error(error);
    callback(error);
  }
}
```

2. 挂载路由
```js
router.post('/object/object/upload', function(req, res, next) {
  console.log('upload');
  const random = Math.random();
  console.time(`${random} -> 1`);
  formidableParseFile(req, res, (err, fileBuffer) => {
    console.timeEnd(`${random} -> 1`);
    if (err) {
      return res.json({
        code: 500,
        result: err.toString(),
      })
    }
    console.time(`${random} -> 2`);
    commonRequestAuth(req.query, objectsresourceApi.object.uploadObject, req, fileBuffer).then(
      (response) => {
        console.timeEnd(`${random} -> 2`);
        res.json({
          code: response.code,
          result: {
            ...{ etag: response.headers ? response.headers.etag : '' },
            ...response.result
          },
        });
      },
      );
    });
});
```

#### 方法2：代码实现文件处理

1. 声明方法
```js
/**
  * parseFile [form-data原生文件解析 - 性能差]
  * @author nojsja
  * @param  {[Object]} req [req obj]
  * @param  {[Object]} res [res obj]
  */
exports.parseFile = (req, res, callback) => {
  req.setEncoding('binary');
  let body = '';   // 文件数据
  let fileName = '';  // 文件名

  // 边界字符串
  const boundary = req.headers['content-type'].split('; ')[1].replace('boundary=', '');

  req.on('data', function (chunk) {
    body += chunk;
  });

  req.on('end', function () {
    try {
      // 分隔键值对(\r\n)和键值(:)
      const file = querystring.parse(body, '\r\n', ':')
      //获取文件名
      const fileInfo = file['Content-Disposition'].split('; ');
      for (value in fileInfo) {
        if (fileInfo[value].indexOf("filename=") != -1) {
          fileName = fileInfo[value].substring(10, fileInfo[value].length - 1);

          if (fileName.indexOf('\\') != -1) {
            fileName = fileName.substring(fileName.lastIndexOf('\\') + 1);
          }
        }
      }

      // 获取图片类型(如：image/gif 或 image/png))
      const entireData = body.toString();

      contentType = file['Content-Type'].substring(1);

      //获取文件二进制数据开始位置，即contentType的结尾
      const upperBoundary = entireData.indexOf(contentType) + contentType.length;
      const shorterData = entireData.substring(upperBoundary);

      // 替换开始位置的空格
      const binaryDataAlmost = shorterData.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

      // 去除数据末尾的额外数据，即: "--"+ boundary + "--"
      const binaryData = binaryDataAlmost.substring(0, binaryDataAlmost.indexOf('--' + boundary + '--'));

      callback(null, binaryData);
    } catch (error) {
      callback(new Error('form-data parse error!'));
    }

  });
};
```
2. 挂载路由同上

### 文件下载-中间层Node获取后端文件数据的两种处理
------------------------------------------
>两种方式均使用Axios发送请求

#### 小文件直传
接收到接口数据后直接放入内存然后以文件的类型发送给前端

1. 请求header注意设置`resType: "arraybuffer"`
```js
// 对象详情信息
router.post('/resource/object/detailinfo/all', function(req, res, next) {
  commonRequestAuth({ ...req.body, ...{ $no_timeout$: true }}, objectsresourceApi.object.objectinfoAll, req).then((response) => {
    res.type('file').send(response.result)
  });
});
```

#### 大文件转存为静态资源
> Node.js支持文件流操作，包含可读流、可写流以及可读可写流，如果在处理大文件的时候直接把数据放入内存，就会出现中间层内存爆满的情况，这里先声明接口返回数据为可读流，然后通过本地静态资源路径创建可写流，最后为了避免由于可读流的数据写入可写流时由于读取速度和写入速度的差异问题导致的数据丢失情况，使用管道pipe连接可读流和可写流再进行数据传输。
1. Node Pipe管道的概念
![node pipe](https://nojsja.gitee.io/static-resources/images/upload/node_pipe.png)

2. 请求header注意设置`resType: "stream"`

3. 创建本地可写流
使用fs.createWriteStream接口，参数为本地某个目录文件，文件可以不存在，目录需要实际存在

4. 接口返回的是可读流，可以直接连接到管道
注意服务器是否支持以数据流方式返回二进制数据

5. 可写流完成写入后向前端发送静态资源文件地址
监听可写流的finish事件可以异步处理文件完成写入事件

```js
// 对象详情信息
router.post('/resource/object/detailinfo', function(req, res, next) {
  console.log('download');
  commonRequestAuth({ ...req.body, ...{ $no_timeout$: true }}, objectsresourceApi.object.objectinfo, req).then((response) => {
    console.log('download callback');
    const fileName = req.body.object.split('/').pop();
    const fileSymbol = `${fileName}-${Date.now()}`;
    const filePath = path.join(_path.public, 'download', fileSymbol);
    const ws = fs.createWriteStream(filePath);
    response.result.pipe(ws);
    ws.on('finish', () => { 
      console.log('download finish');
      res.header({
        'Content-Disposition': fileName
      });
      res.json({
        code: 200,
        result: filePath.split('node-express-react/public/public')[1],
      });
    }); 
  });
});
```

### 文件下载-Js下载中间层文件的两种不同方式
-------------------------------------

#### 小文件直接从接口拿到数据并生成DataURL触发下载  

1. 请求header声明`responseType:arraybuffer`  
指名返回的数据是可直接使用的二进制流数据  

2. 接口数据返回后生成前端通用的大二进制块数据`Blob`
new Blob(DataArray, { type: mimetype })，mimetype需要正确指定，比如jpeg格式的图片mimetype为image/jpeg

3. 使用HTML5 FileReader接口读取二进制块
reader.readAsDataURL将二进制读取为base64编码的字符串数据，前端可以直接预览和下载此类DataURL

4. 构造a标签并指名download属性下载DataURL
替代方法是使用window.open(dataUrl)

```js
downloadObjectInMemory = (para, info) => {
    const iAxios = axios.create();
    // iAxios.defaults.timeout = 60 * 1000 * 60 * 10;
    iAxios.defaults.timeout = 0;

    const options = {
      method: 'POST',
      url: '/resource/object/detailinfo/all',
      withCredentials: true,
      responseType: 'arraybuffer',
      headers: {
        'Cache-Control': 'max-age=0',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      data: para,
    };

    const readAsDataUrl = (data, emptyData) => {
      const reader = new FileReader();
      reader.readAsDataURL(data);
      reader.onload = (e) => {
        const url = e.target.result;
        const a = document.createElement('a');
        const filename = para.object.split('/').pop();
        a.href = url === 'data:' ? emptyData : url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      };
    };
    const typename = mapMimeType(info.name).mime;
    iAxios.request(options)
      .then((res) => {
        const blobData = new Blob([res.data], { type: typename });
        readAsDataUrl(blobData, `data:${typename};base64,`);
      }).catch((error) => {
        console.log(error);
      });
  }
```

#### 大文件通过接口返回的静态文件链接进行下载
步骤同上，只不过构造DataURL的过程取消，a标签可以直接使用接口返回的静态文件地质URL

```js
downloadObjectWithURL = (para) => {
    const iAxios = axios.create();
    // iAxios.defaults.timeout = 60 * 1000 * 60 * 10;
    iAxios.defaults.timeout = 0;

    const options = {
      method: 'POST',
      url: '/resource/object/detailinfo',
      withCredentials: true,
      responseType: 'json',
      headers: {
        'Cache-Control': 'max-age=0',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      data: para,
    };

    let timer;
    iAxios.request(options)
      .then((res) => {
        clearTimeout(timer);
        const a = document.createElement('a');
        const filename = para.object.split('/').pop();
        const address = process.env.NODE_ENV === 'development' ? `${window.location.protocol}//10.0.6.206:3000${res.data.result}` : `${window.location.protocol}//${window.location.hostname}:3000${res.data.result}`;
        a.href = address;
        a.download = filename;
        a.click();
      }).catch((error) => {
        console.log(error);
      });
    timer = setTimeout(() => {
      openNotification('info', null, this.lang.lang.fileDownloadTips);
    }, 1e3);
  }
```