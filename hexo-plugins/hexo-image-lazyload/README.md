## Hexo-Img-Lazyload
---
A image lazyload plugin for hexo@^5.0.0, doesn't work in lower version.

### Install
```bash
$: yarn add hexo-img-lazyload
# or
$: npm install hexo-img-lazyload
```

### Usage
Add new conf block in your site config file - `_config.yml`
```yml
# _config.yml
image_lazy:
  enable: true
  type: post
  replacement: "/path/to/loading.gif"
```

### Options

1. `enable`：whether to enable the plugin.
2. `type`: optional value: `post|page`, set value - `post` to enable lazyloading in a post, or set value - `page` to work in all pages.
3. `replacement`: use your loading-image url to replace the default one provided by the plugin.

### Preview
[>> nojsja blog](https://nojsja.gitee.io/blogs/2020/12/18/927d467e.html/)