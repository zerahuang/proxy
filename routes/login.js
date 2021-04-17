// 引用dao
var userDao = require("../dao/user");
var http = require("http");
var request = require('request');
var querystring=require('querystring');
var basic = require("../model/basic");
var async = require("async");
var comicusersDao = require("../dao/comicusers");
var cpsuserDao = require("../dao/cpsuser");

// 获得用户信息
exports.getuser = function (req, res, next) {
  // platform
  var platform = "";
  try {
    platform = JSON.parse(req.cookies.platform).platform;
  } catch(e) {}

  var nameid = req.cookies.nameid;
  // 如果没有，就返回失败
 	if (!nameid) {
 		res.jsonp({ret: 1, msg: "no nameid"});
 	} else {
 		// 查询user信息
 		userDao.queryById(function (err, data) {
 			if (err || (data && data.length == 0)) {
 				res.jsonp({ret: 3, msg: "no person"});
 			} else {
 				var _tt = data[0];
 				// 更新最新时间
 				userDao.update(function () {}, {
 					lastlogintime: new Date(),
          lastloginplatform: platform
 				}, _tt.userid);

 				delete _tt.openid;
 				delete _tt.session_key;
 				res.jsonp({ret: 0, msg: "", data: _tt});
 			}
 		}, nameid);
 	}
}

// 获得用户
exports.getuserbyid = function (req, res, next) {
  var uid = req.query.uid;
  comicusersDao.queryById(function (err, data) {
    if (err) {
      // 返回异常
      res.jsonp({ret: 4, msg: "err1"});
      return false;
    }

    try {
      var zhifuinfo = JSON.stringify(JSON.parse(data[0].payinfo || "[]").slice(0, 2));
    } catch (e) {
      var zhifuinfo = "";
    }

    res.jsonp({ret: 0, data: "注册时间：" + $formatDate(new Date(data[0].registertime), "YYYY-MM-DD HH:II:SS") + " 阅读次数：" + data[0].readcount + " 广告次数：" + data[0].adscount + (data[0].viptime ? " VIP到期时间：" + $formatDate(new Date(+data[0].viptime), "YYYY-MM-DD HH:II:SS") : "") + " 支付信息：" + zhifuinfo});
  }, uid);
}

// 登录
exports.login = function (req, res, next) {
  // platform
  var platform = "";
  try {
    platform = JSON.parse(req.cookies.platform).platform;
  } catch(e) {}

  var code = req.query.code;
  if (!code) {
  	res.jsonp({ret: 1, msg: "no code"});
  } else {

    //https://servicewechat.com/wxc85441a693fcee05/devtools/page-frame.html
    // console.log(req.headers.referer);
    // if (req.headers.referer.indexOf("wxc85441a693fcee05") != -1) {
    //   var msg = {
    //     appid: "wxc85441a693fcee05",
    //     secret: "8fea78bfd2065a2aa87d2adb054d1817",
    //     js_code: code,
    //     grant_type: "authorization_code"
    //   };
    // } else {
    //   var msg = {
    //     appid: "wx3ef52935bae59548",
    //     secret: "3fe420c82df992ff09214d7d2bb81e19",
    //     js_code: code,
    //     grant_type: "authorization_code"
    //   };
    // }
    
    // 过滤出appid
    var nowappid = req.headers.referer.match(/servicewechat\.com\/([^\/]+)/);
    if (!nowappid) {
      res.jsonp({ret: 1, msg: "not wxapp"});
      return false;
    } else {
      nowappid = nowappid[1];
    }
    
    // console.log(nowappid);
    // 根据appid，去查询信息
    cpsuserDao.queryById(function (apperr , appdata) {
      if (apperr || (appdata && appdata.length == 0)) {
        res.jsonp({ret: 1, msg: "no appid"});
      } else {
        var msg = {
          appid: nowappid,
          secret: appdata[0].skey,
          js_code: code,
          grant_type: "authorization_code"
        };
        
        // 登录
        var postData =  querystring.stringify(msg);
        // console.log(postData);
        request({
            url: 'https://api.weixin.qq.com/sns/jscode2session?' + postData,
            method: 'get'
        }, function(error, response, body){
            if (error || response.statusCode != 200) {
              // 有报错
              res.jsonp({ret: 3, msg: "http error"});
            } else {
              try {
                var _t = JSON.parse(body);

                if (!_t.errcode) {
                  // 新增用户
                  userDao.add(function (err, data) {
                    // 判断新增成功还是失败
                    if (err) {
                      // 新增失败
                      res.jsonp({ret: 5, msg: "db error"});
                    } else {
                      // 判断是新增还是更新啊
                      if (data.insertId) {
                        // 那就是新增的，要去更新注册时间
                        userDao.update(function (err2, data2) {
                        }, {
                          registertime: new Date()
                        }, data.insertId);

                        // 如果是新增，还要新增一个数据
                        // 还要新增其他的
                        comicusersDao.add(function (err2, data2) {
                          // 新增成功
                        }, {
                          userid: data.insertId,
                          // lastviewed: new Date(),
                          registertime: new Date()
                        });

                      }

                      // 成功的
                      userDao.queryList(function (err, data) {
                        // console.log(data);
                        if (err || (data && data.data && data.data.length == 0)) {
                          res.jsonp({ret: 6, msg: "db error"});
                        } else {
                          var _tt = data.data[0];
                          delete _tt.openid;
                          delete _tt.session_key;
                          res.jsonp({ret: 0, msg: "", data: _tt});
                        }
                      }, {
                        openid: {
                            type: "=",//= like
                            value: _t.openid
                        }
                      });
                    }
                  }, {
                    openid: _t.openid,
                    session_key: _t.session_key,
                    lastloginplatform: platform,
                    lastlogintime: new Date()
                  }, {
                    key: "openid"
                  });
                } else {
                  console.log(_t);
                  res.jsonp({ret: 7, msg: _t});
                }
                
              } catch (e) {
                res.jsonp({ret: 4, msg: "parse error" + e.toString()});
              }
            }
        });
      }
      // console.log(err, data);
    }, nowappid);
  }
}

