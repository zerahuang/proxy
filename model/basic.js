// 引用dao
var basicDao = require("../dao/basicinfo");
var http = require("http");
var request = require('request');
var querystring=require('querystring');
var userDao = require("../dao/user");
var async = require("async");
var comicsDao = require("../dao/comics");
var comicusersDao = require("../dao/comicusers");
var nodemailer = require('nodemailer');
var cpsuserDao = require("../dao/cpsuser");
var env = require("../utils/env");
if (env.getEnv() != "local") {
  var sm = require("sitemap");
}
var fs = require("fs");
var ejs = require('ejs')
var pool = require("../utils/dbpool").getPool();

// 获得
exports.get = function (callback, key) {
    // 要有key
   	if (key) {
   		// 查询吧
   		basicDao.queryById(function (err, data) {
   			if (err) {
   				// 查询失败
   				callback(err);
   			} else if (data.length == 0) {
   				// 没有数据
   				callback("", "");
   			} else {
   				// 有数据，判断数据过期了没有
   				if (data[0].expire_time && new Date(data[0].expire_time) < new Date()) {
   					// 过期了
   					callback("", "");
   				} else {
   					callback("", data[0].b_value, data[0].lastupdate_time);
   				}
   			}
   		}, key);
   	} else {
   		// 没有key
   		callback("key empty");
   	}
}

// 写数据(expiretime是秒)
exports.set = function (callback, key, value, expiretime) {
	// 判断数据
	if (!key) {
		// 不存在
		callback("key empty");
	} else {
		basicDao.add(function (err , data) {
			if (err) {
				// 插入失败
				callback(err);
			} else {
				callback("", "");
			}
		}, {
			b_key: key,
			b_value: value,
			expire_time: expiretime ? new Date(new Date().getTime() + expiretime * 1000) : "",
			lastupdate_time: new Date()
		});
	}
}

// 提醒我
exports.mailme = function (content, title) {
    // 获得数据
    exports.get(function (err, data) {
        if (err) {
            console.log(err);
            // 记录失败
            return false;
        }
        console.log(data);
        var _user = data.split("||")[0];
        var _pass = data.split("||")[1];
        console.log(_user, _pass);
        var transporter = nodemailer.createTransport({
            // host: 'smtp.ethereal.email',
            service: 'qq', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
            port: 465, // SMTP 端口
            secureConnection: true, // 使用了 SSL
            auth: {
                // user: '534144977@qq.com',//你的邮箱
                // // 这里密码不是qq密码，是你设置的smtp授权码
                // pass: 'esclteiinfsibjea',
                user: _user,//你的邮箱
                // 这里密码不是qq密码，是你设置的smtp授权码
                pass: _pass
                // wzreqqvkwnyyfbhf
                // user: '1772475604@qq.com',//你的邮箱
                // // 这里密码不是qq密码，是你设置的smtp授权码
                // pass: 'wzreqqvkwnyyfbhf'
            }
        });

        var mailOptions = {
            from: '"太阿" <' + _user + '>', // sender address
            to: "534144977@qq.com", // list of receivers
            subject: title || "新消息提示", // Subject line
            // 发送text或者html格式
            // text: 'Hello 我是火星黑洞', // plain text body
            html: content
        };
        console.log(mailOptions);
        // （如果还不行可以去“太阿轻互动”公众号，回复漫画名，或者扫下面的二维码）
        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId, "发送成功");
        });
    }, "mailinfos");
}

