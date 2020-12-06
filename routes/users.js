var express = require('express');
var router = express.Router();
var config = require('../config');
var mysql = require('mysql');
var pool = mysql.createPool(process.platform.indexOf("win") != -1 ? config.dbconfig_local : config.dbconfig_idc);
var fs = require("fs");

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
    case "pm2restart":
        pm2restart(req, res, next);
        break;
    default: next();
  }
});

// 重启网卡，并根据权重，写入DB
function start (req, res, next) {
    // res.jsonp({aa: 11});
    // pool.query("show tables", function (err, data) {
    //     res.jsonp({err, data});
    // });
    
}

// 移出DB
function stop (req, res, next) {
    // res.jsonp({aa: 22});
    // 需要有ip地址
    if (!req.query.ip) {
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
                    if (ceil.ip == req.query.ip) {
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
    if (!(req.query.w && req.query.ip)) {
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
                            if (ceil.ip == req.query.ip) {
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

// PM2监控改动，自动重启
function pm2restart (req, res, next) {
    res.jsonp({ret: new Date().toGMTString()});
    fs.writeFile('./pm2tostart/starttime.txt', new Date().toGMTString(), function () {});
}

module.exports = router;
