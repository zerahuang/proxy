// 引用dao
var comicsDao = require("../dao/comics");
var charactorsDao = require("../dao/charactors");
var http = require("http");
var https = require("https");
var url = require("url");
var async = require("async");
var request = require("request");
var basic = require("../model/basic");
var comicRoute = require("../routes/comic");


// 洗牌算法
function shuffle(arr) {  
    var array = arr.concat();  
    for(var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);   
    return array;  
}

// 开始执行操作
function doit (item, callback) {
  // 不管执行成功还是失败，都要返回
  // 整体try catch一下
  try {
    if (item.name.indexOf("mh1234--") != -1) {
      // 是getWecUrl2
      comicRoute.getWecUrl2("https://www.mh1234.com/comic/" + item.name.replace("mh1234--", "") + ".html", item.z_ch_name, function (err2, data2) {
        // console.log(err2, data2);
        if (data2 && !/^\[/.test(data2)) {
          // 有异常，就更新一下
          // 判断是否到限制
          if (item.updatetried == 2) {
            comicsDao.update(function (err3, data3) {
              callback("", {
                name: item.z_ch_name + "[" + item.name + "]",
                msg: "更新失败",
                err: data2
              });
            }, {
              updatetried: 0,
              updatetime: new Date()
            }, item.name);
          } else {
            comicsDao.update(function (err3, data3) {
              callback("", {
                name: item.z_ch_name + "[" + item.name + "]",
                msg: "更新失败",
                err: data2
              });
            }, {
              updatetried: !item.updatetried ? 1 : +item.updatetried + 1
            }, item.name);
          }
        } else {
          callback("", {
            name: item.z_ch_name,
            msg: "更新成功"
          });
        }
      });
    } else if (item.name.indexOf("dfvcb--") != -1) {
      comicRoute.buildComic3({
        query: {
          comicid: item.name.replace("dfvcb--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.data && data.data.indexOf("[") != -1) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("pufei--") != -1) {
      comicRoute.buildComic4({
        query: {
          comicid: item.name.replace("pufei--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("tutu--") != -1) {
      comicRoute.buildComic6({
        query: {
          comic: item.name.replace("tutu--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("manhuadb--") != -1) {
      comicRoute.buildComic7({
        query: {
          comicid: item.name.replace("manhuadb--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("youma--") != -1) {
      comicRoute.buildComic5({
        query: {
          comicname: item.z_ch_name,
          type: 1
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});

      // 更新
      comicRoute.buildComic16({
        query: {
          comicname: item.z_ch_name,
          type: 1
        }
      }, {
        jsonp: function (data) {
        }
      }, function () {});
    } else if (item.name.indexOf("duoduo--") != -1) {
      comicRoute.buildComic8({
        query: {
          comicid: item.name.replace("duoduo--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("yiyi--") != -1) {
      comicRoute.buildComic9({
        query: {
          comicid: item.name.replace("yiyi--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("vi--") != -1) {
      comicRoute.buildComic11({
        query: {
          comicid: item.name.replace("vi--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("manmankan--") != -1) {
      comicRoute.buildComic12({
        query: {
          comicid: item.name.replace("manmankan--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("gm--") != -1) {
      comicRoute.buildComic10({
        query: {
          comicid: item.name.replace("gm--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("mt--") != -1) {
      comicRoute.buildComic13({
        query: {
          comicid: item.name.replace("mt--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("dy--") != -1) {
      comicRoute.buildComic14({
        query: {
          comicid: item.name.replace("dy--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else if (item.name.indexOf("gf--") != -1) {
      comicRoute.buildComic15({
        query: {
          comicid: item.name.replace("gf--", "")
        }
      }, {
        jsonp: function (data) {
          if (data && data.ret == 0) {
            callback("", {
              name: item.z_ch_name,
              msg: "更新成功"
            });
          } else {
            // 有异常，就更新一下
            // 判断是否到限制
            if (item.updatetried == 2) {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err || data.msg
                });
              }, {
                updatetried: 0,
                updatetime: new Date()
              }, item.name);
            } else {
              comicsDao.update(function (err3, data3) {
                callback("", {
                  name: item.z_ch_name + "[" + item.name + "]",
                  msg: "更新失败",
                  err: data.err
                });
              }, {
                updatetried: !item.updatetried ? 1 : +item.updatetried + 1
              }, item.name);
            }
          }
        }
      }, function () {});
    } else {
    }
  } catch (e) {
    // 捕获到异常
    // 也要打标
    comicsDao.update(function (err3, data3) {
      callback("", {
        name: item.z_ch_name + "[" + item.name + "]",
        msg: "更新失败",
        err: "会导致程序奔溃的异常：" + e && e.toString && e.toString()
      });
    }, {
      updatetried: !item.updatetried ? 1 : +item.updatetried + 1
    }, item.name);
  }
}

// 开始轮询
function doUpdate () {
  // 查询所有漫画信息
  comicsDao.queryList(function (err, data) {
    // console.log(data);
    if (err) {
      console.log(err);
      console.log("查询失败");
      basic.mailme(err, "更新进程查询漫画列表失败");
    } else {
      // 过滤一下
      // var _tdata = data.data.filter(function (ceil) {
      //   // 必须要是3天内没更新的
      //   var _fixTime = new Date() - new Date(ceil.updatetime) > 3 * 24 * 60 * 60 * 1000;
      //   return _fixTime;
      // });
      var _tdata = data.data;
      
      // 去掉isout和dfvcb
      _tdata = _tdata.filter(function (ceil) {
        return !+ceil.isout && ceil.name.indexOf("dfvcb") == -1;
      });
      
      // 乱序一下
      _tdata = shuffle(_tdata).slice(0, Math.ceil(_tdata.length / (3 * 24 * 60 / 5) * 3));

      if (_tdata.length > 0) {
        var funcs = [];
        _tdata.forEach(function (ceil, index) {
            funcs.push(function (innerCall) {
                doit(ceil, innerCall);
            });
        });
        // 数据
        async.parallelLimit(funcs, 3, function(err, data) {
            console.log("", JSON.stringify(data));
        });
        // console.log(_tdata);
      } else {
        console.log("没有可更新的");
      }
      // console.log(_tdata);
    }
  }, {
    updatetime: {
      value: $formatDate(new Date(new Date() - 3 * 24 * 60 * 60 * 1000), "YYYY-MM-DD HH:II:SS"),
      type: "<"
    },
    isover: [{
      type: "=",
      value: 0
    }, {
      type: "is",
      value: null
    }]
  }, {pagesize: 10000});
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

// 每隔5分钟查询一次
setInterval(function () {
  doUpdate();
}, 5 * 60 * 1000);


doUpdate();