// 引用dao
var http = require("http");
var https = require("https");
var url = require("url");
var async = require("async");
var request = require("request");
var comicsDao = require("../dao/comics");
var subscriptionsDao = require("../dao/subscriptions");
var basic = require("../model/basic");
var paycardsDao = require("../dao/paycards");
var comicusersDao = require("../dao/comicusers");

exports.pay = function (req, res, next) {
    console.log(req.body, req.query);
    // 支付信息
    // 获得支付信息
    // content: '【微信】微信支付：[3条]微信支付: 微信支付收款0.01元(朋友到店)',
    if (req.query.content) {
        var money = req.query.content.match(/收款(\d+(?:\.\d+)?)元/);
        if (money) {
            money = money[1];
            // 去查询这个价钱，有谁的信息，如果没有信息，也是异常
            paycardsDao.queryList(function (err, data) {
                if (err) {
                    basic.mailme("有支付异常，请处理:3 - " + err);
                } else {
                    if (data.data && data.data.length) {
                        if (!data.data[0].payafter) {
                            // 有异常啊
                            basic.mailme("有支付异常，请处理:5 - " + JSON.stringify(data));
                        } else {
                            try {
                                // 最后，没问题了
                                var attach = JSON.parse(decodeURIComponent(data.data[0].payafter));
                                console.log(attach);
                                if (attach.route) {
                                    var route = require("./" + attach.route);
                                    route[attach.func]({query: attach.query}, {jsonp:function(data) {
                                        console.log(data);
                                        basic.mailme("支付处理：" + (data.ret == 0 ? '处理成功' : '处理失败') + "  " + JSON.stringify(attach) + "  " + JSON.stringify(req.query));
                                    }});
                                }

                                // 更新一下支付信息
                                comicusersDao.queryById(function (err2, data2) {
                                    if (err2) {
                                        // 返回异常
                                        console.log({ret: 4, msg: "err1"});
                                        return false;
                                    }
                                    
                                    // 获得之前的数据
                                    try {
                                        var payinfo = JSON.parse(data2[0].payinfo || "[]");
                                        payinfo.unshift({
                                            s: data.data[0].pic + '__' + req.query.timestamp, // pic-time
                                            t: new Date(),
                                            f: data.data[0].pic
                                        });
                                        // 再插入
                                        // 更新
                                        comicusersDao.update(function (err2, data2) {
                                            // 修改成功
                                            // res.jsonp({ret: 0, err: err2, data: data2});
                                            // console.log(err2);
                                            // 邮件通知一下
                                            // basic.mailme(JSON.stringify(query));
                                        }, {
                                            payinfo: JSON.stringify(payinfo.slice(0, 20))
                                        }, attach.uid);
                                    } catch(e){
                                        console.log({ret: 3, msg: e});
                                    }
                                }, attach.uid);

                                // 好了，再来释放一下了
                                paycardsDao.update(function (err3, data3) {
                                    console.log(err3, data3);
                                }, {
                                    userid: "",
                                    payafter: "",
                                    title: ""
                                }, {
                                    userid: {
                                        type: "=",
                                        value: attach.uid
                                    }
                                });
                            } catch (e) {
                                basic.mailme("有支付异常，请处理:6 - " + e.toString());
                            }
                        }
                    } else {
                        basic.mailme("有支付异常，请处理:4 - " + JSON.stringify(data));
                    }
                }
            }, {
                pic: {
                    type: "=",
                    value: (+money) + ""
                }
            });
        } else {
            basic.mailme("有支付异常，请处理:2 - " + JSON.stringify(req.query));
        }
    } else {
        // 有异常了
        basic.mailme("有支付异常，请处理:1 - " + JSON.stringify(req.query));
    }
}

