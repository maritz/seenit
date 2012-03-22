_r(function (app) {
  
  var $modal = $('#modal');
  var default_locals = {
    header: 'Attention',
    buttons: ['Yes', 'No']
  };
  
  app.overlay = function (options) {
    this.closeOverlay();
    options = options || {};
    var view = options.view || null;
    var locals = _.extend({}, default_locals, options.locals);
    
    if (options.confirm) {
      $modal.one('click', 'button.confirm', function () {
        $modal.off('hide', options.cancel);
        options.confirm();
        app.closeOverlay();
      });
    }
    if (options.cancel) {
      $modal.one('hide', options.cancel);
    }
    
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
    $modal.off('click', 'button.confirm');
    $modal.off('click', 'button.cancel');
  };
  
  _.bindAll(app, 'overlay', 'closeOverlay');
  
});