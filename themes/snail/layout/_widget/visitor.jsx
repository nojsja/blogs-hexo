import React from 'react'

export default function Visitor({ site, __ }) {
  return (
    site.posts.length && (
      <>
        <h5>{__('VISITORS')}</h5>
        <div className="widget">
          <span>
            Viewed <b><i><span id="busuanzi_value_site_pv"><i className="fa fa-spinner fa-spin"></i></span></i></b> Times
        </span>
        <br/>
        <span>
          <b><i><span id="busuanzi_value_site_uv"><i className="fa fa-spinner fa-spin"></i></span></i></b> Visitors In Total
        </span>
        </div>
      </>
    )
  );
}
