
/* *************** hux-blog.js *************** */

/*!
 * Clean Blog v1.0.0 (http://startbootstrap.com)
 * Copyright 2015 Start Bootstrap
 * Licensed under Apache 2.0 (https://github.com/IronSummitMedia/startbootstrap/blob/gh-pages/LICENSE)
 */

// Tooltip Init
$(function() {
  $("[data-toggle='tooltip']").tooltip();
});


// make all images responsive
/* 
* Unuse by Hux
* actually only Portfolio-Pages can't use it and only post-img need it.
* so I modify the _layout/post and CSS to make post-img responsive!
*/
// $(function() {
// 	$("img").addClass("img-responsive");
// });

// responsive tables
$(document).ready(function() {
$("table").wrap("<div class='table-responsive'></div>");
$("table").addClass("table");
});

// responsive embed videos
$(document).ready(function () { 
  $('iframe[src*="youtube.com"]').wrap('<div class="embed-responsive embed-responsive-16by9"></div>');
$('iframe[src*="youtube.com"]').addClass('embed-responsive-item');
  $('iframe[src*="vimeo.com"]').wrap('<div class="embed-responsive embed-responsive-16by9"></div>');
$('iframe[src*="vimeo.com"]').addClass('embed-responsive-item');
});

// Navigation Scripts to Show Header on Scroll-Up
jQuery(document).ready(function($) {
  var MQL = 1170;

  //primary navigation slide-in effect
  if ($(window).width() > MQL) {
      var headerHeight = $('.navbar-custom').height();
      $(window).on('scroll', {
              previousTop: 0
          },
          (function() {
              var currentTop = $(window).scrollTop();
              //check if user is scrolling up
              if (currentTop < this.previousTop) {
                  //if scrolling up...
                  if (currentTop > 0 && $('.navbar-custom').hasClass('is-fixed')) {
                      $('.navbar-custom').addClass('is-visible');
                  } else {
                      $('.navbar-custom').removeClass('is-visible is-fixed');
                  }
              } else {
                  //if scrolling down...
                  $('.navbar-custom').removeClass('is-visible');
                  if (currentTop > headerHeight && !$('.navbar-custom').hasClass('is-fixed'))
                    $('.navbar-custom').addClass('is-fixed');
              }
              this.previousTop = currentTop;
          }));
  }
});

/* *************** search.js *************** */

/* Search */
var searchFunc = function(path, search_id, content_id) {
  'use strict';
  var $input = document.getElementById(search_id);
  if (!$input) return;

  $input.onfocus = function() {

      var $input = document.getElementById(search_id);
      $input.onfocus = undefined;
      $.ajax({
          url: path,
          dataType: "xml",
          success: function (xmlResponse) {
              // get the contents from search data
              var datas = $("entry", xmlResponse).map(function () {
                  return {
                      title: $("title", this).text(),
                      content: $("content", this).text(),
                      url: $("url", this).text()
                  };
              }).get();

              var $resultContent = document.getElementById(content_id);
              if ($("#local-search-input").length > 0) {
                  $input.addEventListener('input', function () {
                      var str = '<ul class=\"search-result-list\">';
                      var keywords = this.value.trim().toLowerCase().split(/[\s\-]+/);
                      $resultContent.innerHTML = "";
                      if (this.value.trim().length <= 0) {
                          return;
                      }
                      // perform local searching
                      datas.forEach(function (data) {
                          var isMatch = true;
                          var content_index = [];
                          if (!data.title || data.title.trim() === '') {
                              data.title = "Untitled";
                          }
                          var data_title = data.title.trim().toLowerCase();
                          var data_content = data.content.trim().replace(/<[^>]+>/g, "").toLowerCase();
                          var data_url = data.url;
                          var index_title = -1;
                          var index_content = -1;
                          var first_occur = -1;
                          // only match artiles with not empty contents
                          if (data_content !== '') {
                              keywords.forEach(function (keyword, i) {
                                  index_title = data_title.indexOf(keyword);
                                  index_content = data_content.indexOf(keyword);

                                  if (index_title < 0 && index_content < 0) {
                                      isMatch = false;
                                  } else {
                                      if (index_content < 0) {
                                          index_content = 0;
                                      }
                                      if (i == 0) {
                                          first_occur = index_content;
                                      }
                                      // content_index.push({index_content:index_content, keyword_len:keyword_len});
                                  }
                              });
                          } else {
                              isMatch = false;
                          }
                          // show search results
                          if (isMatch) {
                              str += "<li><a href='" + data_url + "' class='search-result-title'>" + data_title + "</a>";
                              var content = data.content.trim().replace(/<[^>]+>/g, "");
                              if (first_occur >= 0) {
                                  // cut out 100 characters
                                  var start = first_occur - 20;
                                  var end = first_occur + 80;

                                  if (start < 0) {
                                      start = 0;
                                  }

                                  if (start == 0) {
                                      end = 100;
                                  }

                                  if (end > content.length) {
                                      end = content.length;
                                  }

                                  var match_content = content.substring(start, end);

                                  // highlight all keywords
                                  keywords.forEach(function (keyword) {
                                      var regS = new RegExp(keyword, "gi");
                                      match_content = match_content.replace(regS, "<em class=\"search-keyword\"><i style='color:rgb(231,133,104);'><b>" + keyword + "</b></i></em>");
                                  });

                                  str += "<p class=\"search-result\">" + match_content + "...</p>"
                              }
                              str += "</li>";
                          }
                      });
                      str += "</ul>";
                      $resultContent.innerHTML = str;
                  });
              }
          }
      });
  }

}

$(document).ready(function(){
  $("#local-search-input").bind('keypress',function(event){
      if(event.keyCode=='13'){
          //$(this).val('');
          alert('search');
      }
  })
});
