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
    var template = options.view || options.template || null;
    var module = options.module || 'overlays';
    var locals = _.extend({
      _t: function (name, submodule, module_specific) {
        return $.t(name, submodule || template, module_specific || module);
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
    if ( ! options.onRender) {
      options.onRender = function () {};
    }
    
    var renderModal = function () {
      app.template('page', 'modal', locals, function (modal_html) {
        if (typeof(modal_html) === 'string') {
          $modal.html(modal_html).modal('show');
          options.onRender($modal);
        } else {
          if (template !== 'error') {
            this.overlay = false;
            app.overlay({view: 'error', locals: {error: 'Overlay view does not exist.'}});
          }
          console.log('error');
          app.closeOverlay();
        }
      });
    };
    if (template) {
      app.template(module, template, locals, function (body) {
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