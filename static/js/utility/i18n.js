(function (storage) {
  var i18n_options = {
    interpolationPrefix: '{',
    interpolationSuffix: '}',
    reusePrefix: "_(",
    setDollarT: false
  },
  lang = false;
  

  if (Modernizr.localstorage) {
    lang = storage.get('lang'); // TODO: add youtube style question "do you want your local language?"
    if (!lang) {
      lang = 'en_US';
      storage.store('lang', lang);
    }
  }
  _r("i18n");
  
  var localDict = false
  , loadJSperanto = function (dict) {
    i18n_options.dictionary = dict;
    $.jsperanto.init(function(){
      _r("i18n", true);
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
  
  jQuery.t = function(name, submodule, module) {
    module = module || 'generic';
    submodule = submodule || 'general';
    var search_string = module+'.'+submodule+'.'+name;
    var t = $.jsperanto.translate(search_string);
    if (t !== search_string) {
      return t;
    } else {
      if (submodule !== 'general') {
        return arguments.callee(name, 'general', module);
      } else if (module !== 'generic') {
        return arguments.callee(name, 'general', 'generic');
      } else {
        console.log('i18n didn\'t find '+name);
        return name+'(not translated)';
      }
    }
  };
})(window.storage);