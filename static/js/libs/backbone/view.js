_r(function (app) {
  
  app.base.pageView = Backbone.View.extend({
    
    auto_render: false,
    model_generated: false,
    max_age: 10000,
    $el: window.app.config.$content,
    wait_for_user_loaded: true,
    reload_on_login: false,
    
    initialize: function (module, action, $el, params) {
      var self = this;
      
      _.extend(this, Backbone.Events);
      
      this.$el = $el || this.$el;
      this.el = this.$el[0];
      this.module = module || this.module;
      this.action = action || this.action;
      this.i18n = [module, action];
      this.rendered = false;
      this.params = Array.isArray(params) ? params : [];
      
      if ( ! this.checkAllowed()) {
        this.closeAndBack();
        return false;
      }
      
      if (this.model) {
        if ( ! this.model.get || ! typeof(this.model.get) === 'function') {
          this.model = new this.model();
          this.model_generated = true;
        }
        this.addLocals({_model: this.model});
        this.model.view = this;
      }
      
      _.bindAll(this);
      
      this.addLocals({
        _t: function (name, submodule) {
          submodule = submodule || self.action;
          return $.t(name, submodule, self.module);
        },
        _view: this
      });
      if (this.init && typeof(this.init) === 'function') {
        this.init();
      }
      
      if (this.auto_render) {
        if (this.wait_for_user_loaded && ! app.user_self.loaded) {
          app.once('user_loaded', function () {
            self.render();
          });
        } else {
          this.render();
        }
      }
      
      if (this.reload_on_login) {
        app.once('login', function () {
          if (self.reload_on_login && self.$el.parent().length !== 0 && (app.current.view === self || ! self.$el.hasClass('main_content'))) {
            self.render();
          }
        });
      }
      
      this._gc_interval = setInterval(function () {
        self._check_gc();
      }, 250);
      
      this._expiration = +new Date() + this.max_age;
      return true;
    },
    
    _check_gc: function () {
      if (this.rendered && this.$el.parent().length === 0) {
        clearInterval(this._gc_interval);
        this._unload();
      }
    },
    
    _unload: function () {
      if (this.model_generated) {
        this.model.unbind();
        delete this.model;
      }
      this.unbind();
    },
    
    addLocals: function (locals) {
      if (!this.locals) {
        this.locals = {};
      }
      this.locals = _.extend(this.locals, locals);
    },
    
    successRender: function (locals) {
      var self = this;
      app.template(this.module, this.action, locals, function (html) {
        if (html === false) {
          self.errorRender(locals);
        } else {
          if (self.afterRender.call(self, html) !== false) {
            self.trigger('rendered');
            self.rendered = true;
            self.delegateEvents();
          }
        }
      });
    },
    
    errorRender: function (locals) {
      var self = this;
      var module = 'page';
      var action = 'error';
      if (this.own_error_template) {
        module = this.module;
        if (_.isString(this.own_error_template)) {
          action = this.own_error_template;
        }
      }
      app.template(module, action, locals, function (html) {
        self.afterRender.call(self, html)
        self.trigger('error');
        self.rendered = true;
      });
    },
    
    render: function () {
      var self = this;
      this.load(function (err, data) {
        var locals = _.extend({
          success: !err,
          data: data,
        }, self.locals);
        if (err) {
          self.errorRender(locals);
        } else {
          self.successRender(locals);
        }
      });
    },
    
    load: function (callback) {
      callback();
    },
    
    afterRender: function (html, error) {
      this.$el.html(html);
    },
    
    isExpired: function () {
      return +new Date() > this._expiration;
    },
    
    checkAllowed: function () {
      return true;
    },
    
    closeAndBack: function () {
      app.closeOverlay();
      if (this.$el.parent()[0] === app.config.$content[0]) {
        app.back();
      }
    }
    
  });
      
  app.base.formView = app.base.pageView.extend({
    
    initialize: function () {
      if ( ! app.base.pageView.prototype.initialize.apply(this, arguments)) {
        return false;
      }
      
      if (_.isFunction(this.saved)) {
        this.model.once('saved', this.saved);
      }
      if (_.isFunction(this.error)) {
        this.model.bind('error', this.error);
      }
    },
    
    afterRender: function (html) {
      this.$el.html(html);
      this.handler = new app.formHandler(this);
      this.handler.link();
    }
    
  });
      
  app.base.listView = app.base.pageView.extend({
    
    initialize: function () {
      if (this.collection) {
        if ( ! this.collection.getByCid || typeof(this.collection.getByCid) !== 'function') {
          this.collection = new this.collection();
          this.collection_generated = true;
        }
        this.addLocals({collection: this.collection});
      }
      
      if ( ! app.base.pageView.prototype.initialize.apply(this, arguments)) {
        return false;
      }
    },
    
    _unload: function () {
      this.collection.unbind();
      app.base.pageView.prototype._unload.apply(this, arguments);
    },
    
    load: function (callback) {
      var self = this;
      
      this.collection.fetch({
        success: function (collection) {
          callback(null, collection);
        },
        error: function (collection, response) {
          var json = JSON.parse(response.responseText);
          callback(json.data, null);
        }
      });
    }
    
  });
  
});