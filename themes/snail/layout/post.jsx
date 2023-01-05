import React, { useEffect } from 'react';
import ReactHtmlParser from 'react-html-parser';

import Comment from './_partial/comment';
import Toc from './_partial/toc';
import Anchor from './_partial/anchor';
import Modal from './_widget/modal';

export default function Post(props) {
  const { page, config } = props;

  useEffect(() => {
    const visitors = document.querySelector('#headerViewCountWrapper > .leancloud_visitors');
    if (visitors) {
      visitors.id = decodeURIComponent(window.location.pathname);
    }
  }, []);

  return (
    <>
      <article>
        <div className="container">
          <div className="row">

            <div className="
                  col-lg-8 col-lg-offset-2
                  col-md-10 col-md-offset-1
                  post-container markdown-body"
            >
              {ReactHtmlParser(page.content)}
              {/* 不蒜子统计 start */}
              <span className="meta" id="headerViewCountWrapper">
                <span id="<Your/Path/Name>" className="leancloud_visitors" data-flag-title="Your Article Title">
                  <em className="post-meta-item-text">⇸⇸ 阅读量：</em>
                  <i className="leancloud-visitors-count">[ loading ]</i>⇷⇷
                </span>
              </span>
              {/* 不蒜子统计 end */}
              <hr style={{ marginTop: 5 }} />

              {/* Pager */}
              <ul className="pager">
                {
                  page.prev && (
                    <li className="previous">
                      <a href="<%- config.root %><%- page.prev.path %>" data-toggle="tooltip" data-placement="top"
                        title="<%- page.prev.title %>">&larr; Previous Post</a>
                    </li>
                  )
                }
                {
                  page.next && (
                    <li className="next">
                      <a href="<%- config.root %><%- page.next.path %>" data-toggle="tooltip" data-placement="top"
                        title="<%- page.next.title %>">Next Post &rarr;</a>
                    </li>
                  )
                }
              </ul>

              {/* tip start */}
              {
                config.tip.enable && (config.tip.content !== '') && (
                  <>
                    <div className="comment_notes_blank"></div>
                    <div className="visitor_notice">
                      <img src="/img/notice.png" alt="notice" title="notice" />
                      <p className="notice">
                        {
                          config.tip.content
                        }
                      </p>
                    </div>
                  </>
                )
              }

              {/* Music start */}
              {
                config.music.enable && (
                  <>
                    <span>{/* <%- partial('_partial/music') %> */}</span>
                  </>
                )
              }

              {/* Sharing */}
              {
                config.share && (
                  <>
                    <div className="social-share" data-wechat-qrcode-helper="" align="center"></div>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/social-share.js/1.0.16/css/share.min.css" />
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/social-share.js/1.0.16/js/social-share.min.js"></script>
                  </>
                )
              }

              {
                config.comment.valine.enable && (
                  <>
                    <hr />
                    <Comment {...props} />
                  </>
                )
              }

            </div>

            <Toc {...props} />

          </div>
        </div>
      </article>
      {
        config.anchorjs && (
          <Anchor {...props} />
        )
      }
      <Modal {...props} />
    </>
  );
}
