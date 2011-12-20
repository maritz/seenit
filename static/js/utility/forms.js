_r(function (app) {
  
  var formHandler = app.formHandler = function (view, model) {
    this.view = view;
    this.model = model || view.model;
    this.csrf = false;
    if (typeof(this.model) === 'undefined') {
      throw new Error('formHandler requires a model or the view to have a model');
    }
    this.autoLabels();
  };
  
  formHandler.prototype.autoLabels = function () {
    var $label = this.view.$el.find('[data-label]');
    var i18n = this.view.i18n;
    $label.each(function () {
      var $this = $(this);
      var str = 'forms.labels.'+$this.data('label');
      $this.html(jQuery.t(str, i18n[1], i18n[0]));
      $this.data('label', null);
    });
  };
  
  formHandler.prototype.getInputByName = function (name) {
    if ( ! name) {
      return $();
    }
    var $form = this.view.$el;
    var $el = $('input[data-link="'+name+'"]', $form);
    
    if ($el.length === 0) {
      $el = $('input[name="'+name+'"]', $form);
    }
    return $el;
  };
  
  formHandler.prototype.setError = function (name, error) {
    var $el = this.getInputByName(name);
    var $errSpan = $el.siblings('span.error');
    
    if ($el.length === 0) {
      $errSpan = $('.general_error', this.view.$el);
    }
    
    $errSpan.html($.t('forms.errors.'+error, this.view.i18n[1], this.view.i18n[0])).show('slow');
  };
  
  formHandler.prototype.clearError = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('span.error').html('').hide('fast');
  };
  
  formHandler.prototype.setLoading = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('.loading').show();
  };
  
  formHandler.prototype.clearLoading = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('.loading').hide();
  };
  
  formHandler.prototype.blurHandler = function (context) {
    var self = this;
    _.delay(function () {
      if (self._submitting === true) {
        return false;
      }
      var $this = $(context);
      var attrs = {};
      var name = $this.data('link');
      if (name === 'data-link') {
        name = $this.attr('name');
      }
      attrs[name] = $this.val();
      
      if (self.model.required.indexOf(name) === -1 && $this.attr('required')) {
        self.model.required.push(name);
      }
      self.model.set(attrs, {validate: true});
    }, 200);
  };
  
  formHandler.prototype.getCsrf = function (callback) {
    if (this._submitting === true) {
      return false;
    }
    var self = this;
    $.getJSON('/REST/Util/csrf', function (response) {
      var token = $.cookie(response.data);
      $.cookie(response.csrf_key, null, { path: '/' });
      self.csrf = token;
      if (callback) {
        callback();
      }
    });
  };
  
  formHandler.prototype.submit = function (e) {
    e.preventDefault();
    var self = this;
    
    this._submitting = true;
    
    this.$inputs.prop('disabled', true);
    
    var attributes =  {};
    this.$inputs.each(function () {
      var $item = $(this);
      attributes[$item.attr('name')] = $item.val();
    });

    self.model.validation(attributes, function (valid) {
      
      if ( ! valid) {
        self.$inputs.prop('disabled', false);
      self._submitting = false;
      } else {
        attributes['csrf-token'] = self.csrf;
        delete self.csrf;
        self.model.set(attributes);
        self.model.save(undefined, {        
          error: function (model, response) {
            var data = JSON.parse(response.responseText).data;
            if (data.error.msg === 'crsf failure') {
              self.setError(null, 'csrf');
            }
            self.$inputs.prop('disabled', false);
            var fields = data.fields;
            _.each(fields, function (val, key) {
              if (_.isArray(val) && val.length > 0) {
                var err = {};
                err[key] = val[0];
                self.model.trigger('error', model, err);
              }
            });
            self._submitting = false;
            self.getCsrf();
          },
          
          success: function (model) {
            self.$inputs.prop('disabled', false);
            self._submitting = false;
            self.model.trigger('saved', model);
          }
          
        });
      }
    });
  };
  
  formHandler.prototype.link = function () {
    var $form = this.view.$el;
    var self = this;
    
    this.getCsrf();
    
    this.$inputs = $('input[data-link]');
    
    $form.delegate('input[data-link]', 'blur', function () {
      self.blurHandler(this);
    });
    
    this.$inputs.each(function () {
      if ($(this).attr('required')) {
        self.model.required.push(name);
      }
    });
    
    this.model.bind("valid", function (model, attributes) {
      _.each(attributes, function (val, key) {
        self.clearError(key, val);
      });
    });
    
    this.model.bind("error", function(model, error) {
      _.each(error, function (val, key) {
        self.setError(key, val);
      });
    });
    
    $form.bind('submit', function (e) {
      self.submit.call(self, e);
    });
    
    return this;
  };
  
});