// 更新sitemap
exports.exportsitemap = function () {
    // 根据当天的阅读排行
    var _tWeekday = new Date().getDay();
    var _colum = "";
    switch (_tWeekday){
        case 0: _colum = "week6_count"; break;
        case 1: _colum = "week7_count"; break;
        case 2: _colum = "week1_count"; break;
        case 3: _colum = "week2_count"; break;
        case 4: _colum = "week3_count"; break;
        case 5: _colum = "week4_count"; break;
        case 6: _colum = "week5_count"; break;
        default: ;
    }
    comicsDao.queryList(function (err2, data2) {
        if (err2) {
            // 获得列表失败，很难
            exports.mailme("获得漫画列表失败：" + err2.toString());
        } else {
            // console.log(data2.data.length);

            try {
                var urls1 = [{
                    url: "https://www.onhit.cn",
                    changefreq: 'always',
                    lastmod: new Date(),
                    priority: 0.9
                }], urls2 = [{
                    url: "https://www.taie.fun",
                    changefreq: 'always',
                    lastmod: new Date(),
                    priority: 0.9
                }];
                var urlall1 = [], urlall2 = [], onhiturls = [];
                $shuffle(data2.data).slice(0, 2000).forEach(function (ceil) {
                    urls1.push({
                        url: "https://www.onhit.cn/sanpk/mh-comicindex?comic=" + ceil.name,
                        changefreq: 'daily',
                        lastmod: ceil.updatetime
                    });
                    
                    urls2.push({
                        url: "https://www.taie.fun/sanpk/mh-comicindex?comic=" + ceil.name,
                        changefreq: 'daily',
                        lastmod: ceil.updatetime
                    });

                    urlall1.push({
                        link: "http://www.onhit.cn/sanpk/mh-comicindex?comic=" + ceil.name,
                        name: ceil.z_ch_name
                    });

                    urlall2.push({
                        link: "http://www.taie.fun/sanpk/mh-comicindex?comic=" + ceil.name,
                        name: ceil.z_ch_name
                    });

                    onhiturls.push("http://www.onhit.cn/sanpk/mh-comicindex?comic=" + ceil.name);
                });
                
                // 提交一下啊
                exports.reportUrls(onhiturls.join("\n"), function (err, data) {
                  exports.mailme((err ? err.toString() : "") +  " - " + data);
                });

                // 写入sitemap.xml
                const stream1 = new sm.SitemapStream( { hostname: 'https://www.onhit.cn' } );
                urls1.forEach( link => stream1.write( link ) );
                stream1.end();
                sm.streamToPromise( stream1 ).then( data => fs.writeFileSync(process.cwd() + "/public/sitemap_onhit.xml", data.toString()));


                const stream2 = new sm.SitemapStream( { hostname: 'https://www.onhit.cn' } );
                urls2.forEach( link => stream2.write( link ) );
                stream2.end();
                sm.streamToPromise( stream2 ).then( data => fs.writeFileSync(process.cwd() + "/public/sitemap_taie.xml", data.toString()));

                // 写入html
                ejs.renderFile(process.cwd() + '/views/sitemap.ejs',{as:urlall1, time: $formatDate(new Date(), "YYYY-MM-DD HH:II:SS")},function (err,data) {
                  if(err) {
                      console.log('失败', err)
                  }else {
                      // console.log(data)
                      fs.writeFileSync(process.cwd() + "/public/sitemap_onhit.html", data);
                  }
                });

                ejs.renderFile(process.cwd() + '/views/sitemap.ejs',{as:urlall2, time: $formatDate(new Date(), "YYYY-MM-DD HH:II:SS")},function (err,data) {
                  if(err) {
                      console.log('失败', err)
                  }else {
                      // console.log(data)
                      fs.writeFileSync(process.cwd() + "/public/sitemap_taie.html", data);
                  }
                });
            } catch (e) {
                exports.mailme("处理sitemap失败：" + e.toString());
            }
        }
    }, {
        isout : [{
            type: "!=",
            value: 1
        }, {
            type: "is",
            value: null
        }],
        name: {
            type: "not like",
            value: "dfvcb"
        },
        isoffline: [{
            type: "!=",
            value: 1
        }, {
            type: "is",
            value: null
        }]
    }, {pagesize: 100000});
};
// exports.exportsitemap();


// 提交链接
exports.reportUrls = function (postData, callback) {
  request({
      url: 'http://data.zz.baidu.com/urls?site=https://www.onhit.cn&token=ImwZl1IgjenP6ksi',
      method: 'post',
      headers: {
          "content-type": "text/plain",
          "Content-Length": postData.length
      },
      // body: JSON.stringify(requestData)
      body: postData
  }, function(error, response, body){
      callback(error, body);
  });
}

