(function () {

var gui = require('nw.gui');
var app = angular.module('editor', [
    'ngRoute',
    'editor.utils.menu',
    'editor.utils.analytics',
    'editor.utils.config',
    'editor.utils.update',
    'editor.utils.filter',
    'editor.utils.i18n',
    'editor.utils.eastereggs',
    'editor.views.library',
    'editor.views.editor',
    'editor.views.palico_editor',
    'editor.views.settings',
    'editor.views.upload'
]);

app.config(['$routeProvider', '$compileProvider',
    function ($routeProvider, $compileProvider) {
        $routeProvider.otherwise({
            redirectTo: '/library'
        });
        // activate production mode
        $compileProvider.debugInfoEnabled(false);
    }]);

app.run(['$config', '$update', function ($config, $update) {
    window.document.title = "MH4U Quest Editor " + $config.versionString + " by dasding";
    gui.App.clearCache();
    // stops backspace from going back
    $(document).keydown(function(e) {
        var nodeName = e.target.nodeName.toLowerCase();
        if (e.which === 8) {
            if ((nodeName === 'input' && e.target.type === 'text') ||
                (nodeName === 'input' && e.target.type === 'number') ||
                (nodeName === 'input' && e.target.type === 'password') ||
                nodeName === 'textarea') {
            } else {
                e.preventDefault();
            }
        }
    });

    // defaults configs
    $config.userSettings.defaults('check_update', true);
    $config.userSettings.defaults('analytics', true);
    $config.userSettings.defaults('quest_nag', true);
    $config.userSettings.defaults('quest_nagv2', true);
    $config.userSettings.defaults('intruder_nag', true);
    $config.userSettings.defaults('small_monster_nag', true);

    $config.userSettings.defaults('locale', 'en');

    gui.Window.get().on('new-win-policy', function (frame, url, policy) {
        policy.forceNewWindow();
        // policy.forceDownload();
    });

    // check updates
    if ($config.userSettings.get('check_update')) {
        $update.check_update();
    }

    gui.Window.get().show();
    gui.Window.get().focus();
}]);

// disable dragdrop default behavior
window.ondragover = function(e) { e.preventDefault(); return false; };
window.ondrop = function(e) { e.preventDefault(); return false; };

})();
