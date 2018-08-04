var s = ".previewicon {";
s += "background-image: url(../img/sprite1.png);";
s += "background-repeat: no-repeat;";
s += "height: 36px;";
s += "width: 36px;";
s += "display: inline-block;";
s += "}";

var i, x, y;
for (i = 0; i < 14 * 7; i++) {
    x = (i % 7) * 36;
    y = Math.floor(i / 7) * 36;
    s += ".previewicon.idx" + i + " {";
    s += "background-position: -" + x + "px -" + y + "px;";
    s += "}";
}

s+= ".previewicon.idx98 {background-position: -360px -180px;}";

for (i = 0; i < 3 * 7 + 4; i++) {
    x = (i % 7) * 36 + 7 * 36 + 4;
    y = Math.floor(i / 7) * 36;
    s += ".previewicon.idx" + (i + 14*7 + 1) + " {";
    s += "background-position: -" + x + "px -" + y + "px;";
    s += "}";
}

console.log(s);
