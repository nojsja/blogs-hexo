import React from 'react';

export default function ShortAbout({ config, __ }) {
  return (
    <section class="visible-md visible-lg">
      <h5><a href={`${config.root}about/`}>Me</a></h5>
      <div class="short-about">
        {
          config['sidebar-avatar'] && (
            <img id="avatar_pic" height="auto" alt="avatar" width="80%" src={`${config.root}${config['sidebar-avatar']}`} />
          )
        }
        {
          config['sidebar-about-description'] && (
            <p>{config['sidebar-about-description']}</p>
          )
        }
        <ul class="list-inline">
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
            config.jianshu_username && (
              <li>
                <a target="_blank" rel="noopener" href={`https://www.jianshu.com/u/${config.jianshu_username}`}>
                  <span class="fa-stack fa-lg">
                    <i class="fa fa-circle fa-stack-2x"></i>
                    <i class="fa fa-stack-1x fa-inverse">简</i>
                  </span>
                </a>
              </li>
            )
          }
          {
            config.segmentfault_username && (
              <li>
                <a target="_blank" rel="noopener" href="https://juejin.cn/user/3298190612015405/posts">
                  <span class="fa-stack fa-lg">
                    <i class="fa fa-circle fa-stack-2x"></i>
                    <i class="fa fa-stack-1x fa-inverse">掘</i>
                  </span>
                </a>
              </li>
            )
          }
          {
            config.zhihu_username && (
              <li>
                <a target="_blank" rel="noopener" href="https://www.zhihu.com/people/<%= config.zhihu_username %>">
                  <span class="fa-stack fa-lg">
                    <i class="fa fa-circle fa-stack-2x"></i>
                    <i class="fa  fa-stack-1x fa-inverse">知</i>
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
      </div>
    </section>
  );
}
