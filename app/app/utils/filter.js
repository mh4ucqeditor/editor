(function () {

var app = angular.module('editor.utils.filter', ['editor.utils.constants', 'editor.utils.i18n']);

app.filter('num', function() {
    return function(input) {
      return parseInt(input, 10);
    };
});

app.filter('doublenum', function() {
    return function(input) {
        if (input < 10) {
            return '0' + input;
        }
        return input;
    };
});


app.filter('round_float', function() {
    return function(input) {
      return input.toFixed(2);
    };
});

app.filter('strip_c', function() {
    return function(input) {
        if (input) {
            return input.replace('[C] ', '');
        } else {
            return 'undefined';
        }
    };
});

app.filter('qid_rank', function() {
    return function(qid) {
        if (60000 <= qid && qid < 60100) {
            return 'Low Rank';
        }
        if (60100 <= qid && qid < 60200) {
            return 'High Rank';
        }
        if (60200 <= qid && qid < 60300) {
            return 'G Rank';
        }
        return '';
    };
});

app.filter('qid_desc', ['constants', '$i18n', function(constants, $i18n) {
    return function(input) {
        switch (typeof input) {
            case 'object':
                return input.map(function (monster_id) {
                    return $i18n.getFilter(constants.monsters[monster_id]);
                }).join(', ');
            case 'string':
                return input;
            default:
                return input;
        }
    };
}]);

app.filter('i18n', ['$i18n', function($i18n) {
    return function(input) {
        return $i18n.getFilter(input);
    };
}]);

app.filter('proxy_filter', [function() {
    return function(input) {
        var s = "";
        if (!input) return s;
        input.forEach(function (addr) {
            s += addr + '\n';
        });
        return s.substring(0, s.length-1);
    };
}]);

app.filter('ceil', [function() {
    return function(input) {
        if (!input) return "";
        if (isNaN(input)) return "Inf";
        return Math.ceil(input);
    };
}]);

app.directive('selectOnClick', ['$window', function ($window) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.on('click', function () {
                if (!$window.getSelection().toString()) {
                    // Required for mobile Safari
                    this.setSelectionRange(0, this.value.length)
                }
            });
        }
    };
}]);

})();
