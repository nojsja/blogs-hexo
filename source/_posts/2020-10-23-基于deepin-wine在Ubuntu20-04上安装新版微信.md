---
title: 基于deepin-wine在Ubuntu20.04上安装新版微信
catalog: true
header-img: "article_header.png"
top: false
toc_nav_num: true
updateDate: 2020-10-23 14:49:56
subtitle: "wechat on ubuntu20.04"
tags:
- ubuntu20.04
categories:
- Linux
---

#### 预览

![wechat3.0](wechat3.0.png)

> 操作系统：ubuntu 20.04.1 LTS (Kernel: 5.4.0-47-generic )

> 支持微信(2.9.5+)以及3.0版本

#### 运行`deepin-wine-depends.sh`安装依赖
```bash
#!/bin/bash
mkdir /tmp/deepintemp
cd /tmp/deepintemp
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine/deepin-wine_2.18-19_all.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine/deepin-wine32_2.18-19_i386.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine/deepin-wine32-preloader_2.18-19_i386.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine-helper/deepin-wine-helper_1.2deepin8_i386.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine-plugin/deepin-wine-plugin_1.0deepin2_amd64.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine-plugin-virtual/deepin-wine-plugin-virtual_1.0deepin3_all.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine-uninstaller/deepin-wine-uninstaller_0.1deepin2_i386.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/u/udis86/udis86_1.72-2_i386.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine/deepin-fonts-wine_2.18-19_all.deb
wget http://mirrors.aliyun.com/deepin/pool/non-free/d/deepin-wine/deepin-libwine_2.18-19_i386.deb
wget https://mirrors.aliyun.com/deepin/pool/main/libj/libjpeg-turbo/libjpeg62-turbo_1.5.1-2_amd64.deb
wget https://mirrors.aliyun.com/deepin/pool/main/libj/libjpeg-turbo/libjpeg62-turbo_1.5.1-2_i386.deb

echo '准备添加32位支持'
sudo dpkg --add-architecture i386
echo '添加成功，准备刷新apt缓存信息...'
sudo apt update
echo '即将开始安装...'
sudo dpkg -i *.deb
echo '安装完成，正在自动安装依赖...'
sudo apt install -fy

rm -vfr /tmp/deepintemp
```

#### 安装deepin-wine环境

下载 https://community-packages.deepin.com/deepin/pool/main/d/deepin-wine5/ 里几个deb，并安装 (备用下载链接: https://pan.baidu.com/s/1aENeezzyRrxW_b5U5e0s8w  密码: t2cr)

#### 建立软链接
```bash
$: sudo ln -s  /usr/lib/i386-linux-gnu/deepin-wine5/wine* /usr/bin/ -f
```

#### 建立32位的wine环境

* 创建WINEPREFIX，并安装winetricks图形工具安装`msls31 msxml6 riched20 riched30 ole32`等dll依赖，`msxml6`下载失败时亦可手动安装：
```bash
$: wget -P /tmp https://download.microsoft.com/download/e/a/f/eafb8ee7-667d-4e30-bb39-4694b5b3006f/msxml6_x86.msi
$: wine msiexec /i /tmp/msxml6_x86.msi
```

#### 安装新版微信 2.9.5+
```bash
$: wine WechatSetup.exe
```

#### 解决字体问题  
从 windows 中系统盘所在的位置 `C:\windows\Fonts` 中拷贝全部的字体，
将拷贝的字体数据放在 ubuntu 系统中 `~/.wine/drive_c/windows/Fonts 中`.

#### 配置wineconfig  

终端运行`winecfg`，选择`Windows 版本：Windows 7`

#### 创建应用程序列表启动图标  

* 创建Wechat启动脚本`wechat`，内容如下：
```bash
#!/bin/bash
LC_ALL=zh_CN.UTF-8 wine /home/nojsja/.wine/drive_c/Program\ Files/Tencent/WeChat/WeChat.exe > $&
```

* 同文件夹放入`wechat.png`作为图标

* 使用[makeIconLink](https://github.com/NoJsJa/maintenance/blob/master/code/shell/desktop/application/makeIconLink)脚本创建启动图标，使用帮助`bash makeIconLink --help`，相关命令如下：
```bash
$: sudo makeIconLink --directory /home/nojsja/software/wechat --icon wechat.png --target wechat
```

微信安装后使用正常，能发图片(之前的方法装新版会有大图片发不出去，一直转圈的问题)、文件，阴影框也不见了，剪贴板也好用了(可直接粘贴图片、url)
