var toc = document.getElementById('toc')

if (toc != null) {
	window.addEventListener("scroll", scrollcatelogHandler);
	var height_header = $("#signature").height();
	function scrollcatelogHandler(e) {
		var tocPosition = toc.offsetTop;
		 var event = e || window.event,
		     target = event.target || event.srcElement;
		 var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
		 if (scrollTop >  tocPosition - 60) {
				 toc.classList.add("toc-fixed");
		 } else {
			console.log(scrollTop, tocPosition - 60, 2);
				 toc.classList.remove("toc-fixed");
		 }
	}
}

