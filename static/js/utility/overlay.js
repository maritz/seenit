_r(function (app) {
  
  var $modal = $('#modal');
  var default_locals = {
    header: 'Attention',
    buttons: ['Yes']
  };
  
  app.overlay = function (options) {
    this.closeOverlay();
    options = options || {};
    var view = options.view || null;
    var locals = _.extend({}, default_locals, options.locals);
    var renderModal = function () {
      app.template('page', 'modal', locals, function (modal_html) {
        if (typeof(modal_html) === 'string') {
          $modal.html(modal_html).modal('show');
        } else {
          if (view !== 'error') {
            this.overlay = false;
            app.overlay({view: 'error', locals: {error: 'Overlay view does not exist.'}});
          }
        }
      });
    };
    if (view) {
      app.template('overlays', view, locals, function (body) {
        locals.body = body;
        renderModal();
      });
    } else {
      renderModal();
    }
  };
  
  app.closeOverlay = function () {
    $modal.modal('hide');
  };
  
  _.bindAll(app, 'overlay', 'closeOverlay');
  
});