import React from 'react';

export default function Pagination({ __, page, config }) {
  return (
    <ul className="pager">
      {
        page.prev && (
          <li className="previous"><a href={`${config.root}${page.prev_link}`}>&larr;  {__('next')}</a></li>
        )
      }
      {
        page.next && (
          <li className="next"><a href={`${config.root}${page.next_link}`}>{__('prev')}  &rarr;</a></li>
        )
      }
    </ul>
  );
}
