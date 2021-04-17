// 引用dao
var personDao = require("../dao/person");
var pkDao = require("../dao/pk");
var pkallDao = require("../dao/pkall");
var basicModel = require("../model/basic");
var async = require("async");
var userDao = require("../dao/user");

// pk中
exports.doit = function (req, res, next) {
	// 还是需要登录的
	var nameid = req.cookies.nameid;
	var view = req.query.view;
    // 如果没有，就返回失败
   	if (!nameid && !view) {
   		res.jsonp({ret: 1, msg: "no user or view"});
   	} else {
   		// 查询user信息
   		var names = req.query.names.split(",");
		if (names && names.length == 5) {
			// 正确
			var funcs = [];
			names.forEach(function (ceil) {
				funcs.push(function (callback) {
					personDao.queryList(function (err, data) {
						callback(err || (data && data.data && data.data.length == 0 ? "no person" : ""), data);
					}, {
						name: {
			                type: "=",//= like
			                value: ceil
			            }
					});
				});
			});

			async.parallel(funcs, function(err, data) {
				// 返回数据了
				if (err) {
					res.jsonp({
						ret: 3,
						msg: "query error"
					});
				} else {
					var list = [];
					data.forEach(function (ceil) {
						list.push({
							name: ceil.data[0].name,
							fname: ceil.data[0].fname,
							zname: ceil.data[0].zname,
							pinyin: ceil.data[0].pinyin,
							xinge: ceil.data[0].xinge,
							tongshuai: ceil.data[0].tongshuai,
							wuli: ceil.data[0].wuli,
							zhili: ceil.data[0].zhili,
							zhengzhi: ceil.data[0].zhengzhi,
							xide: ceil.data[0].xide,
							zongzhi: ceil.data[0].zongzhi,
							isleader: ceil.data[0].isleader,
							pic: ceil.data[0].picurl
						});
					});

					// robj = {a:1,b:2};
					// msg = word;
					// result = 0
					// 最强武力
					list.sort(function (a, b) {
						if (a.wuli - b.wuli < 0) {
							return 1;
						} else if (a.wuli - b.wuli > 0) {
							return -1;
						} else {
							return 0;
						}
					});
					// 武力
					var wuli = Math.round((list[0].wuli + list[1].wuli + list[2].wuli) / 3);
					// 智力
					list.sort(function (a, b) {
						if (a.zhili - b.zhili < 0) {
							return 1;
						} else if (a.zhili - b.zhili > 0) {
							return -1;
						} else {
							return 0;
						}
					});
					var zhili = Math.round((list[0].zhili + list[1].zhili + list[2].zhili) / 3);
					// 政治
					list.sort(function (a, b) {
						if (a.zhengzhi - b.zhengzhi < 0) {
							return 1;
						} else if (a.zhengzhi - b.zhengzhi > 0) {
							return -1;
						} else {
							return 0;
						}
					});
					var zhengzhi = Math.round((list[0].zhengzhi + list[1].zhengzhi + list[2].zhengzhi) / 3);

					// 主副
					list.sort(function (a, b) {
						if (a.isleader && !b.isleader) {
							return -1;
						} else if (!a.isleader && b.isleader) {
							return 1;
						} else {
							if (a.tongshuai - b.tongshuai < 0) {
								return 1;
							} else if (a.tongshuai - b.tongshuai > 0) {
								return -1;
							} else {
								return 0;
							}
						}
					});

					var mainGene = list[0].name;
					var subGene = list[1].name;
					// 统帅值
					var tongshuai = Math.round((getMainPoint(list[0].tongshuai) + getMainPoint(list[1].tongshuai)) / 2);
					// 最好性格（理性、勇敢最好，主副将决定性格）
					var xinge1 = getXinge(list[0].xinge);
					var xinge2 = getXinge(list[1].xinge);
					// console.log(xinge1, xinge2);
					// console.log(list[0], list[1]);
					var xingePoint = Math.round(((xinge1[0] * list[0].tongshuai + xinge2[0] * list[1].tongshuai) / 2)
					 * ((xinge1[1] * list[0].tongshuai + xinge2[1] * list[1].tongshuai) / 2));

					if (!view) {
						// 于此同时，上报一下吧
						reportData(nameid, Math.round((tongshuai * wuli * zhili * zhengzhi * xingePoint / 10000000)), list);

						pkDao.queryList (function (err2, data2) {
							var myhighest = 0;
							var myhighestList = [];
							if (!err2) {
								var pkdata = data2.data.filter(function (ceil) {return ceil.nameid == nameid})[0];
								if (pkdata) {
									myhighest = pkdata.highscore;
									myhighestList = [pkdata.name1, pkdata.name2, pkdata.name3, pkdata.name4, pkdata.name5];
								}
							}
							// robj = {a:1,b:2};
							// msg = word;
							// result = 0
							var thisResult = Math.round((tongshuai * wuli * zhili * zhengzhi * xingePoint / 10000000));
							var _high = myhighest > thisResult ? myhighest : thisResult;
							var _highlist = myhighest > thisResult ?  myhighestList : [list[0].name, list[1].name, list[2].name, list[3].name, list[4].name];
							res.jsonp({
				            	ret: 0,
				            	data: list,
				            	mainGene: mainGene,
				            	subGene: subGene,
				            	tongshuai: (tongshuai),
				            	wuli: (wuli),
				            	zhili: (zhili),
				            	zhengzhi: (zhengzhi),
				            	xingePoint: (xingePoint),
				            	result: thisResult,
				            	robj: {
				            		"主将": mainGene,
				            		"副将": subGene,
				            		"领兵": tongshuai * 100 + "人",
				            		"战斗力": wuli + "分",
				            		"谋略": zhili + "分",
				            		"士气": zhengzhi + "分",
				            		"最高分": _high + "分" + (data2.count && pkdata ? " (超过" + ((data2.count - pkdata.rankPos) / data2.count * 100).toFixed(2) + "%的网友)" : ""),
				            		"最高分武将组合": _highlist.join(", "),
				            		"最高分时间": pkdata ? new Date(pkdata.lastupdatetime).toLocaleString() : new Date().toLocaleString()
				            	},
				            	myhighest: _high,
				            	myhighestList: _highlist,
				            	msg: ""
				            });
						}, {
						}, {
							sortkey: "highscore"
						});
					} else {
						var thisResult = Math.round((tongshuai * wuli * zhili * zhengzhi * xingePoint / 10000000));
						res.jsonp({
			            	ret: 0,
			            	data: list,
			            	mainGene: mainGene,
			            	subGene: subGene,
			            	tongshuai: (tongshuai),
			            	wuli: (wuli),
			            	zhili: (zhili),
			            	zhengzhi: (zhengzhi),
			            	xingePoint: (xingePoint),
			            	result: thisResult,
			            	robj: {
			            		"主将": mainGene,
			            		"副将": subGene,
			            		"领兵": tongshuai * 100 + "人",
			            		"战斗力": wuli + "分",
			            		"谋略": zhili + "分",
			            		"士气": zhengzhi + "分"
			            	},
			            	msg: ""
			            });
					}
				}
	        })
		} else {
			res.jsonp({
				ret: 1,
				msg: "param error"
			});
		}
   	}
}