exports.init = function (req, res, next) {
	console.log(req.body, req.query);
	var echostr = (req.query && req.query.echostr) || (req.body && req.body.echostr);
	if (echostr) {
		res.send(echostr);
	} else {
		// 是推送消息
		var _xml = req.body && req.body.xml;
		if (_xml && _xml.fromusername && _xml.fromusername[0]) {
            var _type = _xml.msgtype && _xml.msgtype[0];
			if (_type == "text") {
                // 判断用户
                subscriptionsDao.queryById(function (err3, data3) {
                    // 判断是否存在
                    if (err3 || (data3 && !data3.length)) {
                        // 新用户吧，去新增
                        subscriptionsDao.add(function (err4, data4) {
                            // 新增成功
                            doResComic(_xml, false);
                        }, {
                            openid: _xml.fromusername[0],
                            gid: _xml.tousername[0],
                            first_follow_time: new Date("2020/12/10"),
                            last_follow_time: new Date(),
                            isfollowed: 1,
                            messagecount: 0,
                            z_ch_name: "漫客山谷"
                        });
                    } else {
                        // 老用户
                        subscriptionsDao.update(function (err4, data4) {
                            // 更新成功
                            doResComic(_xml, new Date(data3[0].first_follow_time) - new Date("2020/12/12") > 0);
                        }, {
                            messagetime: new Date(),
                            isfollowed: 1,
                            messagecount: +data3[0].messagecount + 1
                        }, _xml.fromusername[0]);
                    }
                }, _xml.fromusername[0]);
			} else if (_type == "event" && _xml.event && _xml.event[0]) {
				// 事件
				var _event = _xml.event && _xml.event[0];
				if (_event == "subscribe") {
                    // 关注之后，先给它去建一个公众号openid信息
                    // 判断之前是否有openid
                    subscriptionsDao.queryById(function (err3, data3) {
                        // 判断是否存在
                        if (err3 || (data3 && !data3.length)) {
                            // 新用户吧，去新增
                            subscriptionsDao.add(function (err4, data4) {
                                // 新增成功
                                doResponse(_xml);
                            }, {
                                openid: _xml.fromusername[0],
                                gid: _xml.tousername[0],
                                first_follow_time: new Date(),
                                last_follow_time: new Date(),
                                isfollowed: 1,
                                messagecount: 0,
                                z_ch_name: "漫客山谷"
                            });
                        } else {
                            // 老用户
                            subscriptionsDao.update(function (err4, data4) {
                                // 更新成功
                                doResponse(_xml);
                            }, {
                                last_follow_time: new Date(),
                                isfollowed: 1
                            }, _xml.fromusername[0]);
                        }
                    }, _xml.fromusername[0]);
				} else if (_event == "unsubscribe") {
                    // 取关
                    subscriptionsDao.update(function (err4, data4) {
                        // 更新成功
                    }, {
                        isfollowed: 0
                    }, _xml.fromusername[0]);
                } else {
                    nofound();
                }
			} else {
				// 是的
				nofound();
			}

            // 回复信息
            function doResComic (_xml, isnew) {
                // 要去搜索一下，得到一个结果（日漫，韩漫都可以，没下线就行，得到一个列表）
                comicsDao.queryList(function (err2, data2) {
                    if (err2 || (data2 && data2.data && data2.data.length == 0)) {
                        // 没有找到
                        nofound();
                    } else {
                        // 要做一些过滤
                        data2.data = data2.data.filter(function (ceil) {
                            return !+ceil.isout && !+ceil.isoffline && ((ceil.name && ceil.name.indexOf("dfvcb") == -1))
                        });

                        // 扑飞的放前面
                        data2.data = data2.data.filter(function (ceil) {return ceil.name && ceil.name.indexOf("pufei") != -1}).concat(data2.data.filter(function (ceil) {return !(ceil.name && ceil.name.indexOf("pufei") != -1)}));

                        // 判断一下
                        if (data2.data.length == 0) {
                            nofound();
                            return false;
                        }

                        var _str = "";
                        data2.data.slice(0, 5).forEach(function (ceil, index) {
                            _str += `
` + (index + 1) + `: &lt;a href="https://www.onhit.cn/sanpk/mh-comicindex?comic=` + ceil.name + `" data-miniprogram-appid="wxef721eb9acd18f95" data-miniprogram-path="pages/tv/index?page=comicindex&amp;comic=` + ceil.name + `"&gt;` + ceil.z_ch_name + `&lt;/a&gt;
`;
                        });
                        console.log(_str);
                        // 可以找到以下漫画
                        // 用户给我发消息
                        res.set('Content-Type', 'text/xml');
                        res.send(`<xml>
                          <ToUserName>` + _xml.fromusername[0] + `</ToUserName>
                          <FromUserName>` + _xml.tousername[0] + `</FromUserName>
                          <CreateTime>` + Math.round(new Date() / 1000) + `</CreateTime>
                          <MsgType>text</MsgType>
                          <Content>“` + _xml.content[0] + `”搜索结果如下：
` + _str + `
&lt;a href="https://www.onhit.cn" data-miniprogram-appid="wxef721eb9acd18f95" data-miniprogram-path="pages/tv/index?page=cates"&gt;更多结果&gt;&gt;&lt;/a&gt;</Content>
                        </xml>`);
                    }
                }, [{
                    z_ch_name: {
                        type: "like",
                        value: _xml.content[0]
                    }
                }, {
                    searchtags: {
                        type: "like",
                        value: _xml.content[0]
                    }
                }, {
                    author: {
                        type: "like",
                        value: _xml.content[0]
                    }
                }], {pagesize: 20, sortkey: "readcount"});
            }

            // 回复信息
            function doResponse (_xml, uinfo) {
                // 用户关注
                res.set('Content-Type', 'text/xml');
                res.send(`<xml>
                  <ToUserName>` + _xml.fromusername[0] + `</ToUserName>
                  <FromUserName>` + _xml.tousername[0] + `</FromUserName>
                  <CreateTime>` + Math.round(new Date() / 1000) + `</CreateTime>
                  <MsgType>text</MsgType>
                  <Content>​免费看最热门国漫，日漫，韩漫。你可通过下面的方式进入：

方法①：回复漫画名，查询漫画

方法②：点击公众号右下角“&lt;a href="https://www.onhit.cn" data-miniprogram-appid="wxef721eb9acd18f95" data-miniprogram-path="pages/tv/index?page=cates"&gt;搜索漫画&lt;/a&gt;”菜单，搜索漫画

漫客山谷地址：https://www.onhit.cn
                </Content>
                </xml>`);
            }

            // 回复没有
            function nofound () {
                res.set('Content-Type', 'text/xml');
                res.send(`<xml>
                  <ToUserName>` + _xml.fromusername[0] + `</ToUserName>
                  <FromUserName>` + _xml.tousername[0] + `</FromUserName>
                  <CreateTime>` + Math.round(new Date() / 1000) + `</CreateTime>
                  <MsgType>text</MsgType>
                  <Content>公众号没有匹配到你发的关键字，换其他关键字试试吧~ 

你也可以点击本公众号右下角的“&lt;a href="https://www.onhit.cn" data-miniprogram-appid="wxef721eb9acd18f95" data-miniprogram-path="pages/tv/index?page=cates"&gt;搜索漫画&lt;/a&gt;”菜单，在小程序内搜索和构建（可自助构建）漫画。</Content>
                </xml>`);
            }
		} else {
			res.send("");
		}
	}
}


