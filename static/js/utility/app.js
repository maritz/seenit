
_r('form_templates'); // see app.initiaize

var App = Backbone.Router.extend({
  
  models: {},
  collections: {},
  views: {},
  formHandler: {},
  current: {
    module: null,
    action: null,
    view: null
  },
  _templates: {},
  history: [],
  
  initialize: function (spec) {
    var self = this;
    this.config = {
      default_module: 'main',
      default_action: 'index',
      $content: $('#content'),
      $breadcrumb: $('#breadcrumb'),
      $navigation: $('#navigation')
    };
    _.extend(this.config, spec);

    this.route('*args', 'routeToView', this.router);
    
    this.template('form', 'input', {}, function () {
      // make sure we have the form templates loaded so we can safely call them from other templates
      _r('form_templates', true);
    });
    
    this.bind('login', function () {
      if (self.current.module !== null) {
        _.delay(self.navigation,0,true);
      }
    });
    self.navigation();
  },
  
  base: {}, // backbone.extend.js
  
  router: function(route, force_rerender){
    var module = this.config.default_module,
        action = this.config.default_action,
        parameters = [],
        previous = this.current,
        self = this,
        orig_route = route;
        
    self.closeOverlay();
    self.history_add(orig_route);
    
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
    if ( ! module.match(/^[\w]+$/i) ) {
      module = this.config.default_module;
    }
    if ( ! action.match(/^[\w]+$/i) ) {
      action = this.config.default_action;
    }
    
    var data_expired = this.current.view ? this.current.view.isExpired() : false;
    
    if (this.current.orig_route === orig_route) {
      if (this.current.view !== null && ! force_rerender && ! data_expired) {
        console.log('data not stale, not reloading view');
        return false;
      }
    }
    
    try {
      this.view(module, action, null, parameters, function (view) {
        self.current = {
          module: module,
          action: action,
          view: view,
          route: orig_route
        };
        self.navigation();
        self.breadcrumb(parameters);
      });
    } catch(e) {
      this.current = previous;
      if (e !== 'view_stop') {
        $.jGrowl('Sorry, there was an error while trying to process your action');
        console.log('Routing error in route '+route+':');
        console.log(e.stack);
        self.back();
      } else {
        console.log('view stopped rendering');
      }
    }
  },
  
  view: function(module, action, $el, params, callback) {
    if (typeof (callback) !== 'function') {
      callback = $.noop;
    }
    var view;
    var after_render = function () {
      if ($el.hasClass('main_content') && $el[0].parentNode) {
        $el.siblings().remove();
      }
      callback(view);
    };
    
    if (!$el) {
      $el = $('<div></div>')
              .appendTo('#content')
              .addClass('main_content '+module+' '+action);
    }
    $el.data('module', module);
    $el.data('action', action);
    
    if ( ! this.views.hasOwnProperty(module) || ! this.views[module].hasOwnProperty(action) ) {
      // try to just load a template without a proper view
      console.log('No view found, trying to render default view. ('+module+':'+action+')');
      view = new this.base.pageView(module, action, $el, params);
      view.render();
    } else {
      view = new this.views[module][action](module, action, $el, params);
    }
    if (view.rendered) {
      after_render();
    } else {
      view.once('rendered', after_render);
      view.once('error', after_render);
    }
    return view;
  },
  
  go: function (str) {
    this.navigate('#'+str, true);
  },
  
  reload: function (force) {
    this.router(this.history[0] || '/', force);
  },
  
  back: function () {
    this.history.shift();
    this.navigate(this.history[0] || '', true);
    if (this.history.length > 0) {
      this.current = {
        module: this.config.default_module,
        action: this.config.default_action,
        route: '/'
      };
      this.navigation();
    }
  },
  
  history_add: function (route) {
    if (route !== this.history[0]) {
      this.history.unshift(route);
    }
    if (this.history.length > 20) {
      this.history.splice(20);
    }
  },
  
  breadcrumb: function (parameters) {
    return;
    var locals = _.extend({
        parameters: parameters && parameters.length && parameters[0].match(/[\d]*/) && parameters[0]
      }, this.current),
      self = this;
    this.template('page', 'breadcrumb', locals, function (html) {
      self.config.$breadcrumb.html(html);
    });
  },
  
  navigation: function  ()  {
    var self = this;
    var $nav = this.config.$navigation;
    self.template('page', 'top_navigation', {}, function (html) {
      $nav
        .html(html)
        .find('li')
          .removeClass('active');
      var $nav_matches = $nav
        .find('.nav > li')
          .has('a[href^="#'+self.current.module+'/'+self.current.action+'"]')
            .first()
              .addClass('active');
      if ($nav_matches.length === 0) {
        $nav
          .find('.nav > li')
            .has('a[href^="#'+self.current.module+'"]')
              .first()
                .addClass('active');
      }
      
      var $subnav = $nav
        .find('ul.sub_navigation')
          .empty();
      if (self.current.module) {
        self.template(self.current.module, 'sub_navigation', {
            _t: function (name) {
              return $.t(name, 'general', self.current.module);
            }
          }, function (html) {
          $subnav
            .html(html)
            .find('li')
              .removeClass('active')
            .has('a[href^="#'+self.current.module+'/'+self.current.action+'"]')
              .addClass('active');
        }); 
      }
    });
  },
  
  _templates: {},
  _templates_loading: {},
  jade: require('jade'),
  template: function (module, name, locals, callback) {
    var self = this;
    var tmpl_module;
    var original_arguments_arr = Array.prototype.slice.call(arguments);
    var filename = module+'/'+name+'.jade';
    
    locals = locals || {};
    
    _.extend(locals, {
      partial: function (name) {
        var args = _.toArray(arguments);
        args.shift();
        var locals_ = _.extend({},{
          parentLocals: locals,
          _t: locals._t,
          args: args
        });
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
    
    if (this._templates.hasOwnProperty(module) && this._templates[module].hasOwnProperty(name)) {
      try {
        var html = this._templates[module][name](locals);
        if (typeof(callback) === 'function') {
          setTimeout(function () {
            callback(html);
          }, 1);
        } else {
          return html;
        }
      } catch (e) {
        console.log('Error while rendering a template:'+filename, locals, e.message);
      }
    } else if ( ! this._templates.hasOwnProperty(module)) {
      if (typeof(callback) !== 'function') {
        console.dir(this._templates);
        console.dir(arguments);
        throw new Error('Can\'t call _template without a callback if the template module was not loaded yet! (might be an invalid template call)');
      }
      if (this._templates_loading[module]) {
        this._templates_loading[module].once('loaded', function () {
          self.template.apply(self, original_arguments_arr);
        });
        return false;
      } else {
        this._templates_loading[module] = _.extend({}, Backbone.Events);
      }
      tmpl_module = $('<div id="tmpl_'+module+'"></div>').appendTo('#templates');
      if (module === null) {
        debugger;
      }
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
        
        self._templates_loading[module].trigger('loaded');
        delete self._templates_loading[module];
        
        if (!found) {
          console.log('Template view "'+name+'" not found in module "'+module+'"');
          callback(false);
        } else {
          self.template.apply(self, original_arguments_arr);
        }
      }, 'html');
    } else {
      console.log('Template "'+name+'" in module "'+module+'" not found.');
      callback(false);
    }
  }
});