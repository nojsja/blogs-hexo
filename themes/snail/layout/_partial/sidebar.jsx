import React from 'react';

import ShortAbout from '../_widget/short-about';
import Search from '../_widget/search';
import RecentPosts from '../_widget/recent-posts';

const widgets = {
  'search': (props) => <Search {...props} />,
  'short-about': (props) => <ShortAbout {...props} />,
  // 'featured-tags': '',
  'recent-posts': (props) => <RecentPosts {...props} />,
  // 'friends-blog': '',
};


const Sidebar = (props) => {
  return (
    <div className="
      col-lg-3 col-lg-offset-0
      col-md-3 col-md-offset-0
      col-sm-12
      col-xs-12
      sidebar-container
    ">
      {
        props.config.widgets.map((widget) => {
          if (widgets[widget]) {
            return (
              <>
                {
                  widgets[widget](props)
                }
                <hr />
              </>
            )
          }
          return null;
        })
      }
    </div>
  );
};

export default Sidebar;
