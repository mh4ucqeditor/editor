(function () {

var app = angular.module('editor.utils.update', ['editor.utils.config', 'editor.utils.i18n']);
var newVersion = null;
var fs = require('fs');

app.controller('UpdateController', ['$scope', '$config', '$i18n', function ($scope, $config, $i18n) {
    $scope.newVersion = function () {
        return newVersion;
    };

    $scope._ = $i18n.get;
    $scope.filename = 'editor-' + $config.platform.name + '.zip';

    $scope.download = function () {
        var path = newVersion.download[$config.platform.name];
        $scope.dl = 1;
        $.ajax({
            type: 'GET',
            // dataType: "text",
            mimeType: 'application/zip; charset=x-user-defined',
            url: path, data: {},
            xhr: function() {
                var xhr = new window.XMLHttpRequest();
                xhr.addEventListener("progress", function(evt){
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total;
                        $scope.dl = Math.floor(percentComplete*100);
                        if ($scope.dl === 0) {
                            $scope.dl = 1;
                        }
                        $scope.$digest();
                        $('#updateprogress').progress({
                            percent: $scope.dl
                        });
                    }
                }, false);
                return xhr;
            },

            success: function(data){
                if ($scope.dl) {
                    $scope.data = data;
                    $scope.dl_finished = true;
                    $scope.$digest();
                }
            }
        });
    };

    $('#saveupdate').change(function (v) {
        var path = $(this).val();
        if (path === "" || path === null) {
            return;
        }
        $(this).val("");
        // console.log('exporting ('+$scope.export_local+')... ' + path);
        fs.writeFileSync(path, $scope.data, {encoding: 'binary'});
        $('#updatedialog').modal('hide');
    });

    $scope.save = function () {
        $('#saveupdate').trigger('click');
    };

    $scope.cancel = function () {
        $scope.dl = null;
        $scope.dl_finished = null;
        $scope.data = null;
    };

}]);

app.factory('$update', ['$rootScope', '$timeout', '$config', function ($rootScope, $timeout, $config) {
    var update = {
        check_update: function () {
            $.get('https://mh4ucqeditor.github.io/versions.json', function (data) {
                var newest = data.newest;
                var current = $config.version;
                var versionString = 'v' + newest.major + '.' + newest.minor + '.' + newest.patch;

                if (!(newest.major > current.major || (newest.major == current.major && newest.minor > current.minor) || (newest.major == current.major && newest.minor == current.minor && newest.patch > current.patch))) {
                    return;
                }

                newVersion = data[versionString];

                $rootScope.$digest();
                $timeout(function () {
                    $('#updatedialog').modal({
                        closable: false
                    }).modal('show');
                });
            });
        }
    };
    return update;
}]);

})();
