// 引用dao
var http = require("http");
var https = require("https");
var url = require("url");
var async = require("async");
var request = require("request");
var charactorsDao = require("../dao/charactors");
var comicusersDao = require("../dao/comicusers");
var basic = require("../model/basic");

exports.notice = function (req, res, next) {
    // {
    //     attach: 'aaabbbaaaa',
    //     mchid: '1582003351',
    //     openid: 'o7LFAwUNQlX7U1-75bU1fZ2_4vsA',
    //     out_trade_no: '11111222223333',
    //     payjs_order_id: '2020032614101700754409729',
    //     return_code: '1',
    //     time_end: '2020-03-26 14:14:12',
    //     total_fee: '101',
    //     transaction_id: '4200000563202003267207476949',
    //     sign: '875456E4645664503DB12CCC8BB92B28' 
    // }
    var query = req.body.payjs_order_id ? req.body : req.query;
    console.log("支付成功啦！！！！！！！！", query);
    // 要获得用户信息
    // attach = {
    //  route: comic,
    //  func: openvip,
    //  comic: xxxx
    //  uid: 1,
    //  query: {
    //      key: aaa
    //  }
    // }  (开，或者续费30天月卡)
    // attach = 123~~book~~pufei--1204（开单本漫画）
    try {
        if (query.return_code == 1 && query.attach) {
            var attach = JSON.parse(decodeURIComponent(query.attach));
            if (attach.route) {
                var route = require("./" + attach.route);
                route[attach.func]({query: attach.query}, {jsonp:function() {}});
            }

            // 还要给这个用户加上数据
            // 先查询用户数据
            comicusersDao.queryById(function (err, data) {
                if (err) {
                    // 返回异常
                    res.jsonp({ret: 4, msg: "err1"});
                    return false;
                }
                
                // 获得之前的数据
                try {
                    var payinfo = JSON.parse(data[0].payinfo || "[]");
                    payinfo.unshift({
                        u: query.out_trade_no,
                        s: query.payjs_order_id,
                        t: new Date(),
                        f: query.total_fee
                    });
                    // 再插入
                    // 更新
                    comicusersDao.update(function (err2, data2) {
                        // 修改成功
                        // res.jsonp({ret: 0, err: err2, data: data2});
                        // console.log(err2);
                        // 邮件通知一下
                        basic.mailme(JSON.stringify(query));
                        res.jsonp({ret: 0, msg: ""});
                    }, {
                        payinfo: JSON.stringify(payinfo.slice(0, 20))
                    }, attach.uid);
                } catch(e){
                    res.jsonp({ret: 3, msg: e});
                }
            }, attach.uid);
        }
    } catch (e) {
        console.log(e);
        res.jsonp({ret: 1, msg: e});
    }
}

