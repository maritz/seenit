_r(function (app) {
  
  var modal_defaults = {
    
  };
  
  app.overlay = function (options) {
    this.closeOverlay();
    options = options || {};
    var view = options.view || 'error';
    var modal_options = _.extend({}, modal_defaults, options.modal);
    app.template('page', view, options.locals, function (modal_html) {
      if (typeof(modal_html) === 'string') {
        $.modal(modal_html, modal_options);
      } else {
        if (view !== 'error') {
          this.overlay = false;
          app.overlay({locals: {error: 'Overlay view does not exist.'}});
        }
      }
    });
  };
  
  app.closeOverlay = function () {
    $.modal.close();
  };
  
  _.bindAll(app, 'overlay', 'closeOverlay');
  
});