// exports.init({
//     body: {
//         xml: 
//         // { 
//         //     tousername: [ 'gh_2766200b8547' ],
//         //     fromusername: [ 'ok9Xov9boZXfTIJHBiLP89FUigjY' ],
//         //     createtime: [ '1596466629' ],
//         //     msgtype: [ 'event' ],
//         //     event: [ 'subscribe' ],
//         //     eventkey: [ '' ] 
//         // }
//         { 
//             tousername: [ 'gh_2766200b8547' ],
//             fromusername: [ 'ok9Xov9boZXfTIJHBiLP89FUigjY1' ],
//             createtime: [ '1596466665' ],
//              msgtype: [ 'text' ],
//             content: [ '我' ],
//             msgid: [ '22855905573095432' ] 
//         }
//         // { 
//         //     tousername: [ 'gh_2766200b8547' ],
//         //     fromusername: [ 'ok9Xov9boZXfTIJHBiLP89FUigjY' ],
//         //     createtime: [ '1596466629' ],
//         //     msgtype: [ 'event' ],
//         //     event: [ 'unsubscribe' ],
//         //     eventkey: [ '' ] 
//         // }
//     }
// }, {
//     set: function () {},
//     send: function (data) {
//         console.log(data);
//     }
// });
// { tousername: [ 'gh_2766200b8547' ],
// fromusername: [ 'ok9Xov9boZXfTIJHBiLP89FUigjY' ],
// createtime: [ '1596466629' ],
// msgtype: [ 'event' ],
// event: [ 'subscribe' ],
// eventkey: [ '' ] }
// { xml:
// { tousername: [ 'gh_2766200b8547' ],
//  fromusername: [ 'ok9Xov9boZXfTIJHBiLP89FUigjY' ],
// createtime: [ '1596466665' ],
//  msgtype: [ 'text' ],
// content: [ '没有' ],
// msgid: [ '22855905573095432' ] } } 

// { signature: '7590ee3e5c3f7ff2fb011dffb96fd165a08486d0',
// timestamp: '1596466665',
// nonce: '1816958472',
// openid: 'ok9Xov9boZXfTIJHBiLP89FUigjY' }