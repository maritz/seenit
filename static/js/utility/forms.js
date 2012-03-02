_r(function (app) {
  
  var csrf = null;
  
  var formHandler = app.formHandler = function (view, model) {
    this.view = view;
    this.model = model || view.model;
    this.csrf = false;
    if (typeof(this.model) === 'undefined') {
      throw new Error('formHandler requires a model or the view to have a model');
    }
    this.autoLabels();
    
    if (csrf === null) {
      this.getCsrf();
    }
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
    if (name instanceof jQuery) {
      return name;
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
    var $errSpan = $el.next('span.input_error');
    
    if ($el.length === 0) {
      $errSpan = $('.general_error', this.view.$el);
    }
    
    $el.parents('.control-group').removeClass('success').addClass('error');
    $errSpan.html($.t('forms.errors.'+error, this.view.i18n[1], this.view.i18n[0])).show();
  };
  
  formHandler.prototype.clearError = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('span.error').html('').hide();
  };
  
  formHandler.prototype.setLoading = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('.loading').removeClass('hidden');
    $el.attr('disabled', true);
  };
  
  formHandler.prototype.clearLoading = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('.loading').addClass('hidden');
    $el.attr('disabled', false);
  };
  
  formHandler.prototype.setSuccess = function (name) {
    var $el = this.getInputByName(name);
    var $parent = $el.parents('.control-group').removeClass('error');
    if ($el.val().length > 0) {
      $parent.addClass('success');
    }
    this.clearLoading(name);
    this.clearError(name);
  };
  
  formHandler.prototype.blurHandler = function (context) {
    var self = this;
    var $this = $(context);
    if ( ! $this.data('validate')) {
      return false;
    }
    _.delay(function () {
      if (self._submitting === true) {
        return false;
      }
      var attrs = {};
      var name = $this.data('link');
      if (name === 'data-link') {
        name = $this.attr('name');
      }
      attrs[name] = $this.val();
      
      if (self.model.required.indexOf(name) === -1 && $this.attr('required')) {
        self.model.required.push(name);
      }
      self.clearError(name);
      self.setLoading(name);
      self.model.set(attrs, {validate: true});
    }, 200);
  };
  
  formHandler.prototype.getCsrf = function (callback) {
    if (this._submitting === true) {
      console.log('remove check? (forms.js getCsrfl if');
      return false;
    }
    
    if (csrf) {
      if (callback) {
        callback();
      }
    } else {
      $.getJSON('/REST/Util/csrf', function (response) {
        var token = $.cookie(response.data);
        $.cookie(response.data, null, { path: '/' });
        
        csrf = token;
        if (callback) {
          callback();
        }
      });
    }
  };
  
  formHandler.prototype.submit = function (e) {
    e.preventDefault();
    var self = this;
    
    this._submitting = true;
    
    this.$inputs.prop('disabled', true);
    
    var attributes =  {};
    var submit_attributes = {
      '_csrf': csrf
    };
    this.$inputs.each(function () {
      var $item = $(this);
      var name = $item.attr('name');
      var value = $item.val();
      if ($item.data('validate')) {
        attributes[name] = value;
      }
      submit_attributes[name] = value;
    });

    self.model.validation(attributes, function (valid) {
      
      if ( ! valid) {
        self.$inputs.prop('disabled', false);
        self._submitting = false;
      } else {        
        self.model.set(submit_attributes);
        self.model.save(undefined, {        
          error: function (model, response) {
            response.handled = true;
            var data;
            if (response.responseText === 'Forbidden') {
              self.setError(null, 'csrf');
              data = {fields: []};
            } else {
              data = JSON.parse(response.responseText).data;
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
    
    var is_linked = $form.data('linked');
    if (is_linked) {
      return false;
    } else {
      $form.data('linked', true);
    }
    
    this.$inputs = $('input[data-link]', $form);
    
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
        self.setSuccess(key, val);
      });
    });
    
    this.model.bind("error", function(model, error) {
      _.each(error, function (val, key) {
        self.clearLoading(key);
        self.setError(key, val);
      });
    });
    
    $form.bind('submit', function (e) {
      self.submit.call(self, e);
    });
    
    return this;
  };
  
});