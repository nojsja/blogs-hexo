import React from 'react';

export default function Pagination({ __, page, config }) {
  return (
    <ul class="pager">
      {
        page.prev && (
          <li class="previous"><a href={`${config.root}${page.prev_link}`}>&larr;  {__('next')}</a></li>
        )
      }
      {
        page.next && (
          <li class="next"><a href={`${config.root}${page.next_link}`}>{__('prev')}  &rarr;</a></li>
        )
      }
    </ul>
  );
}
