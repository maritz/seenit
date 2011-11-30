_r(function (app) {

  var formHandler = app.formHandler = function (view, model) {
    this.view = view;
    this.model = model || view.model;
    if (typeof(this.model) === 'undefined') {
      throw new Error('formHandler requires a model or the view to have a model');
    }
  };
  
  formHandler.prototype.getInputByName = function (name) {
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
    
    $errSpan.html($.t(error)).show('slow');
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
    var $this = $(context);
    var attrs = {};
    var name = $this.data('link');
    if (name === 'data-link') {
      name = $this.attr('name');
    }
    attrs[name] = $this.val();
    
    if (this.model.required.indexOf(name) === -1 && $this.attr('required')) {
      this.model.required.push(name);
    }
    
    this.model.set(attrs);
  };
  
  formHandler.prototype.link = function () {
    var $form = this.view.$el;
    var self = this;
    
    var $linkedInputs = $form.delegate('input[data-link]', 'blur', function () {
      self.blurHandler(this);
    });
    
    $linkedInputs.each(function () {
      if ($(this).attr('required')) {
        this.model.required.push(name);
      }
    });
    
    this.model.bind("change", function(model, key) {
      if (key) {
        console.log('changed', key);
        self.clearError(key);
      } else {
        _.each(model.getChangedValidationAttributes(), function (val, key) {
          self.clearError(key);
        });
      }
    });
    
    this.model.bind("error", function(model, error) {
      _.each(error, function (val, key) {
        self.setError(key, val);
      });
    });
    
    $form.bind('submit', function (e) {
      e.preventDefault();
      var $inputs = $form.find('input');
      $inputs.prop('disabled', true);
      self.model.save(undefined, {
        
        error: function (model, response) {
          $inputs.prop('disabled', false);
          var fields = JSON.parse(response.responseText).data.fields;
          _.each(fields, function (val, key) {
            if (_.isArray(val) && val.length > 0) {
              var err = {};
              err[key] = val[0];
              self.model.trigger('error', model, err);
            }
          });
        },
        
        success: function (model) {
          $inputs.prop('disabled', false);
          self.model.trigger('saved', model);
          console.log('saved');
        }
        
      });
    });
    
    return this;
  };
  
});