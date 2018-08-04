(function () {

var app = angular.module('editor.views.upload', ['editor.utils.config', 'editor.utils.i18n']),
    fs  = require('fs'),
    async = require('async'),
    Puush = require('puush'),
    puush = new Puush();


app.controller('UploadController', ['$scope', '$i18n', '$config', '$library', '$mib', function ($scope, $i18n, $config, $library, $mib) {
    $scope._ = $i18n.get;
    $scope.upload_region = 'us';
    $scope.upload_lang   = 'eng';
    $scope.email   = $config.userSettings.get('puush_email') || '';

    $scope.puushLogin = function () {
        $scope.login_loading = true;
        puush.auth($scope.email, $scope.password, function (err, data) {
            $scope.login_loading = false;
            if (err || data === '-1') {
                $scope.login_err = true;
                return $scope.$digest();
            }
            $scope.login_err = false;
            $config.userSettings.set('puush_email', $scope.email);
            $config.userSettings.set('puush_api_key', data.apiKey);
            $('#puush_login').modal('hide');
            $('#puush_upload').modal({closable: false, observeChanges: false}).modal('show');
            $scope.$digest();
        });
    };

    $scope.select_upload_lang = function (val) {
        $scope.upload_lang = val;
    };

    $scope.select_upload_region = function (val) {
        $scope.upload_region = val;
    };

    $('#httprlsDialog').change(function (v) {
        var path = $(this).val();
        if (path === "" || path === null) {
            return;
        }
        $(this).val("");
        var rules = "";
        $scope.results.forEach(function (file) {
            rules += "http://goshawk.capcom.co.jp/3ds/mh4g_";
            rules += $scope.upload_region;
            rules += "_/";
            rules += file.name;
            rules += "\n";
            rules += file.url;
            rules += "\n";
        });
        fs.writeFileSync(path, rules);
    });

    $scope.saveRules = function () {
        $('#httprlsDialog').trigger('click');
    };

    $scope.puushUpload = function () {
        $scope.uploading = true;
        var files = [];
        var index = "";
        $library.list().forEach(function (quest) {
            if (quest.hosted) {
                files.push({
                    file: $mib.encrypt('us', $library.get(quest.uuid).mib),
                    name: 'm' + quest.json.quest_id + '.mib'
                });
                index += $library.generateIndex(quest.json);
            }
        });
        files.push({
            file: $mib.encrypt('us', index),
            name: 'DLC_EventQuestInfo_' + $scope.upload_lang +'.txt'
        });
        $scope.total = files.length;
        $scope.done = 0;
        async.mapLimit(files, 3, function (file, next) {
            puush.up(file.name, file.file, function (err, data) {
                if (err || data === "-1" || data === "-2") {
                    return next('error');
                }
                $scope.done++;
                $('#uploadprogress').progress({
                    percent: Math.ceil(($scope.done / $scope.total) * 100)
                });
                $scope.$digest();
                next(null, {name: file.name, url: data.url});
            });
        }, function (err, results) {
            if (err) {
                $scope.upload_err = true;
                return $scope.$digest();
            }
            $scope.results = results;
            $scope.upload_done = true;
            $scope.$digest();
            $('#puush_upload').modal({closable: false, observeChanges: true}).modal('show');
        });
    };

    $scope.closeUpload = function () {
        $scope.uploading = false;
        $scope.upload_done = false;
        $scope.upload_err = false;
        $('#puush_upload').modal('hide');
    };

    $('#puush_upload .ui.dropdown').dropdown();

    $scope.$on('$destroy', function () {
        $('#puush_login').remove();
        $('#puush_upload').remove();
        $('#puush_upload .ui.dropdown').remove();
        $('#uploadprogress').remove();
        $('#httprlsDialog').remove();
    });

}]);

app.factory('$upload', ['$config', function ($config) {
    return {
        upload: function() {
            var email = $config.userSettings.get('puush_email'),
                api_key = $config.userSettings.get('puush_api_key');
            if (puush.API_KEY) {
                $('#puush_upload').modal({closable: false}).modal('show');
                return;
            }
            if (email && api_key) {
                return puush.auth_key(email, api_key, function (err, data) {
                    if (err || data === '-1') {
                        return $('#puush_login').modal('show');
                    }
                    $('#puush_upload').modal({closable: false}).modal('show');
                });
            }
            $('#puush_login').modal('show');
        }
        // up : function (string) {
        //     var stream = new Readable();
        //     stream.push(string);
        //     stream.push(null);
        //     puush.up(stream, function (status) {
        //         console.log(status.id);
        //         console.log(status.url);
        //     });
        // }
    };
}]);

})();
