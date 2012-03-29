_r(function (app) {

  app.collections.Show = app.base.paginatedCollection.extend({
    model: app.models.Show,
    url: '/REST/Show/'
  });
  
  app.collections.ShowSearch = app.base.collection.extend({
    model: app.models.Show,
    url: '/REST/Show/search' // not used
  });
  
});