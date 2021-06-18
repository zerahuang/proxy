// 引用dao
var personDao = require("../dao/person");
var pagesDao = require("../dao/pages");
var pool = require("../utils/dbpool").getPool();
// 获得网络数据
var http = require("http");
var url = require("url");
var async = require("async");
var comicDao = require("../dao/comics");
var comicusersDao = require("../dao/comicusers");
var charactorDao = require("../dao/charactors");
var userDao = require("../dao/user");
var request = require("request");
var comiclist = require("../model/comiclist");
var basic = require("../model/basic");
var comicRouter = require("./comic");
var cpsuserDao = require("../dao/cpsuser");
var updatecps = require("../bin/updatecps");

var _vipAdsCounts = 0;

exports.init = function (req, res, next) {
    // 获得昵称
    var name = req.query.name || "曹操";

    personDao.queryList(function (err, data) {
        // res.jsonp({
        //     ret : 0,
        //     msg: "",
        //     data: data
        // });
        console.log(err, data);

        if (data.data[0]) {
            var nowdata = data.data[0];
            var _relateinfo = (nowdata.family || "").match(/\/biography\/index\.shtml\?key=([^"]+)/g) || [];
            var _t = [];
            _relateinfo.forEach(function (ceil) {
                _t.push(decodeURIComponent(ceil.replace("/biography/index.shtml?key=", "")));
            });

            // 更新一下信息
            personDao.update(function (err, data) {
            }, {
                count: nowdata.count ? +nowdata.count + 1 : 1,
                lastviewd: new Date()
            }, nowdata.id);

            res.render('index', {
                title: name + " 字 " + nowdata.zname,
                data: nowdata,
                relatename: _t
            });
        } else {
            res.render("error", {
                message: "还没有录入" + name + "哦",
                error: {}
            });
        }
    }, {
        name: {
            type: "=",//= like
            value: name
        }
    }); 
}

exports.list = function (req, res, next) {
    // 获得昵称
    var page = req.query.page || 1;

    // personDao.queryList(function (err, data) {
    //     var nowdata = data.data;
    //     console.log(nowdata.length);
    //     res.render('list', {
    //         title: "三国志",
    //         data: nowdata
    //     });
    // }, {}, {pagesize: 20, pagenum: page}); 
    res.render('list');
}

exports.getlist = function (req, res, next) {
    // 获得昵称
    var page = req.query.page || 1;
    var search = req.query.search;
    var searchObj = {};
    if (search) {
        searchObj.name = {
            type: "like",//= like
            value: search
        }
    }

    personDao.queryList(function (err, data) {
        res.jsonp({
            ret: 0,
            data
        });
    }, searchObj, {pagesize: 20, pagenum: page}); 
}
function shuffle(arr) {  
    var array = arr.concat();  
    for(var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);   
    return array;  
}

exports.getpage = function (req, res, next) {
    // 判断环境啊
    // platform
    var platform = "";
    try {
        platform = JSON.parse(req.cookies.platform).platform;
    } catch(e) {}

    // 要读取page字段才行，如果没有page字段，就默认index
    if (req.query.pageid == 1 || req.query.pageid == 2) {
        // 是老的
        pagesDao.queryById(function (err, data) {
            res.jsonp({
                ret: 0,
                data
            });
        }, req.query.pageid); 
    } else {
        var page = req.query.page || "index";

        // 不搞了啊
        // if (req.headers.referer.indexOf("wxc85441a693fcee05") == -1) {
        // if (page != "guess") {
        //     // 是以前老的
        //     res.jsonp({
        //         ret: 0,
        //         data: page == "home" ? defaultHomeStr : defaultIndexStr
        //     });
        //     return false;
        // }

        // 还要更新lastviewedtime,platform,page
        var nameid = req.cookies.nameid || req.query.nameid;
        if (nameid) {   
            // 先查询用户信息
            userDao.queryById(function (err, data) {
                if (err || (data && data.length == 0)) {
                    // 用户不存在
                    res.jsonp({
                        ret: 0,
                        data: page == "home" ? defaultHomeStr : defaultIndexStr
                    });
                } else {
                    // 用户存在的
                    var _tt = data[0];

                    // 大事件，要把uid的数据同步过来才行
                    if (req.query.uid && req.query.uid != 'undefined') {
                        // 根据uid，转移数据
                        comicusersDao.queryById(function (err, data) {
                            // 拿到数据之后，再一个一个去同步comicuser表的数据和user表的数据
                            if (err || (data && data.length == 0)) {
                                // 数据不存在
                                console.log("数据不存在，同步失败");
                                return false;
                            }

                            // 如果这个人的数据已同步过了，就不更新了
                            if (data[0].hastransed == 1) {
                                // 数据不存在
                                console.log("数据已经同步过了");
                                return false;
                            }

                            // 同步comicuser数据
                            comicusersDao.update(function (err2, data2) {
                            }, {
                                infos: data[0].infos,
                                registertime: data[0].registertime,
                                lastviewed: data[0].lastviewed,
                                readcount: data[0].readcount,
                                adscount: data[0].adscount,
                                viptime: data[0].viptime,
                                lastsigned: data[0].lastsigned,
                                signedtimes: data[0].signedtimes,
                                nowcontinuesigned: data[0].nowcontinuesigned,
                                adscardscount: data[0].adscardscount,
                                payinfo: data[0].payinfo,
                                mymaster: data[0].mymaster,
                                adscardinfo: data[0].adscardinfo
                            }, nameid);

                            // 同步本人信息，已转移
                            comicusersDao.update(function (err2, data2) {
                            }, {
                                hastransed: 1
                            }, req.query.uid);
                            
                        }, req.query.uid);
                    }

                    var _toupdate = {
                        lastlogintime: new Date(),
                        lastpage: page,
                        lastloginplatform: platform
                    };
                    if (!_tt.isvip) {
                        _toupdate.isvip = (page != "index" && page != "home" && page != "guess" && page != "homeland" && page != "talktome") ? "1" : "";
                        // 是vip
                        if (req.query.vip) {
                            _toupdate.isvip = '1';
                        }
                    }
                    userDao.update(function (err, data) {
                    }, _toupdate , nameid);
                    // 大版本改版，
                    // 在developer下，如果不是1或者8 就一定异常！
                    // 在非developer下（正常环境），如果是新用户、或者非会员用户返回异常！
                    // 只对首页和home页面生效
                    if ((page == "home" || page == "index") && !req.query.vip) {
                        if (platform == "devtools") {
                            res.jsonp({
                                ret: 0,
                                data: page == "home" ? defaultHomeStr : defaultIndexStr
                            });
                        } else {
                            // 判断是否是VIP
                            if (_tt.isvip == "1") {
                                // 是VIP
                                doRespons();
                            } else {
                                // 不是vip
                                res.jsonp({
                                    ret: 0,
                                    data: page == "home" ? defaultHomeStr : defaultIndexStr
                                });
                            }
                        }
                    } else {
                        doRespons();
                    }
                }
            }, nameid);
        } else {
            // 没有nameid
            if ((page == "home" || page == "index") && !req.query.vip) {
                res.jsonp({
                    ret: 0,
                    data: page == "home" ? defaultHomeStr : defaultIndexStr
                });
            } else {
                doRespons();
            }
        }
        // 是developer环境，并且没有豁免权的话，就返回固定内容
        // if (!(req.cookies.nameid && (req.cookies.nameid == 1 || req.cookies.nameid == 8)) && platform == "devtools" && page != "guess") {
        //     res.jsonp({
        //         ret: 0,
        //         data: page == "home" ? defaultHomeStr : defaultIndexStr
        //     });
        //     return false;
        // }

        // 渲染一下
        function doRespons () {
            pagesDao.queryList(function (err, data) {
                if (err || (data.data && data.data.length == 0)) {
                    res.jsonp({
                        ret: 3
                    });
                } else {
                    // 重要的一步，服务端渲染
                    // console.log(data.data[0].data);
                    var _pageinfos = JSON.parse(data.data[0].data);
                    var servers = _pageinfos.server;
                    var _t = [];
                    for (var i in servers) {
                        _t.push({
                            name: i,
                            value: servers[i]
                        });
                    }
                    // console.log(_t);
                    // 并发去发请求
                    var funcs = [];
                    _t.forEach(function (ceil, index) {
                        funcs.push(function (innerCall) {
                            // 判断是要发请求，还是直接组装
                            if (ceil.value.sanpkroute && ceil.value.sanpkfunc) {
                                // 是调用内部方法
                                if (ceil.value.sanpkroute == "comic") {
                                    var _nowFunc = comicRouter[ceil.value.sanpkfunc];
                                } else if (ceil.value.sanpkroute == "page") {
                                    var _nowFunc = exports[ceil.value.sanpkfunc];
                                }
                                if (_nowFunc) {
                                    // 有方法
                                    _nowFunc({
                                        query: ceil.value.options
                                    }, {
                                        jsonp: function (dd) {
                                            if (dd.ret == 0) {
                                                _value = dd.data;
                                                // console.log(ceil.value);
                                                if (ceil.value.shuffle == 1) {
                                                    // 直接洗牌
                                                    _value = shuffle(_value);
                                                } else if (ceil.value.shuffle == 2) {
                                                    // 按时间洗牌，每隔10分钟，走一个
                                                    var _t = Math.round(new Date().getTime() / (10 * 60 * 1000)) % (_value.length);
                                                    // console.log("_t=", _t);
                                                    _value = _value.concat(_value).slice(_t, _t + (ceil.value.length || 6));
                                                }
                                                _pageinfos.source[ceil.name] = ceil.value.length ? _value.slice(0, ceil.value.length) : _value;
                                            }
                                            innerCall();    
                                        }
                                    } , function () {});
                                } else {
                                    innerCall();
                                }
                            } else {
                                request(ceil.value.url, function (err1, data1) {
                                    try{
                                        var _value = JSON.parse(data1.body);
                                        ceil.value.route.replace(/[\.\[]/g, "','").replace(/]/g, "").replace(/['"]/g, "").split(",").forEach(function (cceil) {
                                            _value = _value[cceil];
                                        });
                                        // console.log(ceil.value);
                                        if (ceil.value.shuffle == 1) {
                                            // 直接洗牌
                                            _value = shuffle(_value);
                                        } else if (ceil.value.shuffle == 2) {
                                            // 按时间洗牌，每隔10分钟，走一个
                                            var _t = Math.round(new Date().getTime() / (10 * 60 * 1000)) % (_value.length);
                                            // console.log("_t=", _t);
                                            _value = _value.concat(_value).slice(_t, _t + (ceil.value.length || 6));
                                        }
                                        
                                        _pageinfos.source[ceil.name] = ceil.value.length ? _value.slice(0, ceil.value.length) : _value;
                                        innerCall();
                                    } catch(e){
                                        innerCall(e);
                                    }
                                });
                            }
                        });
                    });
                    // 数据
                    async.parallelLimit(funcs, 10, function(err1, data1) {
                        // console.log("", JSON.stringify(data));
                        if (err1) {
                            res.jsonp({
                                ret: 0,
                                data: data.data
                            });
                        } else {
                            if (_t.length > 0) {
                                data.data[0].data = JSON.stringify(_pageinfos);
                            }
                            res.jsonp({
                                ret: 0,
                                data: data.data
                            });
                        }
                    });
                }
            }, {
                pagename: {
                    type: "=",//= like
                    value: page
                }
            });
        }
    }
}

// 获得搜索内容
exports.search = function (req, res, next) {
    // 根据搜索内容，返回信息
    if (!req.query.info) {
        res.jsonp({ret: 1, msg: "param err"});
        return false;
    }

    comicDao.queryList(function (err, data) {
        if (err || data && data.data && data.data.length == 0) {
            res.jsonp({
                ret: 3,
                msg: "no data"
            });
        } else {
            // 有资源，给用户打个标
            var nameid = req.cookies.nameid || req.query.nameid;
            var _toupdate = {
                lastlogintime: new Date(),
                lastpage: "search",
                isvip: "1"
            };
            userDao.update(function (err, data) {
            }, _toupdate , nameid);

            if (!(+nameid - 27252 < 0)) {
                // 不能搜索到isoffline的
                data.data = data.data.filter(function (ceil) {return !+ceil.isoffline});
            }

            if (data.data.length == 0) {
                res.jsonp({
                    ret: 3,
                    msg: "no data"
                });
            } else {
                res.jsonp({ret: 0, data: data.data[0].name});
            }
        }
    }, {
        z_ch_name: {
            type: "=",
            value: req.query.info
        }
    });
}


// 获得漫画信息
exports.getcomic = function (req, res, next) {
    // 必须要有漫画名称
    if (!req.query.comic) {
        // 必须要有
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }

    // 如果reffer来源不是github或者wxapp，就返回异常
    if (!/(github\.io)|(servicewechat\.com)|(onhit\.cn)/.test(req.headers.referer)) {
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }

    // 要查两遍，查询comic还要查询charactor
    comicDao.queryById(function (err, data) {
        // 是否有报错
        if (err || !data || (data && data.length == 0)) {
            res.jsonp({
                ret: 3,
                msg: "query error"
            });
            return false;
        }

        if (req.query.from == "search" && data && data[0] && data[0].z_ch_name) {
            // 是从搜索过来的
            // 直接去写basic
            basic.get(function (searcherr, searchdata) {
                if (searcherr) {
                    // 记录失败
                    return false;
                }
                var _t = JSON.parse(searchdata || "{}");
                if (!_t[req.query.comic]) {
                    _t[req.query.comic] = {
                        n: data && data[0] && data[0].z_ch_name,
                        v: 0
                    };
                }
                _t[req.query.comic].v++;

                // 继续保存
                basic.set(function (searcherr2, searchdata2) {}, "searchDATAS", JSON.stringify(_t), 60 * 60 * 24 * 7);
            }, "searchDATAS");
        }
        

        // 再去查询章节信息
        charactorDao.queryList(function (err2, data2) {
            // 要精简一下返回
            if (err2 || (data2 && data2.data && data2.data.length == 0)) {
                res.jsonp({
                    ret: 4,
                    msg: "query error."
                });
                return false;
            }

            data2.data.sort(function (a, b) {
                if (a.comic_index > b.comic_index) return 1;
                else if (a.comic_index < b.comic_index) return -1;
                else return 0;
            });

            data = data[0];

            // 扑飞和youma漫画只保留记录的章节数
            if (req.query.comic.indexOf('pufei') != -1 || req.query.comic.indexOf('youma') != -1) {
                data2.data = data2.data.slice(0, data.charactor_counts);
            }

            // 重要的一环，去查询用户信息
            getUserComicInfo(req.cookies.nameid || req.query.nameid, req.query.comic, function (userComicData, newtype, collectCount, userData) {
                // 有用户信息了
                if (userComicData) {
                    // 是2.5倍，向下取整。最多不超过10
                    var userid = req.cookies.nameid || req.query.nameid;
                    // if (data.isfree == 1) {
                    //     var canRead = true;
                    // } else {
                    //     var canRead = false;
                    // }
                    userData = userData || {viptime: 0};
                        
                    // 查询appid信息
                    var nowappid = req.headers.referer.match(/servicewechat\.com\/([^\/]+)/);
                    if (!nowappid) {
                        var charas = [];
                        data2.data.forEach(function (ceil, index) {
                            charas.push({
                                name: ceil.name,
                                comic_index: ceil.comic_index,
                                // comic_name: ceil.comic_name,
                                // read_count: ceil.read_count,
                                // pic_count: ceil.pic_count,
                                canRead: (userComicData.list.indexOf(ceil.comic_index) != -1) || (index >= data2.data.length - _vipAdsCounts ? false : true) 
                            });
                        });
                        data.charas = charas;
                        data.userinfo = userComicData;
                        data.collectCount = collectCount;
                        data.adcounts = !newtype ? getNewNum(data.ad_reward, 3, data) : getNewNum(data.ad_reward, newtype == 100 ? 1 : newtype, data);
                        data.usertype = newtype;
                        // 去渲染吧
                        doAfterUser();
                        return false;
                    } else {
                        nowappid = nowappid[1];
                    }
                    cpsuserDao.queryById(function (apperr , appdata) {
                        var charas = [];
                        //  || !(appdata[0].bannerad1 && appdata[0].bannerad2 && appdata[0].videoad1)
                        if (apperr || (appdata && appdata.length == 0)) {
                            // 没有配置广告信息
                            data2.data.forEach(function (ceil, index) {
                                charas.push({
                                    name: ceil.name,
                                    comic_index: ceil.comic_index,
                                    // comic_name: ceil.comic_name,
                                    // read_count: ceil.read_count,
                                    // pic_count: ceil.pic_count,
                                    canRead: (userComicData.list.indexOf(ceil.comic_index) != -1) || (index >= data2.data.length - _vipAdsCounts ? false : true) 
                                });
                            });
                        } else {
                            data2.data.forEach(function (ceil, index) {
                                charas.push({
                                    name: ceil.name,
                                    comic_index: ceil.comic_index,
                                    // comic_name: ceil.comic_name,
                                    // read_count: ceil.read_count,
                                    // pic_count: ceil.pic_count,
                                    canRead: (userComicData.list.indexOf(ceil.comic_index) != -1) || (index >= data2.data.length - _vipAdsCounts ? false : ((data.isfree || (userComicData.vip || +userData.viptime > new Date().getTime())) ? true : false)) 
                                });
                            });
                            var _usead1 = Math.random() > 0.5;
                            data.adinfo = {
                                ad1: _usead1 ? appdata[0].bannerad1 : appdata[0].bannerad2,
                                ad2: _usead1 ? appdata[0].bannerad2 : appdata[0].bannerad1,
                                vad: appdata[0].videoad1
                            };
                        }
                        data.charas = charas;
                        data.userinfo = userComicData;
                        data.collectCount = collectCount;
                        data.adcounts = !newtype ? getNewNum(data.ad_reward, 3, data) : getNewNum(data.ad_reward, newtype == 100 ? 1 : newtype, data);
                        data.usertype = newtype;
                        // 去渲染吧
                        doAfterUser(userData);
                    }, nowappid);
                } else {
                    var charas = [];
                    data2.data.forEach(function (ceil) {
                        charas.push({
                            name: ceil.name,
                            comic_index: ceil.comic_index,
                            // comic_name: ceil.comic_name,
                            // read_count: ceil.read_count,
                            // pic_count: ceil.pic_count
                        });
                    });
                    data.charas = charas;
                    data.adcounts = getNewNum(data.ad_reward, 1, data);
                    data.usertype = 100;
                    data.collectCount = 0;
                    data.userinfo = { 
                        current: '1',
                        time: new Date(),
                        helpedlist: [],
                        list: [ 1 ] 
                    };
                    // 去渲染吧
                    doAfterUser(userData);
                }
            });

            // 获得用户信息之后的操作
            function doAfterUser (userData) {
                // 去获得当前漫画的推荐漫画
                comiclist.getlist(function (guesslist) {
                    data.guesslist = guesslist.data.filter(function (ceil) {return ceil.name != data.name});
                    data.guesslist = data.guesslist.slice(0,3).concat(shuffle(data.guesslist.slice(3)).slice(0,3));

                    data.guesslist = shuffle(data.guesslist);
                    
                    // 去渲染吧
                    data.readover = data.userinfo.list && data.userinfo.list.length >= data.charactor_counts - 5;
                    
                    if (data.other) {
                        data.baiduyunurl = data.other && data.other.split("$$")[0];
                        data.baiduyuncode = data.other && data.other.split("$$")[1];
                    }
                    data.oricharactors = data.charactors;
                    data.charactors = data.charactors.split(",");
                    data.tags = data.tags.split(",");
                    data.more = data.more || "亲爱的漫友们，漫客谷为个人爱好收集，并不具备版权。朋友们如果喜欢，且有支付能力，请您一定支持正版，本站只是试看。如作者不希望该漫画出现在本站，请前往 “我的”->“意见反馈” 联系我删除。";
                    data.sharetext = data.sharetext || "";
                    // 描述也改一下
                    data.descs = data.descs && data.descs.replace(/^[^。，]*的[^。，]*漫画[。，]/, "").replace(/^漫画讲述了/, "").replace(/^介绍:/, "").replace(/^[^：]+简介：/, "").replace(/^[^：]+漫画：/, "").trim().slice(0,50);

                    // 计算更新时间和最后的章节
                    data.lastestcharname = data.charas && (data.charas[data.charas.length - 1].name);
                    data.updatetimestr = (data.updatetime && $formatDate(new Date(data.updatetime), "YYYY.MM.DD")) || (data.createtime && $formatDate(new Date(data.createtime), "YYYY.MM.DD"));

                    // 打一个标，判断是否是新用户

                    // 返回服务器时间
                    data.nowtime = new Date().getTime();
                    try {
                        // console.log(data.comments);
                        data.comments = JSON.parse(data.comments || "[]");
                    } catch (e) {
                        data.comments = [];
                    }

                    // 如果是dfvcb，就显示已下线
                    data.isout = req.query.comic.indexOf("dfvcb") != -1 ? 1 : data.isout;

                    // 又来新需求了啊，要找到同名的其他漫画
                    // 必须要是mh1234或者dfvcb
                    // if (req.query.comic.indexOf("mh1234") != -1 || req.query.comic.indexOf("dfvcb") != -1) {
                        // 是的
                        comicDao.queryList(function (err5, data5) {
                            if (err5 || data5 && data5.data && data5.data.length == 0) {
                                doRes(data, userData);
                            } else {
                                // 有资源，给用户打个标
                                var _tc = [];
                                data5.data.forEach(function (ceil) {
                                    // if (ceil.name.indexOf("mh1234") == -1 && ceil.name.indexOf("dfvcb") == -1) {
                                    if (ceil.name != data.name && !+ceil.isout) {
                                        _tc.push(ceil);
                                    }
                                });
                                _tc.sort(function (a, b) {
                                    if (a.name.indexOf("mh1234") != -1 && b.name.indexOf("mh1234") != -1) {
                                        return 0;
                                    } else if (a.name.indexOf("mh1234") != -1 && b.name.indexOf("mh1234") == -1) {
                                        return -1;
                                    } else if (a.name.indexOf("mh1234") == -1 && b.name.indexOf("mh1234") != -1) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                });
                                
                                //  && _tc[0].name.indexOf("dfvcb") == -1
                                if (_tc.length > 0 && !+_tc[0].isout && _tc[0].name.indexOf("dfvcb") == -1) {
                                    data.otherresource = _tc[0].name;
                                }
                                
                                // 加一个flag
                                data.flag = data.name.indexOf("youma") != -1 ? "Y" : data.name.indexOf("pufei") != -1 ? "P" : data.name.indexOf("duoduo") != -1 ? "DD" : data.name.indexOf("yiyi") != -1 ? "YY" : data.name.indexOf("vi--") != -1 ? "VI" : data.name.indexOf("manmankan--") != -1 ? "K" : data.name.indexOf("tutu") != -1 ? "U" : data.name.indexOf("manhuadb") != -1 ? "B" : data.name.indexOf("mh1234") != -1 ? "M" : data.name.indexOf("dfvcb") != -1 ? "D" : data.name.indexOf("gm--") != -1 ? "G" : data.name.indexOf("mt--") != -1 ? "MT" : data.name.indexOf("dy--") != -1 ? "DY" : data.name.indexOf("gf--") != -1 ? "GF" : "T";
                                
                                doRes(data, userData);
                            }
                        }, {
                            z_ch_name: {
                                type: "=",
                                value: data.z_ch_name
                            }
                        });
                    // } else {
                    //     // 不是的
                    //     // 返回吧
                    //     res.jsonp({
                    //         ret: 0,
                    //         data: data
                    //     });
                    // }
                }, {
                    cate: data.charactors,
                    // myshuffle: 1
                });
            }

            // 返回
            function doRes (data, userData) {
                userData = userData || {};
                // 要拿到20个广告位，一次性返回
                basic.get(function (cpsgoodserr, cpsgoods) {
                    data.cps = [
                    // {
                    //     appid: 'wxe4b873eafbc4a2c1',
                    //     path: '?wxgamecid=CCBgAAoXkpQY9jHVSkzUOg&game_tunnel=240520'
                    // }, {
                    //     appid: 'wx5c432aeea071d773',
                    //     path: '?wxgamecid=CCBgAAoXkpQY8kWMv1jzX3&game_tunnel=240437'
                    // }, {
                    //     appid: 'wx52966cd958bcd65b',
                    //     path: '?wxgamecid=CCBgAAoXkpQAMVTocw6Q6H-Q&Ads=aiyou2&AdsPos=manshandhr'
                    // }, 
                    // {
                    //     appid: 'wx1b0064fa13f05bbf',
                    //     path: '?mid=183168&p_mid=1503'
                    // }, 
                    // {
                    //     appid: 'wx1dcf3925581c34d9',
                    //     path: '?channel=c47005'
                    // }, 
                    {
                        appid: 'wx309cecc8ed172a14',
                        path: 'pages/tv/index?page=guess'
                    }, {
                        appid: 'wxa73f2e7403357bbf',
                        path: '?from=10509'
                    }, {
                        appid: 'wxb5b642503841b076',
                        path: '?from=10509'
                    }];
                    
                    // 概率
                    if (Math.random() > 0.8) {
                        data.cps.push({
                            appid: 'wx7bcc19f465237030',
                            path: '/pages/index/index?tj=mh'
                        }, {
                            appid: 'wxc3ba1ed4ab5c531d',
                            path: '?wxgamecid=CCBgAAoXkpQY9sztjR6RXA&form=manhua'
                        });
                    }

                    // 判断是否是老用户
                    // if (userData && (userData.adscount - 0 > 0 && new Date(userData.registertime) < new Date('2021/5/8'))) {
                    //     // 老用户
                    //     var _ttt = [{
                    //         appid: 'wx6e5c154e312a5003',
                    //         path: 'pages/web/index?channel=honghao&scene=cxhd:775Q460003-775Q460004'
                    //     }, {
                    //         appid: 'wxb7b043d2ff683ce2',
                    //         path: 'pages/web/index?channel=honghao&scene=cxhd:732Q460003-732Q460004'
                    //     }, {
                    //         appid: 'wxabeb40f620be711b',
                    //         path: 'pages/web/index?channel=honghao&scene=cxhd:715Q460003-715Q460004'
                    //     }, {
                    //         appid: 'wx3d12038e5c9e5d62',
                    //         path: 'pages/web/index?channel=honghao&scene=cxhd:699Q460003-699Q460004'
                    //     }];
                    //     data.cps = data.cps.concat(_ttt);
                    // }
                    
                    if (cpsgoods) {
                        try {
                            var cps = Array.from(JSON.parse(cpsgoods), function (ceil) {
                                return {
                                    appid: ceil.app_id,
                                    path: ceil.page_path
                                }
                            });
                            // 拿到全部广告位，一次性返回
                            data.cps = data.cps.concat(shuffle(cps).slice(0, 6));
                        } catch (e) {}
                    }

                    data.cps = data.cps.slice(0,6);

                    // 查询用户是否有unionid
                    if (userData.userid) {
                        userDao.queryById(function (uerr, udata) {
                            if (uerr || (udata && udata.length == 0)) {
                                data.union = 'sys';
                            } else {
                                data.union = udata[0].unionid;
                            }
                            res.jsonp({
                                ret: 0,
                                data: data
                            });
                        }, userData.userid);
                    } else {
                        data.union = 'sys';
                        res.jsonp({
                            ret: 0,
                            data: data
                        });
                    }
                }, "cpsgoods");
                // res.jsonp({
                //     ret: 0,
                //     data: data
                // });
            }
        }, {
            comic_name: {
                type: "=",
                value: req.query.comic
            }
        }, {
            pagesize: 10000,
            tablename: "charactors_" + ("0" + (data[0].id % 100)).slice(-2)
        });
    }, req.query.comic);
}

// 获得搜索数据
exports.getsearchdata = function (req, res, next) {
    // 根据appid，获得信息
    var nowappid = req && req.headers && req.headers.referer && req.headers.referer.match(/servicewechat\.com\/([^\/]+)/);
    if (!nowappid) {
        res.jsonp({ret: 3, data: {
            list: [],
            time: new Date().getTime(),
            isgq: new Date() >= new Date("2021/5/1") && new Date() < new Date("2021/5/6")
        }});
    } else {
        nowappid = nowappid[1];
        // 查询广告信息
        cpsuserDao.queryById(function (apperr , appdata) {
            if (apperr || (appdata && appdata.length == 0)) {
                var tid = "";
            } else {
                var tid = appdata[0].tplid_build_success;
            }
            basic.get(function (searcherr, searchdata) {
                if (searcherr) {
                    // 记录失败
                    res.jsonp({ret: 0, data: {
                        list: [],
                        time: new Date().getTime(),
                        isgq: new Date() >= new Date("2021/5/1") && new Date() < new Date("2021/5/6")
                    }});
                    return false;
                }
                var _t = JSON.parse(searchdata || "{}");
                
                // 排序
                var _arr = [];
                for (var i in _t) {
                    _arr.push({
                        n: i,
                        zn: _t[i].n,
                        v: _t[i].v
                    });
                }
                _arr.sort(function (a,b) {
                    if (a.v > b.v) {
                        return -1;
                    } else if (a.v < b.v) {
                        return 1;
                    } else {
                        return 0;
                    }
                });

                // 判断是否有用户信息
                var userid = req.cookies.nameid || req.query.nameid;
                if (!userid) {
                    res.jsonp({ret: 0, data: {
                        list: _arr.slice(0, 20),
                        tid: tid,
                        time: new Date().getTime(),
                        isgq: new Date() >= new Date("2021/5/1") && new Date() < new Date("2021/5/6")
                    }});
                } else {
                    var showKorea = false;
                    // 查询用户信息，是否展示韩漫
                    comicusersDao.queryById(function (err, data) {
                        if (!err && (data.length != 0)) {
                            data = data[0];
                            var _usertype = data && data.adscount <= 5 && data.readcount <= 40 ? 100 : new Date() - new Date(data.registertime) > 2000 * 60 * 60 * 24 ? 3 : new Date() - new Date(data.registertime) > 1000 * 60 * 60 * 24 ? 2 : 1;
                            showKorea = _usertype == 2 || _usertype == 3;
                        }
                        if (showKorea) {
                            _arr.splice(2,0,{
                                n: "youma--617",
                                zn: "重考生",
                                v: 100
                            });
                            _arr.splice(5,0,{
                                n: "youma--294",
                                zn: "漂亮乾姊姊",
                                v: 100
                            });
                            _arr.splice(10,0,{
                                n: "youma--350",
                                zn: "下女,初希",
                                v: 100
                            });
                            _arr.splice(17,0,{
                                n: "youma--970",
                                zn: "健身教练",
                                v: 100
                            });
                        }
                        res.jsonp({ret: 0, data: {
                            list: _arr.slice(0, 20),
                            tid: tid,
                            showKorea: showKorea,
                            time: new Date().getTime(),
                            isgq: new Date() >= new Date("2021/5/1") && new Date() < new Date("2021/5/6")
                        }});
                    }, userid);
                }
            }, "searchDATAS");
        }, nowappid);
    }
}

// 查询用户信息
function getUserComicInfo (userid, comic, callback) {
    // 没有登录
    if (!userid) {
        // res.jsonp({ret: 3, msg: "nologin"});
        // 没有登录，就返回这本漫画的初始信息
        comicDao.queryById(function (err3, data3) {
            // 查询出漫画的基本信息
            if (err3 || (data3 && data3.length == 0)) {
                // 返回异常
                callback && callback(false);
                return false;
            }
            callback && callback({
                // max: data3[0].freechars,
                list: getQueen(+data3[0].freechars),
                current: 1,
                time: new Date()
            }, 100);
        }, comic);
        return false;
    }

    comicusersDao.queryById(function (err, data) {
        if (err) {
            // 返回异常
            callback && callback(false);
            return false;
        }

        // 如果还没有开始，就是新用户
        if (data.length == 0 || !JSON.parse(data[0].infos || "{}")[comic]) {
            // 新用户，就去注册
            // 查询漫画信息
            comicDao.queryById(function (err3, data3) {
                // 查询出漫画的基本信息
                if (err3 || (data3 && data3.length == 0)) {
                    // 返回异常
                    callback && callback(false);
                    return false;
                }
                // 是空的
                // 是新用户啊
                if (data.length == 0) {
                    // 是空的
                    var _infos = {};
                } else {
                    var _infos = JSON.parse(data[0].infos || "{}");
                }
                _infos[comic] = {
                    // max: data3[0].freechars,
                    // list: getQueen(+data3[0].freechars),
                    range: [[1, +data3[0].freechars]],
                    current: 1,
                    time: new Date()
                };
                
                var _toUpdate = {
                    userid: userid,
                    // lastviewed: new Date(),
                    infos: JSON.stringify(_infos)
                };

                // 判断是不是全新新增
                if (!(data && data[0] && data[0].registertime)) {
                    _toUpdate.registertime = new Date();
                }

                // 不存在，要新增
                comicusersDao.add(function (err2, data2) {
                    // 新增成功
                    // res.jsonp({ret: 0 , err: err2, data: data2});
                    if (err2) {
                        callback && callback(false);
                    } else {
                        // 计算一下，当前有多少收藏的
                        var _collectCount = 0;
                        for (var i in _infos) {
                            if (_infos[i].collect == 1) {
                                _collectCount++;
                            }
                        }
                        // 插入数据需要range，输出需要list
                        callback && callback({
                            list: getQueen(+data3[0].freechars),
                            current: 1,
                            time: new Date()
                        }, data && data[0] && data[0].adscount <= 5 && data[0].readcount <= 40 ? 100 : !_toUpdate.registertime ? (new Date() - new Date(data[0].registertime) > 2000 * 60 * 60 * 24 ? 3 : new Date() - new Date(data[0].registertime) > 1000 * 60 * 60 * 24 ? 2 : 1) : 100, _collectCount, data[0]);
                    }
                }, _toUpdate);
            }, comic);
        } else {
            data = data[0];
            data.infos = JSON.parse(data.infos);

            // 非关键路径，去更新一下阅读信息
            if (data.infos[comic] && data.infos[comic].nl) {
                delete data.infos[comic].nl;
                comicusersDao.update(function (err4, data4) {
                    // 成功
                    // res.jsonp({ret: 0, err: err4, data: data4});
                }, {
                    userid: userid,
                    infos: JSON.stringify(data.infos)
                }, userid);
            }

            // 要把内容返回
            // 去掉max, 返回list
            data.infos[comic].list = getQueen(data.infos[comic].range || data.infos[comic].max);
            delete data.infos[comic].range;
            delete data.infos[comic].max;

            // 计算一下，当前有多少收藏的
            var _collectCount = 0;
            for (var i in data.infos) {
                if (data.infos[i].collect == 1) {
                    _collectCount++;
                }
            }
            callback && callback(data.infos[comic], data && data.adscount <= 5 && data.readcount <= 40 ? 100 : new Date() - new Date(data.registertime) > 2000 * 60 * 60 * 24 ? 3 : new Date() - new Date(data.registertime) > 1000 * 60 * 60 * 24 ? 2 : 1, _collectCount, data);
        }
    }, userid);
}

// 获得单章漫画信息
exports.getcharsinfo = function (req, res, next) {
    // 参数里面一定要有comic和comic_index
    if (!req.query.comic || !req.query.comic_index) {
        // 必须要有
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }

    // 有了之后，就好了，也要先查询全部信息
    comicDao.queryById(function (err, data) {
        // 是否有报错
        if (err || (data && data.length == 0)) {
            res.jsonp({
                ret: 3,
                msg: "query error"
            });
            return false;
        }

        // 再去查询推荐信息
        comiclist.getlist(function (guesslist) {
            data[0].guesslist = guesslist.data.filter(function (ceil) {return ceil.name != data[0].name});
            data[0].guesslist = shuffle(data[0].guesslist.slice(0,10)).slice(0,3);
            
            getips(function (errip, dataip) {
                // 再去查询单本信息
                charactorDao.queryById(function (err2, data2) {
                    if (err2 || (data2 && data2.length == 0)) {
                        res.jsonp({
                            ret: 4,
                            msg: "query error"
                        });
                        return false;
                    } else {
                        data = data[0];
                        data.charainfo = data2[0];
                        var _t = [];
                        for (var i = 0 ; i < data.charainfo.pic_count; i++) {
                            _t.push(i + (data.charainfo.ext1 ? data.charainfo.ext1 : ".jpg"));
                        }
                        data.charainfo.pics = _t;
                        // urls拼接一下
                        data.charainfo.urls = JSON.parse(data.charainfo.urls || "[]");
                        data.charainfo.urls = Array.from(data.charainfo.urls, function(ceil) {
                            if (ceil) {
                                var _turl = ceil.replace("m.wh156.cn", "qcloud.peiqi98.com:18181").replace("res.img.fffimage.com", "res.img.220012.net").replace("res.img.1fi4b.cn", "res.img.220012.net").replace("mhpic.dongzaojiage.com", "img.wszwhg.net").replace(/^https?/, "http").replace("kgdd.aswyp.com:18181", "qcloud.peiqi98.com:18181").replace("game.peiqi68.com:18181", "qcloud.peiqi98.com:18181").replace("p.youma.org", "bbb.youma.org").replace("bbb.youma.org", "cdn.wwwcom.xyz").replace("220012.net", "youzipi.net").replace("comic.veryim.com/qingtiancms_wap", "m.veryim.com").replace(/^http\:\/\/res\.img\.220012\.net\/http/, "http").replace(/^http\:\/\/res\.img\.220012\.net\/http/, "http").replace(/^http\:\/\/res\.img\.1fi4b\.cn\/http/, "http").replace(/^http\:\/\/res\.img\.youzipi\.net\/http/, "http").replace("youzipi.net", "jituoli.com").replace("jituoli.com", "youzipi.net");
                                // if (_turl.indexOf("cdn.wwwcom.xyz") != -1) {
                                //     _turl = _turl.replace(/^http?/, "https");
                                // }
                                if (_turl.indexOf("wszwhg") != -1 && !/\.jpe?g$/i.test(_turl) && !/index=\d+$/.test(_turl)) {
                                    _turl += "_fixed.jpg";
                                }
                                if (_turl.indexOf("wszwhg") != -1) {
                                    // 随机ip
                                    // var _ips = ["115.221.116.21", "60.169.40.251"];
                                    // _ips = _ips[Math.floor(_ips.length * Math.random())];
                                    // _turl = "http://" + _ips + ":3000/?image=" + encodeURIComponent(_turl);
                                    var nowip = getfromips(dataip);
                                    if (nowip) {
                                        _turl = "http://" + nowip.ip + ":" + nowip.p + "/?image=" + encodeURIComponent(_turl);
                                    } else {
                                        _turl = "http://onhit.cn/sanpk/comic-proxy?image=" + encodeURIComponent(_turl.replace(/^https?:\/\//, ""));
                                    }
                                    // _turl = "http://onhit.cn/sanpk/comic-proxy?image=" + encodeURIComponent("http://m-tohomh123-com.mipcdn.com/i/" + _turl.replace(/^https?:\/\//, ""));
                                } 
                                // console.log(_turl);
                                if (_turl.indexOf("zhengdongwuye.cn") != -1 || _turl.indexOf("88bada.com") != -1) {
                                    // 存在
                                    _turl = "http://onhit.cn/sanpk/comic-proxy2?image=" + encodeURIComponent(_turl);
                                }
                                return _turl;
                            } else {
                                return "";
                            }
                        });
                        // .replace("p.youma.org", "bbb.youma.org")

                        // 非关键路径，更新漫画章节信息
                        // console.log($formatDate(new Date(data.lastviewdtime), "YYYY-MM-DD"), $formatDate(new Date(), "YYYY-MM-DD"), data.read_count)
                        var _tdate = $formatDate(new Date(), "YYYY-MM-DD");
                        try{
                            charactorDao.update(function (err3, data3) {
                            }, {
                                read_count: $formatDate(new Date(data.charainfo.lastviewdtime), "YYYY-MM-DD") == _tdate ? (+data.charainfo.read_count ? (+data.charainfo.read_count + 1) : 1) : 1,
                                lastviewdtime: new Date()
                            }, req.query.comic + "/" + req.query.comic_index, {
                                tablename: "charactors_" + ("0" + (data.id % 100)).slice(-2)
                            });
                        }catch(e){}

                        // 计算一下当前阅读人数
                        // 要根据时间来计算
                        if (new Date(_tdate + " 00:00:00") < new Date() && new Date() <= new Date(_tdate + " 05:00:00")) {
                            // 0点到5点
                            var _x = (new Date() - new Date(_tdate + " 00:00:00")) / (new Date(_tdate + " 05:00:00")  - new Date(_tdate + " 00:00:00")) * 5;
                            var _y = 5 - _x;
                            var _rate = ((5 + _y) * _x / 2) / 140;
                        } else if (new Date(_tdate + " 05:00:00") < new Date() && new Date() <= new Date(_tdate + " 06:00:00")) {
                            var _rate = 12.5 / 140;
                        } else if (new Date(_tdate + " 06:00:00") < new Date() && new Date() <= new Date(_tdate + " 09:00:00")) {
                            var _x = (new Date() - new Date(_tdate + " 06:00:00")) / (new Date(_tdate + " 09:00:00")  - new Date(_tdate + " 06:00:00")) * 3;
                            var _y = _x * 10 / 3;
                            var _rate = (_x * _y / 2 + 12.5) / 140;
                        } else if (new Date(_tdate + " 09:00:00") < new Date() && new Date() <= new Date(_tdate + " 18:00:00")) {
                            var _x = (new Date() - new Date(_tdate + " 09:00:00")) / (new Date(_tdate + " 18:00:00")  - new Date(_tdate + " 09:00:00")) * 9;
                            var _y = 10 - _x * 5 / 9;
                            var _rate = ((10 + _y) * _x / 2 + 12.5 + 15) / 140;
                        } else {
                            var _x = (new Date() - new Date(_tdate + " 18:00:00")) / (new Date(_tdate + " 23:59:59")  - new Date(_tdate + " 18:00:00")) * 6;
                            var _y = _x * 5 / 6 + 5;
                            var _rate = ((5 + _y) * _x / 2 + 12.5 + 15 + 67.5) / 140;
                        }
                        // 判断时间
                        if (new Date(_tdate + " 00:00:00") < new Date() && new Date() <= new Date(_tdate + " 01:00:00")) {
                            data.charainfo.cvisiter = Math.round(_y * 2);
                        } else {
                            // 算出当前在看的人数
                            data.charainfo.cvisiter = Math.round(_y * ((data.charainfo.read_count || 1) / _rate) / 140 * 30);
                            // 上下波动50%
                            data.charainfo.cvisiter = Math.round(data.charainfo.cvisiter * Math.random() + data.charainfo.cvisiter / 2);
                        }

                        var nowappid = req.headers.referer.match(/servicewechat\.com\/([^\/]+)/);
                        if (!nowappid) {
                            doback();
                        } else {
                            nowappid = nowappid[1];
                            // 查询广告信息
                            cpsuserDao.queryById(function (apperr , appdata) {
                                //  || !(appdata[0].bannerad1 && appdata[0].bannerad2)
                                if (apperr || (appdata && appdata.length == 0)) {
                                    doback();
                                } else {
                                    var _usead1 = Math.random() > 0.5;
                                    data.adinfo = {
                                        ad1: _usead1 ? appdata[0].bannerad1 : appdata[0].bannerad2,
                                        ad2: _usead1 ? appdata[0].bannerad2 : appdata[0].bannerad1,
                                        vad: appdata[0].videoad1
                                    };
                                    doback();
                                }
                            }, nowappid);
                        }

                        function doback () {
                            // 判断是否是老用户
                            var user = req.cookies.nameid || req.query.nameid;
                            if (user) {
                                // 有用户
                                // 最后还要去获得用户信息
                                comicusersDao.queryById(function (err3, data3) {
                                    // new Date() - new Date(data.registertime) > 1000 * 60 * 60 * 24
                                    if (err3 || data3.length == 0) {
                                        data.adcounts = getNewNum(data.ad_reward, 1, data);
                                        data.usertype = 100;
                                        // 无用户
                                        doRes(data);
                                    } else {
                                        data3 = data3[0];
                                        var _fixtime = new Date() - new Date(data3.registertime);
                                        data.adcounts = data3 && data3.adscount <= 5 && data3.readcount <= 40 ? getNewNum(data.ad_reward, 1, data) : _fixtime > 2000 * 60 * 60 * 24 ? getNewNum(data.ad_reward, 3, data) : _fixtime > 1000 * 60 * 60 * 24 ? getNewNum(data.ad_reward, 2, data) : getNewNum(data.ad_reward, 1, data);

                                        // 100 是没看过漫画的用户，3 是看过漫画且2天了，2 是看过漫画且1天了，1 是其他
                                        data.usertype = data3 && data3.adscount <= 5 && data3.readcount <= 40 ? 100 : _fixtime > 2000 * 60 * 60 * 24 ? 3 : _fixtime > 1000 * 60 * 60 * 24 ? 2 : 1;

                                        // 只在这里做推荐(没隔5章推荐一下)
                                        // 每隔5章
                                        if (req.query.comic_index % 2 == 1) {
                                            // 可以了
                                            // 是否是深夜
                                            var nowhour = new Date().getHours();
                                            if ((nowhour == 23 || nowhour < 6) && ((data.usertype == 2 || data.usertype == 3) ? Math.random() > 0.5 : 0)) {
                                                // 凌晨
                                                // 有百分之50%推荐韩国漫画
                                                comiclist.getlist(function (gslist) {
                                                    // res.jsonp(data);
                                                    data.bottomtj = gslist && gslist.data && gslist.data[Math.floor(Math.random() * gslist.data.length)];
                                                    doRes(data, data3);
                                                }, {
                                                    cate: "韩国"
                                                });
                                            } else {
                                                data.bottomtj = data.guesslist ? data.guesslist[Math.floor(Math.random() * data.guesslist.length)] : "";
                                                doRes(data, data3);
                                            }
                                        } else {
                                            // 不用
                                            doRes(data, data3);
                                        }
                                    }
                                }, user);
                            } else {
                                data.adcounts = getNewNum(data.ad_reward, 1, data);
                                data.usertype = 100;
                                // 无用户
                                doRes(data);
                            }
                        }
                    }
                }, req.query.comic + "/" + req.query.comic_index, {
                    tablename: "charactors_" + ("0" + (data[0].id % 100)).slice(-2)
                });
            });
        }, {
            cate: data[0].charactors
        });

        function doRes (data, userData) {
            userData = userData || {};
            basic.get(function (cpsgoodserr, cpsgoods) {
                data.cps = [
                // {
                //     appid: 'wxe4b873eafbc4a2c1',
                //     path: '?wxgamecid=CCBgAAoXkpQY9jHVSkzUOg&game_tunnel=240520'
                // }, {
                //     appid: 'wx5c432aeea071d773',
                //     path: '?wxgamecid=CCBgAAoXkpQY8kWMv1jzX3&game_tunnel=240437'
                // }, {
                //     appid: 'wx52966cd958bcd65b',
                //     path: '?wxgamecid=CCBgAAoXkpQAMVTocw6Q6H-Q&Ads=aiyou2&AdsPos=manshandhr'
                // }, 
                // {
                //     appid: 'wx1b0064fa13f05bbf',
                //     path: '?mid=183168&p_mid=1503'
                // }, 
                // {
                //     appid: 'wx1dcf3925581c34d9',
                //     path: '?channel=c47005'
                // }, 
                {
                    appid: 'wx309cecc8ed172a14',
                    path: 'pages/tv/index?page=guess'
                }, {
                    appid: 'wxa73f2e7403357bbf',
                    path: '?from=10509'
                }, {
                    appid: 'wxb5b642503841b076',
                    path: '?from=10509'
                }];

                // 概率
                if (Math.random() > 0.8) {
                    data.cps.push({
                        appid: 'wx7bcc19f465237030',
                        path: '/pages/index/index?tj=mh'
                    }, {
                        appid: 'wxc3ba1ed4ab5c531d',
                        path: '?wxgamecid=CCBgAAoXkpQY9sztjR6RXA&form=manhua'
                    });
                }

                // if (userData && (userData.adscount - 0 > 0 && new Date(userData.registertime) < new Date('2021/5/8'))) {
                //     var _ttt = [{
                //         appid: 'wx6e5c154e312a5003',
                //         path: 'pages/web/index?channel=honghao&scene=cxhd:775Q460003-775Q460004'
                //     }, {
                //         appid: 'wxb7b043d2ff683ce2',
                //         path: 'pages/web/index?channel=honghao&scene=cxhd:732Q460003-732Q460004'
                //     }, {
                //         appid: 'wxabeb40f620be711b',
                //         path: 'pages/web/index?channel=honghao&scene=cxhd:715Q460003-715Q460004'
                //     }, {
                //         appid: 'wx3d12038e5c9e5d62',
                //         path: 'pages/web/index?channel=honghao&scene=cxhd:699Q460003-699Q460004'
                //     }];
                //     data.cps = data.cps.concat(_ttt);
                // }

                if (cpsgoods) {
                    try {
                        var cps = Array.from(JSON.parse(cpsgoods), function (ceil) {
                            return {
                                appid: ceil.app_id,
                                path: ceil.page_path
                            }
                        });
                        // 拿到全部广告位，一次性返回
                        data.cps = data.cps.concat(shuffle(cps).slice(0, 6));
                    } catch (e) {}
                }
                
                data.cps = data.cps.slice(0,6);
                data.cps = data.cps[Math.floor(Math.random() * data.cps.length)];
                data.cpsinfo = [
                // {
                //     pic: 'http://img13.360buyimg.com/jdphoto/jfs/t1/177785/14/3685/258703/609bb054Ea1eeb161/18460ec6f31cf615.jpg',
                //     appid: 'wx1dcf3925581c34d9',
                //     path: '?channel=c47005'
                // }, 
                {
                    pic: 'https://img30.360buyimg.com/img/s650x200_jfs/t1/190366/38/3651/55135/60a231f9E8865e228/884e97b9d900efc8.gif',
                    appid: 'wx7bcc19f465237030',
                    path: '/pages/index/index?tj=mh'
                }, {
                    pic: 'http://img11.360buyimg.com/jdphoto/jfs/t1/172917/12/11241/38282/60ab4d57E0f851f44/236036e1dd06f473.jpg',
                    appid: 'wxc3ba1ed4ab5c531d',
                    path: '?wxgamecid=CCBgAAoXkpQY9sztjR6RXA&form=manhua'
                }];
                // data.cpsinfo = [{
                //     pic: 'https://img13.360buyimg.com/img/s650x120_jfs/t1/177609/23/2452/34760/6092a74fEf2d087bb/91ec02cd9eabe175.jpg',
                //     appid: 'wx6e5c154e312a5003',
                //     path: 'pages/web/index?channel=honghao&scene=cxhd:775Q460003-775Q460004'
                // }, {
                //     pic: 'https://img30.360buyimg.com/img/s650x120_jfs/t1/175460/5/7995/32864/6092a751E12d873ce/5d51b55660c734bc.jpg',
                //     appid: 'wxb7b043d2ff683ce2',
                //     path: 'pages/web/index?channel=honghao&scene=cxhd:732Q460003-732Q460004'
                // }, {
                //     pic: 'https://img10.360buyimg.com/img/s650x120_jfs/t1/176632/20/8192/29983/6092a74fE340515ec/667b211033eebe31.jpg',
                //     appid: 'wx3d12038e5c9e5d62',
                //     path: 'pages/web/index?channel=honghao&scene=cxhd:699Q460003-699Q460004'
                // }, {
                //     pic: 'https://img12.360buyimg.com/img/s650x120_jfs/t1/193860/24/1389/30610/6092a74fE1f1a9f60/b858db0331c44f1b.jpg',
                //     appid: 'wxabeb40f620be711b',
                //     path: 'pages/web/index?channel=honghao&scene=cxhd:715Q460003-715Q460004'
                // }];
                data.cpsinfo = data.cpsinfo[Math.floor(Math.random() * data.cpsinfo.length)];
                // data.cpsinfo = {};

                // 查询用户是否有unionid
                if (userData.userid) {
                    userDao.queryById(function (uerr, udata) {
                        if (uerr || (udata && udata.length == 0)) {
                            data.union = 'sys';
                        } else {
                            data.union = udata[0].unionid;
                        }
                        res.jsonp({
                            ret: 0,
                            data: data
                        });
                    }, userData.userid);
                } else {
                    data.union = 'sys';
                    res.jsonp({
                        ret: 0,
                        data: data
                    });
                }

            }, "cpsgoods");
            // data.cps = [{
            //     appid: 'wxe4b873eafbc4a2c1',
            //     path: '?wxgamecid=CCBgAAoXkpQY9jHVSkzUOg&game_tunnel=240520'
            // }, {
            //     appid: 'wx5c432aeea071d773',
            //     path: '?wxgamecid=CCBgAAoXkpQY8kWMv1jzX3&game_tunnel=240437'
            // }];
            // data.cps = data.cps[Math.floor(Math.random() * data.cps.length)];
            // 返回一个图片和链接
            
        }
    }, req.query.comic);
}

// 获得cps数据
exports.getCpsData = function (req, res, next) {
    if (!req.query.key) {
        // 必须要有
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }
    updatecps.getKeyData(decodeURIComponent(req.query.key), function (err, data) {
        if (err) {
            res.jsonp({
                ret: 3,
                msg: "server error"
            });
        } else {
            res.jsonp({
                ret: 0,
                data: data
            });
        }
    });
}

function getNewNum (ad_reward, type, data) {
    if (data && data.limitinfo == 1) {
        return 1;
    }
    var _temp = Math.floor(ad_reward * (type == 2 ? 1.5 : type == 3 ? 1.4 : 1.75));
    return _temp > 10 ? 10 : _temp;
}

/* 设置队列 */
function setQueen (queen, index, count) {
    index = +index;
    count = +count;
    // 简单做吧，先列举出目前的内容
    var _t = {}, i, j, len, _arr = [];
    queen.forEach(function (ceil) {
        for (i = ceil[0]; i < ceil[ceil.length - 1] + 1; i++) {
            _t[i] = 1;
        }
    });
    // 再把新的数据写进来
    for (j = index; j < index + count; j++) {
        _t[j] = 1;
    }
    // 再遍历，然后重写
    for (i in _t) {
        _arr.push(+i);
    }
    // 排序
    _arr.sort(function (x, y) {
        if (x - y > 0) return 1;
        else if (x - y < 0) return -1;
        else return 0;
    });
    var _ret = [[1]];
    for (i = 1, len = _arr.length; i < len; i++) {
        if (_arr[i] - _arr[i - 1] != 1) {
            // 有跨域了
            // 开启新的一个
            _ret.push([_arr[i]]);
        } else {
            // 没有跨域
            _ret[_ret.length - 1][1] = _arr[i];
        }
    }
    return _ret;
}

/**
 * 获得队列
 * @Author   huangshoalu
 * @DateTime 2019-09-11
 */
function getQueen (queen) {
    var _t = [];
    if (queen instanceof Array) {
        queen.forEach(function (ceil) {
            for (var i = ceil[0]; i < ceil[ceil.length - 1] + 1; i++) {
                _t.push(i);
            }
        });
        return _t;
    } else {
        for (var i = 1; i < queen + 1; i++) {
            _t.push(i);
        }
        return _t;
    }
}
function $formatDate(date,formatStr){   
    //格式化时间
    var arrWeek=['日','一','二','三','四','五','六'],  
        str=formatStr  
            .replace(/yyyy|YYYY/,date.getFullYear())  
            .replace(/yy|YY/,$addZero(date.getFullYear(),2))  
            .replace(/mm|MM/,$addZero(date.getMonth()+1,2))  
            .replace(/m|M/g,date.getMonth()+1)  
            .replace(/dd|DD/,$addZero(date.getDate(),2) )  
            .replace(/d|D/g,date.getDate())  
            .replace(/hh|HH/,$addZero(date.getHours(),2))  
            .replace(/h|H/g,date.getHours())  
            .replace(/ii|II/,$addZero(date.getMinutes(),2))  
            .replace(/i|I/g,date.getMinutes())  
            .replace(/ss|SS/,$addZero(date.getSeconds(),2))  
            .replace(/s|S/g,date.getSeconds())  
            .replace(/w/g,date.getDay())  
            .replace(/W/g,arrWeek[date.getDay()]);   
    return str;   
}  
function $addZero(v,size){  
    for(var i=0,len=size-(v+"").length;i<len;i++){  
        v="0"+v;  
    };  
    return v+"";  
}  

function getfromips (_t) {
    // 返回一个ip即可
    if (_t.length) {
        var nowcount = 0;
        _t.forEach(function (ceil) {
            ceil.start = +nowcount;
            nowcount += +ceil.w;
            ceil.end = +nowcount;
        });
        var _rand = Math.random() * nowcount;
        // console.log(_rand);
        var _ret = _t.filter(function (ceil) {return ceil.start < _rand && ceil.end >= _rand});
        if (_ret && _ret.length) {
            var ip = {
                ip: _ret[0].ip,
                p: _ret[0].p || "3000"
            };
        } else {
            var ip = "";
        }
    } else {
        var ip = "";
    }
    return ip;
}



// 获得ip信息
function getips (callback) {
  pool.query("select * from basicinfo where b_key = ?", ['ips'], function (err, data) {
    if (err || (data && data.length == 0)) {
      callback && callback("", []);
    } else {
      try {
        var _t = JSON.parse(data[0].b_value);
      } catch(e) {
        var _t = [];
      }
      callback && callback("", _t);
    }
  });
}

// var defaultIndexPage = {"source":{"picstyle":"border-radius: 30rpx;margin-top: 40rpx;box-shadow: 0px 4rpx 8rpx 0rpx rgba(0, 0, 0, 0.6);height: 300rpx;width:100%;","fontStyle":"font-size: 32rpx;color: white;text-align: center;font-weight: bold;position: absolute;background-image: linear-gradient(90deg,rgba(141,141,141,0) 0%,rgba(40,41,35, 1) 49%,rgba(141,141,141,0) 100%);width: 500rpx;margin: auto;height: 60rpx;line-height: 60rpx;bottom: 8rpx;right: 0;width: 100%;"},"pageInfo":{"shareinfo":{"title":"太阿轻互动","path":"","imageUrl":""},"title":"主页"},"onLoad":[{"statements":["page.backinfo = {'PageOptions': PageOptions, 'CONFIGDATA': CONFIGDATA, 'vars': vars, 'page': page, 'argus': argus}"]}],"onShow":[{"statements":["temp.pageinfos = getCurrentPages()","temp.pagelen = temp.pageinfos.length","temp.pagelenm1 = temp.pagelen - 1","temp.pageinfo = temp.pageinfos.slice(pagelenm1, pagelen)","temp.pageinfo = temp.pageinfo[0]","PageOptions = temp.pageinfo.backinfo.PageOptions","CONFIGDATA = temp.pageinfo.backinfo.CONFIGDATA","vars = temp.pageinfo.backinfo.vars","page = temp.pageinfo.backinfo.page","argus = temp.pageinfo.backinfo.argus","page.init()"]}],"viewData":[{"type":"view","attr":{},"bindtap":[{"statements":["vars.guesslink = {'url': '/pages/sanpk/detail/index?name=关羽'}","wx.navigateTo(vars.guesslink)"]}],"style":"'text-align: center;width: 640rpx;margin: auto; margin-top: 50rpx; position: relative;'","child":[{"type":"image","style":"picstyle","attr":{"src":"/resources/images/WX20190812-221244@2x.png","mode":"aspectFill"}},{"type":"view","style":"fontStyle","innerText":"'武圣关羽'"}]}]};
// var defaultIndexPage = {"source":{"picstyle":"border-radius: 30rpx;margin-top: 40rpx;box-shadow: 0px 4rpx 8rpx 0rpx rgba(0, 0, 0, 0.6);height: 300rpx;width:100%;","fontStyle":"font-size: 32rpx;color: white;text-align: center;font-weight: bold;position: absolute;background-image: linear-gradient(90deg,rgba(141,141,141,0) 0%,rgba(40,41,35, 1) 49%,rgba(141,141,141,0) 100%);width: 500rpx;margin: auto;height: 60rpx;line-height: 60rpx;bottom: 8rpx;right: 0;width: 100%;"},"pageInfo":{"shareinfo":{"title":"太阿轻互动","path":"","imageUrl":""},"title":"互动列表"},"onLoad":[{"statements":["page.backinfo = {'PageOptions': PageOptions, 'CONFIGDATA': CONFIGDATA, 'vars': vars, 'page': page, 'argus': argus}"]}],"onShow":[{"statements":["temp.pageinfos = getCurrentPages()","temp.pagelen = temp.pageinfos.length","temp.pagelenm1 = temp.pagelen - 1","temp.pageinfo = temp.pageinfos.slice(pagelenm1, pagelen)","temp.pageinfo = temp.pageinfo[0]","PageOptions = temp.pageinfo.backinfo.PageOptions","CONFIGDATA = temp.pageinfo.backinfo.CONFIGDATA","vars = temp.pageinfo.backinfo.vars","page = temp.pageinfo.backinfo.page","argus = temp.pageinfo.backinfo.argus","page.init()"]}],"viewData":[{"type":"view","attr":{},"bindtap":[{"statements":["vars.guesslink = {'url': '/pages/tv/index?page=guess'}","wx.navigateTo(vars.guesslink)"]}],"style":"'text-align: center;width: 640rpx;margin: auto; margin-top: 50rpx; position: relative;'","child":[{"type":"image","style":"picstyle","attr":{"src":"http://m.qpic.cn/psb?/V13t4aPF2wQ5G2/7rpUhAVPEvu4NDN6MsChXyQXvK*KYh.iQLp7GGHk51Q!/b/dLYAAAAAAAAA&bo=HAOGAQAAAAADB7o!&rf=viewer_4","mode":"aspectFill"}},{"type":"view","style":"fontStyle","innerText":"'程序猿身价估值'"}]}]};
var defaultIndexPage = {"source":{"picstyle":"border-radius: 30rpx;margin-top: 40rpx;box-shadow: 0px 4rpx 8rpx 0rpx rgba(0, 0, 0, 0.6);height: 300rpx;width:100%;","fontStyle":"font-size: 32rpx;color: white;text-align: center;font-weight: bold;position: absolute;background-image: linear-gradient(90deg,rgba(141,141,141,0) 0%,rgba(40,41,35, 1) 49%,rgba(141,141,141,0) 100%);width: 500rpx;margin: auto;height: 60rpx;line-height: 60rpx;bottom: 8rpx;right: 0;width: 100%;"},"pageInfo":{"shareinfo":{"title":"首页","path":"","imageUrl":""},"title":"首页"},"onLoad":[{"statements":["page.backinfo = {'PageOptions': PageOptions, 'CONFIGDATA': CONFIGDATA, 'vars': vars, 'page': page, 'argus': argus}"]}],"onShow":[{"statements":["temp.pageinfos = getCurrentPages()","temp.pagelen = temp.pageinfos.length","temp.pagelenm1 = temp.pagelen - 1","temp.pageinfo = temp.pageinfos.slice(pagelenm1, pagelen)","temp.pageinfo = temp.pageinfo[0]","PageOptions = temp.pageinfo.backinfo.PageOptions","CONFIGDATA = temp.pageinfo.backinfo.CONFIGDATA","vars = temp.pageinfo.backinfo.vars","page = temp.pageinfo.backinfo.page","argus = temp.pageinfo.backinfo.argus","page.init()"]}],"viewData":[{"type":"view","attr":{},"bindtap":[{"statements":["vars.guesslink = {'url': '/pages/tv/index?page=homeland'}","wx.navigateTo(vars.guesslink)"]}],"style":"'text-align: center;width: 640rpx;margin: auto; margin-top: 50rpx; position: relative;'","child":[{"type":"image","style":"picstyle","attr":{"src":"http://m.qpic.cn/psc?/V12IMQdX2eTPzw/XhAcrxMqcT2aH2KuaPXKTcmfLz.FH6s4jfD3f*v0.fiR0p.Jw7LWxxO8mXhHHLV8Qjv991Sf22axxi3b2G5WSA!!/b&bo=gAc4BAAAAAARB4s!&rf=viewer_4","mode":"aspectFill"}},{"type":"view","style":"fontStyle","innerText":"'我的家乡'"}]},{"type":"view","attr":{},"bindtap":[{"statements":["vars.guesslink = {'url': '/pages/tv/index?page=guess'}","wx.navigateTo(vars.guesslink)"]}],"style":"'text-align: center;width: 640rpx;margin: auto; margin-top: 10rpx; position: relative;'","child":[{"type":"image","style":"picstyle","attr":{"src":"http://m.qpic.cn/psb?/V13t4aPF2wQ5G2/7rpUhAVPEvu4NDN6MsChXyQXvK*KYh.iQLp7GGHk51Q!/b/dLYAAAAAAAAA&bo=HAOGAQAAAAADB7o!&rf=viewer_4","mode":"aspectFill"}},{"type":"view","style":"fontStyle","innerText":"'程序猿身价估值'"}]}]};

var defaultHomePage = {"source":{},"pageInfo":{"title":"我的","shareinfo":{"title":"我的轻互动","path":"","imageUrl":""}},"onLoad":[{"statements":["page.backinfo = {'PageOptions': PageOptions, 'CONFIGDATA': CONFIGDATA, 'vars': vars, 'page': page, 'argus': argus}"]}],"onShow":[{"statements":["temp.pageinfos = getCurrentPages()","temp.pagelen = temp.pageinfos.length","temp.pagelenm1 = temp.pagelen - 1","temp.pageinfo = temp.pageinfos.slice(pagelenm1, pagelen)","temp.pageinfo = temp.pageinfo[0]","PageOptions = temp.pageinfo.backinfo.PageOptions","CONFIGDATA = temp.pageinfo.backinfo.CONFIGDATA","vars = temp.pageinfo.backinfo.vars","page = temp.pageinfo.backinfo.page","argus = temp.pageinfo.backinfo.argus","page.init()"]}],"viewData":[{"type":"view","style":"'background-color: #f0eff5;'","child":[{"type":"view","style":"'padding:10px;text-align:center;background-color:white;'","hide":"uinfo.avatarUrl","child":[{"type":"button","style":"'width:80px;height:80px;border-radius:50px;padding: 0;border: none;background-color:#dedede;line-height: 80px;color: #666;'","innerText":"'点击登录'","attr":{"open-type":"getUserInfo","size":"mini","plain":true},"bindgetuserinfo":[{"statements":["vars.change = {'viewData[0].child[0].hide': true, 'viewData[0].child[1].hide': false, 'viewData[0].child[1].child[0].attr.src': ed.bindgetuserinfo.detail.userInfo.avatarUrl}","page.setData(vars.change)"]}]}]},{"type":"view","hide":"!uinfo.avatarUrl","style":"'padding:10px;text-align:center;background-color:white;'","child":[{"type":"image","style":"'width:80px;height:80px;border-radius:50px;'","attr":{"src":"jss:uinfo.avatarUrl"}}]},{"type":"view","style":"'margin-top:20rpx;color:#4a4a4a;background-color:white;border-bottom: 1rpx solid #DADADA;'","child":[{"type":"view","child":[{"type":"view","style":"'padding:30rpx 30rpx 0rpx;font-size: 32rpx; font-weight:bold;'","innerText":"'我的家乡'"},{"type":"view","style":"'padding:30rpx 30rpx;font-size: 28rpx;'","innerText":"'老家是湖北省监利县白螺镇荆江村，位于湖北和湖南的交接处，虽然是湖北，但是和湖南省岳阳市区仅一江之隔。那里有长江渡口，去岳阳很方便。我们那里没什么特产，老家的人都出去广东打工，不富裕。希望混的好的人为家乡做点贡献！'"}]}]},{"type":"view","style":"'margin-top:20rpx;color:#4a4a4a;background-color:white;border-bottom: 1rpx solid #DADADA;'","child":[{"type":"view","child":[{"type":"view","style":"'padding:30rpx 30rpx 0rpx;font-size: 32rpx; font-weight:bold;'","innerText":"'程序员身价估值'"},{"type":"view","style":"'padding:30rpx 30rpx;font-size: 28rpx;'","innerText":"'程序员们可以输入自己的技术类型（Javascript、C++、C、JAVA、PHP等），头发长度，平均加班时长，毕业院校，工作年限等内容，系统给出一个评估身价，仅供娱乐哦。'"}]}]},{"type":"view","style":"'margin-top:20rpx;color:#4a4a4a;background-color:white;border-bottom: 1rpx solid #DADADA;'","child":[{"type":"view","child":[{"type":"button","style":"'border: none;font-size:32rpx;text-align:left;'","attr":{"plain":true,"open-type":"contact"},"innerText":"'意见反馈'"}]}]}]}]};


var defaultIndexStr = [{"id":4,"data": JSON.stringify(defaultIndexPage) ,"count":null,"lastviewedtime":null,"pagename":"index","rankPos":null}];

var defaultHomeStr = [{"id":4,"data": JSON.stringify(defaultHomePage) ,"count":null,"lastviewedtime":null,"pagename":"index","rankPos":null}];
