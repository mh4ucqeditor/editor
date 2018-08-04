(function () {

var app  = angular.module('editor.utils.library', ['editor.utils.mib', 'editor.utils.otb', 'editor.utils.eastereggs']),
    zlib = require('zlib');

function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

function multiline(arr, length) {
    var lines = arr.split('\n'),
        index = "";
    while (lines.length < length) {
        lines.push('');
    }
    while (lines.length > length) {
        lines.pop();
    }
    for (var i = 0; i < length; i++) {
        index += "|" + lines[i];
    }
    return index;
}

function utf16d(s) {
    var n_buf = '', byte1;
    for (var i = 0; i < s.length; i++) {
        byte1 = s[i].charCodeAt(0);
        if (byte1 > 255) {
            n_buf += '?';
        } else {
            n_buf += String.fromCharCode(byte1);
        }
    }
    return n_buf;
}

function generateIndex(quest) {
    var index = '';
    index += "2015050128";
    index += "|" + quest.quest_id;
    index += "|" + utf16d(quest.text[0][0]);
    index += "|" + 0;
    index += "|" + quest.quest_rank;
    index += "|" + 0;
    index += "|" + quest.map_id;
    index += "|" + quest.time;
    index += "|" + quest.reward_main;
    index += "|" + quest.fee;
    index += "|" + quest.pictures[0];
    index += "|" + quest.pictures[1];
    index += "|" + quest.pictures[2];
    index += "|" + quest.pictures[3];
    index += "|" + quest.pictures[4];
    index += "|" + quest.requirements[0];
    index += "|" + quest.requirements[1];
    // Main Goal
    index += multiline(utf16d(quest.text[0][1]), 2);
    // index += "|Custom Quest Editor by dasding|";
    // Subquest
    index += "|" + utf16d(quest.text[0][6]);
    // Failure
    index += multiline(utf16d(quest.text[0][2]), 2);
    // Main Monster
    index += multiline(utf16d(quest.text[0][4]), 2);
    // client
    index += "|" + utf16d(quest.text[0][5]);
    // long description
    index += multiline(utf16d(quest.text[0][3]), 7);
    index += "\n";
    return index;
}


function generatePalicoIndex(palico, idx) {
    var index = '';
    index += '2015030602';
    index += '|' + idx;
    index += '|' + utf16d(palico.owner);
    index += '|' + utf16d(palico.name);
    index += '|' + palico.level;
    index += '|' + 1;
    index += '|' + palico.ability;
    index += '|' + palico.skill1;
    index += '|' + palico.skill2;
    index += '|' + palico.skill3;
    index += '|' + palico.skill4;
    index += '|' + palico.skill5;
    index += '|' + palico.skillSig;
    index += '|' + palico.teamAtk;
    index += '|' + palico.coat;
    index += '|' + utf16d(palico.shout);
    index += '\n';
    return index;
}

app.factory('$library', ['$mib', '$otb', '$eastereggs', function ($mib, $otb, $eastereggs) {
    var library = {
        import: function (file) {
            if (file.substring(0, 4) === 'cmib') {
                try {
                    var payload = Buffer(file.substring(4, file.length), 'binary');
                    var archive = JSON.parse(zlib.inflateSync(payload));
                    archive.forEach(function (quest) {
                        library.import(quest);
                    });
                } catch (e) {
                    return;
                }
            }
            var mib = $mib.decrypt(file);
            if (mib !== null) {
                return library.insert(mib);
            }
            var otb = $otb.decrypt(file);
            if (otb !== null) {
                return library.insert_otb(otb);
            }
            return -1;
        },

        insert: function (mib) {
            var index = JSON.parse(localStorage.getItem('index')),
                uuid  = generateUUID(),
                json  = $mib.parse(mib);

            if ( (60000 > json.quest_id || json.quest_id >= 63000 ) && !$eastereggs.get('devmode') ) {
                return -2;
            }

            index.push({uuid: uuid, hosted: false});

            localStorage.setItem(uuid, JSON.stringify({mib: mib, json: json}));
            localStorage.setItem(uuid + '.json', JSON.stringify(json));
            localStorage.setItem('index', JSON.stringify(index));
            return 1;
        },

        insert_otb: function (otb) {
            var index = JSON.parse(localStorage.getItem('index_otb')),
                uuid  = generateUUID(),
                json  = $otb.parse(otb);

            index.push({uuid: uuid, hosted: false});

            localStorage.setItem(uuid, JSON.stringify({otb: otb, json: json}));
            localStorage.setItem(uuid + '.json', JSON.stringify(json));
            localStorage.setItem('index_otb', JSON.stringify(index));
            return 1;
        },

        delete: function (uuid) {
            var index = JSON.parse(localStorage.getItem('index')),
                idx;

            for (var i = 0; i < index.length; i++) {
                if (index[i].uuid === uuid) {
                    idx = i;
                    break;
                }
            }

            if (idx > -1) {
                index.splice(idx, 1);
            }
            localStorage.removeItem(uuid);
            localStorage.removeItem(uuid + '.json');
            localStorage.setItem('index', JSON.stringify(index));
        },

        delete_otb: function (uuid) {
            var index = JSON.parse(localStorage.getItem('index_otb')),
                idx;

            for (var i = 0; i < index.length; i++) {
                if (index[i].uuid === uuid) {
                    idx = i;
                    break;
                }
            }

            if (idx > -1) {
                index.splice(idx, 1);
            }
            localStorage.removeItem(uuid);
            localStorage.removeItem(uuid + '.json');
            localStorage.setItem('index_otb', JSON.stringify(index));
        },


        get: function (uuid) {
            return JSON.parse(localStorage.getItem(uuid));
        },

        update: function (uuid, mib) {
            var json = $mib.parse(mib);
            localStorage.setItem(uuid, JSON.stringify({mib: mib, json: json}));
            localStorage.setItem(uuid + '.json', JSON.stringify(json));
        },

        update_otb: function (uuid, otb) {
            var json = $otb.parse(otb);
            localStorage.setItem(uuid, JSON.stringify({otb: otb, json: json}));
            localStorage.setItem(uuid + '.json', JSON.stringify(json));
        },

        persistHosted: function (list) {
            var index = JSON.parse(localStorage.getItem('index'));
            for (var i = 0; i < list.length; i++) {
                index[i].hosted = list[i].hosted;
            }
            localStorage.setItem('index', JSON.stringify(index));
        },

        persistPalicoHosted: function (list) {
            var index = JSON.parse(localStorage.getItem('index_otb'));
            for (var i = 0; i < list.length; i++) {
                index[i].hosted = list[i].hosted;
            }
            localStorage.setItem('index_otb', JSON.stringify(index));
        },

        list: function () {
            var index = JSON.parse(localStorage.getItem('index')),
                list  = [];

            index.forEach(function (entry) {
                var info = JSON.parse(localStorage.getItem(entry.uuid + '.json'));
                if (info) {
                    entry.json = info;
                } else {
                    entry.json = JSON.parse(localStorage.getItem(entry.uuid)).json;
                    localStorage.setItem(entry.uuid + '.json', JSON.stringify(entry.json));
                }
                list.push(entry);
            });
            return list;
        },

        list_otb: function () {
            var index = JSON.parse(localStorage.getItem('index_otb')),
                list  = [];

            index.forEach(function (entry) {
                var info = JSON.parse(localStorage.getItem(entry.uuid + '.json'));
                if (info) {
                    entry.json = info;
                } else {
                    entry.json = JSON.parse(localStorage.getItem(entry.uuid)).json;
                    localStorage.setItem(entry.uuid + '.json', JSON.stringify(entry.json));
                }
                list.push(entry);
            });
            return list;
        },

        clear: function () {
            var index = JSON.parse(localStorage.getItem('index'));

            index.forEach(function (entry) {
                localStorage.removeItem(entry.uuid);
                localStorage.removeItem(entry.uuid+'.json');
            });
            localStorage.setItem('index', "[]");
        },
        clear_otb: function () {
            var index = JSON.parse(localStorage.getItem('index_otb'));

            index.forEach(function (entry) {
                localStorage.removeItem(entry.uuid);
                localStorage.removeItem(entry.uuid+'.json');
            });
            localStorage.setItem('index_otb', "[]");
        },

        backup: function () {
            var archive = [];
            library.list().forEach(function (quest) {
                archive.push(library.get(quest.uuid).mib);
            });
            var payload = JSON.stringify(archive);
            payload = zlib.deflateSync(payload).toString('binary');
            payload = 'cmib' + payload;
            return payload;
        },

        generateIndex: generateIndex,
        generatePalicoIndex: generatePalicoIndex
    };
    return library;
}]);

app.config(function () {
    if (localStorage.getItem('index') === null) {
        localStorage.setItem('index', "[]");
    }

    if (localStorage.getItem('index_otb') === null) {
        localStorage.setItem('index_otb', "[]");
    }

});

})();
