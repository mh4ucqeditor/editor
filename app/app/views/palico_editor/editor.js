(function  () {

var app = angular.module('editor.views.palico_editor', ['ngRoute', 'editor.utils.constants']);
var fs = require('fs');

function hpad(s) {
    while (s.length < 2) {
        s = '0' + s;
    }
    return s;
}

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/palico_editor/:uuid', {
            controller: 'PalicoEditorController',
            templateUrl: 'app/views/palico_editor/editor.html'
        });
}]);

app.controller('PalicoEditorController', ['$scope', '$timeout', '$routeParams', '$location', '$library', '$config', '$otb', 'constants', '$i18n', function ($scope, $timeout, $routeParams, $location, $library, $config, $otb, constants, $i18n) {
    $scope._ = $i18n.get;
    if ($routeParams.uuid) {
        $scope.palico = $otb.parse($library.get($routeParams.uuid).otb);
        $scope.saved_palico = angular.toJson($scope.palico);
    } else {
        return;
    }
    $scope.lib_length = $library.list_otb().length;
    $scope.constants = constants;
    $scope.config = $config;
    $scope.forms = {};

    $scope.coat_color = "#" + hpad($scope.palico.coat_r.toString(16)) + hpad($scope.palico.coat_g.toString(16)) + hpad($scope.palico.coat_b.toString(16));
    $scope.clothing_color = "#" + hpad($scope.palico.clothing_r.toString(16)) + hpad($scope.palico.clothing_g.toString(16)) + hpad($scope.palico.clothing_b.toString(16));

    $scope.coat_color_change = function () {
        var c = $scope.coat_color;
        $scope.palico.coat_r = parseInt(c.substring(1,3), 16);
        $scope.palico.coat_g = parseInt(c.substring(3,5), 16);
        $scope.palico.coat_b = parseInt(c.substring(5,7), 16);
    };
    $scope.clothing_color_change = function () {
        var c = $scope.clothing_color;
        $scope.palico.clothing_r = parseInt(c.substring(1,3), 16);
        $scope.palico.clothing_g = parseInt(c.substring(3,5), 16);
        $scope.palico.clothing_b = parseInt(c.substring(5,7), 16);
    };


    $scope.type_gen = function (count) {
        var types = {};
        for (var i = 0; i < count; i++) {
            types[i] = 'Type ' + (i+1);
        };
        return types;
    }

    $scope.gotoLibrary = function() {
        if ($scope.saved_palico === angular.toJson($scope.palico)) {
            return $location.path('/library/1');
        }
        $('#confirmDialog')
        .modal({
            transition: 'scale',
            blurring: false
        })
        .modal('show');
    };

    $scope.save = function () {
        if ($routeParams.uuid) {
            $library.update_otb($routeParams.uuid, $otb.export($scope.palico));
        } else {
            $library.insert_otb($otb.export($scope.palico));
        }
        $timeout(function () {
            $location.path('/library/1');
        }, 0);
    };

    $timeout(function () {
        $('.ui.dropdown').dropdown();
    }, 0);

    $scope.$on('$destroy', function () {
        $('.menu .item').remove();
        $('confirmDialog').remove();
        $('.ui.grid .ui.dropdown').remove();
        $('.ui.accordion').remove();
    });
}]);

})();
