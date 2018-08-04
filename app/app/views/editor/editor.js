(function  () {

var app = angular.module('editor.views.editor', ['ngRoute', 'editor.utils.fix' ,'editor.utils.constants', 'editor.utils.eastereggs']);
var fs = require('fs');

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/editor/:uuid?', {
            controller: 'EditorController',
            templateUrl: 'app/views/editor/editor.html'
        });
}]);

function flatten_small(quest) {
    if (quest.small_monster_table.length === 0) {
        quest.small_monster_table = [[[]],[[]],[[]]];
        return;
    }
    while (quest.small_monster_table.length < 3) {
        quest.small_monster_table.push([[]]);
    }
    var new_list;
    for (var i = 0; i < 3; i++) {
        new_list = [];
        quest.small_monster_table[i].forEach(function (wave) {
            wave.forEach(function (monster) {
                new_list.push(monster);
            });
        });
        quest.small_monster_table[i] = [new_list];
    }
}

app.controller('EditorController', ['$scope', '$timeout', '$routeParams', '$location', '$library', '$config', '$mib', '$fix', 'constants', '$i18n', '$eastereggs', function ($scope, $timeout, $routeParams, $location, $library, $config, $mib, $fix, constants, $i18n, $eastereggs) {
    $scope._ = $i18n.get;
    $scope.eastereggs = $eastereggs;
    if ($routeParams.uuid) {
        $scope.quest = $mib.parse($library.get($routeParams.uuid).mib);
        flatten_small($scope.quest);
        $scope.saved_quest = angular.toJson($scope.quest);
    } else {
        $scope.quest = constants.default_quest();
        $scope.saved_quest = {};
    }
    $scope.lib_length = $library.list().length;
    $scope.constants = constants;
    $scope.text_lang = 0;
    $scope.includes_loaded = 0;
    $scope.repel = $scope.quest.repel_flag & 4;
    $scope.config = $config;

    $scope.forms = {};

    $scope.reload_dropdown = function () {
        $timeout(function () {
            $('.ui.dropdown.monster').dropdown({
                fullTextSearch: true
            });
            $('#deliversearch_sub').search({
                maxResults: 5,
                source: constants.search_items,
                onSelect: function (res) {
                    if (res) {
                        $scope.quest.objective_sub.target_id = res.id;

                    }
                }
            });
            $('#deliversearch_main1').search({
                maxResults: 5,
                source: constants.search_items,
                onSelect: function (res) {
                    if (res) {
                        $scope.quest.objectives[0].target_id = res.id;
                    }
                }
            });
            $('#deliversearch_main2').search({
                maxResults: 5,
                source: constants.search_items,
                onSelect: function (res) {
                    if (res) {
                        $scope.quest.objectives[1].target_id = res.id;
                    }
                }
            });
            $('#condition1_search').search({
                maxResults: 5,
                source: constants.search_items,
                onSelect: function (res) {
                    if (res) {
                        $scope.quest.small_monster_conditions[0].target = res.id;

                    }
                }
            });
            $('#condition2_search').search({
                maxResults: 5,
                source: constants.search_items,
                onSelect: function (res) {
                    if (res) {
                        $scope.quest.small_monster_conditions[1].target = res.id;

                    }
                }
            });

        }, 0);
    };

    $scope.reload_special = function () {
        $timeout(function () {
            $('.special.ui.dropdown').dropdown();
        }, 0);
    };

    $scope.gotoLibrary = function() {
        if ($scope.saved_quest === angular.toJson($scope.quest)) {
            return $location.path('/library');
        }
        $('#confirmDialog')
        .modal({
            transition: 'scale',
            blurring: false
        })
        .modal('show');
    };

    $scope.select_lang = function (lang) {
        $scope.text_lang = lang;
    };

    $scope.select_quest_id = function (qid) {
        $scope.quest.quest_id = parseInt(qid, 10);
    };

    $scope.copy_lang = function () {
        var i, j;
        for (i = 0; i < 5; i++) {
            for (j = 0; j < 7; j++) {
                $scope.quest.text[i][j] = $scope.quest.text[$scope.text_lang][j];
            }
        }
    };

    // Supplies

    $('#importSupplies').change(function (v) {
        var file = $(this).val();
        if (file === "" || file === null) return;
        var content = fs.readFileSync(file).toString();
        var new_list = [];
        content.split('\n').forEach(function (entry) {
            var item = entry.split('|');
            item = {item_id:parseInt(item[0], 10), qty: parseInt(item[1], 10)};
            if (item.item_id && item.qty && !isNaN(item.item_id) && !isNaN(item.qty)) {
                new_list.push(item);
            }
        });
        $scope.quest.supplies[$scope.supply_import_idx] = new_list;
        $('#importSupplies').val("");
        $scope.$digest();
    });

    $scope.supply_import_idx = null;
    $scope.importSupplies = function (idx) {
        $scope.supply_import_idx = idx;
        $('#importSupplies').trigger('click');
    };

    $('#exportSupplies').change(function (v) {
        var file = $(this).val();
        if (file === "" || file === null) return;
        var content = '';
        $scope.quest.supplies[$scope.supply_export_idx].forEach(function (item) {
            content += item.item_id + '|' + item.qty + '\n';
        });

        fs.writeFileSync(file, content);
        $('#exportSupplies').val("");
    });
    $scope.supply_export_idx = null;
    $scope.exportSupplies = function (idx) {
        $scope.supply_export_idx = idx;
        $('#exportSupplies').trigger('click');
    };

    // Rewards

    $('#importRewards').change(function (v) {
        var file = $(this).val();
        if (file === "" || file === null) return;
        var content = fs.readFileSync(file).toString();
        var new_list = [{
            "flag": 32768,
            "items": []
        }];
        content.split('\n').forEach(function (entry) {
            var item = entry.split('|');
            item = {item_id:parseInt(item[0], 10), qty: parseInt(item[1], 10), chance: parseInt(item[2], 10)};
            if (item.item_id && item.qty && item.chance && !isNaN(item.item_id) && !isNaN(item.qty) && !isNaN(item.chance)) {
                new_list[0].items.push(item);
            }
        });
        $scope.quest['loot_'+ $scope.rewards_import_idx] = new_list;
        $('#importRewards').val("");
        $scope.$digest();
    });

    $scope.rewards_import_idx = null;
    $scope.importRewards = function (idx) {
        $scope.rewards_import_idx = idx;
        $('#importRewards').trigger('click');
    };


    $('#exportRewards').change(function (v) {
        var file = $(this).val();
        if (file === "" || file === null) return;
        var content = '';
        $scope.quest['loot_'+ $scope.rewards_export_idx][0].items.forEach(function (item) {
            content += item.item_id + '|' + item.qty + '|' + item.chance + '\n';
        });

        fs.writeFileSync(file, content);
        $('#exportRewards').val("");
    });
    $scope.rewards_export_idx = null;
    $scope.exportRewards = function (idx) {
        $scope.rewards_export_idx = idx;
        $('#exportRewards').trigger('click');
    };

    $scope.mon_count = function () {
        var count = 0;
        $scope.quest.large_monster_table.forEach(function (wave) {
            count += wave.length;
        });
        return count;
    };

    $scope.calc_abs_mon_idx = function(wave_idx, mon_idx) {
        var idx = 0;
        for (var i = 0; i < wave_idx; i++) {
            idx += $scope.quest.large_monster_table[i].length;
        }
        idx += mon_idx;
        if (idx > 4) {
            idx = 4;
        }
        return idx;
    };

    $scope.add_wave = function () {
        $scope.quest.large_monster_table.push([]);
    };

    $scope.add_monster = function (wave_idx) {
        $scope.quest.large_monster_table[wave_idx].push(constants.default_monster());
        $scope.quest.large_meta_table.splice(
            $scope.calc_abs_mon_idx(wave_idx, $scope.quest.large_monster_table[wave_idx].length-1),
            0,
            constants.default_meta()
        );
        $scope.quest.large_meta_table.pop();
    };

    $scope.duplicate_monster = function(wave_idx, mon_idx) {
        var abs_idx = $scope.calc_abs_mon_idx(wave_idx, mon_idx);
        var monster = angular.copy($scope.quest.large_monster_table[wave_idx][mon_idx]);
        var meta = angular.copy($scope.quest.large_meta_table[abs_idx]);

        if ($scope.quest.large_monster_table[wave_idx].length < 2) {
            $scope.quest.large_monster_table[wave_idx].push(monster);
            $scope.quest.large_meta_table.splice(abs_idx + 1, 0, meta);
        } else {
            for (var i = wave_idx; i < $scope.quest.large_monster_table.length; i++) {
                if ($scope.quest.large_monster_table[i].length < 2) {
                    $scope.quest.large_monster_table[i].push(monster);
                    $scope.quest.large_meta_table.splice($scope.calc_abs_mon_idx(i, $scope.quest.large_monster_table[i].length-1), 0, meta);
                    return;
                }
            }
            $scope.add_wave();
            $scope.quest.large_monster_table[$scope.quest.large_monster_table.length-1].push(monster);
            $scope.quest.large_meta_table.splice(
                $scope.calc_abs_mon_idx(
                    $scope.quest.large_monster_table.length-1,
                    $scope.quest.large_monster_table[$scope.quest.large_monster_table.length-1].length-1
                ), 0, meta);
        }
    };

    $scope.remove_monster = function (wave_idx, mon_idx) {
        var abs_idx = $scope.calc_abs_mon_idx(wave_idx, mon_idx);
        $scope.quest.large_monster_table[wave_idx].splice(mon_idx, 1);

        $scope.quest.large_meta_table.splice(abs_idx, 1);
        $scope.quest.large_meta_table.push(constants.default_meta());
    };

    $scope.remove_wave = function (wave_idx) {
        while ($scope.quest.large_monster_table[wave_idx].length > 0){
            $scope.remove_monster(wave_idx, 0);
        }
        $scope.quest.large_monster_table.splice(wave_idx, 1);
    };

    $scope.area_x = function () {
        var mon = $scope.current_edit_monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            x_scale = (cfg.max_x_img - cfg.min_x_img)/(cfg.max_x - cfg.min_x);
        return cfg.min_x_img + (-cfg.min_x)*x_scale + mon.x*x_scale;
    };

    $scope.area_z = function () {
        var mon = $scope.current_edit_monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            z_scale = (cfg.max_z_img - cfg.min_z_img)/(cfg.max_z - cfg.min_z);
        return cfg.min_z_img + (-cfg.min_z)*z_scale + mon.z*z_scale;
    };

    $scope.set_coords = function ($event) {
        var mon = $scope.current_edit_monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            x_scale = (cfg.max_x_img - cfg.min_x_img)/(cfg.max_x - cfg.min_x),
            z_scale = (cfg.max_z_img - cfg.min_z_img)/(cfg.max_z - cfg.min_z);
        mon.x = ($event.offsetX-cfg.min_x_img)/x_scale + cfg.min_x;
        mon.z = ($event.offsetY-cfg.min_z_img)/z_scale + cfg.min_z;
    };

    $scope.move_monster_down = function (wave_idx, mon_idx) {
        var abs_idx = $scope.calc_abs_mon_idx(wave_idx, mon_idx);
        var monster = angular.copy($scope.quest.large_monster_table[wave_idx][mon_idx]);
        var meta = angular.copy($scope.quest.large_meta_table[abs_idx]);

        for (var i = wave_idx + 1; i < $scope.quest.large_monster_table.length; i++) {
            if ($scope.quest.large_monster_table[i].length < 2) {
                $scope.quest.large_monster_table[i].push(monster);
                $scope.quest.large_meta_table.splice($scope.calc_abs_mon_idx(i, $scope.quest.large_monster_table[i].length-1), 0, meta);
                $scope.remove_monster(wave_idx, mon_idx);
                return;
            }
        }

        $scope.add_wave();
        $scope.quest.large_monster_table[$scope.quest.large_monster_table.length-1].push(monster);
        $scope.quest.large_meta_table.splice(
            $scope.calc_abs_mon_idx(
                $scope.quest.large_monster_table.length-1,
                $scope.quest.large_monster_table[$scope.quest.large_monster_table.length-1].length-1
            ), 0, meta);
        $scope.remove_monster(wave_idx, mon_idx);

    };

    $scope.move_monster_up = function (wave_idx, mon_idx) {
        var abs_idx = $scope.calc_abs_mon_idx(wave_idx, mon_idx);
        var monster = angular.copy($scope.quest.large_monster_table[wave_idx][mon_idx]);
        var meta = angular.copy($scope.quest.large_meta_table[abs_idx]);

        for (var i = wave_idx - 1; i > -1; i--) {
            if ($scope.quest.large_monster_table[i].length < 2) {
                $scope.quest.large_monster_table[i].push(monster);
                $scope.quest.large_meta_table.splice($scope.calc_abs_mon_idx(i, $scope.quest.large_monster_table[i].length-1), 0, meta);
                $scope.remove_monster(wave_idx, mon_idx);
                return;
            }
        }
    };

    $scope.edit_monster = function (wave_idx, mon_idx) {
        $scope.current_edit_monster = angular.copy($scope.quest.large_monster_table[wave_idx][mon_idx]);
        $scope.current_edit_wave_idx = wave_idx;
        $scope.current_edit_mon_idx = mon_idx;
        $scope.current_edit_meta = angular.copy($scope.quest.large_meta_table[$scope.calc_abs_mon_idx(wave_idx, mon_idx)]);

        $timeout(function() {
            $('#monstermodal')
                .modal({
                    transition: 'vertical flip',
                    blurring: true,
                    observeChanges: true
                })
                .modal('show');
            $('#monstermodal .ui.dropdown').dropdown({
                fullTextSearch: true
            });
        }, 0);
    };

    $scope.save_edit_monster = function () {
        var wave_idx = $scope.current_edit_wave_idx,
            mon_idx = $scope.current_edit_mon_idx,
            monster = $scope.current_edit_monster,
            meta = $scope.current_edit_meta,
            abs_idx = $scope.calc_abs_mon_idx(wave_idx, mon_idx);

        $scope.quest.large_monster_table[wave_idx][mon_idx] = monster;
        $scope.quest.large_meta_table[abs_idx] = meta;
    };

    $scope.area_x_small = function () {
        var mon = $scope.current_edit_small_monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            x_scale = (cfg.max_x_img - cfg.min_x_img)/(cfg.max_x - cfg.min_x);
        return cfg.min_x_img + (-cfg.min_x)*x_scale + mon.x*x_scale;
    };

    $scope.area_z_small = function () {
        var mon = $scope.current_edit_small_monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            z_scale = (cfg.max_z_img - cfg.min_z_img)/(cfg.max_z - cfg.min_z);
        return cfg.min_z_img + (-cfg.min_z)*z_scale + mon.z*z_scale;
    };

    $scope.set_coords_small = function ($event) {
        var mon = $scope.current_edit_small_monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            x_scale = (cfg.max_x_img - cfg.min_x_img)/(cfg.max_x - cfg.min_x),
            z_scale = (cfg.max_z_img - cfg.min_z_img)/(cfg.max_z - cfg.min_z);
        mon.x = ($event.offsetX-cfg.min_x_img)/x_scale + cfg.min_x;
        mon.z = ($event.offsetY-cfg.min_z_img)/z_scale + cfg.min_z;
    };


    $scope.empty_small_wave = function (idx) {
        $scope.quest.small_monster_table[idx] = [[]];
    };

    $scope.duplicate_small_monster = function (wave_idx, mon_idx) {
        var monster = angular.copy($scope.quest.small_monster_table[wave_idx][0][mon_idx]);
        $scope.quest.small_monster_table[wave_idx][0].push(monster);
    };

    $scope.remove_small_monster = function (wave, idx) {
        $scope.quest.small_monster_table[wave][0].splice(idx, 1);
    };

    $scope.add_small_monster = function (wave) {
        $scope.quest.small_monster_table[wave][0].push(constants.default_monster());
    };

    $scope.move_small_monster_down = function (wave_idx, mon_idx) {
        var monster = angular.copy($scope.quest.small_monster_table[wave_idx][0][mon_idx]);

        for (var i = wave_idx + 1; i < 3; i++) {
            $scope.quest.small_monster_table[i][0].push(monster);
            $scope.remove_small_monster(wave_idx, mon_idx);
            return;
        }

    };

    $scope.move_small_monster_up = function (wave_idx, mon_idx) {
        var monster = angular.copy($scope.quest.small_monster_table[wave_idx][0][mon_idx]);

        for (var i = wave_idx - 1; i > -1; i--) {
            $scope.quest.small_monster_table[i][0].push(monster);
            $scope.remove_small_monster(wave_idx, mon_idx);
            return;
        }
    };


    $scope.edit_small_monster = function (wave_idx, mon_idx) {
        $scope.current_edit_small_monster = angular.copy($scope.quest.small_monster_table[wave_idx][0][mon_idx]);
        $scope.current_edit_small_mon_idx = mon_idx;
        $scope.current_edit_small_wave_idx = wave_idx;
        $scope.current_edit_small_meta = angular.copy($scope.quest.small_meta);

        $timeout(function() {
            $('#smallmonstermodal')
                .modal({
                    transition: 'vertical flip',
                    blurring: true,
                    observeChanges: true
                })
                .modal('show');
            $('#smallmonstermodal .ui.dropdown').dropdown({
                fullTextSearch: true
            });
        }, 0);
    };

    $scope.save_edit_small_monster = function () {
        var mon_idx = $scope.current_edit_small_mon_idx,
            wave_idx = $scope.current_edit_small_wave_idx,
            monster = $scope.current_edit_small_monster,
            meta = $scope.current_edit_small_meta;

        $scope.quest.small_monster_table[wave_idx][0][mon_idx] = monster;
        $scope.quest.small_meta = meta;
    };

    $scope.area_x_unstable = function () {
        var mon = $scope.current_edit_unstable_monster.monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            x_scale = (cfg.max_x_img - cfg.min_x_img)/(cfg.max_x - cfg.min_x);
        return cfg.min_x_img + (-cfg.min_x)*x_scale + mon.x*x_scale;
    };

    $scope.area_z_unstable = function () {
        var mon = $scope.current_edit_unstable_monster.monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            z_scale = (cfg.max_z_img - cfg.min_z_img)/(cfg.max_z - cfg.min_z);
        return cfg.min_z_img + (-cfg.min_z)*z_scale + mon.z*z_scale;
    };

    $scope.set_coords_unstable = function ($event) {
        var mon = $scope.current_edit_unstable_monster.monster,
            cfg = constants.map_coordinates[$scope.quest.map_id][mon.area],
            x_scale = (cfg.max_x_img - cfg.min_x_img)/(cfg.max_x - cfg.min_x),
            z_scale = (cfg.max_z_img - cfg.min_z_img)/(cfg.max_z - cfg.min_z);
        mon.x = ($event.offsetX-cfg.min_x_img)/x_scale + cfg.min_x;
        mon.z = ($event.offsetY-cfg.min_z_img)/z_scale + cfg.min_z;
    };


    $scope.remove_unstable_monster = function (idx) {
        $scope.quest.unstable_monster_table.splice(idx, 1);
    };

    $scope.add_unstable_monster = function () {
        $scope.quest.unstable_monster_table.push({chance: 100, monster: constants.default_monster()});
    };

    $scope.duplicate_unstable_monster = function (mon_idx) {
        var monster = angular.copy($scope.quest.unstable_monster_table[mon_idx]);
        $scope.quest.unstable_monster_table.push(monster);
    };

    $scope.edit_unstable_monster = function (mon_idx) {
        $scope.current_edit_unstable_monster = angular.copy($scope.quest.unstable_monster_table[mon_idx]);
        $scope.current_edit_unstable_mon_idx = mon_idx;
        $scope.current_edit_unstable_meta = angular.copy($scope.quest.large_meta_table[2]);

        $timeout(function() {
            $('#unstablemonstermodal')
                .modal({
                    transition: 'vertical flip',
                    blurring: true,
                    observeChanges: true
                })
                .modal('show');
            $('#unstablemonstermodal .ui.dropdown').dropdown({
                fullTextSearch: true
            });
        }, 0);
    };

    $scope.save_edit_unstable_monster = function () {
        var mon_idx = $scope.current_edit_unstable_mon_idx,
            monster = $scope.current_edit_unstable_monster,
            meta = $scope.current_edit_unstable_meta;

        $scope.quest.unstable_monster_table[mon_idx] = monster;
        $scope.quest.large_meta_table[2] = meta;
    };

    $scope.duplicate_supply_item = function(supply_idx, item_idx) {
        var item = angular.copy($scope.quest.supplies[supply_idx][item_idx]);
        $scope.quest.supplies[supply_idx].splice(item_idx, 0, item);
    };


    $scope.edit_supply_item = function (s_idx, idx) {
        $scope.current_edit_supply_item = angular.copy($scope.quest.supplies[s_idx][idx]);
        $scope.current_edit_supply_item_idx = idx;
        $scope.current_edit_supply_item_s_idx = s_idx;

        $timeout(function() {
            $('#supplymodal')
                .modal({
                    transition: 'vertical flip',
                    blurring: true,
                    observeChanges: true
                })
                .modal('show');
            $('#supplymodal .ui.search').search({
                source: constants.search_items,
                onSelect: function (res) {
                    if (res && $scope.current_edit_supply_item) {
                        $scope.current_edit_supply_item.item_id = res.id;
                    }
                }
            });
            $('#supplymodal .ui.search').search('set value', $i18n.getFilter(constants.items[$scope.current_edit_supply_item.item_id]));
        }, 0);
    };

    $scope.save_edit_supply_item = function () {
        $scope.quest.supplies[$scope.current_edit_supply_item_s_idx][$scope.current_edit_supply_item_idx] = $scope.current_edit_supply_item;
    };

    $scope.duplicate_loot_item = function(table, idx) {
        var item = angular.copy($scope.quest['loot_'+table][0].items[idx]);
        $scope.quest['loot_'+table][0].items.splice(idx, 0, item);
    };


    $scope.edit_loot_item = function (table, idx) {
        $scope.current_edit_loot_item = angular.copy($scope.quest["loot_"+table][0].items[idx]);
        $scope.current_edit_loot_item_idx = idx;
        $scope.current_edit_loot_item_table = table;

        $timeout(function() {
            $('#lootmodal')
                .modal({
                    transition: 'vertical flip',
                    blurring: true,
                    observeChanges: true
                })
                .modal('show');
            $('#lootmodal .ui.search').search({
                source: constants.search_items,
                onSelect: function (res) {
                    if (res && $scope.current_edit_loot_item) {
                        $scope.current_edit_loot_item.item_id = res.id;
                    }
                }
            });
            $('#lootmodal .ui.search').search('set value', $i18n.getFilter(constants.items[$scope.current_edit_loot_item.item_id]));
        }, 0);
    };

    $scope.save_edit_loot_item = function () {
        var idx  = $scope.current_edit_loot_item_idx,
            item = $scope.current_edit_loot_item,
            table = $scope.current_edit_loot_item_table;

        $scope.quest["loot_"+table][0].items[idx] = item;
    };


    $scope.save = function () {
        if ($routeParams.uuid) {
            $library.update($routeParams.uuid, $mib.export($fix.fix($scope.quest)));
        } else {
            $library.insert($mib.export($fix.fix($scope.quest)));
        }
        $timeout(function () {
            $location.path('/library');
        }, 0);
    };

    // defer semantic ui js until all includes were loaded
    $scope.$on('$includeContentLoaded', function () {
        $scope.includes_loaded += 1;
        if ($scope.includes_loaded === 8) {
            $timeout(function() {
                $('.menu .item').tab();
                $('.menu .item').on('click', function () { $('#viewport').scrollTop(0); });
                $('.tooltip').popup({
                    delay: {
                        show: 500,
                        hide: 100
                    }
                });

                $('.ui.accordion').accordion();
                $('#general .ui.dropdown').dropdown({
                    fullTextSearch: true
                });
                $('#preview .ui.dropdown').dropdown();
                $('#text_edit .ui.dropdown').dropdown();
                $('#reqobj .ui.dropdown').dropdown();
                $('#refillform .ui.dropdown').dropdown();
                $('#small_conditions .ui.dropdown').dropdown();
                $scope.reload_dropdown();
                $('#loading').hide();
            }, 0);
        }
    });


    $scope.$on('$destroy', function () {
        $('.ui.grid .menu .item').remove();
        // $('.ui.grid .ui.modal').remove();
        $('#confirmDialog').remove();
        $('#monstermodal').remove();
        $('#lootmodal').remove();
        $('#smallmonstermodal').remove();
        $('#supplymodal').remove();
        $('#unstablemonstermodal').remove();
        $('.special.ui.dropdown').remove()
        $('.ui.grid .ui.dropdown').remove();
        $('.ui.accordion').remove();
        $('.tooltip').remove();
        $('.ui.search').remove();
        $('#importSupplies').remove();
        $('#exportSupplies').remove();
        $('#importRewards').remove();
        $('#exportRewards').remove();
    });
}]);

})();
