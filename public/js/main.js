(function ($, undefined) {
  $(function () {
    $('input:checkbox.episode_seen').change(function () {
      var id = $(this).data('id')
      , seen = this.checked
      , label = $(this).prev();
      $.getJSON('/episode/seen_switch/'+id+'/'+seen, function(data) {
        label.stop().css('backgroundColor', 'green').animate({
          backgroundColor: 'hsla(80, 80, 70, 0)'
        }, 3000);
      });
    });
  });
})(jQuery);