(function () {

var app = angular.module('editor.utils.analytics', ['editor.utils.config']);

app.controller('AnalyticsController', ['$scope', '$config', function ($scope, $config) {
    if ($config.userSettings.get('analytics')) {
      $('#analytics').replaceWith(atob(atob("UEdsbWNtRnRaU0J6Y21NOUltaDBkSEE2THk5dGFEUjFZM0ZsWkdsMGIzSXVaMmwwYUhWaUxtbHZJaUJ6ZEhsc1pUMGlaR2x6Y0d4aGVUcHViMjVsSWo0OEwybG1jbUZ0WlQ0PQ==")));
    }
}]);

})();
