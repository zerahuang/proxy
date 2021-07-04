var request = require("request");
var os = require('os');
var fs = require('fs');
var basic = require("../model/basic");
var cp = require('child_process');

var _noipCount = 0;

function getIPAdress () {
    var interfaces = os.networkInterfaces();
    var _ips = [];
    for (var devName in interfaces) {
        if (devName != 'eth0') {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                    _ips.push(alias);
                }
            }
        }
    }
    if (_ips.length == 0) {
        return '';
    } else if (_ips.length == 1) {
        return _ips[0].address;
    } else {
        return Array.from(_ips, function (ceil) {
            return ceil.address;
        })
    }
}

// 执行任务
function dotask () {
    if (new Date().getHours() == 5) {
        // 5点钟，更新
        request("http://127.0.0.1:3000/routes/start", function (err, res, body) {
            console.log("do start:", new Date().toLocaleString(), body);
        });

        request("http://127.0.0.1:3001/routes/start", function (err, res, body) {
            console.log("do start1:", new Date().toLocaleString(), body);
        });
    }
}

function doasync () {
    // 判断是否需要重启，如果getIPAdress连续3次是空的，那就重启吧
    var nowip = getIPAdress();
    console.log(nowip, _noipCount);
    if (nowip instanceof Array || !/^\d+\.\d+\.\d+\.\d+$/.test(nowip)) {
        if (_noipCount >= 3) {
            _noipCount = 0;
            // 重启吧
            // 邮件通知一下
            // basic.mailme(fs.readFileSync('name.txt').toString().replace(/\n$/, '') + '重启', '代理机器要重启了');
            console.log("代理机器要重启了");
            
            setTimeout(function () {
                cp.exec('reboot');
            }, 3000);
        } else {
            // 不用重启，但是记时
            _noipCount++;
        }
        return false;
    }
    
    // request("http://127.0.0.1:3000/routes/asyncip", function (err, res, body) {
    //     console.log("do async:", new Date().toLocaleString(), body);
    // });
    var link = "http://onhit.cn/sanpk/tools-updateip?ip=" + nowip + "&n=" + encodeURIComponent(fs.readFileSync('name.txt').toString().replace(/\n$/, '')) + "&w=" + (+fs.readFileSync('weight.txt').toString()) + "&p=3000";
    // console.log(link);
    request(link, function (err, res, body) {
        console.log("do async:", new Date().toLocaleString(), body);
    });

    link = "http://onhit.cn/sanpk/tools-updateip?ip=" + nowip + "&n=" + encodeURIComponent(fs.readFileSync('name.txt').toString().replace(/\n$/, '')) + "&w=" + (+fs.readFileSync('weight.txt').toString()) + "&p=3001";
    // console.log(link);
    request(link, function (err, res, body) {
        console.log("do async1:", new Date().toLocaleString(), body);
    });
}
// 立即执行一次
// setTimeout(function () {
//     dotask();
// }, 30000);

// 1个小时执行一次
setInterval(dotask, 1000 * 60 * 60 * 1);

// 每隔2分钟，判断一次，是否本地ip与数据库ip不一致
setInterval(doasync, 1000 * 60 * 2);