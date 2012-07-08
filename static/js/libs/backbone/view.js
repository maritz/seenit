_r(function (app) {
  
  _.extend(Backbone.View.prototype, Backbone.Events);
  
  app.base.pageView = Backbone.View.extend({
    
    auto_render: false,
    model_generated: false,
    max_age: 10000,
    $el: window.app.config.$content,
    wait_for_user_loaded: true,
    reload_on_login: true,
    requires_login: true,
    
    initialize: function (module, action, $el, params) {
      var self = this;
      
      _.extend(this, Backbone.Events);
      
      this.$el = $el || this.$el;
      this.el = this.$el[0];
      this.module = module || this.module;
      this.action = action || this.action;
      this.i18n = [this.module, this.action];
      this.rendered = false;
      this.params = Array.isArray(params) ? params : [];
      
      _.bindAll(this);
      
      if ( ! this.checkAllowed.call(this)) {
        return false;
      }
      
      if (this.reload_on_login) {
        app.once('login', function () {
          if (self.reload_on_login && self.$el.parent().length !== 0) {
            self.render();
          }
        });
      }
      
      this.addLocals({
        _t: this._t,
        _view: this
      });
      
      if (this.model) {
        if ( ! this.model.get || typeof(this.model.get) !== 'function') {
          this.model = new this.model();
          this.model_generated = true;
        }
        this.addLocals({_model: this.model});
        this.model.view = this;
      }
      
      if (this.init && typeof(this.init) === 'function') {
        this.init();
      }
      
      if ( this.requires_login && ! app.user_self.get('name')) {
        app.template('page', 'need_login_error', this.locals, function (html) {
          self.$el.html(html);
          self.trigger('rendered');
        });
        return false;
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
          if (self.afterRender(html) !== false) {
            self.delegateEvents();
            self.rendered = true;
            self.trigger('rendered');
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
      this.rendered = false;
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
    
    /**
     * Called after the rendering of this view has produced some html.
     * Used for putting the html in an element or handling errors.
     */
    afterRender: function (html, error) {
      this.$el.html(html);
    },
    
    /**
     * If the page is reloaded without the force flag, this check is invoked to see if the page data has expired.
     * Compares the current time with this._expiration.
     */
    isExpired: function () {
      return +new Date() > this._expiration;
    },
    
    /**
     * Check if the user is allowed to call this view
     */
    checkAllowed: function () {
      return true;
    },
    
    /**
     *  Closes the current overlay and goes back in the application history if this is a main content.
     */
    closeAndBack: function () {
      app.closeOverlay();
      if (this.$el.parent()[0] === app.config.$content[0]) {
        app.back();
      }
    },
    
    /**
     * i18n based on the current module/action.
     */
    _t: function (name, submodule) {
      submodule = submodule || this.action;
      return $.t(name, submodule, this.module);
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
    
    /**
     * Initialize and link the formHandler
     */
    afterRender: function (html) {
      this.$el.html(html);
      this.handler = new app.formHandler(this);
      this.handler.link();
    }
    
  });
      
  app.base.listView = app.base.pageView.extend({
    
    initialize: function () {
      var self = this;
      
      if (this.collection) {
        if ( ! this.collection.getByCid || typeof(this.collection.getByCid) !== 'function') {
          this.collection = new this.collection();
          this.collection_generated = true;
        }
        this.addLocals({collection: this.collection});
      }
      
      return app.base.pageView.prototype.initialize.apply(this, arguments);
    },
    
    /**
     * Make sure the collection doesn't have event listeners to improve gc
     */
    _unload: function () {
      this.collection.unbind();
      app.base.pageView.prototype._unload.apply(this, arguments);
    },
    
    /**
     * Overwrite load to fetch a collection instead of the model
     */
    load: function (callback) {
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
  
  app.base.paginatedListView = app.base.listView.extend({
    
    pagination_pager_selector: '.pagination',
    
    initialize: function () {
      var self = this;
      var do_auto_render = this.auto_render;
      
      if (do_auto_render) {
        this.auto_render = false;
      }
      this.current_page = 1;
      
      if ( ! app.base.listView.prototype.initialize.apply(this, arguments)) {
        return false;
      }
      
      this.collection.getPage(1, function () {
        if (do_auto_render) {
          self.render();
        }
      });
      
      this.bind('rendered', self.renderPagination, this);
      
      this.$el.delegate(this.pagination_pager_selector+' a', 'click', function (e) {
        e.preventDefault();
        var $target = $(e.target);
        var $li = $target.closest('li');
        if ($li.hasClass('disabled') || $li.hasClass('active')) {
          return false;
        } else {
          self.paginator($target.data('page'));
        }
      });
    },
    
    /**
     * Overwrite the default rendering to render the page that is currently selected
     */
    render: function () {
      this.current_page = this.getPageFromHash();
      this.paginator(this.current_page);
    },
    
    /**
     * Render the pagination into an element specified by this.pagination_pager_selector
     */
    renderPagination: function () {
      var $pagination = this.$el.find(this.pagination_pager_selector);
      
      if (this.collection.total <= this.collection.per_page) {
        // no pagination needed
        $pagination.hide();
        return false;
      }
      
      
      if ($pagination.length === 0) {
        console.log('Collection is paginated but no pagination element found with this selector:', this.pagination_pager_selector);
        return false;
      }
      
      var locals = _.extend({}, this.locals, {
        current: parseInt(this.current_page, 10),
        num_pages: Math.ceil(this.collection.total / this.collection.per_page)
      });
      app.template('page', 'pagination', locals, function (html) {
        $pagination.html(html);
      });
    },
    
    /**
     * Checks if there is a page=[\d] in the hash. If so, returns the [\d] otherwise 1.
     */
    getPageFromHash: function () {
      var page = 1;
      window.location.hash
        .split('/')
          .forEach(
            function (part) {
              var match = part.match(/^page=([\d]+)$/i);
              if (match) {
                page = match[1];
              }
            }
          );
      return parseInt(page, 10);
    },
    
    /**
     * If the current window.location.hash does not have the current page numer in it the hash is changed.
     */
    setPageHash: function () {
      var current_hash = window.location.hash;
      var current_hash_page = current_hash.match(/\/page=([\d]+)/);
      if ( ! current_hash_page && this.current_page === 1) {
        return false;
      }
      var new_hash_page = this.current_page === 1 ? '' : '/page='+this.current_page;
      var new_hash = '';
      
      if (current_hash_page) {
        new_hash = current_hash.replace(/\/page=([\d]+)/, new_hash_page);
      } else {
        new_hash = current_hash+new_hash_page;
      }
      app.navigate(new_hash);
    },
    
    /**
     * Renders and sets a page.
     */
    paginator: function (page) {
      var self = this;
      var new_page = parseInt(page, 10);
      
      if (isNaN(new_page)) {
        return false;
      }
      
      this.collection.getPage(new_page, function (collection, page) {
        self.current_page = page;
        self.setPageHash();
        self.locals.data = collection;
        self.successRender(self.locals);
      });
    }
  });
});