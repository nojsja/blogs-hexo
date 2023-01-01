$(function () {
  var $toc = $('.toc-article');
  var $$toc = document.querySelector('.toc-article');
  var $$tocBar = document.querySelector('#sidebar');
  var $anchorNav = document.querySelector('#sidebar .toc-nav');
  var anchorNavActiveClass = 'toc-item-active';
  var left = $$tocBar.getBoundingClientRect().left;
  var cacheNavActiveItem = null;

  function onResize() {
    left = $$tocBar.getBoundingClientRect().left;
    $toc.css('left', left).css('height', window.innerHeight);
    scrollCheck();
  }

  /* 导航条fixed定位 */
  var scrollCheck = fnThrottle(function () {
    var rectbase = $$tocBar.getBoundingClientRect();
    if (rectbase.top <= 0) {
      $toc.css('left', left);
      (!$toc.hasClass('toc-fixed')) && $toc.addClass('toc-fixed');
      $toc.hasClass('toc-normal') && $toc.removeClass('toc-normal');
    } else {
      $toc.css('left', '');
      $toc.hasClass('toc-fixed') && $toc.removeClass('toc-fixed');
      (!$toc.hasClass('toc-normal')) && $toc.addClass('toc-normal');
      ($$toc.scrollTop > 0) && ($$toc.scrollTop = 0);
    }
  }, 10);

  /* 导航条自动高亮+自动滚动 */
  var refreshAnchorNavActiveItem = function () {
    function query(selector) {
      return document.querySelectorAll(selector);
    }
    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          // in view port
          if (entry.intersectionRatio > 0) {
            if (cacheNavActiveItem === entry.target) return;
            cacheNavActiveItem = entry.target;
            var preTargetNavItem = $anchorNav.querySelector('.' + anchorNavActiveClass);
            var targetNavItem = $anchorNav.querySelector('.toc-nav-link[href="#' + encodeURIComponent(entry.target.id) + '"]');
            if (preTargetNavItem) { // 移除上一个高亮
              preTargetNavItem.classList.remove(anchorNavActiveClass);
            }
            if (targetNavItem && targetNavItem.parentNode && targetNavItem.parentNode) {
              var targetClientRect = targetNavItem.getBoundingClientRect();
              var subDistance = targetClientRect.top - window.innerHeight; // 相对于视口的距离 - 视口高度
              if (targetClientRect.top < 0) { // 超出视口顶部
                $$toc.scrollTop = Math.abs(targetClientRect.top);
              } else if (subDistance > 0) { // 超出视口底部
                $$toc.scrollTop += subDistance + 40;
              }
              targetNavItem.parentNode.classList.add(anchorNavActiveClass);
              $toc.scrollTop = targetNavItem.parentNode.offsetTop;
            }
          } else {
            if (entry.target === cacheNavActiveItem) { // 退出视口时，清除高亮
              cacheNavActiveItem = null;
              var preTargetNavItem = $anchorNav.querySelector('.' + anchorNavActiveClass);
              if (preTargetNavItem) {
                preTargetNavItem.classList.remove(anchorNavActiveClass);
              }
            }
          }
        });
      });

      // 为所有的标题元素添加观察
      [
        '.post-container h1[id]',
        '.post-container h2[id]',
        '.post-container h3[id]',
        '.post-container h4[id]',
        '.post-container h5[id]'
      ].forEach(function (selector) {
        query(selector).forEach(function (item) {
          observer.observe(item);
        });
      });
    }

  };

  /* 初始化 */
  $toc.css('height', window.innerHeight);
  if ($$toc.getBoundingClientRect().left !== 0) { // 滚动条未隐藏
    $(document).on('scroll', scrollCheck);
    window.onresize = onResize;
    scrollCheck();
    refreshAnchorNavActiveItem();
  }
});