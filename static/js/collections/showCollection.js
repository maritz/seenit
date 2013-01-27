_r(function (app) {

  app.collections.Show = app.base.paginatedCollection.extend({
    model: app.models.Show,
    url: '/REST/Show/'
  });
  
  
  app.collections.ShowFollowing = app.collections.Show.extend({
    url: '/REST/Show/following',
    comparator: function(show) {
      return show.get("name");
    }
  });
  
  
  app.collections.ShowSearch = app.collections.Show.extend({
  });
  
});