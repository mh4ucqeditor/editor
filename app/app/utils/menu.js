(function () {

var gui = require('nw.gui');
var app = angular.module('editor.utils.menu', ['editor.utils.config']);

app.run(['$config', function ($config) {
    if ($config.platform.isOSX) {
        var win = gui.Window.get();
        var menubar = new gui.Menu({ type: "menubar" });
        menubar.createMacBuiltin("Editor", {
          hideEdit: false,
          hideWindow: false
        });

        win.menu = menubar;
    }
}]);

})();
