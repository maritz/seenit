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
    },
    
    setSeenUpTo: function (callback) {
      var self = this;
      app.getCsrf(function (csrf) {
        $.ajax(self.urlRoot+'seen_up_to/'+self.id, {
          type: 'PUT',
          dataType: 'json',
          data: {
            _csrf: csrf
          }
        }).success(function () {
          callback();
        }).error(function () {
          callback("error");
        });
      });
    }
  });
  
});