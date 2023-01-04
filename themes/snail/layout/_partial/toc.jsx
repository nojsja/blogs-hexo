import React from 'react';

export default function Toc({ __, page, is_post, toc }) {
  return (
    page.catalog && is_post() && (toc(page.content) != "") && (
          <aside id="sidebar">
            <div id="toc" class="toc-article">
            <strong class="toc-title">{__('Contents')}</strong>
            {
              toc(page.content) !== '' ? (
                page.tocnum == false ? toc(page.content, { "class": "toc-nav", list_number: false }) : toc(page.content, { "class": "toc-nav" })
              ) : (
                <ol class="nav">{__('none')}</ol>
              )
            }
            </div>
          </aside>
    )
  );
}
