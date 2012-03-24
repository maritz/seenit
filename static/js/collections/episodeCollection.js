_r(function (app) {

  app.collections.Season = app.base.collection.extend({
    model: app.models.Episode,
    url: '/REST/Episode/',
    
    comparator: function (episode) {
      return episode.get('number');
    },
    
    toggleSeen: function () {
      var self = this;
      $.getJSON('/REST/Episode/season_seen/'+this.first().id, function (res) {
        var seen = res.data.seen;
        self.each(function (episode) {
          episode.set({
            seen: seen
          });
        });
      });
    }
  });
  
});