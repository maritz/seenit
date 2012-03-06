_r(function (app) {

  app.collections.Show = app.base.collection.extend({
    model: app.models.Show,
    url: '/REST/Show/'
  });
  
});