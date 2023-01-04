import React from 'react';

const Head = ({ page, config, is_post }) => {
  return (
    <head>
      <meta charSet="utf-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="google-site-verification" content="GicLYNNqJJ-XBSPlE8Pz-ZwGf2ElS_d_VRcEsQServ4" />
      <meta name="google-site-verification" content="rn4dOdASKHwgOgBKFwN8nAB0OlnuC_pNB8qLDnMyPpc" />
      <meta name="baidu-site-verification" content="093lY4ziMu" />
      <meta name="baidu-site-verification" content="code-W4A0ktcwoi" />
      <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
      <meta name="description" content={config.description} />
      <meta name="keyword" content={config.keyword} />
      <link rel="shortcut icon" href={config.favicon} />

      <link href="/fonts/fontawesome-webfont.woff2?v=4.3.0" rel="preload" as="font" crossOrigin />
      <link href="https://www.google-analytics.com" rel="preconnect" crossOrigin />
      <link href="http://busuanzi.ibruce.info" rel="preconnect" crossOrigin />
      <link href="http://nojsja.gitee.io" rel="preconnect" crossOrigin />

      <title>
        {page.title ? page.title + ' - ' + config.SEOTitle : config.SEOTitle}
      </title>

      <link rel="canonical" href={`${config.url + config.root + (page.path || '').replace('index.html', '')}`} />

      <link href="https://cdn.usebootstrap.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" />

      <link rel="stylesheet" href={`${config.root}css/dusign-light.css`} />

      {
        is_post() && (
          <link href={`${config.root}css/github-markdown.min.css`} />
        )
      }

      <link rel="stylesheet" href={`${config.root}css/widget.css`} />
      <link rel="stylesheet" href={`${config.root}css/fonts.googleapis.css`} />
      <link rel="stylesheet" href={`${config.root}css/font-awesome.min.css`} />
      <script src={`${config.root}js/buttons.js`} async={true} defer={true} />
      <script src={`${config.root}js/polyfill.js`} />
    </head>
  );
};

export default Head;