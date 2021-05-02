
  var $toc = $('.toc-article');
  var $$toc = document.querySelector('.toc-article');
  var $$tocBar = document.querySelector('#sidebar');
  var left;

  function onResize () {
    left = $$tocBar.getBoundingClientRect().left;
    $toc.css('left', left).css('height', window.innerHeight);
    scrollCheck();
  }
  
  var scrollCheck = fnThrottle(function() {
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
  }, 200);

  $(function() {
    left = $$tocBar.getBoundingClientRect().left;
    $toc.css('height', window.innerHeight);
    if ($$toc.getBoundingClientRect().left !== 0) {
        $(document).on('scroll', scrollCheck);
        window.onresize = onResize;
        scrollCheck();
    }
  });