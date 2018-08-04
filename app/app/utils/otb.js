(function () {

var app = angular.module('editor.utils.otb', []),
    ncrypto = require('crypto'),
    us_key = 'AgK2DYheaCjyHGPB',
    jp_key = 'AgK2DYheaCjyHGP8',
    kr_key = 'AgK2DYheaOjyHGP8',
    tw_key = 'Capcom123 ',
    magic = '\x00\x00\x00\x00\x00\x00\x00\x00';

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
    while (buf.length % 0x4 !== 0) {
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
    // buf = buf.substring(0, buf.length-4);
    buf = byteswap(buf);
    bf.write(buf, 'binary');
    buf = bf.read();
    if (bf === null) {
        return '';
    }
    buf = buf.toString('binary');
    buf = byteswap(buf);
    buf = buf.substring(0, len-20);
    return buf;
}

// parser functions

function parse_otb(otb) {
    var palico = {};

    palico.level      = read_byte(otb, 0x08);
    palico.s00        = read_byte(otb, 0x09); // Always 00
    palico.s01        = read_byte(otb, 0x0A); // Always 01
    palico.ability    = read_byte(otb, 0x0B);
    palico.skill1     = read_byte(otb, 0x0C);
    palico.skill2     = read_byte(otb, 0x0D);
    palico.skill3     = read_byte(otb, 0x0E);
    palico.skillSig   = read_byte(otb, 0x0F);
    palico.skill4     = read_byte(otb, 0x10);
    palico.skill5     = read_byte(otb, 0x11);
    palico.teamAtk    = read_byte(otb, 0x12);
    palico.coat       = read_byte(otb, 0x13); // 0-5
    palico.clothing   = read_byte(otb, 0x14); // 0-1
    palico.voice      = read_byte(otb, 0x15); // 0-4
    palico.eyes       = read_byte(otb, 0x16); // 0-5
    palico.ears       = read_byte(otb, 0x17); // 0-2
    palico.tail       = read_byte(otb, 0x18); // 0-2
    palico.unk0       = read_byte(otb, 0x19);
    palico.unk1       = read_byte(otb, 0x1A);
    palico.unk2       = read_byte(otb, 0x1B);
    palico.coat_r     = read_byte(otb, 0x1C);
    palico.coat_g     = read_byte(otb, 0x1D);
    palico.coat_b     = read_byte(otb, 0x1E);
    palico.t1         = read_byte(otb, 0x1F);
    palico.clothing_r = read_byte(otb, 0x20);
    palico.clothing_g = read_byte(otb, 0x21);
    palico.clothing_b = read_byte(otb, 0x22);
    palico.t2         = read_byte(otb, 0x23);
    var text          = read_dword(otb, 0x24);
    palico.owner      = read_string(otb, read_dword(otb, text));
    palico.name       = read_string(otb, read_dword(otb, text + 4));
    palico.shout      = read_string(otb, read_dword(otb, text + 8));

    return palico;
}

function export_otb(palico) {
    var buf, out = '';

    out = place_buffer(out, 0x28).buf;
    out = place_byte(out, 0x08, palico.level);
    out = place_byte(out, 0x09, palico.s00);
    out = place_byte(out, 0x0A, palico.s01);
    out = place_byte(out, 0x0B, palico.ability);
    out = place_byte(out, 0x0C, palico.skill1);
    out = place_byte(out, 0x0D, palico.skill2);
    out = place_byte(out, 0x0E, palico.skill3);
    out = place_byte(out, 0x0F, palico.skillSig);
    out = place_byte(out, 0x10, palico.skill4);
    out = place_byte(out, 0x11, palico.skill5);
    out = place_byte(out, 0x12, palico.teamAtk);
    out = place_byte(out, 0x13, palico.coat); // 0-5
    out = place_byte(out, 0x14, palico.clothing); // 0-1
    out = place_byte(out, 0x15, palico.voice); // 0-4
    out = place_byte(out, 0x16, palico.eyes); // 0-5
    out = place_byte(out, 0x17, palico.ears); // 0-2
    out = place_byte(out, 0x18, palico.tail); // 0-2
    out = place_byte(out, 0x19, palico.unk0);
    out = place_byte(out, 0x1A, palico.unk1);
    out = place_byte(out, 0x1B, palico.unk2);
    out = place_byte(out, 0x1C, palico.coat_r);
    out = place_byte(out, 0x1D, palico.coat_g);
    out = place_byte(out, 0x1E, palico.coat_b);
    out = place_byte(out, 0x1F, palico.t1);
    out = place_byte(out, 0x20, palico.clothing_r);
    out = place_byte(out, 0x21, palico.clothing_g);
    out = place_byte(out, 0x22, palico.clothing_b);
    out = place_byte(out, 0x23, palico.t2);
    out = place_dword(out, 0x24, 0x28);
    out = place_buffer(out, 0x10).buf;

    buf = place_buffer(out, palico.owner.length * 2 + 2);
    out = buf.buf;
    out = place_string(out, buf.addr, palico.owner);
    out = place_dword(out, 0x28, buf.addr);

    buf = place_buffer(out, palico.name.length * 2 + 2);
    out = buf.buf;
    out = place_string(out, buf.addr, palico.name);
    out = place_dword(out, 0x2C, buf.addr);

    buf = place_buffer(out, palico.shout.length * 2 + 2);
    out = buf.buf;
    out = place_string(out, buf.addr, palico.shout);
    out = place_dword(out, 0x30, buf.addr);


    while (out.length < 0x80) {
        out += '\x00';
    }

    return out;
}


app.factory('$otb', function () {
    return {
        decrypt: function (otb) {
            var dec_otb;
            if (otb.substring(0,8) == magic) {
                return otb;
            }
            dec_otb = decrypt(otb, jp_key);
            if (dec_otb.substring(0,8) == magic) {
                return dec_otb;
            }
            dec_otb = decrypt(otb, us_key);
            if (dec_otb.substring(0,8) == magic) {
                return dec_otb;
            }

            dec_otb = decrypt(otb, kr_key);
            if (dec_otb.substring(0,8) == magic) {
                return dec_otb;
            }

            dec_otb = decrypt(otb, tw_key);
            if (dec_otb.substring(0,8) == magic) {
                return dec_otb;
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

        parse: parse_otb,
        export: export_otb
    };
});

})();
