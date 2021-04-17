var comicsDao = require("../dao/comics");
var basic = require("./basic");

exports.getlist = function (callback, opt) {
    var key = opt.key;
    var cate = opt.cate;
    var type = opt.type;
    var myshuffle = opt.myshuffle;
    var pageindex = opt.pageindex || 0;
    var length = opt.length || 10;
    
    if (key) {
        var _keyValues = [];
        if (key == "jx") {
            _keyValues = ["pufei--172","duannao", "pufei--117", "pufei--419", "mh1234--13276", "pufei--234", "zhenhunjie", "mh1234--12188", "chufeng", "huxheyaoshilu", "pufei--17", "shimogelengxiaohua", "pufei--1783",, "pufei--244", "pufei--320", "pufei--2400", "pufei--233", "pufei--415", "mh1234--12549", "pufei--180" , "mh1234--11399", "tiankongqinfan", "pufei--327", "mh1234--9683", "pufei--1423", "pufei--315", "mh1234--11475", "hanghaiwang", "mh1234--9329", "mh1234--13665","pufei--196", "mh1234--13082", "mh1234--11002", "pufei--357", "miyuhangzhe", "pufei--1418", "pufei--51", "pufei--292", "mh1234--11728", "pufei--1779", "pufei--1557", "pufei--405", "pufei--2998", "pufei--3001"];
        } else if (key == "sn") {
            _keyValues = ["mh1234--16514", "mh1234--16416", "pufei--8", "mh1234--16548", "mh1234--14548", "mh1234--16234", "mh1234--12899", "pufei--2726", "mh1234--17050", "pufei--3049", "mh1234--15129", "pufei--2171", "pufei--1914", "pufei--7", "mh1234--17550", "mh1234--12188", "mh1234--17032", "mh1234--17288", "pufei--2853", "pufei--1418", "pufei--1779", "mh1234--17736", "mh1234--15621", "mh1234--13841", "mh1234--17109", "mh1234--16697", "mh1234--12549", "mh1234--16621", "mh1234--11728", "pufei--2855", "mh1234--17209", "pufei--244", "mh1234--9387", "mh1234--17922", "pufei--3005", "pufei--2955", "mh1234--17861", "mh1234--16186", "pufei--357", "mh1234--16616", "mh1234--15198", "pufei--2319", "mh1234--16823", "mh1234--17916", "mh1234--17862", "mh1234--17961", "pufei--1335", "pufei--292", "pufei--1726", "mh1234--17964", "mh1234--15709", "mh1234--16253", "pufei--3001", "pufei--2593"];
        } else if (key == "hot") {
            _keyValues = ["pufei--1557", "mh1234--17176", "mh1234--17464", "pufei--2868", "pufei--1777", "pufei--1861", "mh1234--15024", "mh1234--17351", "pufei--2673", "pufei--2400", "mh1234--11728", "mh1234--16696", "pufei--3028", "mh1234--17332", "pufei--180", "mh1234--17708", "mh1234--13525", "mh1234--17330", "pufei--1423", "pufei--2317", "mh1234--96834", "mh1234--17032", "pufei--357", "pufei--51", "pufei--1418", "pufei--1812", "mh1234--16916", "mh1234--15624", "pufei--190", "pufei--2998", "mh1234--17050", "mh1234--17939", "mh1234--16514", "mh1234--15623", "mh1234--16730", "pufei--41", "mh1234--16823", "mh1234--17951", "mh1234--9329", "pufei--8", "mh1234--12146", "mh1234--16941", "mh1234--16849", "mh1234--17568", "pufei--234", "mh1234--17961", "pufei--196", "mh1234--16826", "pufei--1783", "pufei--405", "pufei--3049", "mh1234--16533", "mh1234--17350", "pufei--3007", "pufei--419", "pufei--2955", "pufei--1584", "pufei--3107", "mh1234--17746", "pufei--3060", "mh1234--18135", "mh1234--9507", "mh1234--17965", "mh1234--17484", "mh1234--17155", "mh1234--16513"];
        }

        comicsDao.queryList(function (err, data) {
            if (err) {
                callback({ret:0, data: []});
            } else {
                // 洗牌算法
                if (myshuffle == 1) {
                    data.data = shuffle(data.data);
                } else if (myshuffle == 2) {
                    var _t = Math.round(new Date().getTime() / (10 * 60 * 1000)) % (data.data.length);
                    // console.log("_t=", _t);
                    data.data = data.data.concat(data.data).slice(_t, _t + data.data.length);
                }
                // var _ret = data.data.slice(pageindex * 10,(+pageindex + 1) * 10);
                var _ret = data.data;
                var _back = [];
                _ret.forEach(function (ceil) {
                    _back.push({
                        name: ceil.name,
                        z_ch_name: ceil.z_ch_name,
                        author: ceil.author,
                        charactor_counts: ceil.charactor_counts,
                        charslen: ceil.charactor_counts,
                        charactors: ceil.charactors,
                        tags: ceil.tags,
                        indexpic: ceil.indexpic,
                        updatetime: ceil.updatetime,
                        createtime: ceil.createtime,
                        week1_count: ceil.week1_count,
                        week2_count: ceil.week2_count,
                        week3_count: ceil.week3_count,
                        week4_count: ceil.week4_count,
                        week5_count: ceil.week5_count,
                        week6_count: ceil.week6_count,
                        week7_count: ceil.week7_count,
                        readcount: ceil.readcount,
                        recommend: ceil.recommend,
                        limitinfo: ceil.limitinfo,
                        descs: ceil.descs && ceil.descs.replace(/^[^。，]*的[^。，]*漫画[。，]/, "").replace(/^漫画讲述了/, "").replace(/^介绍:/, "").replace(/^[^：]+简介：/, "").replace(/^[^：]+漫画：/, "").trim().slice(0,20)
                    });
                });
                _back.forEach(function (ceil) {
                    ceil.updatetimestr = $formatDate(new Date(ceil.updatetime), "YYYY-MM-DD HH:II:SS");
                });
                _back = _back.slice(pageindex * length, (+pageindex + 1) * length);
                callback({ret:0, data: _back});
            }
        }, {
            name: {
                type: "in",
                value: _keyValues
            },
            isoffline: [{
                type: "!=",
                value: 1
            }, {
                type: "is",
                value: null
            }]
        }, {pagesize: 10000});
        return false;
    }

    // cate = 韩国 需要单独计算
    var searchObj = {
        // 下线的就不要拉出来了
        isout : [{
            type: "!=",
            value: 1
        }, {
            type: "is",
            value: null
        }],
        isoffline: [{
            type: "!=",
            value: 1
        }, {
            type: "is",
            value: null
        }]
    };
    // 其他的信息（每周的，要查询出全部的）
    if (type == 3 || cate) {
        var otherObj = {
            pagesize: 100000
        };
    } else {
        var otherObj = {
            pagesize: length,
            pagenum: +pageindex + 1
        };
    }
    
    if (!type) {
        // 最新的
        otherObj.sortkey = "readcount";
    }

    if (type == 1 || type == 7) {
        // 最新的
        otherObj.sortkey = "updatetime";
    }
    // 当天，我要知道今天是哪天
    var _tWeekday = new Date().getDay();
    var _colum = "";
    switch (_tWeekday){
        case 0: _colum = "week7_count"; break;
        case 1: _colum = "week1_count"; break;
        case 2: _colum = "week2_count"; break;
        case 3: _colum = "week3_count"; break;
        case 4: _colum = "week4_count"; break;
        case 5: _colum = "week5_count"; break;
        case 6: _colum = "week6_count"; break;
        default: ;
    }
    if (type == 2 || type == 8) {
        otherObj.sortkey = _colum;
    }

    if (type == 6) {
        // 新上架
        otherObj.sortkey = "createtime";
    }

    if (cate != "韩国") {
        searchObj.limitinfo = {
            type: "is",
            value: null
        };
    } else {
        searchObj.limitinfo = {
            type: "=",
            value: 1
        };
        otherObj.sortkey = "";
    }
    // 类目
    if (cate) {
        var _tcate = [];
        cate.split(",").forEach(function (ceil) {
            _tcate.push({
                type: "like",
                value: ceil
            });
        });
        if (cate != "韩国") {
            otherObj.sortkey = "updatetime";
        }
        
        searchObj.charactors = _tcate;
        if (myshuffle == 1) {
            // 只选20%
            searchObj.id = {
                type: "like",
                value: "%" + (Math.floor(Math.random() * 10) % 5)
            };
        }
    }

    // 查询免费的
    if (type == 7) {
        searchObj.isfree = {
            type: "=",
            value: 1
        };
        if (myshuffle == 1) {
            // 只选20%
            searchObj.id = {
                type: "like",
                value: "%" + (Math.floor(Math.random() * 10) % 5)
            };
        }
    }

    // 查询完结的
    if (type == 8) {
        searchObj.isover = {
            type: "=",
            value: 1
        };
        if (myshuffle == 1) {
            // 只选20%
            searchObj.id = {
                type: "like",
                value: "%" + (Math.floor(Math.random() * 10) % 5)
            };
        }
    }

    // 查询最新吐槽的
    if (type == 9) {
        // 先去查询弹幕信息
        basic.get(function (err, data) {
            if (err) {
                // 记录失败
                callback({
                    ret: 1,
                    msg: "query error",
                    data: []
                });
                return false;
            }
            var _t = JSON.parse(data || "[]");
            // console.log(_t);
            // callback({
            //     ret: 0,
            //     msg: "",
            //     data: _t
            // });
            // 如果有多条，则取最新的一条就好了
            // 根据吐槽信息查询
            var _tclist = [], _tcomic = [], _tobj = {};
            _t.forEach(function (ceil, index) {
                if (!_tobj[ceil.comic]) {
                    _tobj[ceil.comic] = 1;
                    ceil.index = index;
                    _tclist.push(ceil);
                    _tcomic.push(ceil.comic);
                }
            });
            // console.log(_tclist, _tcomic);
            // 分页
            _tclist = _tclist.slice(pageindex * length, (+pageindex + 1) * length + length);
            _tcomic = _tcomic.slice(pageindex * length, (+pageindex + 1) * length + length);
            // console.log(_tcomic);
            searchObj.name = {
                type: "in",
                value: _tcomic
            };
            otherObj.pagesize = 100000;
            otherObj.pagenum = 1;

            // 吐槽信息
            dogetit(function (data) {
                // console.log(_tcomic, data);
                var _sortArr = [];
                _tclist.forEach(function (ceil) {
                    var _st = data.filter(function (cceil) {return cceil.name == ceil.comic});
                    if (_st && _st.length) {
                        _st[0].bullet = ceil;
                        _sortArr.push(_st[0]);
                    }
                });
                return _sortArr.slice(0, 10);
            });
        }, "bulletsample");
    } else {
        // 直接去查询了
        dogetit();
    }

    // 查询漫画信息
    function dogetit (callit) {
        // console.log(searchObj, otherObj);
        // 先查询出所有的漫画信息吧
        comicsDao.queryList(function (err, data) {
            if (err) {
                callback({
                    ret: 1,
                    msg: "query error",
                    data: []
                });
                return false;
            }
            // 判断是否有分类
            if (cate) {
                cate = cate.split(",");
                // data = data.data.filter(function (ceil) {
                //     return ceil.charactors.split(",").some(function (cceil) {
                //         return cate.indexOf(cceil) != -1;
                //     });
                // });
                data = data.data;

                // 再给data排序，根据相关性排序
                data.forEach(function (ceil) {
                    ceil.cateRelate = 0;
                    // 给每一个类型打分
                    var _zz = ceil.charactors.split(",");
                    _zz.forEach(function (cceil, index) {
                        // 判断着cceil是在cate的哪个位置
                        var _pos = -1;
                        cate.forEach(function (ccceil, iindex) {
                            if (ccceil.indexOf(cceil) != -1 || cceil.indexOf(ccceil) != -1) {
                                _pos = iindex;
                            }
                        });

                        var _pos = cate.indexOf(cceil);
                        if (_pos != -1) {
                            // console.log("找到了，在：" + _pos + "位置", cate.length, ceil.name);
                            // 找到了
                            ceil.cateRelate += (cate.length - _pos) * (_zz.length - index) * ceil.readcount;
                        }
                    });
                });
                // console.log(data);
            } else {
                data = data.data;
            }
            
            // 根据type判断
            if (type == 1 || type == 7) {
                // 最新的
                data.sort(function (a, b) {
                    if (a.updatetime > b.updatetime) {
                        return -1;
                    } else if (a.updatetime == b.updatetime) {
                        return 0;
                    } else {
                        return 1;
                    }
                });
            } else if (type == 6) {
                // 新上架
                data.sort(function (a, b) {
                    if (a.createtime > b.createtime) {
                        return -1;
                    } else if (a.createtime == b.createtime) {
                        return 0;
                    } else {
                        return 1;
                    }
                });
            } else if (type == 2 || type == 8) {
                // 当天，我要知道今天是哪天
                data.sort(function (a, b) {
                    if (a[_colum] - b[_colum] > 0) {
                        return -1;
                    } else if (a[_colum] == b[_colum]) {
                        return 0;
                    } else {
                        return 1;
                    }
                });
            } else if (type == 3) {
                // 是本周
                data.sort(function (a, b) {
                    var _acount = (+a.week1_count || 0) + (+a.week2_count || 0) + (+a.week3_count || 0) + (+a.week4_count || 0) + (+a.week5_count || 0) + (+a.week6_count || 0) + (+a.week7_count || 0);
                    var _bcount = (+b.week1_count || 0) + (+b.week2_count || 0) + (+b.week3_count || 0) + (+b.week4_count || 0) + (+b.week5_count || 0) + (+b.week6_count || 0) + (+b.week7_count || 0);
                    
                    if (_acount > _bcount) {
                        return -1;
                    } else if (_acount == _bcount) {
                        return 0;
                    } else {
                        return 1;
                    }
                });
            } else {
                // 如果是有cate的话，就按照cate的方式排序的
                if (cate) {
                    if (cate != "韩国") {
                        if (cate.length != 1) {
                            // 最热
                            data.sort(function (a, b) {
                                if (a["cateRelate"] - b["cateRelate"] > 0) {
                                    return -1;
                                } else if (a["cateRelate"] == b["cateRelate"]) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            });
                        }
                        
                        // 手动分个页
                        data = data.slice(pageindex * length, (+pageindex + 1) * length);
                    } else {
                        // dfvcb
                        // var data1 = data.filter(function (ceil) {return ceil.name.indexOf("dfvcb") != -1});
                        // youma
                        var data2 = data.filter(function (ceil) {return ceil.name.indexOf("youma") != -1 && ceil.replacesource != "empty"});
                        
                        // var data11 = [], data22 = [];
                        // data1.forEach(function (ceil) {
                        //     data11.push(ceil.z_ch_name);
                        // });
                        // data2.forEach(function (ceil) {
                        //     data22.push(ceil.z_ch_name);
                        // });
                        // console.log(JSON.stringify(data11), JSON.stringify(data22));

                        // 来一个平均分配
                        // 哪边大，就用哪边来处理
                        // if (data1.length > data2.length) {
                        //     var bigger = data1;
                        //     var smaller = data2;
                        // } else {
                        //     var bigger = data2;
                        //     var smaller = data1;
                        // }
                        // var rate = Math.floor(bigger.length / smaller.length);
                        // var _tdata = [], j = 0;
                        // for (var i = 0, len = bigger.length ; i < len ; i++) {
                        //     if (i % rate == 0) {
                        //         if (smaller[j]) {
                        //             _tdata.push(smaller[j++]);
                        //         }
                        //     }
                        //     _tdata.push(bigger[i]);
                        // }

                        data = data2;
                        // 韩国的，来一个每天更新（保留6本）（每天更新2本）
                        // var time = 
                        // 先计算
                        var _t = Math.floor((new Date().getTime() + (8 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)) % (data.length);
                        // console.log("_t=", _t);
                        data = data.concat(data).concat(data).concat(data).concat(data).slice(_t * 4, _t * 4 + 40);
                        var _time = [["12:12", "12:34", "14:21", "14:56"], ["08:56", "09:12", "12:10", "12:12"], ["15:21", "16:36", "16:41", "17:21"],["11:10", "11:47", "12:31", "12:43"], ["10:06", "15:38", "16:21", "16:54"], ["14:41", "17:09", "18:21", "19:01"], ["12:10", "20:12", "21:12", "21:14"], ["14:24", "21:19", "23:21", "23:45"], ["10:12", "22:22", "22:34", "23:11"], ["15:16", "16:35", "16:36", "17:01"], ["08:22", "09:01", "10:21", "10:24"], ["16:45", "17:57", "18:01", "18:09"], ["16:12", "17:36", "18:56", "19:21"], ["13:12", "14:21", "15:46", "15:34"], ["02:17", "02:35", "10:38", "11:42"], ["05:06", "05:47", "13:11", "15:21"], ["12:18", "12:36", "17:54", "18:01"], ["11:56", "12:09", "12:32", "12:45"]];
                        // 时间也是要轮询的
                        var _t2 = Math.floor((new Date().getTime() + (8 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)) % (_time.length);
                        _time = _time.concat(_time).slice(_t2, _t2 + 10);
                        _time.reverse();
                        data.reverse();
                        
                        // 现在有40个data, 10个time
                        // 判断今天是否更新到了
                        data.forEach(function (ceil, index) {
                            ceil.recommend = $formatDate(new Date(new Date().getTime() - (Math.floor(index / 4) * 1000 * 60 * 60 * 24)), "YYYY-MM-DD") + " " + _time[Math.floor(index / 4)][3 - (index % 4)];
                        });
                        // 判断今天是否更新到了
                        data = data.filter(function (ceil) {
                            var _t = ceil.recommend;
                            ceil.recommend = "更新时间：" + ceil.recommend;
                            return new Date() >= new Date(_t);
                        }).slice(0, 36);
                        
                        data = data.slice(pageindex * length, (+pageindex + 1) * length);
                    }
                } else {
                    // 最热
                    data.sort(function (a, b) {
                        if (a["readcount"] - b["readcount"] > 0) {
                            return -1;
                        } else if (a["readcount"] == b["readcount"]) {
                            return 0;
                        } else {
                            return 1;
                        }
                    });
                }
            }
            // 要做分页
            // var pageindex = req.query.index || 0;
            if (type == 3) {
                data = data.slice(pageindex * length, (+pageindex + 1) * length);
            }
            
            // var _ret = data.slice(pageindex * 10,(+pageindex + 1) * 10);
            var _ret = data;
            if (myshuffle && cate != "韩国") {
                _ret = shuffle(_ret);
            }

            var _back = [];
            _ret.forEach(function (ceil) {
                _back.push({
                    name: ceil.name,
                    z_ch_name: ceil.z_ch_name,
                    author: ceil.author,
                    charactor_counts: ceil.charactor_counts,
                    charslen: ceil.charactor_counts,
                    charactors: ceil.charactors,
                    tags: ceil.tags,
                    indexpic: ceil.indexpic,
                    updatetime: ceil.updatetime,
                    createtime: ceil.createtime,
                    week1_count: ceil.week1_count,
                    week2_count: ceil.week2_count,
                    week3_count: ceil.week3_count,
                    week4_count: ceil.week4_count,
                    week5_count: ceil.week5_count,
                    week6_count: ceil.week6_count,
                    week7_count: ceil.week7_count,
                    readcount: ceil.readcount,
                    recommend: ceil.recommend,
                    limitinfo: ceil.limitinfo,
                    descs: ceil.descs && ceil.descs.replace(/^[^。，]*的[^。，]*漫画[。，]/, "").replace(/^漫画讲述了/, "").replace(/^介绍:/, "").replace(/^[^：]+简介：/, "").replace(/^[^：]+漫画：/, "").trim().slice(0,20)
                });
            });

            _back.forEach(function (ceil) {
                ceil.updatetimestr = $formatDate(new Date(ceil.updatetime), "YYYY-MM-DD HH:II:SS");
            });

            // 是否存在回调前的处理
            if (callit) {
                _back = callit(_back);
            }
            callback({ret:0, data: _back});
        }, searchObj, otherObj);
    }
}

function shuffle(arr) {  
    var array = arr.concat();  
    for(var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);   
    return array;  
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