// 查询最高战力
exports.getTop3 = function (req, res, next) {
	basicModel.get(function (err, data) {
		basicModel.get(function (err3, data3) {
			if (err || err3) {
				res.jsonp({ret: 1});
			} else {
				try {
					var _t = JSON.parse(data);
					var sangroup = JSON.parse(data3);
					var top3 = _t.top3, funcs = [];
					// 批量去查询用户信息
					top3.forEach(function (ceil) {
						funcs.push(function (callback) {
							userDao.queryById(function (err2, data2) {
								callback(err2, data2);
							}, ceil.nameid);
						});
					});
					async.parallel(funcs, function(err2, data2) {
						if (err2) {
							res.jsonp({ret: 4, msg: "query error"});
						} else {
							top3.forEach(function (ceil, index) {
								var _tt = [];
								for (var i = 0; i < 2 ; i++) {
									_tt.push(ceil.list[i].fname.charAt(0));
								}
								// console.log(data2 , index);
								ceil.picurl = data2[index][0].avatarUrl;
								ceil.nick = (data2[index][0].nickName ? data2[index][0].nickName : "太阿网友") + "     （ " + _tt.join(" ") + " ...）";
							});
							res.jsonp({ret: 0, data: top3, sangroup: sangroup});
						}
					});
				} catch (e) {
					res.jsonp({ret: 3, msg: "parse error"});
				}
			}
		}, "sangroup");
	}, "sanpkGlobalData");
}

