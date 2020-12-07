
  var $toc = $('.toc-article');
  var $$toc = document.querySelector('.toc-article');
  var $$tocBar = document.querySelector('#sidebar');
  var left = $$tocBar.getBoundingClientRect().left;
  $toc.css('left', left).css('height', window.innerHeight);

  function onResize () {
    var left = $$tocBar.getBoundingClientRect().left;
    $toc.css('left', left).css('height', window.innerHeight);
    scrollCheck();
  }
  
  function scrollCheck() {
      var rectbase = $$tocBar.getBoundingClientRect();
      if (rectbase.top <= 0) {
          (!$toc.hasClass('toc-fixed')) && $toc.addClass('toc-fixed');
          $toc.hasClass('toc-normal') && $toc.removeClass('toc-normal');
      } else {
          $toc.hasClass('toc-fixed') && $toc.removeClass('toc-fixed');
          (!$toc.hasClass('toc-normal')) && $toc.addClass('toc-normal');
          ($$toc.scrollTop > 0) && ($$toc.scrollTop = 0);
      }
  }
  
  if ($$toc.getBoundingClientRect().left !== 0) {
      $(document).on('scroll', scrollCheck);
      window.onresize = onResize;
      scrollCheck();
  }