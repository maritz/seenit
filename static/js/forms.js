_r(function () {
  
  var forms = window.app.forms = {};
  
  forms.form = Backbone.View.extend({
    
    action: '#',
    
    initialize: function (options) {
      
    },
    
    render: function () {
      var self = this;
      window.app.template('form', 'formHead', {
          action: self.action
        }, function (html) {
          console.dir(arguments);
      });
    }
    
  });
  
  inputBase = Backbone.View.extend({
    
  });
  
  forms.input = inputBase.extend({
    
    initialize: function (options) {
      
    }
    
  });
  
});