// 上报数据
function reportData (nameid, score, list) {
	// 根据nameid查询一下用户信息吧
	// 查询user信息
	userDao.queryById(function (err, data) {
		if (err || (data && data.length == 0)) {
			console.log({ret: 3, msg: "no person"});
		} else {
			var _tt = data[0];
			var openid = _tt.openid;
			// 上报基础数据
			pkallDao.add(function () {}, {
				nameid: nameid,
				openid: openid,
				score: score,
				inserttime: new Date(),
				name1: list[0].name,
				name2: list[1].name,
				name3: list[2].name,
				name4: list[3].name,
				name5: list[4].name
			});

			// 上报用户数据
			// 要先查询用户数据
			pkDao.queryById(function (err2 , data2) {
				// console.log(err2 , data2);
				if (!err2) {
					var pkdata = data2[0];
					pkDao.add(function () {}, {
						nameid: nameid,
						openid: openid,
						highscore: pkdata ? (pkdata.highscore > score ? pkdata.highscore : score) : score,
						lastupdatetime: new Date(),
						name1: pkdata ? (pkdata.highscore > score ? pkdata.name1 :  list[0].name) : list[0].name,
						name2: pkdata ? (pkdata.highscore > score ? pkdata.name2 :  list[1].name) : list[1].name,
						name3: pkdata ? (pkdata.highscore > score ? pkdata.name3 :  list[2].name) : list[2].name,
						name4: pkdata ? (pkdata.highscore > score ? pkdata.name4 :  list[3].name) : list[3].name,
						name5: pkdata ? (pkdata.highscore > score ? pkdata.name5 :  list[4].name) : list[4].name,
						playcount: pkdata ? (+pkdata.playcount + 1) : 1
					});
				}
			}, nameid);

			// 上报最高三个数据
			// 先拿出最高三个数据
			basicModel.get(function(err, value, time){
				// console.log(err, value, time);
				if (value) {
					value = JSON.parse(value);
				} else {
					value = {
						top3: [{score: 0}]
					};
				}
				// 是否存在比这个用户小的
				if (value.top3.some(function (ceil) {return ceil.score < score}) || value.top3.length < 5) {
					// 保证一个人只有一条数据
					value.top3.push({
						score: score,
						nameid: nameid,
						openid: openid,
						time: new Date().getTime(),
						list: list
					});

					var _namesHigh = {}, _tlist = [];
					value.top3.forEach(function (ceil) {
						if (!_namesHigh[ceil.nameid] || (_namesHigh[ceil.nameid] && _namesHigh[ceil.nameid].score < ceil.score)) {
							_namesHigh[ceil.nameid] = {
								score: ceil.score,
								ceil: ceil
							};
						}
					});
					for (var i in _namesHigh) {
						_tlist.push(_namesHigh[i].ceil);
					}


					// 排个序
					_tlist.sort(function (a, b) {
						if (a.score > b.score) {
							return -1;
						} else if (a.score < b.score) {
							return 1;
						} else {
							return 0;
						}
					});
					_tlist = _tlist.slice(0,5);
					value.top3 = _tlist;
					// 写入数据
					basicModel.set(function(err, value){
					}, "sanpkGlobalData", JSON.stringify(value), 100 *24 * 60 * 60);
				}
			}, "sanpkGlobalData");
		}
	}, nameid);
}

function getMainPoint (point) {
	if (point >= 95) {
		return point * 5;
	} else if (point >= 85 && point < 95) {
		return point * 4;
	} else if (point >= 70 && point < 85) {
		return point * 3;
	} else if (point >= 50 && point < 70) {
		return point * 2;
	} else {
		return point;
	}
}

function getXinge (xinge) {
	// console.log(xinge);
	if (xinge == "刚胆") {
		return [1,1];
	} else if (xinge == "莽撞") {
		return [1,0.5];
	} else if (xinge == "冷静") {
		return [0.5,1];
	} else if (xinge == "慎重") {
		return [0.5,0.5];
	} else {
		return [0.5,0.5];
	}
}