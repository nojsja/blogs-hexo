$(window).scroll(fnThrottle(function() {
    $(window).scrollTop() > $(window).height()*0.5 ?
        $("#rocket").addClass("show") :
        $("#rocket").removeClass("show");
}, 1000));

$("#rocket").click(function() {
    $("#rocket").addClass("launch");
    $("html, body").animate({
        scrollTop: 0
    }, 1000, function() {
        $("#rocket").removeClass("show launch");
    });
    return false;
});