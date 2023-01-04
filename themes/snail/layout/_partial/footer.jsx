import React, { useEffect } from 'react';
import useScripts from '../_hooks/useScripts';

export default function Footer({ config }) {

  useScripts([
    "https://lib.baomitu.com/jquery/3.3.1/jquery.min.js",
    "https://cdn.usebootstrap.com/bootstrap/3.3.7/js/bootstrap.min.js",
    "/js/widgets.js",
  ]);

  useScripts([
    "//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js",
    "/js/busuanzi.pure.mini.js",
  ], true);

  useEffect(() => {
    window.async("https://nojsja.gitee.io/static-resources/libs/fastclick/1.0.6/fastclick.min.js", function() {
      const $nav = document.querySelector("nav");
      if($nav) window.FastClick.attach($nav);
    });

    if (config['search']['enable']) {
      const search_path = config.search.path;
      if (search_path.length == 0) {
          search_path = "search.xml";
      }
      const path = config.root + search_path;

      window.searchFunc(path, 'local-search-input', 'local-search-result');
    }
  }, []);

  return (
    <footer>
      <div class="container">
        <div class="row">
          <div class="col-lg-8 col-lg-offset-2 col-md-10 col-md-offset-1">
            <ul class="list-inline text-center">
              {
                config.github_username && (
                  <li>
                    <a target="_blank" rel="noopener" href={`https://github.com/${config.github_username}`}>
                      <span class="fa-stack fa-lg">
                        <i class="fa fa-circle fa-stack-2x"></i>
                        <i class="fa fa-github fa-stack-1x fa-inverse"></i>
                      </span>
                    </a>
                  </li>
                )
              }

              {
                config.twitter_username && (
                  <li>
                    <a target="_blank" rel="noopener" href={`https://twitter.com/${config.twitter_username}`}>
                      <span class="fa-stack fa-lg">
                        <i class="fa fa-circle fa-stack-2x"></i>
                        <i class="fa fa-twitter fa-stack-1x fa-inverse"></i>
                      </span>
                    </a>
                  </li>
                )
              }

              {
                config.facebook_username && (
                  <li>
                    <a target="_blank" rel="noopener" href={`https://www.facebook.com/${config.facebook_username}`}>
                      <span class="fa-stack fa-lg">
                        <i class="fa fa-circle fa-stack-2x"></i>
                        <i class="fa fa-facebook fa-stack-1x fa-inverse"></i>
                      </span>
                    </a>
                  </li>
                )
              }

              {
                config.zhihu_username && (
                  <li>
                    <a target="_blank" rel="noopener" href={`https://www.zhihu.com/people/${config.zhihu_username}`}>
                      <span class="fa-stack fa-lg">
                        <i class="fa fa-circle fa-stack-2x"></i>
                        <i class="fa  fa-stack-1x fa-inverse">知</i>
                      </span>
                    </a>
                  </li>
                )
              }

              {
                config.weibo_username && (
                  <li>
                    <a target="_blank" rel="noopener" href={`http://weibo.com/${config.weibo_username}`}>
                      <span class="fa-stack fa-lg">
                        <i class="fa fa-circle fa-stack-2x"></i>
                        <i class="fa fa-weibo fa-stack-1x fa-inverse"></i>
                      </span>
                    </a>
                  </li>
                )
              }

              {
                config.linkedin_username && (
                  <li>
                    <a target="_blank" rel="noopener" href={`https://www.linkedin.com/in/${config.linkedin_username}`}>
                      <span class="fa-stack fa-lg">
                        <i class="fa fa-circle fa-stack-2x"></i>
                        <i class="fa fa-linkedin fa-stack-1x fa-inverse"></i>
                      </span>
                    </a>
                  </li>
                )
              }

              {
                config.RSS && (
                  <li>
                    <a href={`${config.root}feed.xml`}>
                      <span class="fa-stack fa-lg">
                        <i class="fa fa-circle fa-stack-2x"></i>
                        <i class="fa fa-rss fa-stack-1x fa-inverse"></i>
                      </span>
                    </a>
                  </li>
                )
              }

            </ul>
            <p class="copyright text-muted">
              Copyright &copy; {config.author} {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

    </footer>
  );
}