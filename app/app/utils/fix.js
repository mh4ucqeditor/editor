(function () {

var app = angular.module('editor.utils.fix', ['editor.utils.constants']);


function small_monster_fix (quest, constants) {
    quest.small_monster_table.forEach(function (wave) {
        wave[0].forEach(function (monster) {
            if (constants.monster_is_large[monster.monster_id]) {
                monster.crashflag = 5;
            } else {
                monster.crashflag = 1;
            }
        });
    });
}

function item_bypass(quest, constants) {
    var list = constants.item_restrictions;

    if (!list[quest.quest_id]) {
        return;
    }

    var bypassitem = {item_id: list[quest.quest_id], qty: 0, chance: 0};

    if (quest.loot_a.length === 0) {
        quest.loot_a.push({flag: 0x8000, items: [bypassitem]});
    } else {
        if (quest.loot_a[0].items.length === 0) {
            quest.loot_a[0].items.push(bypassitem);
        } else {
            if (quest.loot_a[0].items[0].item_id !== list[quest.quest_id]) {
                quest.loot_a[0].items.splice(0, 0, bypassitem);
            }
        }
    }
}

function fix_objective_count(quest) {
    quest.objective_amount = 0;
    if (quest.objectives[0].type !== 0) {
        quest.objective_amount++;
    }
    if (quest.objectives[1].type !== 0) {
        quest.objective_amount++;
    }
    if (quest.objective_sub.type !== 0 && quest.three_obj_flag) {
        quest.objective_amount++;
    }
    if (quest.objective_or) {
        quest.objective_amount = 1;
    }
}

function fix_intruder_chance(quest) {
    if (quest.intruder_chance > 0 && quest.unstable_monster_table.length > 0) {
        quest.intruder_chance2 = 100;
        quest.intruder_flag = 1;

        var already_in = false;
        quest.pictures.forEach(function (pic) {
            if (pic === 84) {
                already_in = true;
            }
        });

        if (!already_in) {
            var did_place = false;
            for (var i = 0; i < 5; i++) {
                if (quest.pictures[i] === 98) {
                    quest.pictures[i] = 84;
                    did_place = true;
                    break;
                }
            }
            if (!did_place) {
                quest.pictures[4] = 84;
            }
        }
    } else {
        quest.intruder_chance = 0;
        quest.intruder_chance2 = 0;
        quest.intruder_flag = 0;
    }
}

function fix_sub_quest(quest) {
    if (quest.objective_sub.type !== 0 && !quest.three_obj_flag) {
        quest.sub_flag = 1;
    } else {
        quest.sub_flag = 0;
    }
}

function fix_quest_type(quest) {
    if (quest.large_monster_table.length > 1) {
        quest.quest_type |= 8;
        quest.huntathon_flag = 0;
    } else {
        quest.quest_type &= 0xF7;
    }
}

function set_ship_integrity(quest) {
    if (quest.map_id === 6) {
        quest.ship_integrity = 1;
    } else {
        quest.ship_integrity = 0;
    }
}

function not_arena_fix(quest) {
    if (quest.map_id !== 11) {
        quest.arena_fence = 0;
        quest.fence_uptime = 0;
        quest.fence_state = 0;
        quest.fence_cooldown = 0;
    }

    // quest.large_meta_table.forEach(function (meta) {
    //     meta.unk2 = 0;
    // });
}

function fix_size(quest) {
    quest.large_meta_table.forEach(function (meta) {
        if (meta.size !== 100) {
            meta.size_var = 0;
        }
    });
}

app.factory('$fix', ['constants', function (constants) {
    var fix = {
        fix: function (quest) {
            small_monster_fix(quest, constants);
            item_bypass(quest, constants);
            set_ship_integrity(quest);
            fix_objective_count(quest);
            fix_intruder_chance(quest);
            fix_quest_type(quest);
            fix_sub_quest(quest);
            not_arena_fix(quest);
            fix_size(quest);
            return quest;
        }
    };
    return fix;
}]);

})();
