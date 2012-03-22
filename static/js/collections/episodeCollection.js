_r(function (app) {

  app.collections.Episode = app.base.collection.extend({
    model: app.models.Episode,
    url: '/REST/Episode/',
    
    comparator: function (episode) {
      return episode.get('number');
    }
  });
  
});