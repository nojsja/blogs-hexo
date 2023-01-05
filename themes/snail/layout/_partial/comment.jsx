import React from 'react';
import useIntersectionObserver from '../_hooks/useIntersectionObserver';

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

  useIntersectionObserver(
    initComments,
    '#headerViewCountWrapper',
  );

  return (
    <div id="vcomments"></div>
  );
}