// 上报formid
exports.reportformid = function (req, res, next) {
	// 一定要是有用户的，否则失败
	var nameid = req.cookies.nameid;
	var formid = req.query.formId;

  if (formid == "the formId is a mock one") {
    // 这个不行哦
    res.jsonp({
      ret: 0
    });
  } else {
    // 如果没有，就返回失败
    if (!nameid ||!formid) {
      res.jsonp({ret: 1, msg: "no nameid or formid"});
    } else {
      // 查询user信息
      userDao.queryById(function (err, data) {
        if (err || (data && data.length == 0)) {
          res.jsonp({ret: 3, msg: "no person"});
        } else {
          var _tt = data[0];
          // 先拿出formid
          var formids = _tt.formids;
          if (!formids) {
            formids = [];
          } else {
            formids = JSON.parse(formids);
          }

          formids.push({
            t: new Date(),
            v: formid
          });

          // 要处理formid
          // 一个用户最多按顺序保留20个可用的formid new Date(new Date(ceil.t).getTime() + 1000 * 60 * 60 * 24 * 7)
          formids = formids.filter(function (ceil) { 
            return new Date(new Date(ceil.t).getTime() + 1000 * 60 * 60 * 24 * 7) > new Date();
          });

          // 排序
          formids.sort(function (a, b) {
            if (new Date(a.t) - new Date(b.t) > 0) {
              return -1;
            } else if (new Date(a.t) - new Date(b.t) == 0) {
              return 0;
            } else {
              return 1;
            }
          });
          formids = formids.slice(0, 20);

          // 更新用户信息
          userDao.update(function (err2, data2) {
            res.jsonp({
              err2, data2
            });
          }, {
            formids : JSON.stringify(formids)
          }, _tt.userid);
        }
      }, nameid);
    }
  }
}

