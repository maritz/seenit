_r(function (app) {
  app.base.pageView = Backbone.View.extend({
      
    initialize: function (module, action) {
      var self = this;
      this.$el = window.app.config.$content;
      this.module = module;
      this.action = action;
      this.i18n = [];
      this.addLocals({
        _t: function (name, submodule) {
          submodule = submodule || self.action;
          return $.t(name, submodule, self.module);
        }
      });
      if (this.init && typeof(this.init) === 'function') {
        this.init();
      }
      this.render();
    },
    
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
    
    afterRender: function (html) {
      this.$el.html(html);
      this.handler = new app.formHandler(this);
      this.handler.link();
    }
    
  });
  
  app.base.model = Backbone.Model.extend({
    required: [],
    validations: {},
    asyncValidations: {},
    
    _previousSuccess: {},
    /**
     * Overwriting Backbone.set() to do async validations before we set it.
     */
    set: function(attributes, options) {
      var self = this;
      var origSet = function () {
        Backbone.Model.prototype.set.call(self, attributes, options);
      };
      
      var origAttributes = _.clone(attributes);
      if ( ! attributes) {
        origSet();
      } else {
        var ret = self.validateSerial(attributes);
        attributes = ret.attributes;
        var errors = ret.errors;
        self.nohmValidation(attributes, errors, function (attributes, errors) {
          // first nohm, then async, instead of both at the same time. this ensures the same order of checks every time.
          self.asyncValidate(attributes, errors, function (attributes, errors) {
            if (_.size(errors) > 0 ) {
              self.trigger('error', self, errors);
            }
            _.each(origAttributes, function (val, key) {
              var success = attributes.hasOwnProperty(key);
              if ( success && ! self._previousSuccess[key]) {
                self.trigger('change', self, key);
              }
              self._previousSuccess[key] = success;
            });
            origSet();
          });
        });
      }
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
        callback(attributes, errors);
      }
      
      var count = 0;
      var checkCallback = function (key, err, cacheResult) {
        if (err && ! errors[key]) {
          errors[key] = err;
        }
        if ( err && ! cacheResult) {
          delete attributes[key];
        }
        if (++count === length) {
          callback(attributes, errors);
        }
      };
      _.each(attributes, function (value, key) {
        // do async validations
        if (self.asyncValidations.hasOwnProperty(key)) {
          self.asyncValidations[key].call(self, value, function (error, cacheResult) {
            checkCallback(key, error, cacheResult);
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