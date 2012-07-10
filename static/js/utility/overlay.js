_r(function (app) {
  
  var $modal = $('#modal');
  $modal.modal({show: false});
  var default_locals = {
    header: 'Attention',
    buttons: ['Yes', 'No']
  };
  
  app.overlay = function (options) {
    this.closeOverlay();
    options = options || {};
    var view = options.view || null;
    var module = options.module || 'overlays';
    var locals = _.extend({
      _t: function (name, submodule, module_specific) {
        return $.t(name, submodule || view, module_specific || module);
      }
    }, default_locals, options.locals);
    
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
          console.log('error');
          app.closeOverlay();
        }
      });
    };
    if (view) {
      app.template(module, view, locals, function (body) {
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