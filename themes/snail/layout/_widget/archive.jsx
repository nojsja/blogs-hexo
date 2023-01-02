import React from 'react';

export default function Archive({ site, list_archives, __ }) {
  return (
    site.posts.length && (
      <>
        <h5>{ __('ARCHIVES') }</h5>
        <div class="widget">
          { list_archives({show_count: config.show_count, type: config.archive_type}) }
        </div>
      </>
    );
  );
}