function filterNicknameWithEmoj(nickname){
    var regStr = /[\uD83C|\uD83D|\uD83E][\uDC00-\uDFFF][\u200D|\uFE0F]|[\uD83C|\uD83D|\uD83E][\uDC00-\uDFFF]|[0-9|*|#]\uFE0F\u20E3|[0-9|#]\u20E3|[\u203C-\u3299]\uFE0F\u200D|[\u203C-\u3299]\uFE0F|[\u2122-\u2B55]|\u303D|[\A9|\AE]\u3030|\uA9|\uAE|\u3030/ig;

    var nickname_filter="";
    //regStr.test(nickname)会一次成功一次失败，待排查是否和regStr写法有关
    if(regStr.test(nickname)){
        nickname_filter = nickname.replace(regStr,"");
        nickname_filter = removeBlank(nickname_filter);
        return nickname_filter;
    }
    return nickname;
}

function removeBlank(str){
    str = str.trim();
    var ret = "";
    for(var i = 0; i < str.length; i++){
        if(str[i] != ' '){
            ret+=str[i];
        }
    }
    return ret;
}

// 更新信息
exports.update = function (req, res, next) {
	var nameid = req.cookies.nameid;
    // 如果没有，就返回失败
   	if (!nameid) {
   		res.jsonp({ret: 1, msg: "no nameid"});
   	} else {
   		// 查询user信息
   		userDao.queryById(function (err, data) {
   			if (err || (data && data.length == 0)) {
   				res.jsonp({ret: 3, msg: "no person"});
   			} else {
   				var _tt = data[0];
   				// 更新最新时间
   				var param = req.query;
          var _t = {
            nickName: param.nickName,
            gender: param.gender,
            language: param.language,
            city: param.city,
            province: param.province,
            country: param.country,
            avatarUrl: param.avatarUrl
          };
          param = _t;
          if (param.nickName) {
            param.nickName = filterNicknameWithEmoj(param.nickName);
          }
          param.lastlogintime = new Date();
   				userDao.update(function (err2, data2) {
   					res.jsonp({err2, data2});
   				}, param, _tt.userid);
   			}
   		}, nameid);
   	}
}

// 发服务通知
exports.notice = function (req, res, next) {
  // 获得信息
  try {
    console.log(req.query.params);
    var params = JSON.parse(req.query.params);
    if (!params.template_id || !params.page || !params.data) {
      // 不能没有用户信息啊
      res.jsonp({ret: 3, msg: "param error"});
      return false;
    }
    // 看看有哪些用户
    userDao.queryList(function (err, data) {
      if (err) {
        // 有异常啊
        res.jsonp({ret: 2, msg: "query error"});
      } else {
        // 没有异常，按照touser去过滤吧
        try {
          var reg = new RegExp(params.touser);
        } catch(e) {
          // console.log(list);
          res.jsonp({ret: 4, msg: "reg error"});
          return false;
        }
        
        var list = [];
        data.data.forEach(function (ceil) {
          if (params.lastestuser) {
            // 多少天内的
            // 如果正确的话
            if (new Date().getTime() - new Date(ceil.lastlogintime).getTime() <= (1000 * 60 * 60 * 24 * params.lastestuser)) {
              // 还要判断是否有可用的formid
              var formids = ceil.formids;
              if (!formids) {
                formids = [];
              } else {
                formids = JSON.parse(formids);
              }
              if (formids.length) {
                list.push(ceil);
              }
            }
          } else if (params.nobackuser) {
            // 是N天内没有回流的用户
            // 如果正确的话
            if (new Date().getTime() - new Date(ceil.lastlogintime).getTime() > (1000 * 60 * 60 * 24 * params.nobackuser)) {
              // 还要判断是否有可用的formid
              var formids = ceil.formids;
              if (!formids) {
                formids = [];
              } else {
                formids = JSON.parse(formids);
              }
              if (formids.length) {
                list.push(ceil);
              }
            }
          } else {
            if (reg.test(ceil.userid + "")) {
              // 如果正确的话
              // 还要判断是否有可用的formid
              var formids = ceil.formids;
              if (!formids) {
                formids = [];
              } else {
                formids = JSON.parse(formids);
              }
              if (formids.length) {
                list.push(ceil);
              }
            }
          }
        });
        // console.log(list);
        // res.jsonp({ret: 0, data: list});
        // 兄弟们，再去做任务吧
        // 发模板消息
        // 发放成功，消耗formid
        // 获得token
        if (list.length > 0) {
          // 可以的
          basic.doNotice(list, params, function (err, data) {
            res.jsonp({ret: 0, msg: "", data: data});
          });
        } else {
          res.jsonp({ret: 5, msg: "no users"});
        }
      }
    }, {}, {pagesize: 99999});
  } catch (e) {
    res.jsonp({ret: 1, msg: "param error"});
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