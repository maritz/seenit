
_r('form_templates'); // see app.initiaize

var App = Backbone.Router.extend({
  
  initialize: function (spec) {
    var self = this;
    this.config = {
      $content: $('#content'),
      $breadcrumb: $('#breadcrumb')
    };
    _.extend(this.config, spec);

    this.models = {};
    this.collections = {};
    this.views = {};
    this.formHandler = {};
    this.currentView = null;
    this.route('*args', 'routeToView', this.router);
    this._templates = {};
    this.template('form', 'input', {}, function () {
      // make sure we have the form templates loaded so we can safely call them from other templates
      _r('form_templates', true);
    });
  },
  
  base: {}, // backbone.extend.js
  
  router: function(route){
    var module = 'main',
        action = 'index',
        parameters = [];
    
    this.currentRoute = route; // for reloading
    
    if (route !== '') {
      route = route.split('/');
      module = route[0].toLowerCase();
      if (route.length > 1 && route[1])
        action = route[1].toLowerCase();
      if (route.length > 2) {
        route.splice(0, 2);
        parameters = route;
      }
    }
    
    this.closeOverlay();
    try {
      this.currentView = this.view(module, action);
      this.breadcrumb(module, action, parameters);
    } catch(e) {
      $.jGrowl('Sorry, there was an error while trying to process your action');
      console.log('Routing error in route '+route+':');
      console.log(e.stack);
    }
  },
  
  view: function(module, action, $el) {
    if ( ! this.views.hasOwnProperty(module) || ! this.views[module].hasOwnProperty(action) ) {
      // try to just load a template without a proper view
      console.log('No view found, trying to render default view. ('+module+':'+action+')');
      var view = new this.base.pageView(module, action, $el);
      view.render();
      return view;
    } else {
      return this.currentView = new this.views[module][action](module, action, $el);
    }
  },
  
  go: function (str) {
    this.navigate('#'+str, true);
  },
  
  reload: function () {
    this.router(this.currentRoute);
  },
  
  breadcrumb: function (module, action, parameters) {
    var locals = {
      module: module,
      action: action,
      parameters: parameters && parameters.length && parameters[0].match(/[\d]*/) && parameters[0]
    },
    self = this;
    this.template('page', 'breadcrumb', locals, function (html) {
      self.config.$breadcrumb.html(html);
    });
  },
  
  _templates: {},
  jade: require('jade'),
  template: function (module, name, locals, callback) {
    var self = this,
    tmpl_module;
    
    locals = locals || {};
    
    _.extend(locals, {
      partial: function (name, locals_) {
        locals_ = locals_ || {}
        locals_.parentLocals = locals;
        locals_._t = locals._t;
        return self.template(module, name, locals_);
      },
      form: function (element, params) {
        params._t = locals._t;
        return self.template('form', element, params);
      }
    });
    
    var options = {
      layout: false,
      colons: true
    };
    
    // TODO: cache templates in localStorage
    if (this._templates.hasOwnProperty(module) && this._templates[module].hasOwnProperty(name)) {
      var html = this._templates[module][name](locals);
      if (typeof(callback) === 'function') {
        callback(html);
      } else {
        return html;
      }
    } else {
      if (typeof(callback) !== 'function') {
        console.dir(this._templates);
        console.dir(arguments);
        throw new Error('Can\'t call _template without a callback if the template module was not loaded yet! (might be an invalid template call)');
      }
      tmpl_module = $('<div id="tmpl_'+module+'"></div>').appendTo('#templates');
      $.get('/templates/tmpl-'+module+'.html', function (data) {
        var found = false;
        if (!data) {
          console.log('Template module "'+module+'" not found.');
          return callback(false);
        }
        self._templates[module] = {};
        
        tmpl_module.append(data).children('script').each(function (i, val) {
          var tmpl = self.jade.compile(val.innerHTML, options),
              loaded_name = val.getAttribute('name');
          self._templates[module][loaded_name] = tmpl;
          if (loaded_name === name) {
            found = tmpl;
          }
        }).end().remove();
        if (!found) {
          console.log('Template view "'+name+'" not found in module "'+module+'"');
          callback(false);
        } else {
          callback(found(locals));
        }
      }, 'html');
    }
  }
});