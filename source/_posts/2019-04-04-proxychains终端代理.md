---
title: proxychains终端代理
catalog: true
toc_nav_num: true
subtitle: proxy linux
header-img: >-
  https://nojsja.github.io/static-resources/images/hexo/article_header/article_header.jpg
tags:
  - proxy
  - shadowsocks
categories:
  - Linux
abbrlink: d04b08a2
date: 2019-04-04 16:30:35
updateDate: 2019-04-04 16:30:35
---

### proxychains安装  

`sudo apt install proxychains`

### 编辑proxychains配置  

`vim /etc/proxychains.conf`

### 将socks4 127.0.0.1 9095改为  

`socks5 127.0.0.1 1080`

ps: 默认的socks4 127.0.0.1 9095是tor代理，而socks5 127.0.0.1 1080是shadowsocks的代理，proxychains.conf文件说明了代理配置格式,如下,这里根据自己使用的代理来配置就行了。  

```bash
ProxyList format
 94 #       type  ip  port  [user pass]
 95 #       (values separated by 'tab' or 'blank')
 96 #
 97 #       only numeric ipv4 addresses are valid
 98 #
 99 #
100 #        Examples:
101 #
102 #       socks5  192.168.67.78   1080    lamer   secret
103 #       http    192.168.89.3    8080    justu   hidden
104 #       socks4  192.168.1.49    1080
105 #       http    192.168.39.93   8080
```

### 使用方法  
在需要代理的命令前加上 proxychains ，如：
```bash
proxychains wget http://xxx.com/xxx.zip
proxychains git clone https://xxxxxxxxx.git
```
npm设置http代理：
```bash
# 假设本地代理端口为8002
npm config set proxy http://127.0.0.1:1081
npm config set https-proxy http://127.0.0.1:1081

# 有用户密码的代理
npm config set proxy http://username:password@127.0.0.1:1081
npm confit set https-proxy http://username:password@127.0.0.1:1081
```
npm设置socks5代理：
```bash
# 假设本地socks5代理端口为1081
# 首先安装转换工具
npm install -g http-proxy-to-socks
# 然后使用这个工具监听8002端口,支持http代理，然后所有8002的http代理数据都将转换成socks的代理数据发送到1081上
hpts -s 127.0.0.1:1081 -p 8002
# 最后设置npm代理为8080
npm config set proxy http://127.0.0.1:8002
npm config set https-proxy http://127.0.0.1:8002
```

查看删除代理
```bash
npm config get
  or
npm config list

npm config delete proxy
  and
npm config delete https-proxy
```