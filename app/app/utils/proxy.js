(function () {

var app    = angular.module('editor.utils.proxy', ['editor.utils.library', 'editor.utils.config', 'editor.utils.mib']),
    http   = require('http'),
    net    = require('net'),
    url    = require('url'),
    mapping  = {},
    re_local = /\/mh4g_([^\/_]+)_?/,
    re_lang  = /_(...)\./,
    re_type  = /\.(...)$/,
    re_file  = /\/([^\/]+[^_]...)(_...)?\....$/,
    re_otb   = /ot(\d{3})/;

var domains = ['goshawk.capcom.co.jp', 'goshawk4g.capcom.co.jp', 'corsair.capcom.co.jp', 'skyhawk.capcom.co.jp', 'viper.capcom.co.jp', 'crusader.capcom.co.jp'];

function http_proxy($config, $mib, $library) {
    return function (req, res) {
        var req_url = url.parse(req.url);

        if (req_url.hostname === "conntest.nintendowifi.net") {
            res.writeHead(200, {'x-organization': 'Nintendo'});
            return res.end();
        }

        if (domains.indexOf(req_url.hostname) < 0) {
            options = {
                hostname: req_url.hostname,
                port: req_url.port,
                path: req_url.path,
                auth: req_url.auth,
                method: req.method,
                headers: req.headers
            };
            var p_req = http.request(options);

            // send request
            p_req.on('socket', function () {
                req.pipe(p_req);
            });

            // receive request
            p_req.on('response', function (p_res) {
                res.writeHead(p_res.statusCode, p_res.headers);
                p_res.pipe(res);
            });

            p_req.on('error', function (err) {
                console.error(err);
                res.end('err');
            });
            return;
        }

        // console.log(req_url.path);
        var local = re_local.exec(req_url.path),
            lang  = re_lang.exec(req_url.path),
            type  = re_type.exec(req_url.path),
            file  = re_file.exec(req_url.path);

        if (local === null || type === null || file === null) {
            return res.end();
        }

        local = local[1];
        type = type[1];
        file  = file[1];

        // console.log(file);

        var message = '';
        if (type === 'txt') {
            switch (file) {
                case 'DLC_Info_Notice':
                    message = "1915070312|00|0|Custom Quest Editor " + $config.versionString + "|              by dasding\r\n";
                    break;
                case 'DLC_EventQuestInfo':
                    mapping = {};
                    $library.list().forEach(function (quest) {
                        if (quest.hosted && 60000 <= quest.json.quest_id && quest.json.quest_id < 61000) {
                            mapping[quest.json.quest_id] = quest.uuid;
                            message += $library.generateIndex(quest.json);
                        }
                    });
                    break;
                case 'DLC_ChallengeQuestInfo':
                    mapping = {};
                    $library.list().forEach(function (quest) {
                        if (quest.hosted && 61000 <= quest.json.quest_id && quest.json.quest_id < 62000) {
                            mapping[quest.json.quest_id] = quest.uuid;
                            message += $library.generateIndex(quest.json);
                        }
                    });
                    break;
                case 'DLC_EpisodeQuestInfo':
                    mapping = {};
                    var l = [];
                    $library.list().forEach(function (quest) {
                        var qid = quest.json.quest_id;
                        if (quest.hosted && 62000 <= qid && qid < 63000) {
                            mapping[qid] = quest.uuid;
                            if ((62100 <= qid && qid < 62200 && qid % 3 == 1) || (62200 <= qid && qid < 63000 && qid % 3 == 2)) {
                                message += $library.generateIndex(quest.json);
                                l.push(qid);
                            }
                        }
                    });
                    l.forEach(function (qid) {
                        if (!mapping[qid+1] || !mapping[qid+2]) {
                            message = "";
                        }
                    });
                    break;
                case 'DLC_EpisodeQuestInfo2':
                    $library.list().forEach(function (quest) {
                        var qid = quest.json.quest_id;
                        if (quest.hosted && 62000 <= qid && qid < 63000) {
                            if ((62100 <= qid && qid < 62200 && qid % 3 == 1) || (62200 <= qid && qid < 63000 && qid % 3 == 2)) {
                                message += ' | | | |\xe3\x80\x80|Episodic '+qid+'|101|101|101\r\n';
                            }
                        }
                    });
                    break;
                case 'DLC_OtomoInfo':
                    var idx = 0;
                    $library.list_otb().forEach(function (palico) {
                        if (palico.hosted) {
                            mapping[idx] = palico.uuid;
                            message += $library.generatePalicoIndex(palico.json, idx++);
                        }
                    });
                    break;
                default:
                    message = '\r\n';
            }
        }
        var uuid;
        if (type === 'mib') {
            var qid = parseInt(file.substring(1, file.length), 10);
            uuid = mapping[qid];
            if (!(isNaN(qid) || !uuid)) {
                message = $library.get(uuid).mib;
            } else {
                // console.log('mapping fail');
            }
        }
        if (type === 'otb') {
            var otb_idx = re_otb.exec(file);
            if (otb_idx) {
                otb_idx = parseInt(otb_idx[1], 10);
                uuid = mapping[otb_idx];
                if (!(isNaN(otb_idx) || !uuid)) {
                    message = $library.get(uuid).otb;
                }
            }

        }

        res.write($mib.encrypt(local, message), 'binary');
        res.end();
    };
}

function tcp_proxy(req, sock, head) {
    var options, p_sock;

    options = {
        host: req.url.split(':')[0],
        port: req.url.split(':')[1],
    };

    // if (!(options.host == "goshawk.capcom.co.jp" || options.host == "nasc.nintendowifi.net")) {
    //     return sock.end();
    // }

    p_sock = net.connect(options);

    p_sock.on('connect', function () {
        sock.write("HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n");
        p_sock.write(head);
        sock.pipe(p_sock).pipe(sock);
    });

    p_sock.on('error', function () {
        sock.end('err');
    });
}

app.factory('$proxy', ['$config', '$mib', '$library', function ($config, $mib, $library) {
    var proxyServer = http.createServer(http_proxy($config, $mib, $library)),
        proxy_running = false;
        proxyServer.on('connect', tcp_proxy);

    return {
        start: function (port, portChange) {
            if (!proxy_running) {
                proxyServer.removeAllListeners('error');
                proxyServer.on('error', function (e) {
                    if (e.code == 'EADDRINUSE') {
                        setTimeout(function () {
                            proxyServer.close();
                            port++;
                            portChange(port);
                            proxyServer.listen(port);
                        }, 500);
                    } else {
                        console.log(e);
                    }
                });
                proxyServer.listen(port);
                proxy_running = true;
            }
        },
        stop: function () {
            if (proxy_running) {
                proxy_running = false;
                proxyServer.close();
            }
        },
        status: function () {
            return proxy_running;
        }
    };
}]);

})();
