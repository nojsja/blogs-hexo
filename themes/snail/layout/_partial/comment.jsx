import React, { useEffect } from 'react';

export default function Comment({ config }) {
  /* 初始化 comments 组件 */
  function initComments() {
    window.async(`${config.root}js/Valine.min.js`, function () {
      new Valine({
        el: '#vcomments',
        appId: config.comment.valine.appId,
        appKey: config.comment.valine.appKey,
        visitor: true
      });
    });
  }

  useEffect(() => {
    /* scroll listener */
    if (window.IntersectionObserver) {
      var vobserver = new IntersectionObserver(function (entrys) {
        entrys.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          vobserver.unobserve(entry.target);
          vobserver.disconnect();
          initComments();
        });
      });
      vobserver.observe(document.querySelector('#headerViewCountWrapper'));
    } else {
      initComments();
    }

    return () => {
      vobserver && vobserver.disconnect();
    };
  }, []);

  return (
    <div id="vcomments"></div>
  );
}
