var request = require("request");
var os = require('os');
var fs = require('fs');

function getIPAdress () {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        if (devName != 'eth0') {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                    return alias.address;
                }
            }
        }
    }
}

// 执行任务
function dotask () {
    if (new Date().getHours() == 5) {
        // 5点钟，更新
        request("http://127.0.0.1:3000/routes/start", function (err, res, body) {
            console.log("do start:", new Date().toLocaleString(), body);
        });
    }
}

function doasync () {
    // request("http://127.0.0.1:3000/routes/asyncip", function (err, res, body) {
    //     console.log("do async:", new Date().toLocaleString(), body);
    // });
    var link = "http://onhit.cn/sanpk/tools-updateip?ip=" + getIPAdress() + "&n=" + encodeURIComponent(fs.readFileSync('name.txt').toString().replace(/\n$/, '')) + "&w=" + (+fs.readFileSync('weight.txt').toString());
    // console.log(link);
    request(link, function (err, res, body) {
        console.log("do async:", new Date().toLocaleString(), body);
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