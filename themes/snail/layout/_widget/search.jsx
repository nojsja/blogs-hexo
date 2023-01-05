import React from 'react'

export default function Search({ config, __ }) {
  return (
    config.search.enable && (
      <>
        <h5>SEARCH</h5>
        <div id="site_search">
          <div className="form-group">
            <input
              type="text"
              id="local-search-input"
              name="q"
              results="0"
              placeholder={__('search')}
              className="st-search-input st-default-search-input form-control"
            />
          </div>
          <div id="local-search-result"></div>
        </div>
      </>
    )
  );
}