// 更新access_token
exports.updateToken = function (callback) {
	// 做事
	function doit () {
		console.log(new Date(), "开始执行updateToken");
		// 先拉取access_token
		exports.get(function(err, value, time){
			// console.log(err, value, time);
			if (err || !value) {
				console.log(new Date(), "不存在或者异常，需要更新updateToken");
				// 要新增
				doUpdate();
			} else {
				// 判断是否需要更新
				if (new Date().getHours() == new Date(time).getHours()) {
					console.log(new Date(), "当前小时已经更新过updateToken了");
					// 已经更新过了
					callback && callback("", "");
				} else {
					console.log(new Date(), "正在更新updateToken");
					// 去更新
					doUpdate();
				}
			}
		}, "access_token");

        // 每天凌晨4点钟，执行一次
        if (new Date().getHours() == 4) {
            // 去获取所有漫画列表
            exports.exportsitemap();
        }

		// 一个小时执行一次的
		// 每天晚上8点到9点之间给3天前（6天前）的用户发回流提醒
		// 判断现在是这个时间吗？
		// if (new Date().getHours() == 25) {
		// 	// 可以发了啊
		// 	// 判断当前小时发过没有？
		// 	exports.get(function(err, value, time){
		// 		// console.log(err, value, time);
		// 		if (err) {
		// 			// 异常
		// 			console.log(new Date(), "获得notice_task_1异常", err);
		// 			return false;
		// 		}

		// 		if (!value) {
		// 			console.log(new Date(), "不存在，需要发通知了notice_task_1");
		// 			// 要新增
		// 			doNotice_task(function (err, data) {
		// 				if (!err) {
		// 					exports.set(function(){
		// 						// callback && callback();
		// 						// noticeback("", data);
		// 						console.log("任务结果1：", err, data);
  //                               exports.mailme("任务结果1：" + JSON.stringify(data));
		// 					}, "notice_task_1", 1, 60 * 60);
		// 				}
		// 				console.log(err, data);
		// 			}, 3);
		// 		} else {
		// 			console.log(new Date(), "存在，不需要发通知了notice_task_1");
		// 		}
		// 	}, "notice_task_1");

		// 	exports.get(function(err, value, time){
		// 		// console.log(err, value, time);
		// 		if (err) {
		// 			// 异常
		// 			console.log(new Date(), "获得notice_task_2异常", err);
		// 			return false;
		// 		}
				
		// 		if (!value) {
		// 			console.log(new Date(), "不存在，需要发通知了notice_task_2");
		// 			// 要新增
		// 			doNotice_task(function (err, data) {
		// 				if (!err) {
		// 					exports.set(function(){
		// 						// callback && callback();
		// 						// noticeback("", data);
		// 						console.log("任务结果2：", err, data);
  //                               exports.mailme("任务结果2：" + JSON.stringify(data));
		// 					}, "notice_task_2", 1, 60 * 60);
		// 				}
		// 				console.log(err, data);
		// 			}, 6);
		// 		} else {
		// 			console.log(new Date(), "存在，不需要发通知了notice_task_2");
		// 		}
		// 	}, "notice_task_2");
		// }
	}

	// 去给用户发服务通知的任务
	// function doNotice_task (noticeback, day) {
	// 	// 看看有哪些用户
	//     userDao.queryList(function (err, data) {
	//       if (err) {
	//         // 有异常啊
	//         noticeback(2, err);
	//       } else {
	//         var list = [];
	//         data.data.forEach(function (ceil) {
	//         	if (ceil.userid == 1) {
	//         		list.push(ceil);
	//         	} else {
	//         		// 是N天内没有回流的用户
	// 	            // 如果正确的话
	// 	            // if ( - .getTime() > (1000 * 60 * 60 * 24 * day)) {
	// 	            var _nowDate = new Date();
	// 	            var _fixedDate = new Date(_nowDate.getTime() - (1000 * 60 * 60 * 24 * day));
	// 	            var _userDate = new Date(ceil.lastlogintime);
	// 	            // console.log(_fixedDate, _userDate);
	// 	           	if (_fixedDate.getDate() == _userDate.getDate()) {
	// 	              // 还要判断是否有可用的formid
	// 	              var formids = ceil.formids;
	// 	              if (!formids) {
	// 	                formids = [];
	// 	              } else {
	// 	                formids = JSON.parse(formids);
	// 	              }
	// 	              if (formids.length) {
	// 	                list.push(ceil);
	// 	              }
	// 	            }
	//         	}
	//         });
	//         // console.log(list);
	//         // res.jsonp({ret: 0, data: list});
	//         // 兄弟们，再去做任务吧
	//         // 发模板消息
	//         // 发放成功，消耗formid
	//         // 获得token
	//         if (list.length > 0) {
	//           // 可以的
	//           // 去查看一下全部漫画信息
	// 	        comicsDao.queryList(function (err2, data2) {
	// 				if (err2) {
	// 					noticeback(5, err2);
	// 				} else {
	// 					var _t = [];
	// 					data2.data.sort(function (a, b) {
	// 						if (a.updatetime > b.updatetime) {
	// 		                    return -1;
	// 		                } else if (a.updatetime == b.updatetime) {
	// 		                    return 0;
	// 		                } else {
	// 		                    return 1;
	// 		                }
	// 					});
	// 					data2.data.forEach(function (ceil) {
	// 						_t.push(ceil.z_ch_name);
	// 					});

 //                        // 识别用户身份，要去查询用户的漫画信息
 //                        var _userids = [];
 //                        list.forEach(function (uceil) {
 //                            _userids.push(uceil.userid);
 //                        });

 //                        // 查询用户读漫画的情况
 //                        comicusersDao.queryList(function (err3, data3) {
 //                            if (err3 || (data3 && data3.data && data3.data.length == 0)) {
 //                                noticeback(6, "no comicusers");
 //                            } else {
 //                                // 找到自己的信息
 //                                list.forEach(function (ceil) {
 //                                    ceil.comicinfo = data3.data.filter(function (cceil) {return cceil.userid == ceil.userid});
 //                                    if (ceil.comicinfo.length > 0) {
 //                                        ceil.comicinfo = ceil.comicinfo[0];
 //                                        ceil.comicinfo.infos = JSON.parse(ceil.comicinfo.infos || "{}");
 //                                        var _ttt = [];
 //                                        for (var ii in ceil.comicinfo.infos) {
 //                                            _ttt.push({
 //                                                name: ii,
 //                                                info: ceil.comicinfo.infos[ii]
 //                                            });
 //                                        }
 //                                        ceil.comicinfo.infosArr = _ttt;
 //                                    } else {
 //                                        ceil.comicinfo = "";
 //                                    }

 //                                    // 判断是属于哪种的了
 //                                    if (!ceil.comicinfo || (ceil.comicinfo && ceil.comicinfo.infosArr.length == 0) || (ceil.comicinfo && ceil.comicinfo.infosArr.length != 0 && !ceil.comicinfo.readcount)) {
 //                                        // 给默认的就好
 //                                        ceil.page = "/pages/index/index?url=%2Fpages%2Ftv%2Findex%3Fpage%3Dlistrow%26type%3D1%26name%3D%E6%9C%80%E6%96%B0%26showtime%3D1";
 //                                        ceil.data = {
 //                                            "keyword1":{"value":"新漫画本上线"},
 //                                            "keyword2":{"value":"新热门经典漫画本上线全套免费看"},
 //                                            "keyword3":{"value": $formatDate(new Date(), "YYYY年MM月DD日 HH:II")},
 //                                            "keyword4":{"value":"漫画本又上线了几部超经典热门漫画。" + _t.slice(0,5).join("，") + "...快来看看吧"}
 //                                        }
 //                                    } else {
 //                                        // 根据用户信息给
 //                                        // 如果是3天的，永远是读第一部
 //                                        // 如果超过3天，就随机吧
 //                                        if (day <= 3) {
 //                                            var _currentComic = ceil.comicinfo.infosArr[0];
 //                                        } else {
 //                                            var _currentComic = ceil.comicinfo.infosArr[Math.floor(ceil.comicinfo.infosArr.length * Math.random())];
 //                                        }
 //                                        ceil.page = "/pages/tv/index?page=comicindex&comic=" + _currentComic.name;
 //                                        ceil.data = {
 //                                            "keyword1":{"value":"漫画更新提醒"},
 //                                            "keyword2":{"value":"您看过的漫画更新啦"},
 //                                            "keyword3":{"value": $formatDate(new Date(), "YYYY年MM月DD日 HH:II")},
 //                                            "keyword4":{"value": day <= 3 ? "亲爱的漫友，我是漫客谷的智能秘书小谷。您看过的漫画-端脑，最新同步已经完成。小谷正安静地等着你回来看看(*^__^*)。" : "亲爱的漫友，我是漫客谷的智能秘书小谷，您看过的漫画-端脑，最近又同步了两次。小谷正安静地等着你回来看看(*^__^*)。"}
 //                                        }
 //                                    }
 //                                });

 //                                console.log(list);
 //                            }
 //                        }, {
 //                            userid: {
 //                                type: "in",
 //                                value: _userids
 //                            }
 //                        }, {pagesize: 10000});


                        



	// 					// exports.doNotice(list, {
	// 			  //         	template_id: "yXkhPVETdDrmTSOFPKb-QMDy42ycxgb6AeJd5evouxg",
	// 			  //         	page: "/pages/index/index?url=%2Fpages%2Ftv%2Findex%3Fpage%3Dlistrow%26type%3D1%26name%3D%E6%9C%80%E6%96%B0%26showtime%3D1",
	// 			  //         	data: {
	// 					// 		"keyword1":{"value":"新漫画本上线"},
	// 					// 		"keyword2":{"value":"新热门经典漫画本上线全套免费看"},
	// 					// 		"keyword3":{"value": $formatDate(new Date(), "YYYY年MM月DD日 HH:II")},
	// 					// 		"keyword4":{"value":"漫画本又上线了几部超经典热门漫画。" + _t.slice(0,5).join("，") + "...快来看看吧"}
	// 					// 	}
	// 			  //       }, function (err, data) {
	// 			  //       	// exports.set(function(){
	// 					// 		// callback && callback();
	// 					// 		noticeback("", data);
	// 					// 	// }, "notice_task_1", 1, 60 * 60);
	// 			  //       });
	// 				}
	// 			}, {}, {pagesize: 10000});
	//         } else {
	//           noticeback(4, "no users");
	//         }
	//       }
	//     }, {}, {pagesize: 99999});
	// }

	// 更新
	function doUpdate () {
        // 去拉取所有appid和secret
        cpsuserDao.queryList(function (err, data) {
            // console.log(err, data);
            // 去批量更新access_token
            if (err || !data || (data && data.data && data.data.length == 0)) {
                return false;
            }
            var funcs = {};
            data.data.forEach(function (ceil) {
                funcs[ceil.appid] = function (innerCallback) {
                    var msg = {
                        appid: ceil.appid,
                        secret: ceil.skey,
                        grant_type: "client_credential"
                    };
                    var postData =  querystring.stringify(msg);
                    request({
                        url: 'https://api.weixin.qq.com/cgi-bin/token?' + postData,
                        method: 'get'
                    }, function(error, response, body){
                        // 做事了
                        if (!error && response.statusCode == 200) {
                            var _t = JSON.parse(body);
                            console.log(new Date(), "更新updateToken成功！", body);
                            // exports.set(function(){
                            //     callback && callback();
                            // }, "access_token", _t.access_token, 60 * 60 * 2);
                            innerCallback("", _t.access_token);
                        } else {
                            console.log(new Date(), "更新updateToken失败！", error || response.statusCode);
                            // callback && callback(error || response.statusCode);
                            innerCallback("", "");
                        }
                    });
                    // doit(ceil, value, function (err1, data1) {
                    //     innerCallback("", data1);
                    // });
                };
            });
            // console.log(charactors.length);
            // 数据
            async.parallelLimit(funcs, 20, function (err1, data1) {
                // console.log(err1, data1);
                // 更新成功了
                exports.set(function(){
                    callback && callback();
                }, "access_token", JSON.stringify(data1), 60 * 60 * 2);
            });
        }, {
          outdate: {
            type: "!=",
            value: "1"
          }
        }, {pagesize: 10000});
	}

	// 开始执行
	doit();
	setInterval(function () {
		doit();
	}, 60 * 60 * 1000);
}
// 去给用户发服务通知的任务
function doNotice_task (noticeback, day) {
    // 看看有哪些用户
    userDao.queryList(function (err, data) {
      if (err) {
        // 有异常啊
        noticeback(2, err);
      } else {
        var list = [];
        data.data.forEach(function (ceil) {
            if (ceil.userid == 1) {
                list.push(ceil);
            } else {
                // 是N天内没有回流的用户
                // 如果正确的话
                // if ( - .getTime() > (1000 * 60 * 60 * 24 * day)) {
                var _nowDate = new Date();
                var _fixedDate = new Date(_nowDate.getTime() - (1000 * 60 * 60 * 24 * day));
                var _userDate = new Date(ceil.lastlogintime);
                // console.log(_fixedDate, _userDate);
                if (_fixedDate.getDate() == _userDate.getDate()) {
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
          // 去查看一下全部漫画信息
            comicsDao.queryList(function (err2, data2) {
                if (err2) {
                    noticeback(5, err2);
                } else {
                    var _t = [];
                    data2.data.sort(function (a, b) {
                        if (a.updatetime > b.updatetime) {
                            return -1;
                        } else if (a.updatetime == b.updatetime) {
                            return 0;
                        } else {
                            return 1;
                        }
                    });
                    data2.data.forEach(function (ceil) {
                        _t.push(ceil.z_ch_name);
                    });

                    // 识别用户身份，要去查询用户的漫画信息
                    var _userids = [];
                    list.forEach(function (uceil) {
                        _userids.push(uceil.userid);
                    });

                    // 查询用户读漫画的情况
                    comicusersDao.queryList(function (err3, data3) {
                        if (err3 || (data3 && data3.data && data3.data.length == 0)) {
                            noticeback(6, "no comicusers");
                        } else {
                            // 找到自己的信息
                            list.forEach(function (ceil) {
                                ceil.comicinfo = data3.data.filter(function (cceil) {return cceil.userid == ceil.userid});
                                if (ceil.comicinfo.length > 0) {
                                    ceil.comicinfo = ceil.comicinfo[0];
                                    ceil.comicinfo.infos = JSON.parse(ceil.comicinfo.infos || "{}");
                                    var _ttt = [];
                                    for (var ii in ceil.comicinfo.infos) {
                                        _ttt.push({
                                            name: ii,
                                            info: ceil.comicinfo.infos[ii]
                                        });
                                    }
                                    ceil.comicinfo.infosArr = _ttt;
                                } else {
                                    ceil.comicinfo = "";
                                }

                                // 判断是属于哪种的了
                                if (!ceil.comicinfo || (ceil.comicinfo && ceil.comicinfo.infosArr.length == 0) || (ceil.comicinfo && ceil.comicinfo.infosArr.length != 0 && !ceil.comicinfo.readcount)) {
                                    // 给默认的就好
                                    ceil.page = "/pages/index/index?url=%2Fpages%2Ftv%2Findex%3Fpage%3Dlistrow%26type%3D1%26name%3D%E6%9C%80%E6%96%B0%26showtime%3D1";
                                    ceil.data = {
                                        "keyword1":{"value":"漫客谷团队漫画更新提醒"},
                                        "keyword2":{"value":"新热门经典漫画本上线全套免费看"},
                                        "keyword3":{"value": $formatDate(new Date(), "YYYY年MM月DD日 HH:II")},
                                        "keyword4":{"value":"漫画本又上线了几部超经典热门漫画。" + _t.slice(0,5).join("，") + "...快来看看吧"}
                                    }
                                } else {
                                    // 根据用户信息给
                                    // 如果是3天的，永远是读第一部
                                    // 如果超过3天，就随机吧
                                    if (day <= 3) {
                                        var _currentComic = ceil.comicinfo.infosArr[0];
                                    } else {
                                        var _currentComic = ceil.comicinfo.infosArr[Math.floor(ceil.comicinfo.infosArr.length * Math.random())];
                                    }
                                    var zname = data2.data.filter(function (cceil) {return cceil.name == _currentComic.name});
                                    if (zname.length == 0) {
                                        ceil.page = "/pages/index/index?url=%2Fpages%2Ftv%2Findex%3Fpage%3Dlistrow%26type%3D1%26name%3D%E6%9C%80%E6%96%B0%26showtime%3D1";
                                        ceil.data = {
                                            "keyword1":{"value":"漫客谷团队新漫画本上线"},
                                            "keyword2":{"value":"新热门经典漫画本上线全套免费看"},
                                            "keyword3":{"value": $formatDate(new Date(), "YYYY年MM月DD日 HH:II")},
                                            "keyword4":{"value":"漫画本又上线了几部超经典热门漫画。" + _t.slice(0,5).join("，") + "...快来看看吧"}
                                        }
                                    } else {
                                        ceil.page = "/pages/tv/index?page=comicindex&comic=" + _currentComic.name;
                                        ceil.data = {
                                            "keyword1":{"value":"漫客谷团队漫画更新提醒"},
                                            "keyword2":{"value":"您看过的漫画更新啦"},
                                            "keyword3":{"value": $formatDate(new Date(), "YYYY年MM月DD日 HH:II")},
                                            "keyword4":{"value": day <= 3 ? "亲爱的漫友，我是漫客谷的智能秘书小谷。您看过的漫画-" + zname[0].z_ch_name + "，最新同步已经完成。小谷正安静地等你回来( •̆ ᵕ •̆ )~♡。" : "亲爱的漫友，我是漫客谷的智能秘书小谷，您看过的漫画-" + zname[0].z_ch_name + "，最近又同步了两次。小谷正安静地等你回来( •̆ ᵕ •̆ )~♡。"}
                                        }
                                    }
                                }
                            });
                            
                            var funcs = [];
                            list.forEach(function (ceil) {
                                funcs.push(function (innerCallback) {
                                    // doit(ceil, value, function (err1, data1) {
                                    //     innerCallback("", data1);
                                    // });
                                    exports.doNotice([ceil], {
                                         template_id: "QCvTvseWFcT8ZjhT6sEUbk4wnWQD-KtM5ir3rJ5SdPE",
                                         page: ceil.page,
                                         data: ceil.data
                                    }, function (err, data) {
                                     // exports.set(function(){
                                         // callback && callback();
                                         innerCallback("", data);
                                     // }, "notice_task_1", 1, 60 * 60);
                                    });
                                });
                            });
                            // console.log(charactors.length);
                            // 数据
                            async.parallelLimit(funcs, 20, noticeback);
                            // console.log(JSON.stringify(list));
                        }
                    }, {
                        userid: {
                            type: "in",
                            value: _userids
                        }
                    }, {pagesize: 10000});
                }
            }, {}, {pagesize: 10000});
        } else {
          noticeback(4, "no users");
        }
      }
    }, {}, {pagesize: 99999});
}

// 发放订阅消息
exports.doSubscribeMessage = function (list, params, callback) {
    // list 是用户信息
    // 获得accesstoken
    exports.get(function(err, value, time){
        if (err) {
            // 异常
            callback("", 1);
        } else {
            // 要根据appid，去获得access_token
            try {
                var token = JSON.parse(value);
                token = token[params.appid];
                
                // 批量去处理
                var funcs = [];
                list.forEach(function (ceil) {
                    funcs.push(function (innerCallback) {
                        doit(ceil, token, function (err1, data1) {
                            innerCallback("", data1);
                        });
                    });
                });
                // console.log(charactors.length);
                // 数据
                async.parallelLimit(funcs, 20, callback);
            } catch(e) {
                callback(e);
            } 
        }
    }, "access_token");

    // 正式发服务通知
    function doit (user, token, mycall) {
      var toparam = {
        "access_token": token,
        "touser": user.openid,
        "template_id": params.template_id,
        "page": params.page,
        "data": params.data
      };
      // 可以发请求了啊
      var postData = JSON.stringify(toparam);
      console.log(postData);
      request({
          url: 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' + token,
          method: 'post',
          body: postData
      }, function(error, response, body){
        // 返回信息
        if (error || (response && response.statusCode != 200)) {
            console.log("发放失败:", error, response && response.statusCode);
          // 请求异常了
          mycall("", user.userid + ":发放失败");
        } else {
          var data = JSON.parse(body);
          if (data.errcode == 0) {
            console.log(user.userid + ":发放成功");
            // 发放成功的
            mycall("", user.userid + ":发放成功");
          } else {
            console.log(user.userid + ":发放失败", body);
            // 发放失败
            mycall("", user.userid + ":发放失败:" + data.errcode + " " + data.errmsg);
          }
        }
      });
    }
}


// 正式发放
// user 是用户信息
// param是发放数据
exports.doNotice = function (list, params, callback) {
	// console.log(list, params);
  // 获得accesstoken
  exports.get(function(err, value, time){
    if (err) {
      // 异常
      callback("", 1);
    } else {
      // 批量去处理
      var funcs = [];
      list.forEach(function (ceil) {
          funcs.push(function (innerCallback) {
              doit(ceil, value, function (err1, data1) {
                  innerCallback("", data1);
              });
          });
      });
      // console.log(charactors.length);
      // 数据
      async.parallelLimit(funcs, 20, callback);
    }
  }, "access_token");

  // 正式发服务通知
  function doit (user, token, mycall) {
  	// 找到当前的formid
	  var nowFormid = JSON.parse(user.formids || "[]");
      // 找到当前没有过期的formid
      var _tfs = [];
      nowFormid && nowFormid.forEach(function (ceil) {
        if (new Date(ceil.t) > new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7)) {
            // 可以
            _tfs.push(ceil);
        }
      });
      // nowFormid = _tfs;
      _tfs.sort(function (a, b) {
        if (new Date(a.t) > new Date(b.t)) {
            return 1;
        } else if (new Date(a.t) < new Date(b.t)) {
            return -1;
        } else {
            return 0;
        }
      });

      if (_tfs.length == 0) {
        // 没有可用的formid
        mycall("", user.userid + ":发放失败:没有可用的formid");
        return false;
      }

	  nowFormid = _tfs[0];

	  var toparam = {
	    "touser": user.openid,
	    "template_id": params.template_id,
	    "page": params.page,
	    "form_id": nowFormid.v,
	    "data": params.data
	  };
	  // 强调可有可无啊
	  if (params.emphasis_keyword) {
	    toparam.emphasis_keyword = params.emphasis_keyword;
	  }

	  // console.log(toparam);

	  // 可以发请求了啊
	  var postData = JSON.stringify(toparam);
	  request({
	      url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + token,
	      method: 'post',
	      body: postData
	  }, function(error, response, body){
	    // 返回信息
	    if (error || (response && response.statusCode != 200)) {
	    	console.log("发放失败:", error, response && response.statusCode);
	      // 请求异常了
	      mycall("", user.userid + ":发放失败");
	    } else {
	      var data = JSON.parse(body);
	      // 0，41028，41029 需要把formid移除掉
	      if (data.errcode == 0 || data.errcode == 41028 || data.errcode == 41029) {
	        // nowFormid = JSON.parse(user.formids);
	        _tfs.shift();
	        // 去掉undefined的formid
	      	_tfs = _tfs.filter(function (ceil) {return ceil.v != "undefined"});
	        userDao.update(function (err2, data2) {}, {
	          formids : JSON.stringify(_tfs)
	        }, user.userid);
	      }
	      if (data.errcode == 0) {
	        console.log(user.userid + ":发放成功");
	        // 发放成功的
	        mycall("", user.userid + ":发放成功");
	      } else {
	        console.log(user.userid + ":发放失败", body);
	        // 发放失败
	        mycall("", user.userid + ":发放失败:" + data.errcode + " " + data.errmsg);
	      }
	    }
	  });
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
function $shuffle(arr) {  
    var array = arr.concat();  
    for(var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);   
    return array;  
}  