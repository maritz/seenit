_r(function (app) {

  app.collections.Season = app.base.paginatedCollection.extend({
    model: app.models.Episode,
    urlRoot: '/REST/Episode/byShow/',
    
    season: 1,
    
    url: function () {
      return this.urlRoot+this.id+'/'+this.season;
    },
    
    pagination_by_field: 'number',
    
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