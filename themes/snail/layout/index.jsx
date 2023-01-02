import React from 'react';

const Index = ({ site, config, page }) => {
  const postRender = (post, isTop) => {
    return (
      <React.Fragment key={post.path}>
        <div className="post-preview">
          <a href={`${config.root}${post.path}`}>
            <h2 className="post-title">
              {
                isTop && (<React.Fragment><span className="post-top">✪</span>&nbsp;</React.Fragment>)
              }
              {
                post.title || "Untitled"
              }
            </h2>
            <h3 className="post-subtitle">
              {">>"}&nbsp; {post.subtitle || ""}
            </h3>
            <div className="post-content-preview">
              {
                (post.content || '').slice(0, 200)
              }
              ...
            </div>
            <p className="post-meta" style={{ margin: config.home_posts_tag ? '10px 0' : '' }}>
              <span className="post-description">
                <i className="fa fa-user" aria-hidden="true"></i>
                {
                  post.author || config.author
                }
              </span>
              <span className="post-description">
                <i className="fa fa-calendar" aria-hidden="true"></i>
                {
                  post.date.format(config.date_format)
                }
              </span>
            </p>
            {
              config.home_posts_tag && (
                <div className="tags">
                  {
                    post.tags.map((tag) => <a key={tag.name} href={`${config.root}tags/${tag.name}`} title={tag.name}>{tag.name}</a>)
                  }
                </div>
              )
            }
          </a>
        </div>
        <hr className="no-border" />
      </React.Fragment>
    );
  };

  return (
    <React.Fragment>
    {
      (site.posts || []).filter((post) => post.top).map((post) => {
        return postRender(post, true);
      })
    }
    {
      (page.posts || []).filter((post) => !post.top).map((post) => {
        return postRender(post, false);
      })
    }
    </React.Fragment>
  );
};

export default Index;
