_r(function (app) {
  
  app.models.Episode = app.base.model.extend({
    urlRoot: '/REST/Episode/',
    nohmName: 'Episode',
    
    toggleSeen: function (callback) {
      var self = this;
      $.getJSON(this.urlRoot+'seen/'+this.id, function (res) {
        self.set({
          seen: res.data.episode
        });
        if (typeof(callback) === 'function') {
          callback();
        }
      });
    }
  });
  
});