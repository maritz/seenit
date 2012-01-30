_r(function (app) {
  app.base.pageView = Backbone.View.extend({
    
    auto_render: false,
    model_generated: false,
    
    initialize: function (module, action, $el) {
      var self = this;
      this.$el = $el || window.app.config.$content;
      this.module = module;
      this.action = action;
      this.i18n = [module, action];
      
      if (this.model) {
        if ( ! this.model.hasOwnProperty('get')) {
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
        this.render();
      }
      
      this._gc_interval = setInterval(this._check_gc, 250);
    },
    
    _check_gc: function () {
      if ($(this.$el.selector).length === 0) {
        clearInterval(this._gc_interval);
        if (this.model_generated) {
          this.model.unbind();
          delete this.model;
        }
        this.unbind();
        delete this;
      }
    },
    
    /*destroy: function () {
      if (this.model_generated) {
        delete this.model;
      }
      Backbone.View.prototype.desctor.apply(this, arguments);
    },*/
    
    addLocals: function (locals) {
      if (!this.locals) {
        this.locals = {};
      }
      this.locals = _.extend(this.locals, locals);
    },
    
    render: function () {
      var self = this;
      window.app.template(this.module, this.action, this.locals, function (html) {
        self.afterRender.call(self, html);
      });
    },
    
    afterRender: function (html) {
      this.$el.html(html);
    }
    
  });
      
  app.base.formView = app.base.pageView.extend({
    
    initialize: function () {
      app.base.pageView.prototype.initialize.apply(this, arguments);
      
      if (this.saved) {
        this.model.bind('saved', this.saved);
      }
      if (this.error) {
        this.model.bind('error', this.error);
      }
    },
    
    afterRender: function (html) {
      this.$el.html(html);
      this.handler = new app.formHandler(this);
      this.handler.link();
    }
    
  });
  
  app.base.collection = Backbone.Collection.extend({
    parse: function (response) {
      return response.data ? response.data : [];
    },
    fetch: function (options) {
      if (typeof(options) === 'function') {
        options = {
          success: options,
          error: options
        };
      }
      return Backbone.Collection.prototype.fetch.call(this, options);
    }
  });
  
  app.base.model = Backbone.Model.extend({
    required: [],
    validations: {},
    asyncValidations: {},
    
    /**
     * Overwriting Backbone.Model.parse() to use the proper root in the response json.
     */
    parse: function (resp) {
     return resp.data;
    },
    
    /**
     * Overwriting Backbone.Model.set() to do async validations before we set it.
     */
    set: function (attributes, options) {
      var self = this;
      var origSet = function (valid, attributes) {
        if (typeof (valid) === 'undefined' || valid === true) {
          return Backbone.Model.prototype.set.call(self, attributes, options);
        }
      };
      
      if ( ! attributes || attributes.length === 0 || !options || options.validate !== true) {
        return origSet(undefined, attributes);
      } else {
        this.validation(attributes, origSet);
      }
    },
    
    validation: function (attributes, callback) {
      console.log('validating', Object.keys(attributes));
      var self = this;
      var ret = this.validateSerial(attributes);
      attributes = ret.attributes;
      var errors = ret.errors;
      this.nohmValidation(attributes, errors, function (attributes, errors) {
        // first nohm, then async, instead of both at the same time. this ensures the same order of checks every time.
        self.asyncValidate(attributes, errors, function (attributes, errors) {
          var valid = _.size(errors) === 0;
          if (!valid) {
            self.trigger('error', self, errors);
          } else {
            self.trigger('valid', self, attributes);
          }
          callback(valid, attributes);
        });
      });
    },
    
    nohmValidation: function (attributes, errors, callback) {
      var self = this;
      if (self.nohmName) {
        nohmValidations.validate(self.nohmName, attributes, 
          function (valid, err) {
            if ( ! valid) {
              _.each(err, function (value, index) {
                if ( ! errors[index]) {
                  errors[index] = value[0];
                }
                delete attributes[index];
              });
            }
            callback(attributes, errors);
          }
        );
      } else {
        callback(attributes);
      }
    },
    
    asyncValidate: function (attributes, errors, callback) {
      var self = this;
      var length = _.size(attributes);
      if ( ! attributes || length < 1 || _.size(self.asyncValidations) < 1) {
        return callback(attributes, errors);
      }
      
      var count = 0;
      var checkCallback = function (key, err) {
        if (err && ! errors[key]) {
          errors[key] = err;
        }
        if (err) {
          delete attributes[key];
        }
        if (++count === length) {
          callback(attributes, errors);
        }
      };
      _.each(attributes, function (value, key) {
        // do async validations
        if (self.asyncValidations.hasOwnProperty(key)) {
          self.asyncValidations[key].call(self, value, function (error) {
            checkCallback(key, error);
          });
        } else {
          checkCallback();
        }
      });
        
    },
    
    validateSerial: function (attributes) {
      var ret = {
        attributes: attributes,
        errors: {}
      };
      var self = this;
      _.each(attributes, function (val, key) {
        if (self.required.indexOf(key) !== -1 && val.length === 0) {
          delete ret.attributes[key];
          ret.errors[key] = 'notEmpty';
        } else if (self.validations.hasOwnProperty(key)) {
          var error = self.validations[key].call(self, val);
          if (error) {
            delete ret.attributes[key];
            ret.errors[key] = error;
          }
        }
      });
      return ret;
    }
  });
});