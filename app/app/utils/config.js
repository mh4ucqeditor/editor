(function () {

var app      = angular.module('editor.utils.config', []),
    os       = require('os'),
    arch     = process.arch === 'ia32' ? 'ia32' : 'x64',
    platform = process.platform;

platform = platform.indexOf('win') === 0 ? 'win'
         : platform.indexOf('darwin') === 0 ? 'osx'
         : 'linux';

var version = {
    major: 2,
    minor: 1,
    patch: 6
};


app.factory('$config', [function () {
    var config = {
        version: version,
        versionString: 'v' + version.major + '.' + version.minor + '.' + version.patch,
        platform: {
            isOSX: platform === 'osx',
            isWindows: platform === 'win',
            isLinux: platform === 'linux',
            name: platform + '-' + arch,
            type: platform,
            arch: arch
        },
        addr: function () {
            var interfaces = os.networkInterfaces();
            var ret_addr = [];

            Object.keys(interfaces).forEach(function (net_interface) {
                interfaces[net_interface].forEach(function (addr) {
                    if (addr.internal === false && addr.family == "IPv4") {
                        ret_addr.push(addr.address);
                    }
                });
            });

            return ret_addr;
        },
        proxy_port: function (val) {
            if (val) {
                return localStorage.setItem('proxy_port', val);
            }
            return JSON.parse(localStorage.getItem('proxy_port')) || 8084;
        },
        userSettings: {
            set: function (key, value) {
                localStorage.setItem(key, JSON.stringify(value));
            },
            get: function (key) {
                return JSON.parse(localStorage.getItem(key));
            },
            defaults: function (key, value) {
                var def = JSON.parse(localStorage.getItem(key));
                if (def === null ) {
                    def = value;
                }
                localStorage.setItem(key, JSON.stringify(def));
            }
        }
    };

    return config;
}]);

})();
