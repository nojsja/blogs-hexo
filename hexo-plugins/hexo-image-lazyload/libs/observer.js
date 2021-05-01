'use strict'

function query(selector) {
  return document.querySelectorAll(selector);
}

if (IntersectionObserver) {

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var img = new Image();
        img.src = entry.target.getAttribute('data-src');
        entry.target.src = entry.target.getAttribute('data-loading');
        img.onload = function() {
          entry.target.src = img.src;
          entry.target.setAttribute('data-loaded', true);
          img.onload = undefined;
        };
        observer.unobserve(entry.target);
      }
    });
  });
  
  query('img[lazyload]').forEach(function (item) {
    observer.observe(item);
  });

} else {

  query('img[lazyload]').forEach(function (img) {
    img.src = img.getAttribute('data-src');
  });

}
