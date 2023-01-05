import React from 'react';
import ReactHtmlParser from 'react-html-parser';

export default function Toc({ __, page, is_post, toc }) {
  return (
    page.catalog && is_post() && (toc(page.content) != "") && (
          <aside id="sidebar">
            <div id="toc" className="toc-article">
            <strong className="toc-title">{__('Contents')}</strong>
            {
              toc(page.content) !== '' ? (
                ReactHtmlParser(page.tocnum == false ? toc(page.content, { "class": "toc-nav", list_number: false }) : toc(page.content, { "class": "toc-nav" }))
              ) : (
                <ol className="nav">{__('none')}</ol>
              )
            }
            </div>
          </aside>
    )
  );
}
