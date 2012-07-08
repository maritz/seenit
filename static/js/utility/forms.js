_r(function (app) {
  
  var csrf = null;
  var csrf_time = null;
  var max_csrf_age = 1000 * 60 * 10 // 10 minutes
  
  var getCsrf = app.getCsrf = getCsrf = function (callback) {
    var csrf_age = +new Date() - csrf_time;
    if (csrf && csrf_age < max_csrf_age) {
      if (callback) {
        callback(csrf);
      }
      return csrf;
    } else {
      $.getJSON('/REST/Util/csrf', function (response) {
        var token = $.cookie(response.data);
        $.cookie(response.data, null, { path: '/' });
        
        csrf = token;
        csrf_time = + new Date();
        if (callback) {
          callback(csrf);
        }
      });
      return true;
    }
  };
  
  var formHandler = app.formHandler = function (view, model) {
    this.view = view;
    this.model = model || view.model;
    if (typeof(this.model) === 'undefined') {
      throw new Error('formHandler requires a model or the view to have a model');
    }
    this.autoLabels();
    
    getCsrf();
  };
  
  formHandler.prototype.getInputs = function () {
    return this.view.$el.find('input[data-link]');
  }
  
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
    var $el = $form.find('input[data-link="'+name+'"]');
    
    if ($el.length === 0) {
      $el = $('input[name="'+name+'"]', $form);
    }
    return $el;
  };
  
  formHandler.prototype.setError = function (name, error) {
    var $el = this.getInputByName(name);
    var $errSpan = $el.next('span.input_error');
    
    if (error.indexOf(' ') === -1) {
      error = $.t('forms.errors.'+error, this.view.i18n[1], this.view.i18n[0]);
    }
    
    if ($el.length === 0) {
      $errSpan = $('.general_error', this.view.$el);
    }
    
    if ( ! $el.data('no_form_class')) {
      $el.parents('.control-group').removeClass('success').addClass('error');
    }
    $errSpan.html(error).show();
  };
  
  formHandler.prototype.clearError = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('span.error').html('').hide();
  };
  
  formHandler.prototype.setLoading = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('.loading').removeClass('hidden');
    $el.attr('readOnly', true);
  };
  
  formHandler.prototype.clearLoading = function (name) {
    var $el = this.getInputByName(name);
    $el.siblings('.loading').addClass('hidden');
    if ( ! this._submitting) {
      $el.attr('readOnly', false);
    }
  };
  
  formHandler.prototype.setSuccess = function (name) {
    var $el = this.getInputByName(name);
    var $parent = $el.parents('.control-group').removeClass('error');
    var val = $el.val();
    if (val && val.length > 0 && ! $el.data('no_form_class')) {
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
  
  formHandler.prototype.submit = function (e) {
    e.preventDefault();
    var self = this;
    
    this._submitting = true;
    
    this.getInputs().prop('readOnly', true);
    
    var attributes =  {};
    var submit_attributes = {
      '_csrf': csrf
    };
    this.getInputs().each(function () {
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
        self.getInputs().prop('readOnly', false);
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
            self.getInputs().prop('readOnly', false);
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
            self.getInputs().prop('readOnly', false);
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
    
    $form.delegate('input[data-link]', 'blur', function () {
      self.blurHandler(this);
    });
    
    this.getInputs().each(function () {
      if ($(this).attr('required')) {
        self.model.required.push($(this).attr('name'));
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
    
    $form.delegate('button', 'click', function (e) {
      if ($(e.target).data('form') !== 'submit') {
        e.preventDefault();
      }
    });
    
    $form.bind('submit', function (e) {
      e.preventDefault();
      getCsrf(function () {
        self.submit.call(self, e);
      });
    });
    
    return this;
  };
  
});
