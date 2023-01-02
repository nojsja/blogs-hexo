import React from 'react';

export default function Nav({ config, site }) {
  function handleMagic(e){
    const $navbar = document.querySelector('#huxblog_navbar');
    const $collapse = document.querySelector('.navbar-collapse');

    if ($navbar.className.indexOf('in') > 0) {
      // CLOSE
      $navbar.className = " ";
      // wait until animation end.
      setTimeout(function () {
        // prevent frequently toggle
        if ($navbar.className.indexOf('in') < 0) {
          $collapse.style.height = "0px"
        }
      }, 400)
    } else {
      // OPEN
      $collapse.style.height = "auto"
      $navbar.className += " in";
    }
  }

  return (
    <nav className="navbar navbar-default navbar-custom navbar-fixed-top">
      <div className="container-fluid">
        <div className="navbar-header page-scroll">
          <button type="button" className="navbar-toggle" onClick={handleMagic}>
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
          </button>
          <a className="navbar-brand" href={config.root}>{config.title}</a>
        </div>

        <div id="huxblog_navbar">
          <div className="navbar-collapse">
            <ul className="nav navbar-nav navbar-right">
              <li>
                <a href={config.root}>首页</a>
              </li>

              {
                site.pages.map((page) => {
                  if (page.title) {
                    return (
                      <li>
                        <a key={page.path} href={`${config.root}${page.path.replace('index.html', '')}`}>{page.title}</a>
                      </li>
                    );
                  }
                })
              }
              {
                config['chinese_blog']['enable'] && (
                  <li>
                    <a href={config.chinese_blog.url} target="_blank">Chinese Blog</a>
                  </li>
                )
              }
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
