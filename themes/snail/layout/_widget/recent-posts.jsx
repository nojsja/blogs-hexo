import React from 'react'

export default function RecentPosts({ site, __, url_for }) {
  return (
    site.posts.length && (
      <>
        <h5>Recent</h5>
        <div className="widget">
          <ul className="recent">
            {
              site.posts.sort('date', -1).limit(5).map((post) => (
                <li>
                  <a href={url_for(post.path)}>{post.title || '(no title)'}</a>
                </li>
              ))
            }
          </ul>
        </div>
      </>
    )
  );
}
