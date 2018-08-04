(function () {

var app = angular.module('editor.utils.i18n', ['editor.utils.constants']);



function change_items (constants, current_locale, filter) {
    constants.search_items = angular.copy(constants.search_items_backup);
    if (!filter || ['es', 'fr', 'it', 'de', 'jp'].indexOf(current_locale) < 0) return;

    constants.search_items.forEach(function (item) {
        var t = filter[item.title];
        if (t) {
            item.title = t;
        }
    });
}

app.factory('$i18n', ['$config', 'constants', function ($config, constants) {
    var i18n = {
        'en': locale_en,
        'de': locale_de,
        'de_filter': locale_de_filter,
        'es': locale_es,
        'es_filter': locale_es_filter,
        'fr': locale_fr,
        'fr_filter': locale_fr_filter,
        'it': locale_it,
        'it_filter': locale_it_filter,
        'cn': locale_cn,
        'cn_filter': locale_cn_filter,
    };
    var count = 0;
    var current_locale = $config.userSettings.get('locale');
    change_items(constants, current_locale, i18n[current_locale+'_filter']);
    return {
        get: function (string) {
            // console.log(JSON.stringify(count++), string);
            var f = i18n[current_locale];
            if (!f) {return i18n.en[string];}
            var s = i18n[current_locale][string];
            if (!s) {
                s = i18n.en[string];
            }
            return s;
        },

        getFilter: function (string) {
            var f = i18n[current_locale+'_filter'];
            if (!f) {return string;}
            var s = f[string];
            if (!s) {return string;}
            return s;
        },

        select_locale: function (locale) {
            current_locale = locale;
            change_items(constants, current_locale, i18n[current_locale+'_filter']);
            $config.userSettings.set('locale', locale);
        },
        current_locale: function () {
            return current_locale;
        }
    };
}]);

})();
