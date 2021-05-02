
(function() {
  /* avoid garbage collection */
  window.hexoLoadingImages = window.hexoLoadingImages || {};

  function query(selector) {
    return document.querySelectorAll(selector);
  }
  
  /* registry listener */
  if (window.IntersectionObserver) {
  
    var observer = new IntersectionObserver(function (entries) {

      entries.forEach(function (entry) {
        // in view port
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);

          // proxy image
          var img = new Image();
          var imgId = "_img_" + Math.random();
          window.hexoLoadingImages[imgId] = img;

          img.onload = function() {
            entry.target.src = entry.target.getAttribute('data-src');
            window.hexoLoadingImages[imgId] = null;
          };
          img.onerror = function() {
            window.hexoLoadingImages[imgId] = null;
          }

          entry.target.src = entry.target.getAttribute('data-loading');
          img.src = entry.target.getAttribute('data-src');

        }
      });
    });
    
    query('img[lazyload]').forEach(function (item) {
      observer.observe(item);
    });
  
  } else {
  /* fallback */
    query('img[lazyload]').forEach(function (img) {
      img.src = img.getAttribute('data-src');
    });
  
  }
}).bind(window)();