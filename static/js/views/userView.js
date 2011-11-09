_r(function (app) {
  if ( ! window.app.views.hasOwnProperty('user')) {
    app.views.user = {}
  }
  
  app.views.user.register = Backbone.View.extend({
    
    initialize: function ($el) {
      this.$el = $el;
      this.model = new app.models.user();
      this.render();
    },
    
    render: function () {
      var self = this;
      app.template('user', 'register', {model: this.model, view: this}, function (html) {
        self.$el.html(html);
        self.handler = new app.formHandler(self);
        self.handler.link();
      });
    }
    
  });
  
});