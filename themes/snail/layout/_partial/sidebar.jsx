import React from 'react';

const Sidebar = ({ config }) => {
  return (
    <div class="
      col-lg-3 col-lg-offset-0
      col-md-3 col-md-offset-0
      col-sm-12
      col-xs-12
      sidebar-container
    ">
      {
        config.widgets.map((widget) => {
          // partial('_widget/' + widget)
          return (<hr />)
        })
      }
    </div>
  );
};

export default Sidebar;
