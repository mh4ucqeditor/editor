(function () {
var app = angular.module('editor.views.library', ['ngRoute', 'editor.utils.library', 'editor.utils.proxy', 'editor.utils.config', 'editor.utils.eastereggs']),
    fs  = require('fs');

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/library/:palico?', {
            controller: 'LibraryController',
            templateUrl: 'app/views/library/library.html'
        });
}]);

app.controller('LibraryController', ['$scope', '$timeout', '$library', '$mib', '$otb', '$proxy', '$config', '$i18n', 'constants', '$routeParams', '$upload', '$eastereggs', function ($scope, $timeout, $library, $mib, $otb, $proxy, $config, $i18n, constants, $routeParams, $upload, $eastereggs) {
    $scope.i18n = $i18n;
    $scope.eastereggs = $eastereggs;
    $scope._ = $i18n.get;
    $scope.openUpload = $upload.upload;
    $scope.constants = constants;
    $scope._EDIT = $i18n.get('EDIT');
    $scope._EXPORT = $i18n.get('EXPORT');
    $scope._DELETE = $i18n.get('DELETE');
    $scope._COPY = $i18n.get('DUPLICATE');
    $scope.palico_tab = $routeParams.palico;

    $scope.library = $library;
    $scope.list = $library.list();
    $scope.palico_list = $library.list_otb();
    $scope.proxy = {
        addr: $config.addr(),
        port: $config.proxy_port(),
        running: $proxy.status()
    };
    $scope.export_local = 'none';
    $scope.exportselected_local = 'none';

    $scope.toggle_sort = function (ident) {
        if ($scope.sortBy === ident) {
            if ($scope.sortReverse) {
                $scope.sortBy = null;
            } else {
                $scope.sortReverse = true;
            }
        } else {
            $scope.sortBy = ident;
            $scope.sortReverse = false;
        }
    };

    $scope.toggle_palico = function () {
        $('.shape').shape('flip over');
    };

    $scope.isEpisodic = function (quest)  {
        return 62000 <= quest.json.quest_id && quest.json.quest_id < 63000;
    };

    $scope.isChallenge = function (quest)  {
        return 61000 <= quest.json.quest_id && quest.json.quest_id < 62000;
    };

    $scope.select_export_local = function (local) {
        $scope.export_local = local;
    };

    $scope.select_exportselected_local = function (local) {
        $scope.exportselected_local = local;
    };

    $scope.refresh_list = function () {
        $scope.list = $library.list();
        $scope.palico_list = $library.list_otb();
    };

    $scope.refresh_text_idx = function () {
        switch ($i18n.current_locale()) {
            case 'jp':
            case 'tw':
            case 'cn':
            case 'en':
                $scope.text_idx = 0;
                break;
            case 'fr':
                $scope.text_idx = 1;
                break;
            case 'es':
                $scope.text_idx = 2;
                break;
            case 'de':
                $scope.text_idx = 3;
                break;
            case 'it':
                $scope.text_idx = 4;
                break;
        }
    };
    $scope.refresh_text_idx();

    $scope.refresh_buttons = function () {
        $scope.refresh_text_idx();
        $scope._EDIT = $i18n.get('EDIT');
        $scope._EXPORT = $i18n.get('EXPORT');
        $scope._DELETE = $i18n.get('DELETE');
        $scope._COPY = $i18n.get('DUPLICATE');
    };

    $scope.select_all_toggle = true;
    $scope.select_all = function () {
        var i;
        if ($scope.select_all_toggle) {
            $scope.select_all_toggle = false;
            for(i = $scope.list.length -1 ; i >= 0; i--) {
                $scope.list[i].hosted = true;
                $scope.clearDuplicateHost($scope.list[i], i);
            }
        } else {
            $scope.select_all_toggle = true;
            for(i = $scope.list.length -1 ; i >= 0; i--) {
                $scope.list[i].hosted = false;
            }
        }
        $library.persistHosted($scope.list);
    };

    $scope.select_all_toggle_otb = true;
    $scope.select_all_otb = function () {
        var i;
        if ($scope.select_all_toggle_otb) {
            $scope.select_all_toggle_otb = false;
            for(i = $scope.palico_list.length -1 ; i >= 0; i--) {
                $scope.palico_list[i].hosted = true;
                $scope.clearDuplicateHost($scope.palico_list[i], i);
            }
        } else {
            $scope.select_all_toggle_otb = true;
            for(i = $scope.palico_list.length -1 ; i >= 0; i--) {
                $scope.palico_list[i].hosted = false;
            }
        }
        $library.persistPalicoHosted($scope.palico_list);
    };


    $scope.clearDuplicateHost = function (quest) {
        for(var i = 0; i < $scope.list.length; i++) {
            if ($scope.list[i].json.quest_id === quest.json.quest_id && $scope.list[i].uuid !== quest.uuid) {
                $scope.list[i].hosted = false;
            }
        }
        $library.persistHosted($scope.list);
    };

    $scope.clearDuplicatePalicoHost = function (palico) {
        // for(var i = 0; i < $scope.palico_list.length; i++) {
        //     if ($scope.palico_list[i].json.pal_id === palico.json.pal_id && $scope.palico_list[i].uuid !== palico.uuid) {
        //         $scope.palico_list[i].hosted = false;
        //     }
        // }
        $library.persistPalicoHosted($scope.palico_list);
    };


    $scope.toggle_proxy = function () {
        if ($scope.proxy.running) {
            $scope.proxy.running = false;
            $scope.proxy.port_changed = false;
            $proxy.stop();
        } else {
            $scope.proxy.port_changed = false;
            var port = parseInt($scope.proxy.port, 10);
            if (isNaN(port)) { return; }

            var at_least_one_hosted;
            $scope.list.forEach(function (entry) {
                if (entry.hosted) {
                    at_least_one_hosted = true;
                }
            });
            if (!at_least_one_hosted) {
                $('#nohosted').modal('show');
            }

            $proxy.start(port, function (new_port) {
                $scope.proxy.port = new_port;
                $scope.proxy.port_changed = true;
                $scope.$digest();
            });
            $config.proxy_port(port);
            $scope.proxy.running = true;
        }
    };

    $scope.deleteLibrary = function () {
        $('#deleteLibraryDialog').modal({
        closable  : false,
        onDeny    : function(){},
        onApprove : function() {
          $library.clear();
          $scope.refresh_list();
          $scope.$digest();
        }
      }).modal('show');
    };

    $scope.deletePalicoLibrary = function () {
        $('#deleteLibraryDialog').modal({
        closable  : false,
        onDeny    : function(){},
        onApprove : function() {
          $library.clear_otb();
          $scope.refresh_list();
          $scope.$digest();
        }
      }).modal('show');
    };

    // export & import utility functions

    $('#saveas').change(function (v) {
        var path = $(this).val();
        if (path === "" || path === null) {
            return;
        }
        $(this).val("");
        // console.log('exporting ('+$scope.export_local+')... ' + path);
        fs.writeFileSync(path, $mib.encrypt($scope.export_local, $scope.export_quest.mib), {encoding: 'binary'});
        if ($scope.export_info_file) {
            fs.writeFileSync(path.replace(/.mib$/, '.txt'), $mib.encrypt($scope.export_local, $library.generateIndex($scope.export_quest.json)), {encoding: 'binary'});
        }
        $('#exportmodal').modal('hide');
    });

    $('#savePalico').change(function (v) {
        var path = $(this).val();
        if (path === "" || path === null) {
            return;
        }
        $(this).val("");
        fs.writeFileSync(path, $otb.encrypt($scope.export_local, $scope.export_palico.otb), {encoding: 'binary'});
        if ($scope.export_info_file) {
            fs.writeFileSync(path.replace(/.otb$/, '.txt'), $otb.encrypt($scope.export_local, $library.generatePalicoIndex($scope.export_palico.json, 1)), {encoding: 'binary'});
        }
        $('#exportPalico').modal('hide');
    });

    $('#importDialog').change(function (v) {
        var files = $('#importDialog')[0].files;
        if (files === "" || files === null) {
            return;
        }

        var content;
        for (var i = 0; i < files.length; i++) {
            content = fs.readFileSync(files[i].path, {encoding: 'binary'});
            $library.import(content);
        }
        $('#importDialog').val("");
        $scope.refresh_list();
        $scope.$digest();
    });


    $('#backupDialog').change(function (v) {
        var path = $(this).val();
        if (path === "" || path === null) {
            return;
        }
        $(this).val("");

        fs.writeFileSync(path, $library.backup(), {encoding: 'binary'});
    });

    $('#saveSelectedDialog').change(function (v) {
        var path = $(this).val();
        if (path === "" || path === null) {
            return;
        }
        $(this).val("");

        var index = '';
        $library.list().forEach(function (quest) {
            if (quest.hosted) {
                fs.writeFileSync(path+'/m'+quest.json.quest_id+'.mib', $mib.encrypt($scope.exportselected_local, $library.get(quest.uuid).mib), {encoding: 'binary'});
                index += $library.generateIndex(quest.json);
            }
        });
        if ($scope.export_info_file) {
            fs.writeFileSync(path+'/DLC_EventQuestInfo.txt', $mib.encrypt($scope.exportselected_local, index), {encoding: 'binary'});
        }
        $('#exportselectedmodal').modal('hide');
    });

    $scope.backup = function () {
        $('#backupDialog').trigger('click');
    };

    $scope.saveDialog = function () {
        $('#saveas').trigger('click');
    };

    $scope.savePalicoDialog = function () {
        $('#savePalico').trigger('click');
    };

    $scope.saveSelectedDialog = function() {
        $('#saveSelectedDialog').trigger('click');
    };

    $scope.importDialog = function () {
        $('#importDialog').trigger('click');
    };

    $scope.export = function (uuid){
        $scope.export_quest = $library.get(uuid);
        $('#exportmodal')
            .modal({
                transition: 'scale',
                blurring: true
            })
            .modal('show');
    };

    $scope.export_selected = function (){
        $('#exportselectedmodal')
            .modal({
                transition: 'scale',
                blurring: true
            })
            .modal('show');
    };

    $scope.exportPalico = function (uuid){
        $scope.export_palico = $library.get(uuid);
        $('#exportPalico')
            .modal({
                transition: 'scale',
                blurring: true
            })
            .modal('show');
    };

    // init semantic ui js
    $timeout(function () {
        $('#exportmodal .ui.dropdown').dropdown();
        $('#exportselectedmodal .ui.dropdown').dropdown();
        $('#exportPalico .ui.dropdown').dropdown();
        $('#language_changer').dropdown();
        $('.shape').shape();
    }, 0);

    $scope.$on('$destroy', function () {
        $('.shape').remove();
        $('#dragdrop .ui.modal').remove();
        $('#exportmodal .ui.dropdown').remove();
        $('#exportselectedmodal .ui.dropdown').remove();
        $('#nohosted').remove();
        $('#language_changer').remove();
        $('#saveas').remove();
        $('#exportmodal').remove()
        $('#importDialog').remove();
        $('#deleteLibraryDialog').remove();
    });

    // drag & drop utility functions

    var dragdrop = $('#dragdrop');

    dragdrop.on('dragover', function () {
        $('#dragdropicon').toggleClass('outline', false);
        $('#dropzone').toggleClass('pulse', true);
    });
    dragdrop.on('dragleave', function () {
        $('#dragdropicon').toggleClass('outline', true);
        $('#dropzone').toggleClass('pulse', false);
    });

    dragdrop.on('drop', function (e) {
        e.preventDefault();
        // dont accept drop when already importing
        if ($scope.importing) {
            return false;
        }
        $scope.importing = true;
        // end animation
        $('#dragdropicon').toggleClass('outline', true);
        $('#dropzone').toggleClass('pulse', false);

        // HTML 5 FileTransfer
        var files = e.originalEvent.dataTransfer.files,
            file_idx = [];
            files_done = 0;

        for (var i = 0; i < files.length; i++) {
            file_idx.push(i);
        }

        file_idx.forEach(function (idx) {
            var reader = new FileReader();

            reader.onloadend = function () {
                files_done++;

                if (reader.result !== null) {
                    $library.import(reader.result);
                }

                if (files_done === files.length) {
                    // done
                    $scope.importing = null;
                    $scope.refresh_list();
                    $scope.$digest();
                }
            };

            reader.readAsBinaryString(files[idx]);
        });
    });

}]);

})();
