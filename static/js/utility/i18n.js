(function (storage) {
  var i18n_options = {
    interpolationPrefix: '{',
    interpolationSuffix: '}',
    reusePrefix: "_(" 
  },
  lang = false;
  

  if (Modernizr.localstorage) {
    lang = storage.get('lang'); // TODO: add youtube style question "do you want your local language?"
    if (!lang) {
      lang = 'en_US';
      storage.store('lang', lang);
    }
  }
  
  var localDict = false
  , loadJSperanto = function (dict) {
    i18n_options.dictionary = dict;
    $.jsperanto.init(function(){
      _r("i18n_done");
    }, i18n_options);
  };
  
  // we try to get the dictionary from localStorage, if that fails we manually load it, store it and then initialize the translation
  try {
    localDict = storage.get('dict');
    if (localDict.hash !== i18n_hashes[lang]) // compare the local dictionary version hash with the one the server provided in the layout.jade
      throw '';
    loadJSperanto(localDict.dict);
  } catch(e) { // invalid json or local translations have expired or localstorage not available
    $.getJSON('/REST/i18n/dict/'+lang, function (data) {
      if (Modernizr.localstorage) {
        storage.store('dict', data);
      }
      loadJSperanto(data.dict);
    });
  }
  
  window.i18n = {
    lang: function (newLang) {
      storage.store('lang', newLang)
      storage.store('dict', null);
      window.location.reload();
    }
  };
})(window.storage);