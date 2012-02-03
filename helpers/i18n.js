var fs = require('fs');

var basedir = __dirname + '/../static/i18n/'
, translations = {}
, current_hash = {};

crypto = require('crypto');

var checkHashChange = function checkHashChange (lang) {
  var new_hash = crypto.createHash('md5');
  new_hash.update(JSON.stringify(translations[lang]));
  new_hash = new_hash.digest('base64');
  current_hash[lang] = new_hash.substr(0, 10);
  // TODO: maybe we need an event here to make others aware that the translation was changed?!
}

var loadTranslations = function (lang, file) {
  try {
    delete require.cache[require.resolve(basedir + lang + '/' + file)];
    var name = file.substring(0, file.lastIndexOf('.js'));
    translations[lang][name] = require(basedir + lang + '/' + file);
    checkHashChange(lang);
  } catch (e) {
    console.dir(e.stack);
  }
}

try {
  var langs = fs.readdirSync(basedir);
  if (Array.isArray(langs)) {
    langs.forEach(function (lang) {
      translations[lang] = {};
      files = fs.readdirSync(basedir + lang);
      if (Array.isArray(files)) {
        files.forEach(function (file) {
          if (file.lastIndexOf('.js') === file.length - 3) {
            fs.watchFile(basedir + lang + '/' + file, function () {
              loadTranslations(lang, file);
            });
            loadTranslations(lang, file);
          }
        });
      }
    });
  }
} catch (e) {
  console.log('Translation file loading error:');
  console.dir(e);
}


module.exports = {
  getHashes: function () { 
    return current_hash; 
  },
  getTranslations: function (lang) { 
    return translations.hasOwnProperty(lang) ? translations[lang] : {} 
  },
  langs: Object.keys(translations),
  getTranslation: function (lang, key) {
    var reg = /([^:]*):/g
    , module = reg.exec(key)
    , indextest = reg.lastIndex,
    keystart = 0,
    orig = key;
    var section = reg.exec(key);
    if (!module || typeof(module[1]) === 'undefined' || typeof(translations[lang][module[1]]) === 'undefined') {
      if (module && typeof(module[1]) !== 'undefined') {
        section = module;
      }
      module = 'general';
    } else {
      module = module[1];
      keystart = key.indexOf(':', 0)+1;
    }
    if (!section || typeof(section[1]) === 'undefined' || typeof(translations[lang][module][section[1]]) === 'undefined') {
      section = null;
    } else {
      section = section[1];
      keystart = key.indexOf(':', keystart)+1;
    }
    key = key.substr(keystart);
    if (key.length > 0) {
      var base = section ? 
                            translations[lang][module][section]
                          : translations[lang][module];
      if (typeof(base[key]) === 'undefined') {
        // translation not found, try to find the key in en_US
        var base = section ? 
                            translations['en_US'][module][section]
                          : translations['en_US'][module];
        if (typeof(base[key]) !== 'undefined') {
          console.log('Missing translation for: ' + orig + '  in language: ' + lang);
        }
      }
      if (typeof(base[key]) === 'undefined') {
        // even with default language it can't be found.
        return '<span class="translation_error translation_missing">Translation with key: '+orig+' does not exist.\
                Parsed structure: translations['+lang+']['+module+']['+section+']['+key+'].</span>';
      } else {
        return base[key];
      }
    } else {
      return '<span class="translation_error">SPECIFIED KEY IS INVALID: '+orig+'</span>';
    }
  }
};
