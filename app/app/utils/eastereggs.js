(function () {

var app = angular.module('editor.utils.eastereggs', ['editor.utils.config']);

var eastereggs = [
    'rainbows',
    'darkmode',
    'redmode',
    'abstract',
    'bbq',
    'konchu',
    'dancingjho'
];

var codes = {
    '!devmode': ['devmode'],
    '#japanoshit': ['rainbows', 'abstract', 'konchu', 'bbq'],
    '#swag': ['abstract'],
    '#science': ['bbq'],
    '#partyjho': ['dancingjho'],
    '#darkside': ['darkmode'],
    '#blood': ['redmode'],
    '#unicorns': ['rainbows']
};

app.controller('EastereggsController', ['$scope', '$eastereggs', function ($scope, $eastereggs) {
    $scope.eastereggs = $eastereggs;
    $scope.current_code = '';

    $(document).keypress(function(e) {
        var key = String.fromCharCode(e.charCode);
        if (key === '#' || key === '!') {
            $scope.current_code = key;
            return;
        }
        if ($scope.current_code.length < 30) {
            $scope.current_code += key;
            if (codes[$scope.current_code]) {
                codes[$scope.current_code].forEach(function (egg) {
                    $eastereggs.unlock(egg);
                });
                $scope.$root.$digest();
            }
        }
    });
}]);

app.factory('$eastereggs', ['$config', function ($config) {
    var config = {
        list: eastereggs,

        unlocked: function (code) {
            if (!code) {
                return $config.userSettings.get('eastereggs_unlocked');
            }
            return $config.userSettings.get(code + '_unlocked');
        },
        unlock: function (code) {
            $config.userSettings.set('eastereggs_unlocked', true);
            $config.userSettings.set(code + '_unlocked', true);
            $config.userSettings.set(code, !$config.userSettings.get(code));
        },
        get: function (code) {
            return $config.userSettings.get(code);
        },
        set: function (code, state) {
            $config.userSettings.set(code, state);
        },
        toggle: function (code) {
            $config.userSettings.set(code, !$config.userSettings.get(code));
        },

        unlock_count: function () {
            var count = 0;
            config.list.forEach(function (egg) {
                if (config.unlocked(egg)) count++;
            });
            return count;
        }
    };

    return config;
}]);

})();
