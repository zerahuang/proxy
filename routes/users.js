var express = require('express');
var router = express.Router();
var config = require('../config');
var mysql = require('mysql');
var pool = mysql.createPool(process.platform.indexOf("win") != -1 ? config.dbconfig_local : config.dbconfig_idc);
var fs = require("fs");
var cp = require('child_process');
var os = require('os');

/* GET users listing. */
router.get('*', function(req, res, next) {
  // res.send(req.url);
  // 根据users/aa路由
  switch (req.url.replace(/\?.+/, "").replace(/^\//, "")) {
    case "start":
      start(req, res, next);
      break;
    case "stop":
      stop(req, res, next);
      break;
    case "cwight":
      cwight(req, res, next);
      break;
    case "asyncip":
      asyncip(req, res, next);
      break;
    case "pm2restart":
      pm2restart(req, res, next);
      break;
    case "hmstatus":
      hmstatus(req, res, next);
      break;
    default:
      next();
  }
});

// 重启网卡，并根据权重，写入DB
function start (req, res, next) {
    // res.jsonp({aa: 11});
    // pool.query("show tables", function (err, data) {
    //     res.jsonp({err, data});
    // });
    // 先把之前的ip去掉
    stop({
        query: {
            name: fs.readFileSync('name.txt').toString().replace(/\n$/, '')
        }
    }, {
        jsonp: function (data) {
            // if (data.ret == 0) {
                // 1分钟之后，切换ip
                if (process.platform.indexOf("win") != -1 || req.query.type == 1) {
                    doUpdate(getIPAdress());
                } else {
                    setTimeout(function () {
                        cp.exec('pppoe-stop', function (err, stdout, stderr) {
                            console.log('pppoe-stop:', new Date().toLocaleString(), err, stdout, stderr);
                            cp.exec('pppoe-start', function (err1, stdout1, stderr1) {
                                console.log('pppoe-start:', new Date().toLocaleString(), err1, stdout1, stderr1);
                                // console.log(getIPAdress());
                                // 开始写入db
                                doUpdate(getIPAdress());
                            });
                        });
                    }, 1 * 60 * 1000);
                }
            // } else {
            //     // 去掉失败了
            //     res.jsonp({ret: 1, msg: "close error"});
            // }
        }
    });

    // 更新
    function doUpdate (nowip) {
        pool.query("select * from basicinfo where b_key = ?", ["ips"] , function (err, data) {
            // 判断是否存在
            if (err || (data && data.length == 0)) {
                // 有问题
                res.jsonp({ret: 3, msg: "query error"});
            } else {
                try {
                    var ips = JSON.parse(data[0].b_value);
                    // 判断是否有
                    if (!ips.some(function (ceil, index) {
                        var _p = ceil.p || "3000";
                        if (ceil.ip == nowip && _p == global.dePort) {
                            return true;
                        }
                    })) {
                        ips.push({
                            ip: nowip,
                            w: +fs.readFileSync('weight.txt').toString(),
                            n: fs.readFileSync('name.txt').toString().replace(/\n$/, ''),
                            p: global.dePort
                        });
                    }
                    // 重新写入
                    pool.query("update basicinfo set b_value = ? where b_key = ?", [JSON.stringify(ips), "ips"], function (err1, data1) {
                        if (err1) {
                            res.jsonp({ret: 5, err: err1});
                        } else {
                            res.jsonp({ret: 0, data: ips});
                        }
                    });
                } catch(e) {
                    res.jsonp({ret: 4, msg: "parse error"});
                }
            }
        });
    }
}

// 移出DB
function stop (req, res, next) {
    // res.jsonp({aa: 22});
    // 需要有ip地址
    if (!req.query.name) {
        res.jsonp({ret: 1, msg: "param error"});
        return false;
    }
    pool.query("select * from basicinfo where b_key = ?", ["ips"] , function (err, data) {
        // 判断是否存在
        if (err || (data && data.length == 0)) {
            // 有问题
            res.jsonp({ret: 3, msg: "query error"});
        } else {
            try {
                var ips = JSON.parse(data[0].b_value);
                // 移除
                ips.some(function (ceil, index) {
                    var _p = ceil.p || "3000";
                    if (ceil.n.replace(/\n$/, '') == decodeURIComponent(req.query.name).replace(/\n$/, '') && _p == global.dePort) {
                        ips.splice(index, 1);
                        return true;
                    }
                });
                // 重新写入
                pool.query("update basicinfo set b_value = ? where b_key = ?", [JSON.stringify(ips), "ips"], function (err1, data1) {
                    if (err1) {
                        res.jsonp({ret: 5, err: err1});
                    } else {
                        res.jsonp({ret: 0, data: ips});
                    }
                });
            } catch(e) {
                res.jsonp({ret: 4, msg: "parse error"});
            }
        }
    });
}

// 改变权重，写入DB和config.txt
function cwight (req, res, next) {
    if (!(req.query.w && req.query.name)) {
        res.jsonp({ret: 1, msg: "param error"});
        return false;
    }
    // 写入config
    // var data = fs.readFileSync('weight.txt');
    fs.writeFile('weight.txt', req.query.w, function (err, data) {
        if (err) {
            res.jsonp({ret: 1, msg: "write error"});
        } else {
            // 还要写入db
            pool.query("select * from basicinfo where b_key = ?", ["ips"] , function (err, data) {
                // 判断是否存在
                if (err || (data && data.length == 0)) {
                    // 有问题
                    res.jsonp({ret: 3, msg: "query error"});
                } else {
                    try {
                        var ips = JSON.parse(data[0].b_value);
                        // 更新
                        ips.some(function (ceil, index) {
                            var _p = ceil.p || "3000";
                            if (ceil.n.replace(/\n$/, '') == decodeURIComponent(req.query.name).replace(/\n$/, '') && _p == global.dePort) {
                                ceil.w = +req.query.w;
                                return true;
                            }
                        });
                        // 重新写入
                        pool.query("update basicinfo set b_value = ? where b_key = ?", [JSON.stringify(ips), "ips"], function (err1, data1) {
                            if (err1) {
                                res.jsonp({ret: 5, err: err1});
                            } else {
                                res.jsonp({ret: 0, data: ips});
                            }
                        });
                    } catch(e) {
                        res.jsonp({ret: 4, msg: "parse error"});
                    }
                }
            });
        }
    });
    // res.jsonp({aa: data.toString()});
}

// 每隔2s同步一次，是否ip不一致
function asyncip (req, res, next) {
    start({
        query: {
            type: 1
        }
    }, {
        jsonp: function (data) {
            res.jsonp(data);
        }
    });
}

// PM2监控改动，自动重启
function pm2restart (req, res, next) {
    res.jsonp({ret: new Date().toGMTString()});
    // fs.writeFile('./pm2tostart/starttime.txt', new Date().toGMTString(), function () {});
    setTimeout(function () {
        var a = null;
        a.b;
    }, 10);
}

// 同步
function hmstatus (req, res, next) {
    global.hmng = req.query.hmstatus == 1;
    res.jsonp({ ret: new Date().toGMTString() });
}
// 获得ip
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

module.exports = router;
