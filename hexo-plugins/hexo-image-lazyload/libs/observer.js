'use strict'

function query(selector) {
  return document.querySelectorAll(selector);
}

if (IntersectionObserver) {

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var img = entry.target;
        img.src = img.getAttribute('data-src');
        img.setAttribute('data-loaded', true);
        observer.unobserve(img);
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
