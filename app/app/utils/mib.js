(function () {

var app = angular.module('editor.utils.mib', []),
    ncrypto = require('crypto'),
    us_key = 'AgK2DYheaCjyHGPB',
    jp_key = 'AgK2DYheaCjyHGP8',
    kr_key = 'AgK2DYheaOjyHGP8',
    tw_key = 'Capcom123 ',
    magic = '\x76\x30\x30\x35';

// Big Endian functions for en/decryption
function pack_int4_be(value) {
    var i, buf, c;
    buf = '';
    for (i = 0; i < 4; i++) {
        c = (value >> (i * 8)) & 0xFF;
        buf = String.fromCharCode(c) + buf;
    }
    return buf;
}

function unpack_int4_be(buf) {
    if (buf.length < 4) {
        return 0;
    }
    var i, value;
    value = 0;
    for (i = 0; i < 4; i++) {
        value += buf[i].charCodeAt(0) << ((3-i) * 8);
    }
    return value;
}

function pad(buf, mod) {
    while (buf.length % mod !== 0) {
        buf += '\x00';
    }
    return buf;
}

function byteswap(buf) {
    var idx, idx2, new_buf;
    new_buf = '';
    for (idx = 0; idx < buf.length; idx += 4) {
        for (idx2 = 3; idx2 > -1; idx2--) {
            new_buf += buf.substring(idx + idx2, idx + idx2 + 1);
        }
    }
    return new_buf;
}

// Little Endian functions for parsing and exporting
function read_char(buf, offset) {
    return buf.charAt(offset);
}

function read_block(buf, offset, length) {
    return buf.substring(offset, offset+length);
}

function unpack_int(buf) {
    var i, value;
    value = 0;
    for (i = 0; i < buf.length; i++) {
        value += buf[i].charCodeAt(0) << ((i) * 8);
    }
    return value;
}

function read_byte(buf, offset) {
    return unpack_int(buf.charAt(offset));
}

function read_bit(buf, offset, n) {
    if (read_byte(buf, offset) & (1 << n)) {
        return 1;
    } else {
        return 0;
    }
}


function read_word(buf, offset) {
    return unpack_int(buf.substring(offset, offset+2));
}

function read_dword(buf, offset) {
    return unpack_int(buf.substring(offset, offset+4));
}

function read_float(buf, offset) {
    var abuf = new ArrayBuffer(4),
        ibuf = new Uint8Array(abuf),
        fbuf = new Float32Array(abuf);
    for (var i = 0; i < 4; i++) {
        ibuf[i] = buf[offset + i].charCodeAt(0);
    }
    return fbuf[0];
}

function read_word_array(buf, offset, length) {
    var i = 0,
        a = [];
    for (i = 0; i < length; i++) {
        a.push(read_word(buf, offset));
        offset += 2;
    }
    return a;
}

function read_dword_array(buf, offset, length) {
    var i = 0,
        a = [];
    for (i = 0; i < length; i++) {
        a.push(read_dword(buf, offset));
        offset += 4;
    }
    return a;
}

function read_dword_array_until_zero(buf, offset) {
    var word = 0x00,
        a = [];
    while (true) {
        word = read_dword(buf, offset);
        if (word === 0x00) {
            break;
        }
        a.push(word);
        offset += 4;
    }
    return a;
}

function read_string(buf, offset) {
    var byte1, byte2,
        s = '';
    while (true) {
        byte1 = read_char(buf, offset);
        byte2 = read_char(buf, offset + 1);
        if (byte1.charCodeAt(0) === 0x00 && byte2.charCodeAt(0) === 0x00) {
            break;
        }
        if (byte1 === "" && byte2 === "") {
            break;
        }
        s += String.fromCharCode(unpack_int(byte1 + byte2));
        offset += 2;
    }
    return s;
}

function pack_int(value, length) {
    var i, buf, c;
    buf = '';
    for (i = 0; i < length; i++) {
        c = (value >> (i * 8)) & 0xFF;
        buf += String.fromCharCode(c);
    }
    return buf;
}

function place_block(buf, offset, value) {
    return buf.substring(0, offset) + value + buf.substring(offset+value.length, buf.length);
}

function place_int(buf, offset, value, length) {
    return buf.substring(0, offset) + pack_int(value, length) + buf.substring(offset+length, buf.length);
}

function place_byte(buf, offset, value) {
    return place_int(buf, offset, value, 1);
}

function place_bit(out, offset, n, value) {
    var o = read_byte(out, offset);
    if (value) {
        o = o | (1 << n);
    } else {
        o = o & ~(1 << n);
    }
    return place_byte(out, offset, o);
}


function place_word(buf, offset, value) {
    return place_int(buf, offset, value, 2);
}

function place_dword(buf, offset, value) {
    return place_int(buf, offset, value, 4);
}

function place_float(buf, offset, value) {
    var abuf = new ArrayBuffer(4),
        ibuf = new Uint8Array(abuf),
        fbuf = new Float32Array(abuf),
        sbuf = '';

    fbuf[0] = value;

    for (var i = 0; i < 4; i++) {
        sbuf += String.fromCharCode(ibuf[i]);
    }
    return buf.substring(0, offset) + sbuf + buf.substring(offset+4,buf.length);
}

function place_string(buf, offset, value) {
    var n_buf = '';
    for (var i = 0; i < value.length; i++) {
        n_buf += String.fromCharCode(value[i].charCodeAt(0) & 0xFF);
        n_buf += String.fromCharCode(value[i].charCodeAt(0) >> 8);
    }
    return buf.substring(0, offset) + n_buf + buf.substring(offset + value.length * 2, buf.length);
}

function place_word_array(buf, offset, arr) {
    for (var idx = 0; idx < arr.length; idx++) {
        buf = place_word(buf, offset + idx * 2, arr[idx]);
    }
    return buf;
}

function place_buffer(buf, length) {
    var obj = {};
    while (buf.length % 0x10 !== 0) {
        buf += '\x00';
    }
    obj.addr = buf.length;

    for (var i = 0; i < length; i++) {
        buf += '\x00';
    }
    obj.buf = buf;
    return obj;
}

// en/decryption

function encrypt(buf, key) {
    var bf, sha1, len;
    bf   = ncrypto.createCipheriv('bf-ecb', key, '');
    sha1 = ncrypto.createHash('sha1');

    sha1.update(buf);
    buf += sha1.digest().toString('binary');
    len = buf.length;
    buf = pad(buf, 8);
    buf = byteswap(buf);
    bf.write(buf, 'binary');
    buf = bf.read().toString('binary');
    buf = byteswap(buf);
    buf += pack_int4_be(len);
    return buf;
}

function decrypt(buf, key) {
    var bf, len;
    bf  = ncrypto.createDecipheriv('bf-ecb', key, '');

    len = unpack_int4_be(buf.substring(buf.length-4, buf.length));
    if (len === 0) { return ''; }
    buf = buf.substring(0, buf.length-4);
    buf = byteswap(buf);
    bf.write(buf, 'binary');
    buf = bf.read();
    if (bf === null) {
        return '';
    }
    buf = buf.toString('binary');
    buf = byteswap(buf);
    buf = buf.substring(0, len);
    return buf;
}

// parser functions

function parse_text(mib, offset) {
    var base_addr = read_dword(mib, offset),
        lang_array = [],
        addr, s_addr, lang, t_array1, t_array2, i, j;

    t_array1 = read_dword_array(mib, base_addr, 5);
    for (i = 0; i < t_array1.length; i++) {
        addr = t_array1[i];
        if (addr === 0x00) {
            break;
        }
        lang = [];
        t_array2 = read_dword_array(mib, addr, 7);
        for (j = 0; j < t_array2.length; j++) {
            s_addr = t_array2[j];
            lang.push(read_string(mib, s_addr));
        }
        lang_array.push(lang);
    }
    return lang_array;
}

function parse_objective(mib, offset){
    var objective = {};
    objective.type      = read_dword(mib, offset);
    objective.target_id = read_word(mib, offset + 4);
    objective.qty       = read_word(mib, offset + 6);
    return objective;
}

function parse_supplies(mib) {
    var base_addr = read_dword(mib, 0x08),
        supply_table = [],
        idx = 0,
        item_table_idx,
        item_table_length,
        item_table_addr,
        item_table,
        item,
        i;

    while (idx < 100) {
        item_table_idx = read_byte(mib, base_addr + idx * 8);
        if (item_table_idx == 0xFF) {
            break;
        }
        item_table_length = read_byte(mib, base_addr + idx * 8 + 1);
        item_table_addr   = read_dword(mib, base_addr + idx * 8 + 4);
        item_table        = [];

        for (i = 0; i < item_table_length; i++) {
            item = {};
            item.item_id = read_word(mib, item_table_addr + i * 4);
            item.qty     = read_word(mib, item_table_addr + i * 4 + 2);
            if (item.item_id === 0) {
                break;
            }
            item_table.push(item);
        }
        supply_table.push(item_table);
        idx++;
    }
    return supply_table;
}

function parse_refills(mib) {
    var refills = [{},{}];
    for (var i = 0; i < 2; i++) {
        refills[i].box       = read_byte(mib, 0x0C + 8 * i);
        refills[i].condition = read_byte(mib, 0x0D + 8 * i);
        refills[i].monster   = read_byte(mib, 0x0E + 8 * i);
        refills[i].qty       = read_byte(mib, 0x10 + 8 * i);
    }
    return refills;
}

function parse_loot(mib, offset) {
    var base_addr = read_dword(mib, offset);
    if (base_addr === 0x00) {
        return [{flag: 0x8000, items: []}];
    }
    var loot_table = [],
        idx = 0,
        item_table_val,
        item_table_addr,
        item_table,
        item_idx,
        loot;

    while (idx < 100) {
        item_table_val = read_dword(mib, base_addr + idx * 8);
        if (item_table_val === 0xFFFF || item_table_val === 0x0000) {
            break;
        }

        item_table_addr = read_dword(mib, base_addr + idx * 8 + 4);
        item_table      = [];
        item_idx        = 0;

        while (item_idx < 100) {
            item_chance = read_word(mib, item_table_addr + item_idx * 6);
            if (item_chance === 0xFFFF) {
                break;
            }
            item = {};
            item.chance  = read_word(mib, item_table_addr + item_idx * 6);
            item.item_id = read_word(mib, item_table_addr + item_idx * 6 + 2);
            item.qty     = read_word(mib, item_table_addr + item_idx * 6 + 4);
            item_table.push(item);
            item_idx++;
        }
        loot = {};
        loot.flag  = item_table_val;
        loot.items = item_table;
        loot_table.push(loot);
        idx++;
    }
    if (loot_table.length === 0) {
        loot_table.push({flag: 0x8000, items: []});
    }
    return loot_table;
}

function parse_monster(mib, offset) {
    var monster = {};
    monster.monster_id = read_dword(mib, offset + 0x00);
    monster.qty        = read_dword(mib, offset + 0x04);
    monster.condition  = read_byte(mib, offset + 0x08);
    monster.area       = read_byte(mib, offset + 0x09);
    monster.crashflag  = read_byte(mib, offset + 0x0a);
    monster.special    = read_byte(mib, offset + 0x0b);
    monster.unk2       = read_byte(mib, offset + 0x0c);
    monster.unk3       = read_byte(mib, offset + 0x0d);
    monster.unk4       = read_byte(mib, offset + 0x0e);
    monster.infection  = read_byte(mib, offset + 0x0f);
    monster.x          = read_float(mib, offset + 0x10);
    monster.y          = read_float(mib, offset + 0x14);
    monster.z          = read_float(mib, offset + 0x18);
    monster.x_rot      = read_dword(mib, offset + 0x1c);
    monster.y_rot      = read_dword(mib, offset + 0x20);
    monster.z_rot      = read_dword(mib, offset + 0x24);
    return monster;
}

function parse_large_monster_table(mib) {
    var base_addr         = read_dword(mib, 0x28),
        top_monster_array = [];

    read_dword_array_until_zero(mib, base_addr).forEach(function (monster_array_addr) {
        var monster_array     = [],
            monster_array_idx = 0,
            monster_id,
            monster;
        while (monster_array_idx < 5) {
            monster_id = read_dword(mib, monster_array_addr + monster_array_idx * 0x28);
            if (monster_id === -1) {
                break;
            }
            monster = parse_monster(mib, monster_array_addr + monster_array_idx * 0x28);
            monster_array.push(monster);
            monster_array_idx++;
        }
        top_monster_array.push(monster_array);
    });
    return top_monster_array;
}

function parse_small_monster_table(mib) {
    var base_addr           = read_dword(mib, 0x2c),
        small_monster_table = [];

    read_dword_array_until_zero(mib, base_addr).forEach(function (top_addr) {
        small_monster_table.push([]);
        read_dword_array_until_zero(mib, top_addr).forEach(function (addr) {
            var monster_array     = [],
                monster_array_idx = 0,
                monster_id,
                monster;
            while (monster_array_idx < 100) {
                monster_id = read_dword(mib, addr + monster_array_idx * 0x28);
                if (monster_id === -1) {
                    break;
                }
                monster = parse_monster(mib, addr + monster_array_idx * 0x28);
                monster_array.push(monster);
                monster_array_idx++;
            }
            small_monster_table[small_monster_table.length - 1].push(monster_array);
        });
    });
    return small_monster_table;
}

function parse_unstable_monster_table(mib) {
    var base_addr                  = read_dword(mib, 0x30),
        unstable_monster_table     = [],
        unstable_monster_table_idx = 0,
        chance,
        monster;

    while (unstable_monster_table_idx < 100) {
        chance = read_word(mib, base_addr + unstable_monster_table_idx * 0x2c);
        if (chance === 0xFFFF) {
            break;
        }
        monster = parse_monster(mib, base_addr + unstable_monster_table_idx * 0x2c + 4);
        unstable_monster_table.push({chance: chance, monster: monster});
        unstable_monster_table_idx++;
    }
    return unstable_monster_table;
}

function parse_small_meta(mib, offset) {
    var meta = {};
    meta.size       = read_word(mib, offset);
    meta.unk0       = read_byte(mib, offset + 1);
    meta.hp         = read_byte(mib, offset + 3);
    meta.atk        = read_byte(mib, offset + 4);
    meta.break_res  = read_byte(mib, offset + 5);
    meta.stamina    = read_byte(mib, offset + 6);
    meta.unk2       = read_byte(mib, offset + 7);
    return meta;
}

function parse_meta(mib, offset) {
    var meta = {};
    meta.size       = read_word(mib, offset);
    meta.size_var   = read_byte(mib, offset + 2);
    meta.hp         = read_byte(mib, offset + 3);
    meta.atk        = read_byte(mib, offset + 4);
    meta.break_res  = read_byte(mib, offset + 5);
    meta.stamina    = read_byte(mib, offset + 6);
    meta.status_res = read_byte(mib, offset + 7);
    return meta;
}

function parse_meta_table(mib) {
    var base_addr  = 0x34,
        meta_table = [];
    for (var idx = 0; idx < 5; idx++) {
        meta_table.push(parse_meta(mib, base_addr + idx * 8));
    }
    return meta_table;
}

function parse_small_monster_conditions(mib) {
    var base_addr = 0x64,
        conditions = [],
        condition;
    for (var i = 0; i < 2; i++) {
        condition = {};
        condition.type   = read_byte(mib, base_addr + 0 + 8 * i);
        condition.target = read_word(mib, base_addr + 4 + 8 * i);
        condition.qty    = read_byte(mib, base_addr + 6 + 8 * i);
        condition.group  = read_byte(mib, base_addr + 7 + 8 * i);
        conditions.push(condition);
    }
    return conditions;
}

function parse_mib(mib) {
    var quest = {};

    // console.log('parsing static header');
    var header_offset      = read_dword(mib, 0x0) - 0xA0;
    quest.version          = read_block(mib, 0x04, 4);
    quest.hrp              = read_dword(mib, 0x74);
    quest.hrp_reduction    = read_dword(mib, 0x78);
    quest.hrp_sub          = read_dword(mib, 0x7C);
    quest.intruder_timer   = read_byte(mib, 0x80);
    quest.intruder_chance  = read_byte(mib, 0x82);
    // Spawn counter 0x84
    quest.gather_rank      = read_byte(mib, 0x89);
    quest.carve_rank       = read_byte(mib, 0x8A);
    quest.monster_ai       = read_byte(mib, 0x8B);
    quest.spawn_area       = read_byte(mib, 0x8C);
    quest.arena_fence      = read_byte(mib, 0x8D);
    quest.fence_state      = read_byte(mib, 0x8E);
    quest.fence_uptime     = read_byte(mib, 0x8F);
    quest.fence_cooldown   = read_byte(mib, 0x90);

    // console.log('parsing dynamic header');
    quest.quest_type       = read_byte(mib, header_offset + 0xA0);
    quest.huntathon_flag   = read_bit(mib, header_offset + 0xA1, 0);
    quest.intruder_flag    = read_bit(mib, header_offset + 0xA1, 1);
    quest.repel_flag       = read_bit(mib, header_offset + 0xA1, 2);
    quest.unknown0_flag    = read_bit(mib, header_offset + 0xA1, 3); // used for steak your ground

    quest.unknown1_flag    = read_bit(mib, header_offset + 0xA2, 0); // probably for dialog, used for 714 the hero and the captains trap, 1001 death of thousand cuts
    quest.harvest_flag     = read_bit(mib, header_offset + 0xA2, 1);
    quest.challenge_flag   = read_bit(mib, header_offset + 0xA2, 2);
    quest.unknown2_flag    = read_bit(mib, header_offset + 0xA2, 3); // not used
    quest.kushala_flag     = read_bit(mib, header_offset + 0xA2, 4); // used for wind of discords
    quest.unknown4_flag    = read_bit(mib, header_offset + 0xA2, 5); // not used
    quest.sub_flag         = read_bit(mib, header_offset + 0xA2, 6);
    quest.three_obj_flag   = read_bit(mib, header_offset + 0xA2, 7);

    quest.unknown5_flag    = read_bit(mib, header_offset + 0xA3, 0);
    quest.advanced_flag    = read_bit(mib, header_offset + 0xA3, 1);
    quest.unknown6_flag    = read_bit(mib, header_offset + 0xA3, 2); // used heavily dont know
    quest.ship_integrity   = read_bit(mib, header_offset + 0xA3, 3);

    quest.fee              = read_dword(mib, header_offset + 0xA4);
    quest.reward_main      = read_dword(mib, header_offset + 0xA8);
    quest.reward_reduction = read_dword(mib, header_offset + 0xAC);
    quest.reward_sub       = read_dword(mib, header_offset + 0xB0);
    quest.time             = read_dword(mib, header_offset + 0xB4);
    quest.intruder_chance2 = read_dword(mib, header_offset + 0xB8);

    // console.log('parsing text');
    quest.text             = parse_text(mib, header_offset + 0xBC);

    quest.quest_id         = read_word(mib, header_offset + 0xC0);
    quest.quest_rank       = read_word(mib, header_offset + 0xC2);
    quest.map_id           = read_byte(mib, header_offset + 0xC4);
    quest.requirements     = [0,0];
    quest.requirements[0]  = read_byte(mib, header_offset + 0xC5);
    quest.requirements[1]  = read_byte(mib, header_offset + 0xC6);

    quest.objective_amount = read_byte(mib, header_offset + 0xCB);
    quest.objectives       = [0,0];
    quest.objectives[0]    = parse_objective(mib, header_offset + 0xCC);
    quest.objectives[1]    = parse_objective(mib, header_offset + 0xD4);
    quest.objective_sub    = parse_objective(mib, header_offset + 0xDC);

    // console.log('parsing pictures');
    quest.pictures         = read_word_array(mib, header_offset + 0xE8, 5);

    // console.log('parsing supplies');
    quest.supplies = parse_supplies(mib);
    // console.log('parsing refills');
    quest.refills  = parse_refills(mib);

    // console.log('parsing loot a');
    quest.loot_a   = parse_loot(mib, 0x1C);
    // console.log('parsing loot b');
    quest.loot_b   = parse_loot(mib, 0x20);
    // console.log('parsing loot c');
    quest.loot_c   = parse_loot(mib, 0x24);

    // console.log('parsing small monster conditions');
    quest.small_monster_conditions = parse_small_monster_conditions(mib);

    // console.log('parsing large monster');
    quest.large_monster_table    = parse_large_monster_table(mib);
    // console.log('parsing small monster');
    quest.small_monster_table    = parse_small_monster_table(mib);
    // console.log('parsing unstable monster');
    quest.unstable_monster_table = parse_unstable_monster_table(mib);

    // console.log('parsing meta');
    quest.large_meta_table = parse_meta_table(mib);
    quest.small_meta       = parse_small_meta(mib, 0x5c);

    return quest;
}

// export functions

function export_objective(out, offset, objective) {
    out = place_dword(out, offset, objective.type);
    out = place_dword(out, offset+4, objective.target_id);
    out = place_dword(out, offset+6, objective.qty);
    return out;
}

function export_supplies(out, offset, supplies) {
    var top_table = [],
        table_idx = 0;
    // place item lists
    supplies.forEach(function (table) {
        var length = table.length,
            obj = place_buffer(out, length * 4),
            addr = obj.addr,
            item;
        out = obj.buf;
        for (var idx = 0; idx < length; idx++) {
            item = table[idx];
            out = place_word(out, addr + idx * 4, item.item_id);
            out = place_word(out, addr + idx * 4 + 2, item.qty);
        }
        top_table.push([table_idx, length, addr]);
        table_idx++;
    });
    // place top table
    var obj = place_buffer(out, top_table.length * 8),
        addr = obj.addr;
    out = obj.buf;
    for (var idx = 0; idx < top_table.length; idx++) {
        out = place_byte(out, addr + idx * 8, top_table[idx][0]);
        out = place_byte(out, addr + idx * 8 + 1, top_table[idx][1]);
        out = place_dword(out, addr + idx * 8 + 4, top_table[idx][2]);
    }
    // write address of top_table to header
    out += '\xFF';
    out = place_word(out, offset, addr);
    return out;
}

function export_refills(out, offset, refills) {
    for (var i = 0; i < 2; i++) {
        out = place_byte(out, offset + 0 + 8 * i, refills[i].box);
        out = place_byte(out, offset + 1 + 8 * i, refills[i].condition);
        out = place_byte(out, offset + 2 + 8 * i, refills[i].monster);
        out = place_byte(out, offset + 4 + 8 * i, refills[i].qty);
    }
    return out;
}


function export_loot(out, offset, loot) {
    var top_table = [];
    // place item lists
    loot.forEach(function (table) {
        var table_length = table.items.length,
            obj = place_buffer(out, table_length * 6),
            addr = obj.addr;
        out = obj.buf;
        for (var idx = 0; idx < table_length; idx++) {
            out = place_word(out, addr + idx * 6, table.items[idx].chance);
            out = place_word(out, addr + idx * 6 + 2, table.items[idx].item_id);
            out = place_word(out, addr + idx * 6 + 4, table.items[idx].qty);
        }
        out += '\xFF\xFF';
        top_table.push([table.flag, addr]);
    });
    // place top table
    var obj = place_buffer(out, top_table.length * 8),
        addr = obj.addr;
    out = obj.buf;
    for (var idx = 0; idx < top_table.length; idx++) {
        out = place_word(out, addr + idx * 8, top_table[idx][0]);
        out = place_dword(out, addr + idx * 8 + 4, top_table[idx][1]);
    }
    out += '\xFF\xFF';
    // write address of top_table to header
    out = place_dword(out, offset, addr);
    return out;
}

function export_monster(out, offset, monster) {
    out = place_dword(out, offset + 0x00, monster.monster_id);
    out = place_dword(out, offset + 0x04, monster.qty);
    out = place_byte(out, offset + 0x08, monster.condition);
    out = place_byte(out, offset + 0x09, monster.area);
    out = place_byte(out, offset + 0x0a, monster.crashflag);
    out = place_byte(out, offset + 0x0b, monster.special);
    out = place_byte(out, offset + 0x0c, monster.unk2);
    out = place_byte(out, offset + 0x0d, monster.unk3);
    out = place_byte(out, offset + 0x0e, monster.unk4);
    out = place_byte(out, offset + 0x0f, monster.infection);
    out = place_float(out, offset + 0x10, monster.x);
    out = place_float(out, offset + 0x14, monster.y);
    out = place_float(out, offset + 0x18, monster.z);
    out = place_dword(out, offset + 0x1c, monster.x_rot);
    out = place_dword(out, offset + 0x20, monster.y_rot);
    out = place_dword(out, offset + 0x24, monster.z_rot);
    return out;
}

function export_large_monster_table(out, offset, large_monster_table) {
    var top_table = [];
    // place monster lists
    large_monster_table.forEach(function (table) {
        var obj = place_buffer(out, table.length * 0x28),
            addr = obj.addr;
        out = obj.buf;
        for (var idx = 0; idx < table.length; idx++) {
            out = export_monster(out, addr + idx * 0x28, table[idx]);
        }
        out += '\xFF\xFF\xFF\xFF';
        out += '\x00\x00\x00\x00';
        out += '\xFF';
        top_table.push(addr);
    });
    // place top_table
    var obj = place_buffer(out, top_table.length * 4),
        addr = obj.addr;
    out = obj.buf;
    for (var idx = 0; idx < top_table.length; idx++) {
        out = place_dword(out, addr + idx * 4, top_table[idx]);
    }
    out += '\x00\x00\x00\x00';
    // write address of top_table to header
    out = place_dword(out, offset, addr);
    return out;
}

function export_small_monster_table(out, offset, small_monster_table) {
    var top_table = [];
    small_monster_table.forEach(function (subtable) {
        var sub_table = [];
        subtable.forEach(function (table) {
            // place monster list
            var obj = place_buffer(out, table.length * 0x28),
                addr = obj.addr;
            out = obj.buf;
            for (var idx = 0; idx < table.length; idx++) {
                out = export_monster(out, addr + idx * 0x28, table[idx]);
            }
            out += '\xFF\xFF\xFF\xFF';
            out += '\x00\x00\x00\x00';
            out += '\xFF';
            sub_table.push(addr);
        });
        // place sub_table
        var obj = place_buffer(out, sub_table.length * 4),
            addr = obj.addr;
        out = obj.buf;

        for (var idx = 0; idx < sub_table.length; idx++) {
            out = place_dword(out, addr + idx * 4, sub_table[idx]);
        }
        out += '\x00\x00\x00\x00';
        top_table.push(addr);
    });

    // place top_table
    var obj = place_buffer(out, top_table.length * 4),
        addr = obj.addr;
    out = obj.buf;

    for (var idx = 0; idx < top_table.length; idx++) {
        out = place_dword(out, addr + idx * 4, top_table[idx]);
    }
    out += '\x00\x00\x00\x00';
    // write adress of top_table to header
    out = place_dword(out, offset, addr);
    return out;
}

function export_unstable_monster_table(out, offset, unstable_monster_table) {
    // place monster lists
    var obj = place_buffer(out, unstable_monster_table.length * 0x2c),
        addr = obj.addr,
        entry;
    out = obj.buf;

    for (var idx = 0; idx < unstable_monster_table.length; idx++) {
        entry = unstable_monster_table[idx];
        out = place_word(out, addr + idx * 0x2c, entry.chance);
        out = export_monster(out, addr + idx * 0x2c + 4, entry.monster);
    }
    if (unstable_monster_table.length === 0) {
        out += '\xFF\xFF\x00\x00';
    }
    out += '\xFF\xFF\xFF\xFF';
    out += '\x00\x00\x00\x00';
    out += '\xFF';
    // write address of monster list to header
    out = place_dword(out, offset, addr);
    return out;
}

function export_small_meta(out, offset, meta) {
    out = place_word(out, offset, meta.size);
    out = place_byte(out, offset + 2, meta.unk0);
    out = place_byte(out, offset + 3, meta.hp);
    out = place_byte(out, offset + 4, meta.atk);
    out = place_byte(out, offset + 5, meta.break_res);
    out = place_byte(out, offset + 6, meta.stamina);
    out = place_byte(out, offset + 7, meta.status_res);
    return out;
}

function export_meta(out, offset, meta) {
    out = place_word(out, offset, meta.size);
    out = place_byte(out, offset + 2, meta.size_var);
    out = place_byte(out, offset + 3, meta.hp);
    out = place_byte(out, offset + 4, meta.atk);
    out = place_byte(out, offset + 5, meta.break_res);
    out = place_byte(out, offset + 6, meta.stamina);
    out = place_byte(out, offset + 7, meta.status_res);
    return out;
}

function export_meta_table(out, offset, meta_table) {
    for (var idx = 0; idx < 5; idx++) {
        out = export_meta(out, offset + idx * 8, meta_table[idx]);
    }
    return out;
}

function export_text(out, lang) {
    var lang_table = [];
    // place strings
    lang.forEach(function (text) {
        var obj = place_buffer(out, text.length * 2),
            addr = obj.addr;
        out = obj.buf;
        out = place_string(out, addr, text);
        out += '\x00\x00';
        lang_table.push(addr);
    });
    // place lang_table
    var obj = place_buffer(out, lang_table * 4),
        addr = obj.addr;
    out = obj.buf;
    for (var idx = 0; idx < lang_table.length; idx++) {
        out = place_dword(out, addr + idx * 4, lang_table[idx]);
    }
    return {buf: out, addr: addr};
}

function export_top_text(out, addresses) {
    var obj = place_buffer(out, addresses.length * 4),
        addr = obj.addr;
        out = obj.buf;
    for (var idx = 0; idx < addresses.length; idx++) {
        out = place_dword(out, addr + idx * 4, addresses[idx]);
    }
    out += '\x00\x00\x00\x00';
    return {buf: out, addr: addr};
}

function export_small_monster_conditions(out, offset, conditions) {
    for (var i = 0; i < 2; i++) {
        out = place_byte(out, offset + 0 + 8 * i, conditions[i].type);
        out = place_word(out, offset + 4 + 8 * i, conditions[i].target);
        out = place_byte(out, offset + 6 + 8 * i, conditions[i].qty);
        out = place_byte(out, offset + 7 + 8 * i, conditions[i].group);
    }
    return out;
}

function export_header(out, offset, quest) {
    var header_buf = place_buffer(out, 0x60);
    out = header_buf.buf;
    out = place_dword(out, offset, header_buf.addr);

    var header_offset = header_buf.addr - 0xA0;

    out = place_byte(out, header_offset + 0xA0, quest.quest_type);
    out = place_bit(out, header_offset + 0xA1, 0, quest.huntathon_flag);
    out = place_bit(out, header_offset + 0xA1, 1, quest.intruder_flag);
    out = place_bit(out, header_offset + 0xA1, 2, quest.repel_flag);
    out = place_bit(out, header_offset + 0xA1, 3, quest.unknown0_flag); // used for steak your ground

    out = place_bit(out, header_offset + 0xA2, 0, quest.unknown1_flag); // probably for dialog, used for 714 the hero and the captains trap, 1001 death of thousand cuts
    out = place_bit(out, header_offset + 0xA2, 1, quest.harvest_flag);
    out = place_bit(out, header_offset + 0xA2, 2, quest.challenge_flag);
    out = place_bit(out, header_offset + 0xA2, 3, quest.unknown2_flag); // not used
    out = place_bit(out, header_offset + 0xA2, 4, quest.kushala_flag); // used for wind of discords
    out = place_bit(out, header_offset + 0xA2, 5, quest.unknown4_flag); // not used
    out = place_bit(out, header_offset + 0xA2, 6, quest.sub_flag);
    out = place_bit(out, header_offset + 0xA2, 7, quest.three_obj_flag);

    out = place_bit(out, header_offset + 0xA3, 0, quest.unknown5_flag);
    out = place_bit(out, header_offset + 0xA3, 1, quest.advanced_flag);
    out = place_bit(out, header_offset + 0xA3, 2, quest.unknown6_flag); // used heavily dont know
    out = place_bit(out, header_offset + 0xA3, 3, quest.ship_integrity);

    out = place_dword(out, header_offset + 0xA4, quest.fee);
    out = place_dword(out, header_offset + 0xA8, quest.reward_main);
    out = place_dword(out, header_offset + 0xAC, quest.reward_reduction);
    out = place_dword(out, header_offset + 0xB0, quest.reward_sub);
    out = place_dword(out, header_offset + 0xB4, quest.time);
    out = place_dword(out, header_offset + 0xB8, quest.intruder_chance2);
    out = place_word(out, header_offset + 0xC0, quest.quest_id);
    out = place_word(out, header_offset + 0xC2, quest.quest_rank);
    out = place_byte(out, header_offset + 0xC4, quest.map_id);
    out = place_byte(out, header_offset + 0xC5, quest.requirements[0]);
    out = place_byte(out, header_offset + 0xC6, quest.requirements[1]);

    out = place_byte(out, header_offset + 0xCB, quest.objective_amount);
    out = export_objective(out, header_offset + 0xCC, quest.objectives[0]);
    out = export_objective(out, header_offset + 0xD4, quest.objectives[1]);
    out = export_objective(out, header_offset + 0xDC, quest.objective_sub);
    out = place_word_array(out, header_offset + 0xE8, quest.pictures);

    return {buf:out, addr: header_buf.addr};
}

function export_mib(quest) {
    var out = '';

    out = place_buffer(out, 0xA0).buf;
    out = place_block(out, 0x04, quest.version);
    out = place_byte(out, 0x0C, quest.refill1);
    out = place_byte(out, 0x0D, quest.refill2);

    out = export_meta_table(out, 0x34, quest.large_meta_table);
    out = export_small_meta(out, 0x5c, quest.small_meta);
    out = export_small_monster_conditions(out, 0x64, quest.small_monster_conditions);

    out = place_dword(out, 0x74, quest.hrp);
    out = place_dword(out, 0x78, quest.hrp_reduction);
    out = place_dword(out, 0x7C, quest.hrp_sub);

    out = place_byte(out, 0x80, quest.intruder_timer);
    out = place_byte(out, 0x82, quest.intruder_chance);
    out = place_byte(out, 0x89, quest.gather_rank);
    out = place_byte(out, 0x8A, quest.carve_rank);
    out = place_byte(out, 0x8B, quest.monster_ai);
    out = place_byte(out, 0x8C, quest.spawn_area);
    out = place_byte(out, 0x8D, quest.arena_fence);
    out = place_byte(out, 0x8E, quest.fence_state);
    out = place_byte(out, 0x8F, quest.fence_uptime);
    out = place_byte(out, 0x90, quest.fence_cooldown);



    var todo = [0,1,2,3,4,5,6,7,8,9,10,11,12,13];
    var rand_todo, temp;
    var text_addresses = [0,0,0,0,0];
    var header_addr = 0;

    while (todo.length > 0) {
        rand_todo = todo.splice(Math.floor(Math.random() * todo.length), 1)[0];
        switch (rand_todo) {
            case 0:
                temp = export_header(out, 0x00, quest);
                out = temp.buf;
                header_addr = temp.addr;
                break;
            case 1:
                temp = export_text(out, quest.text[0]);
                out = temp.buf;
                text_addresses[0] = temp.addr;
                break;
            case 2:
                temp = export_text(out, quest.text[1]);
                out = temp.buf;
                text_addresses[1] = temp.addr;
                break;
            case 3:
                temp = export_text(out, quest.text[2]);
                out = temp.buf;
                text_addresses[2] = temp.addr;
                break;
            case 4:
                temp = export_text(out, quest.text[3]);
                out = temp.buf;
                text_addresses[3] = temp.addr;
                break;
            case 5:
                temp = export_text(out, quest.text[4]);
                out = temp.buf;
                text_addresses[4] = temp.addr;
                break;
            case 6:
                out = export_supplies(out, 0x08, quest.supplies);
                break;
            case 7:
                out = export_refills(out, 0x0C, quest.refills);
                break;
            case 8:
                out = export_loot(out, 0x1C, quest.loot_a);
                break;
            case 9:
                out = export_loot(out, 0x20, quest.loot_b);
                break;
            case 10:
                out = export_loot(out, 0x24, quest.loot_c);
                break;
            case 11:
                out = export_large_monster_table(out, 0x28, quest.large_monster_table);
                break;
            case 12:
                out = export_small_monster_table(out, 0x2c, quest.small_monster_table);
                break;
            case 13:
                out = export_unstable_monster_table(out, 0x30, quest.unstable_monster_table);
                break;
        }
    }
    temp = export_top_text(out, text_addresses);
    out = temp.buf;
    out = place_dword(out, header_addr + 0xBC - 0xA0, temp.addr);

    return out;
}


app.factory('$mib', function () {
    return {
        decrypt: function (mib) {
            var dec_mib;
            if (mib.substring(4,8) == magic) {
                return mib;
            }
            dec_mib = decrypt(mib, jp_key);
            if (dec_mib.substring(4,8) == magic) {
                return dec_mib;
            }
            dec_mib = decrypt(mib, us_key);
            if (dec_mib.substring(4,8) == magic) {
                return dec_mib;
            }

            dec_mib = decrypt(mib, kr_key);
            if (dec_mib.substring(4,8) == magic) {
                return dec_mib;
            }

            dec_mib = decrypt(mib, tw_key);
            if (dec_mib.substring(4,8) == magic) {
                return dec_mib;
            }
            return null;
        },

        encrypt: function (local, data) {
            var key;
            switch (local) {
                case "none":
                case "":
                    return data;
                case 'us':
                case 'eu':
                    key = us_key;
                    break;
                case 'kr':
                    key = kr_key;
                    break;
                case 'nihon':
                    key = jp_key;
                    break;
                case 'tw':
                    key = tw_key;
                    break;
                default:
                    key = us_key;
            }
            return encrypt(data, key);
        },

        parse: parse_mib,
        export: export_mib
    };
});

})();
