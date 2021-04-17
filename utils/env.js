var os     = require('os');
var config = require('../config/config');
/**
 * 判断当前的环境
 * @author huangshaolu
 * @date   2016-03-02
 */
exports.getEnv = function () {
    //判断是否是window本地环境
    if (process.platform.indexOf("win") != -1) {
        return "local";
    } else {
        //判断是linux环境
        // if (getIPAdress() == config._config.devip) {
        //     //是dev环境
        //     return "dev";
        // } else if (getIPAdress() == config._config.gammaip) {
        //     //是dev环境
        //     return "gamma";
        // } else {
            //是idc环境
            return "idc";
        // }
    }
}

/**
 * 返回当前ip
 */
exports.getIp = function () {
    var ip = getIPAdress();
    return ip;
}

function getIPAdress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
}