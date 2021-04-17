var pool = require("../utils/dbpool").getPool();
var async = require("async");

// 初始化
exports.init = function (options) {
    // 数据表
    var tablename = options.tablename;
    // 主键
    var primarykey = options.primarykey;
    // 排序值
    var sortkey = options.sortkey;


    /**
     * 根据factid查询工厂信息
     * @Author   huangshoalu
     * @DateTime 2019-04-26
     * @param    {Function}  callback 回调函数
     */
    function queryById (callback, id, opts) {
        pool.query("select * from " + (opts && opts.tablename || tablename) + " where " + primarykey + " = ?", [id], function (err, data) {
            // 在服务器端，对https统一替换成http
            // getips(function (errip, dataip) {
                if (data && data.length > 0) {
                    data.forEach(function (ceil) {
                        if (ceil.indexpic) {
                            // 做一个替换
                            // ceil.indexpic = ceil.indexpic.replace("imggg.wh156.cn:18181", "dgkk.wh156.cn");
                            // ceil.indexpic = ceil.indexpic.replace("dgkk.wh156.cn", "dgkk.wh156.cn:18181");
                            ceil.indexpic = ceil.indexpic.replace("p.youma.org", "bbb.youma.org").replace("bbb.youma.org", "cdn.wwwcom.xyz").replace("ddgk.aswyp.com:18181", "qcloud.peiqi98.com:18181").replace("game.peiqi68.com:18181", "qcloud.peiqi98.com:18181").replace("tu.mh1234.com", "img.wszwhg.net").replace("220012.net", "youzipi.net").replace("youzipi.net", "jituoli.com").replace("jituoli.com", "youzipi.net").replace("caisangji.com", "91xiban.com");
                            // if (ceil.indexpic.indexOf("dgkk.wh156.cn") == -1) {
                                ceil.indexpic = ceil.indexpic.replace(/^https:\/\//g, "http://");

                            if (ceil.indexpic.indexOf("zhengdongwuye") != -1 || ceil.indexpic.indexOf("88bada.com") != -1) {
                                ceil.indexpic = "http://onhit.cn/sanpk/comic-proxy2?image=" + encodeURIComponent(ceil.indexpic);
                            }
                            if (ceil.indexpic.indexOf("wszwhg") != -1 || ceil.indexpic.indexOf("91xiban") != -1 || ceil.indexpic.indexOf("caisangji") != -1) {
                                // var _ips = ["115.221.116.21", "60.169.40.251"];
                                //     _ips = _ips[Math.floor(_ips.length * Math.random())];
                                // ceil.indexpic = "http://" + _ips + ":3000/?image=" + encodeURIComponent(ceil.indexpic);
                                // var nowip = getfromips(dataip);
                                // if (nowip) {
                                //     ceil.indexpic = "http://" + nowip + ":3000/?image=" + encodeURIComponent(ceil.indexpic);
                                // } else {
                                //     ceil.indexpic = "http://onhit.cn/sanpk/comic-proxy?image=" + encodeURIComponent(ceil.indexpic.replace(/^https?:\/\//, ""));
                                // }
                                ceil.indexpic = "https://www.onhit.cn/sanpk/comic-proxy3?image=" + encodeURIComponent(ceil.indexpic);
                            } 
                            // if (ceil.indexpic.indexOf("cdn.wwwcom.xyz") != -1) {
                            //     ceil.indexpic = ceil.indexpic.replace(/^http:\/\//g, "https://");
                            // }
                            // } else {
                            //     ceil.indexpic = ceil.indexpic.replace(/^http:\/\//g, "https://");
                            // }
                        }

                        // 替换一下分享的章节数
                        if (ceil.share_reward && ceil.share_reward > 3) {
                            ceil.share_reward = Math.floor(ceil.share_reward / 3 * 2);
                        }

                        if (ceil.urls) {
                            ceil.urls = ceil.urls.replace(/https:\/\//g, "http://");
                        }
                    });
                }

                callback(err, data);
            // });
        });
    }

    /**
     * 新增工厂信息
     * @Author   huangshoalu
     * @DateTime 2019-04-26
     * @param    {Function}  callback 回调函数
     * @param    {Object}    infos    新增信息
     */
    function add (callback, infos, options) {
        // options = {key: xx}
        // 如果infos里面有主键，就直接判断成有了
        if (infos[primarykey]) {
            if (!options) {
                options = {};
            }
            options.key = primarykey;
        }
        // 如果存在的话，就要判断一下，之前是否存在了
        if (options && options.key && infos[options.key]) {
            // 根据key去查询，如果存在就更新，而不是新增
            pool.query("select * from " + (options && options.tablename || tablename) + " where " + options.key + " = ?", [infos[options.key]], function (err, data) {
                if(err || (data && data.length == 0)){
                    doAdd();
                } else {
                    // 要更新，更新就把createtime去掉
                    delete infos.createtime;
                    update(function (err1, data1) {
                        if (!data1) {
                            data1 = {};
                        }
                        data1.insertId = data[0].id || 0;
                        callback(err1, data1);
                    }, infos, data[0][primarykey], {
                        tablename: options && options.tablename || tablename
                    });
                }
            });
        } else {
            doAdd();
        }

        function doAdd () {
            pool.query("insert into " + (options && options.tablename || tablename) + " set ?", infos, function(err, data) {
                callback(err, data);
            });
        }
    }

    /**
     * 更新工厂信息
     * @Author   huangshoalu
     * @DateTime 2019-04-26
     * @param    {Function}  callback 回调函数
     * @param    {Object}    infos    内容
     * @param    {String}    factid   工厂ID
     */
    function update (callback, infos, apply_id, opts) {
        /* apply_id
            {
                status: [{    // 在申请中的
                    type: ">=",
                    value: "5"
                }, {
                    type: "!=",
                    value: "6"
                }],
                factory_id: {    // 有对应factid的
                    type: "=",
                    value: obj.factid
                }
            }
         */

        var sql    = "update " + (opts && opts.tablename || tablename) + " set ";
        var _param = [];
        //将数据加入sql中去
        for (var i in infos) {
            sql += i + " = ? , ";
            _param.push(infos[i]);
        }
        // 去掉多余的逗号
        sql = sql.replace(/, $/, "");

        //设置where条件
        if (typeof apply_id != "object") {
            sql += " where " + primarykey + " = ?";
            _param.push(apply_id);
        } else {
            var where = "";
            // 按条件搜索
            for (var i in apply_id) {
                if (apply_id[i] instanceof Array) {
                    apply_id[i].forEach(function (ceil) {
                        where += " " + i + " " + ceil.type + " ? and ";
                        _param.push(ceil.type && ceil.type.indexOf("like") != -1 ? ("%" + ceil.value + "%") : ceil.value);
                    });
                } else {
                    where += " " + i + " " + apply_id[i].type + " ? and ";
                    _param.push(apply_id[i].type && apply_id[i].type.indexOf("like") != -1 ? ("%" + apply_id[i].value + "%") : apply_id[i].value);
                }
            }
            where && (where = ' where' + where.substring(0, where.length - 4));
            sql += where;
        }

        // 做一下判断，如果没有where，直接返回异常
        if (sql.indexOf("where") == -1) {
            callback("no where");
            return false;
        }  
        var _t = pool.query(sql, _param, function (err, result) {
            callback(err, result);
        });
    }

    // +1
    function addone (callback, colum, id, options) {
        // UPDATE comics set readcount = readcount + 1 WHERE id = 12;
        var sql    = "update " + (options && options.tablename || tablename) + " set " + colum + " = " + colum + " + 1 where " + primarykey + " = ?";
        var _param = [id];
        var _t = pool.query(sql, _param, function (err, result) {
            callback(err, result);
        });
    }

    /**
     * 根据条件查询
     * @Author   huangshoalu
     * @DateTime 2019-04-26
     * @param    {Function}  callback  回调函数
     * @param    {Number}    pagenum   页码
     * @param    {Number}    pagesize  每页长度
     * @param    {Object}    searchobj 搜索条件
     */
    function queryList (callback, searchobj, option) {
        // searchobj = {
        //      begin_time: {
        //          type: "<=",//= like
        //          value: "xxx"
        //      }
        // }
        if (!option) {
            option = {};
        }
        if ((option.pagenum && option.pagenum == "0") || !option.pagenum) {
            option.pagenum = 1;
        }
        option.pagesize = option.pagesize || 10;
        var pagingParam = [(option.pagenum - 1) * option.pagesize, option.pagesize * 1.0];
        var paramArr = [];
        var where = "";
        // 按条件搜索
        if (searchobj instanceof Array) {
            // 有数组就要特殊处理
            searchobj.forEach(function (ceilsearchobj) {
                where += " (";
                doWhere(ceilsearchobj);
                where += ") or ";
            });
            where && (where = where.replace(/and *$/, "").replace(/or *$/, ""));
        } else {
            doWhere(searchobj);
        }
        
        // where走一下
        function doWhere (mysearchobj) {
            for (var i in mysearchobj) {
                // 有数组的话，就是or
                if (mysearchobj[i] instanceof Array) {
                    where += " (";
                    mysearchobj[i].forEach(function (ceil) {
                        if (ceil.type == "in") {
                            where += " " + i + " in (?) or ";
                        } else {
                            where += " " + i + " " + ceil.type + " ? or ";
                        }
                        paramArr.push(ceil.type && ceil.type.indexOf("like") != -1 ? (ceil.value.indexOf("%") != -1 ? ceil.value : ("%" + ceil.value + "%")) : ceil.value);
                    });
                    where = where.substring(0, where.length - 3);
                    where += ") and ";
                } else {
                    if (mysearchobj[i].type == "in") {
                        where += " " + i + " in (?) and ";
                    } else {
                        where += " " + i + " " + mysearchobj[i].type + " ? and ";
                    }
                    paramArr.push(mysearchobj[i].type && mysearchobj[i].type.indexOf("like") != -1 ? (mysearchobj[i].value.indexOf("%") != -1 ? mysearchobj[i].value :  ("%" + mysearchobj[i].value + "%")) : mysearchobj[i].value);
                }
            }
            where && (where = where.replace(/and *$/, "").replace(/or *$/, ""));
        }

        where && (where = ' where' + where.replace(/and *$/, "").replace(/or *$/, ""));
        var sql = "select " + (option.sum ? "count(*) as sum" : (option && option.tablename || tablename) + ".*") + ", @curRank := @curRank + 1 AS rankPos from " + (option && option.tablename || tablename) + (option.sortkey || sortkey ? ", (SELECT @curRank := 0) p " : " ") + where + (option.sortkey || sortkey ? " order by " + (option.sortkey || sortkey) + " DESC" : "")
        
        // 查询列表和查询总数
        function _getList(callback) {
            pool.query(sql + " limit ?, ?", paramArr.concat(pagingParam), function (err, data) {
                // 在服务器端，对https统一替换成http
                // getips(function (errip, dataip) {
                    if (data && data.length > 0) {
                        data.forEach(function (ceil) {
                            if (ceil.indexpic) {
                                // 做一个替换
                                // ceil.indexpic = ceil.indexpic.replace("imggg.wh156.cn:18181", "dgkk.wh156.cn");
                                // ceil.indexpic = ceil.indexpic.replace("dgkk.wh156.cn", "dgkk.wh156.cn:18181");
                                ceil.indexpic = ceil.indexpic.replace("p.youma.org", "bbb.youma.org").replace("bbb.youma.org", "cdn.wwwcom.xyz").replace("ddgk.aswyp.com:18181", "qcloud.peiqi98.com:18181").replace("game.peiqi68.com:18181", "qcloud.peiqi98.com:18181").replace("tu.mh1234.com", "img.wszwhg.net").replace("220012.net", "youzipi.net").replace("youzipi.net", "jituoli.com").replace("jituoli.com", "youzipi.net").replace("caisangji.com", "91xiban.com");
                                // if (ceil.indexpic.indexOf("dgkk.wh156.cn") == -1) {
                                    ceil.indexpic = ceil.indexpic.replace(/^https:\/\//g, "http://");
                                    
                                if (ceil.indexpic.indexOf("zhengdongwuye") != -1 || ceil.indexpic.indexOf("88bada.com") != -1) {
                                    ceil.indexpic = "http://onhit.cn/sanpk/comic-proxy2?image=" + encodeURIComponent(ceil.indexpic);
                                }
                                if (ceil.indexpic.indexOf("wszwhg") != -1 || ceil.indexpic.indexOf("91xiban") != -1 || ceil.indexpic.indexOf("caisangji") != -1) {
                                    // var _ips = ["115.221.116.21", "60.169.40.251"];
                                    // _ips = _ips[Math.floor(_ips.length * Math.random())];
                                    // ceil.indexpic = "http://" + _ips + ":3000/?image=" + encodeURIComponent(ceil.indexpic);
                                    // var nowip = getfromips(dataip);
                                    // if (nowip) {
                                    //     ceil.indexpic = "http://" + nowip + ":3000/?image=" + encodeURIComponent(ceil.indexpic);
                                    // } else {
                                    //     ceil.indexpic = "http://onhit.cn/sanpk/comic-proxy?image=" + encodeURIComponent(ceil.indexpic.replace(/^https?:\/\//, ""));
                                    // }
                                    ceil.indexpic = "https://www.onhit.cn/sanpk/comic-proxy3?image=" + encodeURIComponent(ceil.indexpic);
                                } 
                                // } else {
                                //     ceil.indexpic = ceil.indexpic.replace(/^http:\/\//g, "https://");
                                // }
                            }

                            // 替换一下分享的章节数
                            if (ceil.share_reward && ceil.share_reward > 3) {
                                ceil.share_reward = Math.floor(ceil.share_reward / 3 * 2);
                            }

                            if (ceil.urls) {
                                ceil.urls = ceil.urls.replace(/https:\/\//g, "http://");
                            }
                        });
                    }
                    callback && callback(err, data);
                // });
            })
        }
        
        function _getCount (callback) {
            pool.query("select count(*) as count from (" + sql + ") counttable", paramArr, function(err, data) {
                // console.log(err, data);
                callback && callback(err, data && data[0] ? data[0].count : 0);
            })
        }

        // 总查询结果
        async.parallel({
            data: _getList,
            count: _getCount
        }, function(err, data) {
            callback(err, data);
        })
    }

    // 返回
    return {
        queryById: queryById,
        add: add,
        update: update,
        queryList: queryList,
        addone: addone
    }
}

// function getfromips (_t) {
//     // 返回一个ip即可
//     if (_t.length) {
//         var nowcount = 0;
//         _t.forEach(function (ceil) {
//             ceil.start = +nowcount;
//             nowcount += +ceil.w;
//             ceil.end = +nowcount;
//         });
//         var _rand = Math.random() * nowcount;
//         // console.log(_rand);
//         var _ret = _t.filter(function (ceil) {return ceil.start < _rand && ceil.end >= _rand});
//         if (_ret && _ret.length) {
//             var ip = _ret[0].ip;
//         } else {
//             var ip = "";
//         }
//     } else {
//         var ip = "";
//     }
//     return ip;
// }


// 获得ip信息
// function getips (callback) {
//   pool.query("select * from basicinfo where b_key = ?", ['ips'], function (err, data) {
//     if (err || (data && data.length == 0)) {
//       callback && callback("", []);
//     } else {
//       try {
//         var _t = JSON.parse(data[0].b_value);
//       } catch(e) {
//         var _t = [];
//       }
//       callback && callback("", _t);
//     }
//   });
// }