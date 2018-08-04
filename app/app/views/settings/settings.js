(function () {
var gui = require('nw.gui');
var app = angular.module('editor.views.settings', ['ngRoute', 'editor.utils.config', 'editor.utils.eastereggs']);

var userSettings = [
    'check_update',
    'analytics',
    'puush_email',
    'puush_api_key',
];

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/settings', {
            controller: 'SettingsController',
            templateUrl: 'app/views/settings/settings.html'
        });
}]);

app.controller('SettingsController', ['$scope', '$location', '$config', '$i18n', '$eastereggs', function ($scope, $location, $config, $i18n, $eastereggs) {
    $scope._ = $i18n.get;
    $scope.config = $config;
    $scope.gui = gui;
    var settings = {};

    userSettings.forEach(function (setting) {
        settings[setting] = $config.userSettings.get(setting);
    });

    $scope.settings = settings;
    $scope.eastereggs = $eastereggs;

    $scope.gotoLibrary = function () {
        userSettings.forEach(function (setting) {
            $config.userSettings.set(setting, $scope.settings[setting]);
        });

        $location.path('/library');
    };
}]);

})();
