// 引用dao
var rdDao = require("../dao/rd");
var userDao = require("../dao/user");
var comicusersDao = require("../dao/comicusers");

// 上报rd，未登录也可以上报RD
exports.rd = function (req, res, next) {
    if (req.query.rd) {
    	// 查询user信息
		if (req.cookies.nameid) {
			// 已登录
			userDao.queryById(function (err, data) {
				if (err || (data && data.length == 0)) {
					doReport();
				} else {
					doReport(data[0].openid);
				}
			}, req.cookies.nameid);
		} else {
			doReport();
		}
    } else {
    	res.jsonp({ret: 1, msg: "no rd"});
    }
	
	// 上报
	function doReport (openid) {
		rdDao.add(function (err, data) {
			res.jsonp({err, data});
		}, {
			rd: req.query.rd,
			openid: openid,
			time: new Date()
		});
	}
}


// 这个是数据，要好好处理
exports.getdashboard = function (req, res, next) {
	var aa = new Date();
	// 获得用户信息
	userDao.queryList (function (err, data) {
		// 获得所有漫画阅读者的信息
		// comicusersDao.queryList(function (err, comicusers) {
			// data.data是全部用户信息
			// var _t = [], _t2 = [];
			// data.data.forEach(function (ceil) {
			// 	// 今天注册的
			// 	if (isToday(new Date(ceil.registertime))) {
			// 		var _read = comicusers.data.filter(function (cceil) {return cceil.userid == ceil.userid});
			// 		var formids = ceil.formids ? JSON.parse(ceil.formids) : [];
			// 		_t.push({
			// 			userid: ceil.userid,
			// 			lastlogintime: new Date(ceil.lastlogintime).toLocaleString(),
			// 			formids: formids && formids.length > 0 ? [new Date(formids[0].t).toLocaleString() , new Date(formids[formids.length - 1].t).toLocaleString()] : "",
			// 			registertime: new Date(ceil.registertime).toLocaleString(),
			// 			lastloginplatform: ceil.lastloginplatform,
			// 			lastpage: ceil.lastpage,
			// 			isvip: ceil.isvip,
			// 			readinfo: _read && _read[0] ? _read[0].infos : "",
			// 			readcount: _read && _read[0] ? _read[0].readcount : 0,
			// 			adscount: _read && _read[0] ? _read[0].adscount : 0,
			// 		});
			// 	}

			// 	// 今天登陆过的
			// 	if (isToday(new Date(ceil.lastlogintime))) {
			// 		var _read = comicusers.data.filter(function (cceil) {return cceil.userid == ceil.userid});
			// 		var formids = ceil.formids ? JSON.parse(ceil.formids) : [];
			// 		_t2.push({
			// 			userid: ceil.userid,
			// 			lastlogintime: new Date(ceil.lastlogintime).toLocaleString(),
			// 			formids: formids && formids.length > 0 ? [new Date(formids[0].t).toLocaleString() , new Date(formids[formids.length - 1].t).toLocaleString()] : "",
			// 			registertime: new Date(ceil.registertime).toLocaleString(),
			// 			lastloginplatform: ceil.lastloginplatform,
			// 			lastpage: ceil.lastpage,
			// 			isvip: ceil.isvip,
			// 			readinfo: _read && _read[0] ? _read[0].infos : "",
			// 			readcount: _read && _read[0] ? _read[0].readcount : 0,
			// 			adscount: _read && _read[0] ? _read[0].adscount : 0,
			// 		});
			// 	}

			// 	// 今天登陆过的排个序吧
			// 	_t2.sort(function (a, b) {
			// 		if (new Date(a.lastlogintime) > new Date(b.lastlogintime)) {
			// 			return 1;
			// 		} else if (new Date(a.lastlogintime) < new Date(b.lastlogintime)) {
			// 			return -1;
			// 		} else {
			// 			return 0;
			// 		}
			// 	});
			// });

			// 还要拉取今天上报的RD（观看视频的、点击广告的、啥都没有的）
			// comicindex
			// 广告点击成功RD: 10001
			// 广告拉取成功的RD：10002
			// 广告点击第一次的RD: 10003
			// 广告拉取失败的RD：10004

			// 视频点击的RD：20001
			// 视频拉取成功的RD：20002
			// 视频拉取失败的RD：20003

			// 分享按钮点击RD：30001
			// 打开浮层的RD：30002
			// 视频和广告都失败的RD：30003


			// comic
			// 广告点击成功RD: 11001
			// 广告拉取成功的RD：11002
			// 广告点击第一次的RD: 11003
			// 广告拉取失败的RD：11004

			// 视频点击的RD：21001
			// 视频拉取成功的RD：21002
			// 视频拉取失败的RD：21003

			// 分享按钮点击RD：31001
			// 打开浮层的RD：31002
			// 视频和广告都失败的RD：31003
			
			
			// 拉取今天的RD
			rdDao.queryList(function (err, rds) {
				var _t30003 = rds.data.filter(function (ceil) {return ceil.rd == "30003" || ceil.rd == "31003"}), _t30003arr = [], _tobj = {};
				_t30003.forEach(function (ceil) {
					if (!_tobj[ceil.openid]) {
						_tobj[ceil.openid] = 1;
						_t30003arr.push(ceil);
					}
				});

				// 第二天仍然失败的情况
				var _t30005 = rds.data.filter(function (ceil) {return ceil.rd == "30005"}),_t30005arr = [];
				_tobj = {};
				_t30005.forEach(function (ceil) {
					if (!_tobj[ceil.openid]) {
						_tobj[ceil.openid] = 1;
						var _zz = data.data.filter(function (cceil) {return cceil.openid == ceil.openid})[0];
						if (_zz) {
							_t30005arr.push(_zz.userid);
						}
					}
				});

				res.jsonp({
					ret: 0, 
					data: {
						count: data.count, 
						rcount: data.data.filter(function (ceil) {return isToday(new Date(ceil.registertime))}).length, 
						lcount: data.data.length, 
						// rds: rds.data,
						"10001": rds.data.filter(function (ceil) {return ceil.rd == "10001"}).length,
						"10002": rds.data.filter(function (ceil) {return ceil.rd == "10002"}).length,
						"10003": rds.data.filter(function (ceil) {return ceil.rd == "10003"}).length,
						"10004": rds.data.filter(function (ceil) {return ceil.rd == "10004"}).length,
						"10005": rds.data.filter(function (ceil) {return ceil.rd == "10005"}).length,
						"20001": rds.data.filter(function (ceil) {return ceil.rd == "20001"}).length,
						"20002": rds.data.filter(function (ceil) {return ceil.rd == "20002"}).length,
						"20003": rds.data.filter(function (ceil) {return ceil.rd == "20003"}).length,
						"20004": rds.data.filter(function (ceil) {return ceil.rd == "20004"}).length,
						"30001": rds.data.filter(function (ceil) {return ceil.rd == "30001"}).length,
						"30002": rds.data.filter(function (ceil) {return ceil.rd == "30002"}).length,
						"30003": _t30003arr.length,
						"30004": rds.data.filter(function (ceil) {return ceil.rd == "30004"}).length,
						"30005": _t30005arr.join(" , "),
						"11001": rds.data.filter(function (ceil) {return ceil.rd == "11001"}).length,
						"11002": rds.data.filter(function (ceil) {return ceil.rd == "11002"}).length,
						"11003": rds.data.filter(function (ceil) {return ceil.rd == "11003"}).length,
						"11004": rds.data.filter(function (ceil) {return ceil.rd == "11004"}).length,
						"11005": rds.data.filter(function (ceil) {return ceil.rd == "11005"}).length,
						"21001": rds.data.filter(function (ceil) {return ceil.rd == "21001"}).length,
						"21002": rds.data.filter(function (ceil) {return ceil.rd == "21002"}).length,
						"21003": rds.data.filter(function (ceil) {return ceil.rd == "21003"}).length,
						"21004": rds.data.filter(function (ceil) {return ceil.rd == "21004"}).length,
						"31001": rds.data.filter(function (ceil) {return ceil.rd == "31001"}).length,
						"31002": rds.data.filter(function (ceil) {return ceil.rd == "31002"}).length,
						"31003": _t30003arr.length,
						"31004": rds.data.filter(function (ceil) {return ceil.rd == "31004"}).length,
						"40001": rds.data.filter(function (ceil) {return ceil.rd == "40001"}).length,

						// 插屏广告相关
						// 插屏广告加载成功
						"50001": rds.data.filter(function (ceil) {return ceil.rd == "50001"}).length,
						// 插屏广告加载失败
						"50002": rds.data.filter(function (ceil) {return ceil.rd == "50002"}).length,
						// 插屏广告点击关闭
						"50003": rds.data.filter(function (ceil) {return ceil.rd == "50003"}).length,
						// 显示插屏广告总数
						"50004": rds.data.filter(function (ceil) {return ceil.rd == "50004"}).length,
						// 插屏广告显示失败
						"50005": rds.data.filter(function (ceil) {return ceil.rd == "50005"}).length,

						// 广告的曝光次数
						"10006": rds.data.filter(function (ceil) {return ceil.rd == "10006"}).length,

						// 广告的曝光次数
						"11006": rds.data.filter(function (ceil) {return ceil.rd == "11006"}).length,

						// 直接进入的次数
						"10007": rds.data.filter(function (ceil) {return ceil.rd == "10007"}).length,

						// 直接进入的次数
						"11007": rds.data.filter(function (ceil) {return ceil.rd == "11007"}).length,

						// 点击我的收藏
						"60001": rds.data.filter(function (ceil) {return ceil.rd == "60001"}).length,
						// 点击收藏
						"60002": rds.data.filter(function (ceil) {return ceil.rd == "60002"}).length,
						// 点击取消收藏
						"60003": rds.data.filter(function (ceil) {return ceil.rd == "60003"}).length,
						// 显示收藏提醒
						"60004": rds.data.filter(function (ceil) {return ceil.rd == "60004"}).length,
						// 关闭收藏提醒
						"60005": rds.data.filter(function (ceil) {return ceil.rd == "60005"}).length,

						// 关闭收藏提醒
						"60006": rds.data.filter(function (ceil) {return ceil.rd == "60006"}).length,
						// 关闭收藏提醒
						"60007": rds.data.filter(function (ceil) {return ceil.rd == "60007"}).length,
						// todayR: _t.reverse(), 
						// todayL: _t2.reverse()
						todayR: [], 
						todayL: []
					}
				});
			}, {
				time: {
					type: ">",
					value: new Date(aa.getFullYear() + "/" + (aa.getMonth() + 1) + "/" + aa.getDate())
				}
			}, {pagesize: 100000});
		// }, {} , {pagesize: 100000});
	}, {
		lastlogintime: {
			type: ">",
			value: new Date(aa.getFullYear() + "/" + (aa.getMonth() + 1) + "/" + aa.getDate())
		}
	}, {
		pagesize: 100000
	});
}

function isToday(date){
    var d = new Date();
    var y = d.getFullYear(); // 年
    var m = d.getMonth(); // 月份从0开始的
    var d = d.getDate(); //日
    return (date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()) == (y + '-' + m + '-' + d);
}
