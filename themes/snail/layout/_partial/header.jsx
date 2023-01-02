import React from 'react';

const Header = ({ is_post, page, config, wordcount, min2read, is_home }) => {
  const introHeaderStyle = is_home() ? {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('${config["header-img"]}')`
  } : is_post() ? {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('${page["header-img"]}')`
  } : {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('${page["header-img"]}')`
  };
  const signatureStyle = config.signature ? {
    backgroundImage: `url('${config.root}${config["signature-img"]}')`,
  } : {};

  return (
    <header className="intro-header" style={introHeaderStyle}>
      <div id="signature" style={signatureStyle}>
        <div className="container">
          <div className="row">
            <div className="col-lg-8 col-lg-offset-2 col-md-10 col-md-offset-1">
              {
                is_post() && (
                  <div className="post-heading">
                    <div className="tags">
                      {
                        page.tags.map((tag) => <a key={tag.name} className="tag" href={`${config.root}tags/#${tag.name}`} title={tag.name}>{tag.name}</a>)
                      }
                    </div>
                    <h1>{page.title}</h1>
                    <h2 className="subheading">{page.subtitle || ""}</h2>
                    <span className="meta">
                      <span className="post-description">
                        <i className="fa fa-user" aria-hidden="true"></i>
                        {page.author || config.author}
                      </span>
                      <span className="post-description">
                        <i className="fa fa-calendar" aria-hidden="true"></i>
                        {page.date.format(config.date_format)}
                      </span>
                    </span>

                    {
                      (config['visitor']['enable']) && (
                        <React.Fragment>
                          <div className="blank_box"></div>
                          <span className="meta">
                            字数：<span className="post-count">{wordcount(page.content)}</span>丨
                            阅读时间：<span className="post-count">{min2read(page.content)}</span> 分钟
                          </span>
                          <div className="blank_box"></div>
                        </React.Fragment>
                      )
                    }
                  </div>
                )
              }
              {
                !is_post() && (
                  <div className="site-heading">
                    <h1 data-text={page.title || config.title} className="center-text glitch">{page.title || config.title}</h1>
                    <span id="subdusi" className="subheading">{page.description || config.subtitle || ''}</span>
                  </div>
                )
              }

            </div>
          </div>
        </div>
      </div>

      {
        (config['bg_effects']['enable'] && config['bg_effects']['wave']['enable']) && (
          <div className="waveWrapper">
            <div className="wave wave_before" style={{ backgroundImage: `url('/img/wave-${config.color_theme}.png')` }}></div>
            <div className="wave wave_after" style={{ backgroundImage: `url('/img/wave-${config.color_theme}.png')` }}></div>
          </div>
        )
      }
    </header>
  );
};

export default Header;