import React from 'react';
import ReactHtmlParser from 'react-html-parser';

export default function Post({ page, config }) {
  return (
<article>
  <div class="container">
    <div class="row">

      <div class="
                col-lg-8 col-lg-offset-2
                col-md-10 col-md-offset-1
                post-container markdown-body"
        >
        {
            ReactHtmlParser(page.content)
        }
        {/* 不蒜子统计 start */}
        <span class="meta" id="headerViewCountWrapper">
          <span id="<Your/Path/Name>" class="leancloud_visitors" data-flag-title="Your Article Title">
            <em class="post-meta-item-text">⇸⇸ 阅读量：</em>
            <i class="leancloud-visitors-count">[ loading ]</i>⇷⇷
          </span>
        </span>
        {/* <script>
          document.querySelector('#headerViewCountWrapper > .leancloud_visitors').id = decodeURIComponent(window
            .location.pathname);
        </script> */}
        {/* 不蒜子统计 end */}
        <hr style="margin-top: 5px;" />

        {/* Pager */}
        <ul class="pager">
          {
            page.prev && (
              <li class="previous">
                <a href="<%- config.root %><%- page.prev.path %>" data-toggle="tooltip" data-placement="top"
                  title="<%- page.prev.title %>">&larr; Previous Post</a>
              </li>
            )
          }
          {
            page.next && (
              <li class="next">
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
              <div class="comment_notes_blank"></div>
              <div class="visitor_notice">
                <img src="/img/notice.png" alt="notice" title="notice" />
                <p class="notice">
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
              <div class="social-share" data-wechat-qrcode-helper="" align="center"></div>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/social-share.js/1.0.16/css/share.min.css" />
              <script src="https://cdnjs.cloudflare.com/ajax/libs/social-share.js/1.0.16/js/social-share.min.js"></script>
            </>
          )
        }
      </div>

    </div>
  </div>
</article>

// <!-- comment start -->
//         <% if(config['comment']['valine']['enable']){ %>
//           <hr>
//           <%- partial('_partial/comment') %>
//         <% } %></hr>

// <%- partial('_partial/toc') %>

// <% if(config['anchorjs']) { %>
//   <%- partial('_partial/anchor') %>
// <% } %>

// <%- partial('_widget/modal') %>
)
}
