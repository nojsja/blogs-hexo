---
title: "基于Electron的windows平台smb客户端开发记录"
catalog: true
toc_nav_num: true
date: 2020-07-17 15:59:00
subtitle: "smb samba client windows"
header-img: "/blogs/img/article_header/article_header.png"
tags:
- SMB
categories:
- client
updateDate: 2020-07-17 15:59:00
top: 1
---


### 前言
---------------
最近拿到一个客户需求，需要利用现有部分后台接口和原生smb协议来实现一个windows平台的smb客户端，主要功能需要包含：存储集群节点管理、集群用户登录、远程共享目录挂载、共享目录浏览、目录权限设置、文件上传管理，其中目录权限设置和目录浏览接口已经被提供，其余几个功能的electron代码和web端代码需要由我负责。考虑整个项目由前端同事来实现且数据存储量较小、数据关系不复杂，所以技术选型方面使用了支持跨平台的Electron框架和易用的的本地json数据库[lowdb](https://github.com/typicode/lowdb)。

项目精简版[DEMO]展示(https://github.com/NoJsJa/electron-react-template)

### 功能需求
---------------

#### 集群节点管理

1. 客户端需要支持多个节点(每个节点所属集群不同)的添加、删除操作
2. 支持设置默认节点操作用于自动登录功能
3. 添加节点的时候要进行ping逻辑判断目标节点是否可用
4. 调用存储集群ID获取接口保证每个集群只有一个节点被添加到集群管理列表

需求分析：节点IP列表、默认节点属性、节点用户登录信息均需要在本地json数据库存储管理，以便数据记录。

![RhinoDisk](../img/article/smb_node.jpg)

![RhinoDisk](../img/article/smb_node_conf.jpg)

#### 集群用户登录

1. 支持已登录过客户端的用户自动下拉提示
2. 支持已记住密码的用户自动填充密码到输入框
3. 如果设置了默认节点，且默认节点的当前用户密码已经记住，则启动客户端时自动执行登录，类似QQ登录面板

需求分析：调用已有登录接口验证smb用户名和密码是否正确，然后拿到具有接口操作权限的access_token(注意直接走smb协议的操作无需使用token)，并且在本地json数据库存储用户名、密码、自动登录标识、用户节点登录记录等。

![RhinoDisk](../img/article/smb_login.jpg)

#### 远程共享目录挂载

1. windows资源管理器原生功能一样，将远程主机的smb共享挂载为本地的一个磁盘，方便用户使用windows资源管理器直接对文件和目录进行操作
2. 选择挂载设备时需要弹出所有空闲的磁盘盘符，支持范围C-Z

需求分析：同windows资源管理器原生功能一样，将远程主机的smb共享挂载为本地的一个磁盘，方便用户使用windows资源管理器直接对文件和目录进行操作，所有挂载信息包括空闲盘符、共享挂载状态 均需要使用windows cmd命令即时获取以防数据不一致的情况。

![RhinoDisk](../img/article/smb_share.jpg)
![RhinoDisk](../img/article/smb_share_mount.jpg)

#### 文件上传管理

1. 文件上传管理能够查看当前任务列表的任务详情，包含上传速度、上传时间、完成时间、文件大小、文件名称，勾选进行中的任务后能够进行暂停、重传、删除、续传等操作。
2. 在任务列表的所有文件都被上传后会进行一次历史任务。
3. 任务历史记录中可以进行删除任务记录、恢复上传错误的历史任务(重传)等操作。
4. 切换不同节点重新登录用户上传任务不受影响，在当前节点重新登录用户上传任务会被强制终止，退出客户端后上传任务会被强制终止，各个用户的上传任务列表均不相同互不干扰，所有被强制终止的任务都能从历史任务列表中中恢复。

需求分析：当前任务列表即时存储于内存中，以便快速进行增删查改操作，任务历史记录使用json数据库进行本地存储；每次任务列表自动同步时将内存中的任务写入到本地json数据库里，并且任务列表数据从内存中释放。

![RhinoDisk](../img/article/smb_upload_now.jpg)
![RhinoDisk](../img/article/smb_upload_record.jpg)

### 实现难点
-----------

#### 多语言功能实现

总体逻辑是通过配置文件或参数声明引入某个语言目录下的所有语言配置文件即可，注意每次更改语言后将lang配置写入文件，下次启动应用时读取文件配置然后调用下面声明的方法加载语言文件即可。

![lang](../img/article/electron-lang.png)

```js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * global.lang -- 内存里保存的所有语言数据
 * global.LANG -- 语言数据标识(en_us, zh_cn, zh_tw)
 * session.lang -- 在session里保存一份语言数据标识，防止用户cookie丢失时语言设置失效(session 持久化)
 * cookie.lang -- 保存在客户端的语言数据标识，session.lang和cookie.lang保持同步
 */
const lang = (function lang() {
  const defaultLang = 'zh_CN';

  /* ------------------- 获取统一的语言环境标识 ------------------- */
  const getLANG = (acceptLang) => {
    // 英语
    if (['en-US', 'en', 'en-us', 'en_us', 'en_US'].indexOf(acceptLang) !== -1) {
      return 'en_us';
    }
    // 中文简体
    if (['zh-CN', 'zh', 'zh-cn', 'zh_cn', 'zh_CN'].indexOf(acceptLang) !== -1) {
      return 'zh_cn';
    } if (['zh-TW', 'zh-tw', 'zh_tw', 'zh_TW'].indexOf(acceptLang) !== -1) {
      return 'zh_tw';
    // 默认中文简体
    }
    return 'zh_cn';
  };

  /* ------------------- 加载语言文件 ------------------- */
  const setLang = (langEnv) => {
    global.lang = global.lang ? global.lang : {};
    global.LANG = langEnv;

    // 读取文件夹的语言配置文件写入全局配置
    fs.readdir(path.join(app.getAppPath(), 'app/lang', langEnv), (err, files) => {
      if (err) {
        console.error(err);
        return;
      }
      files.forEach((file) => {
        global.lang[path.basename(file)] = require(path.join(app.getAppPath(), 'app/lang', langEnv, file));
      });
    });
  };

  return (acceptLang) => {
    const _lang = getLANG(acceptLang || defaultLang);
    if (global.LANG && global.LANG == _lang) {
      return;
    }
    // 设置目前的语言环境
    setLang(_lang);
  };
}());

module.exports = lang;

```

#### 托盘功能的实现

使用Electron的Tray创建托盘菜单，Menu.buildFromTemplate方法创建菜单子项以及对应的事件回调函数。

```js
contextMenu() {
    global.appTray = new Tray(path.join(app.getAppPath(), os.type() === 'Windows_NT' ? `resources/icon_${this.envConf.work_env}.ico` : 'resources/mac_tray.png'));
    const menu = Menu.buildFromTemplate( [
      {
          label: global.lang.public.quit,
          type: 'normal',
          click: () => {
            this.sendToWeb('upload', {action: 'getUploadingTask'});
            ipcMainProcess.ipc.once('upload-getUploadingTask', (event, rsp) => {
              if (rsp.code === 200) {

                  global.ipcMainWindow.sendToWeb('shell', { action: 'upload-clear' });
                  .then(() => {
                    global.appTray.destroy();
                    app.quit();
                  }).catch(() => {
                    global.ipcMainProcess.notifySend({
                      body: global.lang.public['data_write_failed_before_quit']
                    });
                  });
                };
                
                if (rsp.result !== 0) {
                  const buttonId = dialog.showMessageBoxSync(this.windowoptions, {
                    defaultId: 0,
                    buttons: ['No', 'Yes'],
                    type: 'info',
                    title: global.lang.public.tips,
                    message: global.lang.upload.app_quit_tips
                  });
                  if (buttonId === 1) quitApp();
                } else {
                  quitApp();
                }
                
              } else {
                global.ipcMainProcess.notifySend({
                  body: rsp.result
                });
              }
            });
          }
        }
    ]);

    global.appTray.on('click', ()=>{    
      this.window.show();
    });
    global.appTray.setToolTip('RninoDisk');
    global.appTray.setContextMenu(menu);
  }
```

#### Node执行操作系统命令

1. 通用的系统命令执行函数(日志输出阻塞版本)  
使用Node.js的`child_process.exec`函数衍生 shell，然后在 shell 中执行 command，会在命令执行完成之后将所有信息输出到控制台。

```js
  const child = require('child_process');
/**
   * [exec 执行一个命令，阻塞输出信息到控制台]
   * @param  { [String] }  command    [命令]
   * @param  { [Array | String] }   params  [参数数组]
   * @param  { [Object] }  options [exec可定制的参数]
   * @return { Promise }           [返回Promise对象]
   */
exports.exec = (_command, _params=[], _options={}) => {
  const params = Array.isArray(_params) ? _params.join(' ') : '';
  const options = (String(_params) === '[object Object]') ? _params : (_options);
  const command = `${_command} ${params}`;
  
  console.log(params, options, command);

  return new Promise((resolve, reject) => {
    child.exec(command, options, (_err, _stdout, _stderr) => {
      if (_err) {
        exports.console_log(_err, 'red');
        resolve({code: 1, result: _err});
      } else if (_stderr && _stderr.toString()) {
        exports.console_log(_stderr, 'red');
        resolve({code: 1, result: _stderr});
      } else {
        console.log(_stdout);
        resolve({code: 0, result: _stdout});
      }
    });
  });
}
```

2. 通用的系统命令执行函数(日志同步输出版本)  
使用Node.js的`child_process.exec`函数衍生 shell，然后在 shell 中执行 command，所有控制台日志会同步输出。

```js
  const child = require('child_process');
  /**
   * [execRealtime 执行一个命令，实时输出信息到控制台]
   * @param  { [String] }  command    [命令]
   * @param  { [Array | String] }   params  [参数数组]
   * @param  { [Object] }  options [exec可定制的参数]
   * @return { Promise }           [返回Promise对象]
   */
  exports.execRealtime = (_command, _params=[], _options={}) => {
    const params = Array.isArray(_params) ? _params.join(' ') : '';
    const options = (String(_params) === '[object Object]') ? _params : (_options);
    const command = `${_command} ${params}`;
    let data = '', error = '';
    
    console.log(params, options, command);
  
    return new Promise((resolve, reject) => {
      const result = child.exec(command, options);
      
      result.stdout.on('data', (data) => {
        exports.console_log(data, 'white');
        data += `${data}`;
      });

      result.stderr.on('data', (data) => {
        exports.console_log(data, 'red');
        error += `${data}`;
      });

      result.on('close', (code) => {
        resolve({code, result: data, error});
      });
    });
  }

```

#### 远程共享目录挂载

1. 获取空闲盘符和已经挂载盘符
```js
/**
    * getSystemDriveLetter [获取系统已经挂载的磁盘]
    * @return {[Array]} [盘符列表]
    */
  getSystemDriveLetter() {
    return new Promise((resolve) => {
      this.sudo.exec('fsutil fsinfo drives', [], { encoding: 'buffer' }).then((stdout) => {
        const driverstr = stdout;
        const driverstrArr = driverstr.split(' ').filter(s => s !== os.EOL).map(s => s.replace('\\', ''));
        const allDrivers = [
          'C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', 'K:', 'L:',
          'M:', 'N:', 'O:', 'P:', 'Q:', 'R:', 'S:', 'T:', 'U:', 'V:',
          'W:', 'X:', 'Y:', 'Z:'
        ];
        driverstrArr.shift();
        resolve({
          code: 200,
          result: {
            mounted: driverstrArr,
            available: allDrivers.filter(d => !driverstrArr.includes(d.toLocaleUpperCase()))
          },
        })
      }, (err) => {
        console.error(err);
        resolve({
          code: 600,
          result: err,
        });
      });
    })
  }
```

2. 通过UNC命令对远程共享进行挂载
```js
/* 挂载共享 */
_mountSystemDriver_Windows_NT({ host, driver, path, auto = false }) {
    const pwd = global.ipcMainProcess.userModel.get('last.pwd');
    const { isThirdUser, nickname, isLocalUser, username } = global.ipcMainProcess.userModel.info;
    const commandUseIPC = `net use \\\\${host}\\ipc$ "${pwd}" /user:"${username}"`;
    const commandMount = `net use ${driver} \\\\${host}\\${path} "${pwd}" /user:"${username}"`;
    const commandUmount = `net use ${driver} /del /y`;

    return new Promise((resolve, reject) => {
      // 获取系统已经挂载的磁盘和空闲的磁盘
      this.getSystemDriveLetter()
        .then((rsp) => {
          if (rsp.code === 200) {
            if (rsp.result.mounted.includes(driver.toLocaleUpperCase())) {
              throw new Error(global.lang.node.driver_already_mount);
            }
          } else {
            throw new Error(global.lang.node.get_system_mount_info_failed);
          }
        })
        // 尝试UNC连接
        .then(() => {
          return this.sudo.exec(commandUseIPC);
        })
        // 执行挂载命令
        .then(() => {
          return this.sudo.exec(commandMount);
        })
        // 更新数据
        .then(() => {
          return this.update('mountPoint', { username, host, path }, {
            username, host, path, driver, auto
          });
        }).then((rsp) => {
          resolve({
            code: 200,
            result: {
              username, host, driver
            },
          });
        }).catch((err) => {
          console.error(err, err.toString());
          resolve({
            code: 600,
            result: global.lang.node.net_mount_failed_reason,
          });
        });
    });
  }
```

#### 文件上传管理

前端界面沿用之前的对象存储文件上传管理逻辑[基于s3对象存储多文件分片上传的Javascript实现(一)](https://nojsjaosc.gitee.io/blogs/2020/03/07/%E5%9F%BA%E4%BA%8Es3%E5%AF%B9%E8%B1%A1%E5%AD%98%E5%82%A8%E5%A4%9A%E6%96%87%E4%BB%B6%E5%88%86%E7%89%87%E4%B8%8A%E4%BC%A0%E7%9A%84Javascript%E5%AE%9E%E7%8E%B0-%E4%B8%80/)，不同的地方是加入了`历史任务`功能用于持久化文件上传任务记录功能，失败的任务能在历史任务中重新启动。由于smb简单文件上传协议不支持文件分片管理功能，所以前端界面的上传进度获取和上传速度计算均是基于 Node.js 的 FS API实现，整体流程是：使用Windows UNC命令连接后端共享，然后可以像访问本地文件系统一样访问远程一个共享路径，比如`\\[host]\[sharename]\file1`，这样子文件上传就变成本地目录文件的复制、删除、重命名了。

整个上传流程完全模拟了aws对象存储的逻辑：

1. 页面调用init请求附带上选中的文件信息初始化一个文件上传任务
2. Node.js拿到init请求附带的文件信息后，将所有信息存入临时存放在内存中的文件上传列表，并尝试打开待上传文件的文件描述符用于即将开始的文件切片分段上传工作
3. 页面拿到init请求成功的回调后，存储返回的上传任务ID，并将该文件加入文件待上传队列，在合适的时机开始上传，开始上传的时候向Node.js端发送upload请求，同时请求附带上任务ID和当前的分片索引值(表示需要上传第几个文件分片)
4. Node.js拿到upload请求后根据携带的任务ID读取内存中的上传任务信息，然后使用第二步打开的文件描述符和分片索引对本地磁盘中的目标文件进行分片切割，最后使用FS API将分片递增写入目标位置
5. upload请求成功后页面判断是否已经上传完所有分片，如果完成则向Node.js发送complete请求，同时携带上任务ID
6. Node.js根据任务ID获取文件信息，关闭文件描述符，更新文件上传状态
7. 界面上传任务列表清空后，向后端发送sync请求，用于把当前任务同步到历史任务中，表明当前所有任务已经完成
8. Node.js拿到sync请求后，把内存中存储的所有文件上传信息写入磁盘，同时释放内存占用


#### windows安装包自动化打包配置

### 总结
--------
