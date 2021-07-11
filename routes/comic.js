// 引用dao
var comicusersDao = require("../dao/comicusers");
var userDao = require("../dao/user");
var pool = require("../utils/dbpool").getPool();
var comicsDao = require("../dao/comics");
var http = require("http");
var https = require("https");
var url = require("url");
var async = require("async");
var request = require("request");
var charactorsDao = require("../dao/charactors");
var basic = require("../model/basic");
var comiclist = require("../model/comiclist");
var iconvLite = require("iconv-lite");
var cpsuserDao = require("../dao/cpsuser");
var sim = require("../utils/simplify");
process.env.NODE_TLS_REJECT_UNAUTHORIZED ='0'; 

var _vipAdsCounts = 0;

// 开始阅读
exports.start = function (req, res, next) {
	// 要有参数
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 没有登录也不行啊
	var userid = req.cookies.nameid || req.query.nameid;
	if (!userid) {
		res.jsonp({ret: 3, msg: "nologin"});
		return false;
	}

	// 查询是否有数据
	comicusersDao.queryById(function (err, data) {
		if (err) {
			// 返回异常
			res.jsonp({ret: 4, msg: "err1"});
			return false;
		}

		// 查询漫画信息
		comicsDao.queryById(function (err3, data3) {
			// 查询出漫画的基本信息
			if (err3 || (data3 && data3.length == 0)) {
				// 返回异常
				res.jsonp({ret: 5, msg: "err1"});
				return false;
			}
			// 给这个漫画阅读次数++
			if (data3[0].readcount) {
				// ++
				comicsDao.addone(function () {}, "readcount", req.query.comic);
			} else {
				// 变成1
				comicsDao.update(function (err2, data2) {}, {
					readcount: 1
				}, req.query.comic);
			}

			// 加上每周的记录
			// 获得周id
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
			// 上一个访问是今天，并且有值的话，就++
			if (data3[0][_colum] && data3[0].lastviewed && new Date(data3[0].lastviewed).getDate() == new Date().getDate()) {
				// ++
				comicsDao.addone(function () {}, _colum, req.query.comic);
			} else {
				// 变成1
				var _optData = {};
				_optData[_colum] = 1;
				comicsDao.update(function (err2, data2) {}, _optData, req.query.comic);
			}

			// 更新时间
			comicsDao.update(function (err2, data2) {}, {
				lastviewed: new Date()
			}, req.query.comic);

			// 是空的
			if (data && data.length == 0) {
				// 是新用户啊
				var _infos = {};
				_infos[req.query.comic] = {
					// max: data3[0].freechars,
					// list: getQueen(+data3[0].freechars),
					range: [[1, +data3[0].freechars]],
					current: 1,
					time: new Date()
				};
				// 不存在，要新增
				comicusersDao.add(function (err2, data2) {
					// 新增成功
					res.jsonp({ret: 0 , err: err2, data: data2});
				}, {
					userid: userid,
					lastviewed: new Date(),
					infos: JSON.stringify(_infos),
					registertime: new Date()
				});
			} else {
				// 存在
				var _infos = JSON.parse(data[0].infos || "{}");
				if (_infos[req.query.comic]) {
					_infos[req.query.comic].time = new Date();
					_infos[req.query.comic].current = req.query.current || 1;
				} else {
					_infos[req.query.comic] = {
						// max: data3[0].freechars,
						// list: getQueen(+data3[0].freechars),
						range: [[1, +data3[0].freechars]],
						current: 1,
						time: new Date()
					};
				}
				// 如果第一本就是好漫画，那就把初始到数量调整一下
				var _readc = data[0].readcount ? +data[0].readcount + 1 : (data3 && data3[0] && data3[0].limitinfo == 1 ? 30 : 1);
				
				comicusersDao.update(function (err2, data2) {
					// 新增成功
					res.jsonp({ret: 0, err: err2, data: data2});
				}, {
					lastviewed: new Date(),
					infos: JSON.stringify(_infos),
					readcount: _readc
				}, userid);

				// 独立的步骤，给我的master加数据
				// 本人有master，并且今天第一次
				if (data[0].mymaster && (new Date(data[0].lastviewed || 0) < new Date(new Date().getFullYear() + "/" + (new Date().getMonth() + 1) + "/" + new Date().getDate()))) {
					// 去查询我的master数据 
					comicusersDao.queryById(function (err4, data4) {
						if (err4) {
							// 返回异常
							console.log(err4);
							return false;
						}
						try {
							var adscardinfo = JSON.parse(data4[0].adscardinfo || "[]");
							// 找到数据
							var nowindex = -1;
							var nowinfo = adscardinfo.filter(function (ceil, index) {
								if (ceil.uid == userid) {
									nowindex = index;
									return true;
								} else {
									return false;
								}
							});
							if (nowinfo.length != 0) {
								adscardinfo[nowindex].adcount = adscardinfo[nowindex].adcount ? +adscardinfo[nowindex].adcount + 10 : 10;
								// 给数据+1
								comicusersDao.update(function (err5, data5) {
									console.log(err5, data5);
								}, {
									adscardinfo: JSON.stringify(adscardinfo)
								}, data[0].mymaster);
							}
							
						} catch (e) {
							console.log(e);
						}
					}, data[0].mymaster);
				}
			}
		}, req.query.comic);
	}, userid);
}

// 删除记录
exports.delhistory = function (req, res, next) {
	// 要有参数
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	var userid = req.cookies.nameid || req.query.nameid;
	// 没有登录，就直接返回吧
	if (!userid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	// 查询用户阅读信息
	comicusersDao.queryById(function (err, data) {
		if (err || (data && data.length == 0)) {
			// 返回异常
			res.jsonp({ret: 3, msg: "err1", data: []});
			return false;
		}

		// 没有异常就直接返回内容
		// 开始做查询
		if (data[0].infos) {
			// 存在
			try {
				var infos = JSON.parse(data[0].infos);
				// 成功的
				// console.log(infos);
				if (!infos[req.query.comic]) {
					res.jsonp({ret: 6, msg: "parse error", data: []});
				} else {
					infos[req.query.comic].nl = 1;
					// 更新一下
					comicusersDao.update(function (err4, data4) {
						// 成功
						res.jsonp({ret: 0, err: err4, data: data4});
					}, {
						userid: userid,
						infos: JSON.stringify(infos)
					}, userid);
				}
			} catch(e) {
				res.jsonp({ret: 5, msg: "parse error", data: []});
			}
		} else {
			res.jsonp({ret: 4, msg: "err2", data: []});
		}
	}, userid);
}

// 查询全部漫画
exports.queryComic = function (req, res, next) {
	var userid = req.cookies.nameid || req.query.nameid;
	// 没有登录，就直接返回吧
	if (!userid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	var pageindex = req.query.pageindex || 0;
	// 有登录就去查询吧，最后要能返回一个数组
	userDao.queryById(function (err0, data0) {
		if (err0 || (data0 && data0.length == 0)) {
			// 返回异常
			res.jsonp({ret: 3, msg: "err1", data: []});
		} else {
			comicusersDao.queryById(function (err, data) {
				if (err || (data && data.length == 0)) {
					// 返回异常
					res.jsonp({ret: 3, msg: "err1", data: []});
					return false;
				}

				// 没有异常就直接返回内容
				// 开始做查询
				// if (data[0].infos) {
					// 存在
					try {
						var infos = JSON.parse(data[0].infos);
					} catch(e) {
						// res.jsonp({ret: 5, msg: "parse error", data: []});
						var infos = {};
					}
						// 以最新的排序
						var _temp = [], searchArr = [];
						for (var i in infos) {
							// 如果type=collect的话，就是查看收藏过的
							if (req.query.type == "collect") {
								if (infos[i].collect) {
									_temp.push({
										time: infos[i].time,
										name: i
									});
								}
							} else {
								// 必须要 不是 不在列表里面的
								if (!infos[i].nl) {
									_temp.push({
										time: infos[i].time,
										name: i
									});
								}
							}
						}

						_temp.sort(function (a,b) {
							if (new Date(a.time) < new Date(b.time)) {
								return 1;
							} else if (new Date(a.time) > new Date(b.time)) {
								return -1;
							} else {
								return 0;
							}
						});

						_temp.forEach(function (ceil) {
							searchArr.push(ceil.name);
						});

						// 再来个选择吧
						if (req.query.type != "collect") {
							// 自己的就是全部 , 否则要分页
							searchArr = searchArr.slice(pageindex * 10,(+pageindex + 1) * 10);
						}

						// 查询全部的漫画信息
						comicsDao.queryList(function (err2, data2) {
							if (err2) {
								res.jsonp({ret: 6, msg: "query comic error", data: [], 
									unionid: data0[0].unionid,
									readcount: data[0].readcount,
									havepaied: !!data[0].payinfo, 
									viptime: data[0].viptime && +data[0].viptime > new Date().getTime() ? $formatDate(new Date(+data[0].viptime), "YYYY-MM-DD HH:II:SS") : ""
								});
							} else {
								var _ret = [];
								data2.data.forEach(function (ceil) {
									_ret.push({
										name: ceil.name,
										z_name: ceil.z_ch_name,
										z_ch_name: ceil.z_ch_name,
										current: infos[ceil.name].current,
										cover: ceil.indexpic,
										time: infos[ceil.name].time,
										author: ceil.author,
										charactors: ceil.charactors,
										indexpic: ceil.indexpic,
										charslen: ceil.charactor_counts
									});
								});

								// console.log(_ret);

								// 根据阅读时间排序
								_ret.sort(function (a,b) {
									if (new Date(infos[a.name].time) < new Date(infos[b.name].time)) {
										return 1;
									} else if (new Date(infos[a.name].time) > new Date(infos[b.name].time)) {
										return -1;
									} else {
										return 0;
									}
								});
								
								// 返回数据
								// res.jsonp({ret: 0, msg: "", data: _ret.slice(pageindex * 10,(+pageindex + 1) * 10)});
								res.jsonp({ret: 0, msg: "", data: _ret.slice(0,30), 
									unionid: data0[0].unionid,
									readcount: data[0].readcount,
									havepaied: !!data[0].payinfo, 
									viptime: data[0].viptime && +data[0].viptime > new Date().getTime() ? $formatDate(new Date(+data[0].viptime), "YYYY-MM-DD HH:II:SS") : ""
								});
							}
						}, {
							name: {
				                type: "in",
				                value: searchArr
				            }
						}, {
							pagesize: 10000
						});
					
				// } else {
				// 	res.jsonp({ret: 4, msg: "err2", data: []});
				// }
			}, userid);
		}
	}, userid);
}

// 查询
exports.query = function (req, res, next) {
	// 要有参数
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 没有登录
	var userid = req.cookies.nameid || req.query.nameid;
	if (!userid) {
		// res.jsonp({ret: 3, msg: "nologin"});
		// 没有登录，就返回这本漫画的初始信息
		comicsDao.queryById(function (err3, data3) {
			// 查询出漫画的基本信息
			if (err3 || (data3 && data3.length == 0)) {
				// 返回异常
				res.jsonp({ret: 5, msg: "err1"});
				return false;
			}
			res.jsonp({ret: 0, data: {
				// max: data3[0].freechars,
				list: getQueen(+data3[0].freechars),
				current: 1,
				time: new Date(),
				nowtime: new Date().getTime()
			}});
		}, req.query.comic);
		
		return false;
	}

	comicusersDao.queryById(function (err, data) {
		if (err) {
			// 返回异常
			res.jsonp({ret: 4, msg: "err1"});
			return false;
		}
		comicsDao.queryById(function (err3, data3) {
			// 查询出漫画的基本信息
			if (err3 || (data3 && data3.length == 0)) {
				// 返回异常
				res.jsonp({ret: 5, msg: "err1"});
				return false;
			}
			// 如果还没有开始，就是新用户
			if (data.length == 0 || !JSON.parse(data[0].infos || "{}")[req.query.comic]) {
				// 新用户，就去注册
				// 查询漫画信息
			
				// 是空的
				// 是新用户啊
				if (data.length == 0) {
					// 是空的
					var _infos = {};
				} else {
					var _infos = JSON.parse(data[0].infos || "{}");
				}
				_infos[req.query.comic] = {
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
						res.jsonp({ret: 6, msg: "err1"});
					} else {
						// 插入数据需要range，输出需要list
						res.jsonp({ret: 0, data: {
							list: getQueen(+data3[0].freechars),
							current: 1,
							time: new Date(),
							nowtime: new Date().getTime()
						}});
					}
				}, _toUpdate);
			} else {
				data = data[0];
				data.infos = JSON.parse(data.infos);
				// 要把内容返回
				// 去掉max, 返回list
				var myrange = data.infos[req.query.comic].range ? data.infos[req.query.comic].range : [[1, data.infos[req.query.comic].max]];
				// if (data3[0].isfree == 1 || (data.infos[req.query.comic].vip || +data.viptime > new Date())) {
				
				// 如果没有广告位，就要放开限制，因为广告也看不了
				var nowappid = req.headers.referer.match(/servicewechat\.com\/([^\/]+)/);
			    if (!nowappid) {
			      	res.jsonp({ret: 7, msg: "not wxapp"});
			      	return false;
			    } else {
			      	nowappid = nowappid[1];
			    }
			    // 根据appid，查询信息
			    cpsuserDao.queryById(function (apperr , appdata) {
			    	function doinfos () {
			    		charactorsDao.queryList(function (err2, data2) {
						    // 要精简一下返回
						    // console.log(err2, data2);
						    if (err2 || (data2 && data2.data && data2.data.length == 0)) {
						    	data.infos[req.query.comic].list = getQueen(myrange.concat([[1, data3[0].charactor_counts - _vipAdsCounts]]));
						    } else {
						    	data.infos[req.query.comic].list = getQueen(myrange.concat([[1, data2.data[0].sum - _vipAdsCounts]]));
						    }
						    delete data.infos[req.query.comic].range;
							delete data.infos[req.query.comic].max;
							data.infos[req.query.comic].nowtime = new Date().getTime();
							res.jsonp({ret: 0, data: data.infos[req.query.comic]});
						}, {
						    comic_name: {
						        type: "=",
						        value: req.query.comic
						    }
						}, {
						    pagesize: 10000,
						    tablename: "charactors_" + ("0" + (data3[0].id % 100)).slice(-2),
						    sum: true
						});
			    	}
			    	//  || !(appdata[0].bannerad1 && appdata[0].bannerad2)
			    	if (apperr || (appdata && appdata.length == 0)) {
						doinfos();
					} else {
						if (data3[0].isfree == 1 || (data.infos[req.query.comic].vip || +data.viptime > new Date())) {
							doinfos();
						} else {
							data.infos[req.query.comic].list = getQueen(myrange);
							delete data.infos[req.query.comic].range;
							delete data.infos[req.query.comic].max;
							data.infos[req.query.comic].nowtime = new Date().getTime();
							res.jsonp({ret: 0, data: data.infos[req.query.comic]});
						}
					}
			    }, nowappid);
			}
		}, req.query.comic);
	}, userid);
}

// +次数
exports.addmax = function (req, res, next) {

}

// 自己翻页
exports.next = function (req, res, next) {
	// 要有参数
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 没有登录也不行啊
	var userid = req.cookies.nameid || req.query.nameid;
	if (!userid) {
		res.jsonp({ret: 3, msg: "nologin"});
		return false;
	}

	// 不能没有cindex！！
	if (!req.query.cindex) {
		res.jsonp({ret: 1, msg: "param err."});
		return false;
	}

	// 查询是否有数据
	comicusersDao.queryById(function (err, data) {
		if (err) {
			// 返回异常
			res.jsonp({ret: 4, msg: "err1"});
			return false;
		}

		// 查询漫画信息
		comicsDao.queryById(function (err3, data3) {
			// 查询出漫画的基本信息
			if (err3 || (data3 && data3.length == 0)) {
				// 返回异常
				res.jsonp({ret: 5, msg: "err1"});
				return false;
			}

			// 是空的
			if (data && data.length == 0) {
				res.jsonp({ret: 5, msg: "err2"});
			} else {
				// 如果是使用卡片，卡片不够，就返回一个异常
				if (req.query.usecard == 1 && !(data[0].adscardscount && data[0].adscardscount > 0)) {
					res.jsonp({ret: 6, msg: "err1"});
					return false;
				}

				// 存在
				var _infos = JSON.parse(data[0].infos || "{}");
				if (_infos[req.query.comic]) {
					_infos[req.query.comic].time = new Date();

					if (_infos[req.query.comic].max && !_infos[req.query.comic].range) {
						// 如果有max，就先把max转化成range
						_infos[req.query.comic].range = [[1, _infos[req.query.comic].max]];
					}

					// 不能有max了
					if (_infos[req.query.comic].max) {
						delete _infos[req.query.comic].max;
					}

					// 写入range
					// 判断当前next是否有章节信息
					// 如果是新用户的话，加*2.5章
					// console.log(data[0]);
					// console.log(data[0].registertime);
					var _fixtime = new Date() - new Date(data[0].registertime);
					var nextCount = Math.ceil((data && data[0] && data[0].adscount <= 5 && data[0].readcount <= 40 ? getNewNum(data3[0].ad_reward, 1, data3[0]) : _fixtime > 2000 * 60 * 60 * 24 ? getNewNum(data3[0].ad_reward, 3, data3[0]) : _fixtime > 1000 * 60 * 60 * 24 ? getNewNum(data3[0].ad_reward, 2, data3[0]) : getNewNum(data3[0].ad_reward, 1, data3[0])) * (req.query.times || 1));

					// 如果只打开这一章，就这一章吧
					if (req.query.only) {
						nextCount = 1;
					}
					// 如果是最后一章的话，就只打开一节
					// if (+req.query.islast) {
					// 	nextCount = 1;
					// }
					
					charactorsDao.queryList(function (err2, data2) {
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


			            // console.log(data2.data);
			            // 不能超啊
			            _infos[req.query.comic].range = setQueen(_infos[req.query.comic].range || [[1, data3[0].freechars]], req.query.cindex, nextCount);

			            // 最后一项不能超
			            try {
			            	if (_infos[req.query.comic].range[_infos[req.query.comic].range.length - 1][1] - data2.data[data2.data.length - 1].comic_index > 0) {
			            		// 超过了
			            		// console.log(_infos[req.query.comic].range[_infos[req.query.comic].range.length - 1][1], data2.data[data2.data.length - 1].comic_index);
			            		_infos[req.query.comic].range[_infos[req.query.comic].range.length - 1][1] = data2.data[data2.data.length - 1].comic_index;
			            	}
			            } catch (e) {}
			            

			            // console.log(_infos[req.query.comic].range);

			            comicusersDao.update(function (err4, data4) {
							// 新增成功
							res.jsonp({ret: 0, err: err4, data: data4, info: data[0].adscardscount - 1});
						}, {
							userid: userid,
							lastviewed: new Date(),
							infos: JSON.stringify(_infos),
							adscount: data[0].adscount ? data[0].adscount + 1 : 1,
							adscardscount: req.query.usecard == 1 ? data[0].adscardscount - 1 : data[0].adscardscount
						}, userid);
			        }, {
			            comic_name: {
			                type: "=",
			                value: req.query.comic
			            }
			        }, {
			            pagesize: 10000,
			            tablename: "charactors_" + ("0" + (data3[0].id % 100)).slice(-2)
			        });
					// _infos[req.query.comic].max = +_infos[req.query.comic].max + +data3[0].ad_reward;
				} else {
					_infos[req.query.comic] = {
						// max: data3[0].freechars,
						// list: getQueen(data3[0].freechars),
						range: [[1, +data3[0].freechars]],
						current: 1,
						time: new Date()
					};
					comicusersDao.update(function (err2, data2) {
						// 新增成功
						res.jsonp({ret: 0, err: err2, data: data2, info: data[0].adscardscount - 1});
					}, {
						userid: userid,
						lastviewed: new Date(),
						infos: JSON.stringify(_infos),
						adscount: data[0].adscount ? data[0].adscount + 1 : 1,
						adscardscount: req.query.usecard == 1 ? data[0].adscardscount - 1 : data[0].adscardscount
					}, userid);
				}

				// 独立的步骤，给我的master加数据
				// if (!req.query.only && !req.query.usecard && data[0].mymaster) {
				// 	// 去查询我的master数据 
				// 	comicusersDao.queryById(function (err4, data4) {
				// 		if (err4) {
				// 			// 返回异常
				// 			console.log(err4);
				// 			return false;
				// 		}
				// 		try {
				// 			var adscardinfo = JSON.parse(data4[0].adscardinfo || "[]");
				// 			// 找到数据
				// 			var nowindex = -1;
				// 			var nowinfo = adscardinfo.filter(function (ceil, index) {
				// 				if (ceil.uid == userid) {
				// 					nowindex = index;
				// 					return true;
				// 				} else {
				// 					return false;
				// 				}
				// 			});
				// 			if (nowinfo.length != 0) {
				// 				adscardinfo[nowindex].adcount = adscardinfo[nowindex].adcount ? +adscardinfo[nowindex].adcount + 1 : 1;
				// 				// 给数据+1
				// 				comicusersDao.update(function (err5, data5) {
				// 					console.log(err5, data5);
				// 				}, {
				// 					adscardinfo: JSON.stringify(adscardinfo)
				// 				}, data[0].mymaster);
				// 			}
							
				// 		} catch (e) {
				// 			console.log(e);
				// 		}
				// 	}, data[0].mymaster);
				// }
			}
		}, req.query.comic);
	}, userid);
}

// 别人帮助
exports.help = function (req, res, next) {
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	if (!req.query.frid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 不能没有cindex！！
	if (!req.query.cindex) {
		res.jsonp({ret: 1, msg: "param err."});
		return false;
	}
	// if (!req.query.pagecount) {
	// 	res.jsonp({ret: 1, msg: "param err"});
	// 	return false;
	// }

	// 没有登录也不行啊
	var userid = req.cookies.nameid || req.query.nameid;
	if (!userid) {
		res.jsonp({ret: 3, msg: "nologin"});
		return false;
	}

	// 只能是新用户哦
	comicusersDao.queryById(function (err, data) {
		if (err) {
			// 返回异常
			res.jsonp({ret: 4, msg: "err1"});
			return false;
		}

		// 是空的
		if (data && data.length == 0) {
			// 不存在
			// res.jsonp({ret: 5, msg: "not exait"});
			doHelp();
		} else {
			// 判断是否是新用户，看注册时间，是否是前3分钟
			if (new Date() - new Date(data[0].registertime) > (1000 * 60 * 20)) {
				// 不是新用户了
				res.jsonp({ret: 6, msg: "not new"});
			} else {
				// 是新用户
				doHelp();
			}
		}

		function doHelp () {
			// 判断是否给同一个好友助力过
			// 然后去给好友加次数
			comicusersDao.queryById(function (err, data) {
				if (err) {
					// 返回异常
					res.jsonp({ret: 7, msg: "err1"});
					return false;
				}

				// 是空的
				if (data && data.length == 0) {
					res.jsonp({ret: 8, msg: "err2"});
				} else {
					// 存在
					var _infos = JSON.parse(data[0].infos || "{}");
					if (_infos[req.query.comic]) {
						// 判断是否已经被这个好友助力过了
						if (_infos[req.query.comic].helpedlist && _infos[req.query.comic].helpedlist.some(function (ceil) {return ceil.id == userid})) {
							// 已经助力过了
							res.jsonp({ret: 10, msg: "helped"});
						} else {

							// 查询漫画信息
							comicsDao.queryById(function (err3, data3) {
								// 查询出漫画的基本信息
								if (err3 || (data3 && data3.length == 0)) {
									// 返回异常
									res.jsonp({ret: 11, msg: "err1"});
									return false;
								}

								// 还没有助力
								if (_infos[req.query.comic].max && !_infos[req.query.comic].range) {
									// 如果有max，就先把max转化成range
									_infos[req.query.comic].range = [[1, _infos[req.query.comic].max]];
								}

								// 不能有max了
								if (_infos[req.query.comic].max) {
									delete _infos[req.query.comic].max;
								}

								// 写入range
								// 判断当前next是否有章节信息
								_infos[req.query.comic].range = setQueen(_infos[req.query.comic].range || [[1, data3[0].freechars]], req.query.cindex, +data3[0].share_reward);

								// _infos[req.query.comic].max = _infos[req.query.comic].max + +data3[0].share_reward;
								
								if (!_infos[req.query.comic].helpedlist) {
									_infos[req.query.comic].helpedlist = [];
								}
								_infos[req.query.comic].helpedlist.push({
									id: userid,
									time: new Date()
								});
								comicusersDao.update(function (err2, data2) {
									// 新增成功
									res.jsonp({ret: 0, err: err2, data: data2});
								}, {
									userid: req.query.frid,
									infos: JSON.stringify(_infos)
								}, req.query.frid);
							}, req.query.comic);
						}
					} else {
						res.jsonp({ret: 9, msg: "err1"});
					}
				}
			}, req.query.frid);
		}
	}, userid);
}

// 收藏漫画
exports.collection = function (req, res, next) {
	// 所谓收藏，就是给自己的漫画达个标了
	// 必须要有漫画名和用户名
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 没有登录也不行啊
	var userid = req.cookies.nameid || req.query.nameid;
	if (!userid) {
		res.jsonp({ret: 3, msg: "nologin"});
		return false;
	}

	// 根据用户id，查询出漫画信息
	comicusersDao.queryById(function (err, data) {
		if (err) {
			// 返回异常
			res.jsonp({ret: 4, msg: "err1"});
			return false;
		}

		if (data && data.length == 0) {
			res.jsonp({ret: 8, msg: "err2"});
		} else {
			try {
				// 存在
				var _infos = JSON.parse(data[0].infos || "{}");
				if (_infos[req.query.comic]) {
					// 有这本漫画，可以打标了
					if (req.query.type) {
						delete _infos[req.query.comic].collect;
					} else {
						_infos[req.query.comic].collect = 1;
					}
					comicusersDao.update(function (err2, data2) {
						if (err2) {
							// 新增成功
							res.jsonp({ret: 7, err: err3});
						} else {
							// 新增成功
							res.jsonp({ret: 0, err: err2, data: data2});
						}
					}, {
						infos: JSON.stringify(_infos)
					}, userid);
				} else {
					// 没有这本漫画，就不正常
					res.jsonp({ret: 6, msg: "err4"});
				}
			} catch(e) {
				console.log(e);
				res.jsonp({ret: 5, msg: "err3"});
			}
		}
	}, userid);
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
    	var _tobj = {};
        queen.forEach(function (ceil) {
            for (var i = ceil[0]; i < ceil[ceil.length - 1] + 1; i++) {
            	if (!_tobj[i]) {
            		_tobj[i] = 1;
            		_t.push(i);
            	}
            }
        });
        
        // 排序
	   	_t.sort(function (a,b) {
	   		if (a > b) return 1;
	   		else if (a < b) return -1;
	   		else return 0;
	   	});
        return _t;
    } else {
        for (var i = 1; i < queen + 1; i++) {
            _t.push(i);
        }
        return _t;
    }
}


// 关联订单号
exports.fixuser = function (req, res, next) {
	// 必须要有订单号
	if (!req.query.mid) {
        // 必须要有
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }

    // 没有登录也不行啊
	var userid = req.cookies.nameid || req.query.nameid;
	if (!userid) {
		res.jsonp({ret: 3, msg: "nologin"});
		return false;
	}

    // 根据订单号，查询用户
    comicusersDao.queryList(function (err, data) {
    	// 拿到数据之后，再一个一个去同步comicuser表的数据和user表的数据
    	if (err || (data.data && data.data.length == 0)) {
    		// 数据不存在
    		res.jsonp({
	            ret: 4,
	            msg: "param error"
	        });
	        return false;
    	}

    	// 如果有自己本人，就不更新了
    	if (data.data.some(function (ceil) {return ceil.userid == userid})) {
    		// 数据不存在
    		res.jsonp({
	            ret: 0,
	            msg: "already"
	        });
	        return false;
    	}

    	// 同步comicuser数据
    	comicusersDao.update(function (err2, data2) {
    		if (err2) {
    			// console.log(err2);
    			res.jsonp({ret: 5, data: data2});
    		} else {
    			res.jsonp({ret: 0, data: data2});
    		}
		}, {
			infos: data.data[0].infos,
			lastviewed: data.data[0].lastviewed,
			readcount: data.data[0].readcount,
			adscount: data.data[0].adscount,
			viptime: data.data[0].viptime,
			lastsigned: data.data[0].lastsigned,
			signedtimes: data.data[0].signedtimes,
			nowcontinuesigned: data.data[0].nowcontinuesigned,
			adscardscount: data.data[0].adscardscount,
			payinfo: data.data[0].payinfo,
		}, userid);
    }, {
    	payinfo: {
			type: "like",
			value: '"' + req.query.mid + '"'
		}
    });
}

// 构建漫画
exports.buildComic = function (req, res, next) {
	// 一定要有漫画名字
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 获得
	getIt("https://m.tohomh123.com/action/Search?keyword=" + encodeURIComponent(req.query.comic));

	// 获得数据
	function getIt (tourl) {
		// 去toho搜一下
		request(tourl, function (err, data0) {
			if (!(data0 && data0.body)) {
				res.jsonp({ret: 3, msg: "找不到漫画"});
				return false;
			}
	        data0 = data0.body.replace(/[\r\n\t]/g,"");

	        // 判断是否需要重试
	        if (/uaredirect/.test(data0)) {
	        	// 需要重试啊
	        	getIt(tourl + "&page=1");
	        	return false;
	        }

	        var haveResult = false;
	        // if (!/0<\/strong>/.test(data0)) {
	        if (!/对不住，没找到您要的漫画/.test(data0)) {
	        	haveResult = true;
	        }
	        if (haveResult) {
	        	try {
	        		// data0 = data0.match(/mh-list col7(?:(?!<\/ul>).)+<\/ul>/)[0].match(/<li>(?:(?!<\/li>).)+<\/li>/g);
	        		// 要去找名字一样的
	        		var _t = [];
	        // 		data0.forEach(function (ceil) {
		       //  		var _tname = ceil.match(/href="\/([^\/]+)\/"/)[1];
		    			// _t.push({
		       //  			name: _tname,
		       //  			zname: ceil.match(/title="([^"]+)"/)[1],
		       //  			pic: ceil.match(/background-image: url\(([^\)]+)\)/)[1].replace(/^https:/, "http:")
		       //  		});
		       //  	});

	        		data0 = data0.match(/am-thumbnails list">(?:(?!<\/ul>).)+<\/ul>/)[0].match(/<li(?:(?!<\/li>).)+<\/li>/g);
		        	// 返回列表
		        	data0.forEach(function (ceil) {
		        		var _tname = ceil.match(/href="\/([^\/]+)\/"/)[1];
	        			_t.push({
		        			name: _tname,
		        			zname: ceil.match(/title="([^"]+)"/)[1],
		        			// pic: ceil.match(/<img src="([^"])+)/)[1].replace(/^https:/, "http:"),
		        			pic: ceil.match(/<img src="([^"]+)/)[1].replace(/^https:/, "http:"),
		        			more: ceil.match(/<span class="tip">([^<]+)</)[1]
		        		});
		        	});

	        		var _tt = _t.filter(function (ceil) {
	        			return ceil.zname == req.query.comic;
	        		});
	        		if (_tt.length == 0) {
	        			res.jsonp({ret: 3, msg: "找不到漫画"});
	        		} else {
	        			// 处理数据
			        	getWecUrl(_tt[0].zname, _tt[0].name, function (err2, data2) {
			        		// 构建完成了！
			        		if (req.query.isgetcomment) {
			        			res.jsonp({ret: 0, msg: "", data: data2});
			        		} else {
			        			console.log("build success");
			        		}
			        	}, req.query.type == 1, req.query.isgetcomment);

			        	if (!req.query.isgetcomment) {
			        		res.jsonp({ret: 0, msg: "正在构建中"});
			        	}
	        		}
	        	} catch(e) {
	        		res.jsonp({ret: 1, msg: "解析报错"});
	        	}
	        } else {
	        	res.jsonp({ret: 3, msg: "找不到漫画"});
	        }
	    });
	}
} 



// 构建漫画
exports.buildComic2 = function (req, res, next) {
	// 一定要有漫画名字
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 去mh1234搜一下
	request("https://m.mh1234.com/search/?keywords=" + encodeURIComponent(req.query.comic), function (err, data0) {

		if (!(data0 && data0.body)) {
			res.jsonp({ret: 3, msg: "找不到漫画"});
			return false;
		}
		
        data0 = data0.body.replace(/[\r\n\t]/g,"");
        var haveResult = false;
        if (!/没有找到数据。/.test(data0)) {
        	haveResult = true;
        }
        if (haveResult) {
        	try {
        		data0 = data0.match(/<a class="title" href="(?:(?!<\/a>).)+<\/a>/g);
        		// 要去找名字一样的
        		var _t = [];
        		data0.forEach(function (ceil) {
	    			_t.push({
	        			link: ceil.match(/href="([^"]+)"/)[1],
	        			zname: ceil.match(/">([^<]+)</)[1]
	        		});
	        	});
        		var _tt = _t.filter(function (ceil) {
        			return ceil.zname == req.query.comic;
        		});
        		if (_tt.length == 0) {
        			res.jsonp({ret: 3, msg: "找不到漫画"});
        		} else {
        			// 处理数据
		        	// getWecUrl(_tt[0].zname, _tt[0].name, function (err2, data2) {
		        	// 	// 构建完成了！
		        	// 	console.log("build success");
		        	// });
		        	getWecUrl2(_tt[0].link, _tt[0].zname, function (err2, data2) {
		        		if (req.query.getisover) {
		        			// 不是构建漫画
		        			res.jsonp({ret: 0, msg: "获得数据", data: data2});
		        		} else {
		        			console.log(err2, data2);
		        		}
		        	}, req.query.getisover, req.query.type == 1);

		        	if (!req.query.getisover) {
		        		// 是构建漫画
		        		res.jsonp({ret: 0, msg: "正在构建中", data: _tt});
		        	}
        		}
        	} catch(e) {
        		res.jsonp({ret: 1, msg: "解析报错"});
        	}
        } else {
        	res.jsonp({ret: 3, msg: "找不到漫画"});
        }
    });
} 

exports.getWecUrl2 = getWecUrl2;

// getWecUrl2("https://www.mh1234.com/comic/15096.html", "偷星九月天·异世界", function (err ,data) {
// 	console.log(err, data);
// });

// 去获得资源吧
function getWecUrl2 (link, zname, callback, getisover, forceall) {
	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
	}

    // https://www.mh1234.com/comic/18015.html
    console.log(link.replace("www.mh1234.com/", "m.mh1234.com/"));
    requestTry(link.replace("www.mh1234.com/", "m.mh1234.com/"), function (err, data) {
    	try {
	        // console.log(data.body);
	        // return false;
	        data = data.body.replace(/[\r\n\t]/g,"");

	        if (getisover) {
	        	// 只是想知道是否完结是吧
	        	callback && callback("", />已完结</.test(data) ? 1 : 0);
	        	return false;
	        }

	        // console.log(data);
	        // console.log(data.match(/chapter-list-1(?:(?!<\/ul>).)+<\/ul>/)[0]);
	        var temChars = data.match(/chapter-list-1(?:(?!<\/ul>).)+<\/ul>/)[0].match(/<li(?:(?!<\/li>).)+<\/li>/g);
	        var charactors = [];
	        temChars.forEach(function (ceil) {
	            charactors.push({
	                url: ceil.match(/href="([^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.match(/>([^>]+)<\/span>/)[1]
	            });
	        });
	     	
	        // 获得其他信息
	        var comicinfo = {
	        	name: "mh1234--" + link.match(/(\d+)\.html/)[1],
	        	z_ch_name: zname,
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: />已完结</.test(data) ? 1 : 0
	        };
	        // console.log(comicinfo, 1);

	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/"icon icon01"><\/span>([^<]*)<\/p>/);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        // var tags = data.match(/剧情类别：<\/em>[^>]+>([^<]*)<\/a>/);
	        // var tags = data.match(/icon icon02"><\/span><a href="([^<]*)<\/a>/);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].replace(/[^>]+>/, "");
	        // }
	        var tags = data.match(/icon icon02"><\/span>(?:(?!<\/p>).)+<\/p>/);
	        if (tags) {
	        	tags = tags[0].match(/<a[^>]+>([^<]+)/g);
	        	if (tags) {
	        		var _t_tag = [];
	        		tags.forEach(function (ceil) {
	        			_t_tag.push(ceil.replace(/[^>]+>/, ""));
	        		});
	        		tags = _t_tag;
	        	}
	        }
	        if (tags) {
		        comicinfo.tags = tags.join(",");
	        } else {
	        	comicinfo.tags = "日常";
	        }

	        // var characs = comicinfo.tags;
	        if (tags) {
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
		        		case "少年热血": characs += "热血,"; break;
		        		case "武侠格斗": characs += "武侠,"; break;
		        		case "科幻魔幻": characs += "仙侠,奇幻,玄幻,"; break;
		        		case "侦探推理": characs += "推理,烧脑,悬疑,"; break;
		        		case "恐怖灵异": characs += "猎奇,奇幻,悬疑,"; break;
		        		case "耽美人生": characs += "蔷薇,恋爱,治愈,"; break;
		        		case "少女爱情": characs += "恋爱,后宫,"; break;
		        		case "恋爱生活": characs += "恋爱,后宫,萌系,"; break;
		        		case "生活漫画": characs += "日常,治愈,"; break;
		        		case "战争漫画": characs += "热血,日常,"; break;
		        		case "爆笑喜剧": characs += "搞笑,日常,"; break;
		        		case "玄幻": characs += "玄幻,热血,冒险,"; break;
		        		case "爱情": characs += "恋爱,后宫,"; break;
		        		case "热血": characs += "热血,冒险,"; break;
		        		case "恋爱": characs += "恋爱,后宫,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }

	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/id="full-des" style="display: none;">([^<]*)<\/p>/);
	       	if (descs) {
	       		comicinfo.descs = descs[1].replace("&nbsp;", "");
	       	} else {
	       		descs = data.match(/id="simple-des">([^<]*)<\/p>/);
	       		if (descs) {
	       			comicinfo.descs = descs[1].replace("&nbsp;", "");
	       		}
	       	}

	       	// 主图
	       	var indexpic = data.match(/var pageImage = "([^"]+)"/)[1];
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic;
	       	}
	       	// console.log(comicinfo, 2);
	       	// var _b = [];
	     //   	try {
	     //   		var commnets = data.match(/<ul class="postlist">(?:(?!<\/ul>).)+<\/ul>/);
	     //        // console.log(commnets[0]);
	     //        commnets = commnets[0].match(/<li(?:(?!<\/li>).)+<\/li>/g);
	     //        commnets && commnets.slice(0,10).forEach(function (ceil) {
	     //            _b.push({
	     //                pic: "http://www.tohomh123.com" + ceil.match(/src="([^"]+)"/)[1],
	     //                nick: filterNicknameWithEmoj(ceil.match(/title">((?:(?!<\/p>).)+)<\/p>/)[1]),
	     //                text: filterNicknameWithEmoj(ceil.match(/content">((?:(?!<\/p>).)+)<\/p>/)[1]),
	     //                time: ceil.match(/bottom">((?:(?!<span).)+)<span/)[1].trim(),
	     //            });
	     //        });
	     //   	} catch(e){}

	     //    // console.log(comicinfo);
	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

	       		// 插入数据之前，先把数据搞一下
	       		exports.buildComic({
	       			query: {
	       				comic: comicinfo.z_ch_name,
	       				isgetcomment: 1
	       			}
	       		}, {
	       			jsonp: function (data4) {
	       				var comments = "";
	       				if (data4.ret == 0 && data4.data && data4.data.length) {
	       					comments = JSON.stringify(data4.data);
	       				}
	       				_toinsert.comments = comments;
	       				// 先把漫画插入到表中
				        comicsDao.add(function (err1, data1) {
					        if (err1) {
					        	console.log(err1);
					            // 写入db报错
					            callback("", "写入db报错");
					        } else {
					        	// callback("", "写入db成功");
					        	// console.log(data1);
					        	// 还要写入章节表
					        	// console.log(data1.insertId);
					        	render(data1.insertId, forceall ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
					        }
					    }, _toinsert , {
					        key: "name"
					    });
	       			}
	       		});
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	            var funcs = [];
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	                callback("", JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            callback("", getisover ? "" : "获得数据报错");
        }
    });


    function getPage (obj, pagecallback, trytime) {
        requestTry("https://m.mh1234.com" + obj.url.replace("/wap/comic", "/comic"), function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                // console.log(data);
                // 获得urls
                var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://mhpic.dongzaojiage.com" + (chapterPath ? "/" + chapterPath : "") + ceil);});
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: "https://m.mh1234.com" + obj.url.replace("/wap/comic", "/comic"),
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: "https://m.mh1234.com" + obj.url.replace("/wap/comic", "/comic"),
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}

// 构建漫画
exports.buildComic3 = function (req, res, next) {
	// 一定要有漫画名字
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request({
		    url: url,
		    method: 'get',
		    headers:{
		        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36",
		        "Cookie": "UM_distinctid=16e06ca77edb66-0489d012d4f00a-38677b07-1aeaa0-16e06ca77eeadd; CNZZDATA1277113641=1308486014-1572072084-%7C1572155966; PHPSESSID=vv4j216h86alr4g1perknc00k0; CNZZDATA1278169029=1521215428-1573372022-%7C1574940036; __51cke__=; userid=10848347; password=ae4a5e17d3d8cd5a9a16dbd775847210; username=aifmnm; __tins__20090269=%7B%22sid%22%3A%201574944978460%2C%20%22vd%22%3A%2013%2C%20%22expires%22%3A%201574946859019%7D; __51laig__=13"
		    }
		}, _doback);
	}

	async.parallel({
    	comic: function (ceilcall) {
    		requestTry("http://jfnnp.dfvcb.com/home/book/index/id/" + req.query.comicid, function (err, data) {
    			ceilcall(err, data.body.replace(/[\r\n\t]/g,""));
    		});
    	},
    	chars: function (ceilcall) {
    		requestTry("http://jfnnp.dfvcb.com/home/api/chapter_list/tp/" + req.query.comicid + "-1-1-1000", function (err, data) {
    			ceilcall(err, data.body.replace(/[\r\n\t]/g,""));
    		});
    	}
    }, function(err, data) {
    	try {
    		// console.log(err, data);
	    	// res.jsonp({err, data});
	    	// console.log();
	    	var charactors = JSON.parse(data.chars).result.list;
	    	// console.log(data.comic.match(/<span class="name">((?:(?!<\/span>).)+)<\/span>/)[1]);
	    	var tags = data.comic.match(/<span class="tag[^>]+>((?:(?!<\/span>).)+)<\/span>/g);
	    	if (tags) {
	    		var _ttag = [];
	    		tags.forEach(function (ceil) {
	    			var _tstr = ceil.match(/<span class="tag[^>]+>((?:(?!<\/span>).)+)<\/span>/);
	    			if (_tstr) {
	    				_ttag.push(_tstr[1]);
	    			}
	    		});
	    	}
	    	tags = _ttag.length ? _ttag.join(",") : "韩国漫画";

	        // 获得其他信息
	        var comicinfo = {
	        	name: "dfvcb--" + req.query.comicid,
	        	z_ch_name: data.comic.match(/<span class="name">((?:(?!<\/span>).)+)<\/span>/)[1],
	        	charactor_counts: charactors.length,
	        	share_reward: 3,
	        	ad_reward: 1,
	        	freechars: charactors.length < 10 ? 2 : 5,
	        	listwidth: "350",
	        	tags: tags,
	        	charactors: "韩国",
	        	limitinfo: 1
	        };

	        // 获得作者信息
	        var author = data.comic.match(/author">作者：([^<]+)</)[1].replace(/amp;/g, "");
	        if (author) {
	        	comicinfo.author = author;
	        }

	       	// 描述
	       	var descs = data.comic.match(/"book-desc">((?:(?!<\/p).)+)<\/p/);
	       	if (descs) {
	       		comicinfo.descs = descs[1].replace("&nbsp;", "");
	       	}

	       	// 主图
	       	var indexpic = data.comic.match(/<img alt="" src="([^"]+)"/)[1];
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic;
	       	}

	       	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date()
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        limitinfo: 1
				    };
	       		}
			    // 先把漫画插入到表中
		        comicsDao.add(function (err1, data1) {
			        // if (err1) {
			        // 	console.log(err1);
			        //     // 写入db报错
			        //     callback("", "写入db报错");
			        // } else {
			        // 	// callback("", "写入db成功");
			        // 	// console.log(data1);
			        // 	// 还要写入章节表
			        // 	// console.log(data1.insertId);
			        // 	render(data1.insertId, data3 && data3[0] && data3[0].charactor_counts);
			        // }
			        if (err1) {
			        	console.log(err1);
			            // 写入db报错
			            res.jsonp({err: err1, data: JSON.stringify(data1)});
			        } else {
			        	// callback("", "写入db成功");
			        	// console.log(data1);
			        	// 还要写入章节表
			        	// console.log(data1.insertId);
			        	render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
			        }
			    }, _toinsert , {
			        key: "name"
			    });
	       	}, comicinfo.name);
	       	
		    // console.log(comicinfo);
	        // 先把漫画插入到表中
	     //    comicsDao.add(function (err1, data1) {
		    //     if (err1) {
		    //     	console.log(err1);
		    //         // 写入db报错
		    //         res.jsonp({err: err1, data: JSON.stringify(data1)});
		    //     } else {
		    //     	// callback("", "写入db成功");
		    //     	// console.log(data1);
		    //     	// 还要写入章节表
		    //     	// console.log(data1.insertId);
		    //     	render(data1.insertId, data3 && data3[0] && data3[0].charactor_counts);
		    //     }
		    // }, {
		    //     name: comicinfo.name,
		    //     z_ch_name: comicinfo.z_ch_name,
		    //     author: comicinfo.author,
		    //     charactor_counts: comicinfo.charactor_counts,
		    //     tags: comicinfo.tags,
		    //     charactors: comicinfo.charactors,
		    //     descs: comicinfo.descs,
		    //     indexpic: comicinfo.indexpic,
		    //     share_reward: comicinfo.share_reward,
		    //     ad_reward: comicinfo.ad_reward,
		    //     freechars: comicinfo.freechars,
		    //     listwidth: comicinfo.listwidth,
		    //     createtime: new Date(),
		    //     updatetime: new Date(),
		    //     limitinfo: 1
		    // }, {
		    //     key: "name"
		    // });
    	} catch(e) {
    		res.jsonp({err: e});
    	} 

        function render (comicid, fromlen) {
        	fromlen = fromlen - 5 > 0 ? fromlen - 5 : 0;
            var funcs = [];
            charactors.forEach(function (ceil, index) {
                funcs.push(function (innerCall) {
                    // getPage({
                    //     url: ceil.url,
                    //     name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
                    //     index: index,
                    //     comicid: comicid,
                    //     comicname: comicinfo.name
                    // }, function (err, data) {
                    //     innerCall("", data);
                    // });
                    // console.log();
                   	var urls = Array.from(ceil.imagelist.split(","), function (cceil) {return "http://kgdd.aswyp.com:18181" + cceil.replace(/^\./, "")});
                   	// console.log(urls);
                    // 插入到数据
                    charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (index + 1) + ". " + ceil.title.replace(/\?/g, "").replace(/\:/g, "_") + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            innerCall("", err2 || "");
			        }, {
			            name: ceil.title.replace(/\?/g, "").replace(/\:/g, "_"),
			            comic_index: index + 1,
			            pic_count: urls.length,
			            comic_name: comicinfo.name,
			            route: comicinfo.name + "/" + (index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (comicid % 100)).slice(-2)
			        });
                });
            });
            // 数据
            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
                res.jsonp({err, data: JSON.stringify(data)});
            });
        }
    })
}

// 构建扑飞漫画
exports.buildComic4 = function (req, res, next) {
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}
	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		// request(url, _doback);
		request({
			url: url
		}).on('response',function(res){
	    	var chunks = [];
	    	res.on('data',function(chunk){
	        	chunks = chunks.concat(chunk);
	    	})

	    	res.on('end',function(){
	        	var buf = Buffer.concat(chunks);
	        	// 转码
	        	var text = iconvLite.decode(buf,'gbk');
	        	// console.log(text);
	        	_doback && _doback("", text);
	    	})
		}).on('error', function (res) {
			_doback && _doback("请求异常了！", "");
		});
	}

    // https://www.mh1234.com/comic/18015.html
    var link = "http://m.pufei.cc/manhua/" + req.query.comicid;
    requestTry(link, function (err, data) {
    	if (err) {
    		res.jsonp({
            	ret: 10,
            	msg: err
            });
            return false;
    	}
    	try {
	        data = data.replace(/[\r\n\t]/g,"");
	        // console.log(data.match(/chapter-list-1(?:(?!<\/ul>).)+<\/ul>/)[0]);
	        var temChars = data.match(/<li><a href="\/manhua\/(?:(?!\.html).)+\.html[^>]+/g);
	        var charactors = [];
	        temChars.forEach(function (ceil) {
	            charactors.push({
	                url: "http://m.pufei.cc" + ceil.match(/href="([^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.match(/title="([^"]+)"/)[1]
	            });
	        });

	        charactors.reverse();
	     	
	        // 获得中文名
	        var zname = data.match(/<h1>((?:(?!<\/h1>).)+)<\/h1>/)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "pufei--" + req.query.comicid,
	        	z_ch_name: zname,
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: 0
	        };
	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/<dt>作者：<\/dt>\s*<dd>((?:(?!<\/dd>).)+)<\/dd>/);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        var tags = data.match(/<dt>类别：<\/dt>\s*<dd>\s*<a[^>]+>([^<]+)</);
	        if (tags) {
	        	comicinfo.tags = tags[1].trim();
	        }

	        // var characs = comicinfo.tags;
	        if (tags) {
	        	tags = [tags[1].trim()];
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
		        		case "少年热血": characs += "热血,"; break;
		        		case "武侠格斗": characs += "武侠,"; break;
		        		case "科幻魔幻": characs += "仙侠,奇幻,玄幻,"; break;
		        		case "侦探推理": characs += "推理,烧脑,悬疑,"; break;
		        		case "恐怖灵异": characs += "猎奇,奇幻,悬疑,"; break;
		        		case "耽美人生": characs += "恋爱,后宫,治愈,"; break;
		        		case "少女爱情": characs += "恋爱,后宫,"; break;
		        		case "恋爱生活": characs += "恋爱,后宫,萌系,"; break;
		        		case "生活漫画": characs += "日常,治愈,"; break;
		        		case "战争漫画": characs += "热血,日常,"; break;
		        		case "爆笑喜剧": characs += "搞笑,日常,"; break;
		        		case "搞笑喜剧": characs += "搞笑,日常,"; break;
		        		case "耽美BL": characs += "彩虹,"; break;
		        		case "玄幻": characs += "玄幻,热血,冒险,"; break;
		        		case "爱情": characs += "恋爱,后宫,"; break;
		        		case "热血": characs += "热血,冒险,"; break;
		        		case "恋爱": characs += "恋爱,后宫,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }

	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/id="bookIntro">\s*<p>([^<]+)</);
	       	if (descs) {
	       		comicinfo.descs = descs[1].replace("&nbsp;", "").replace(/扑飞/g, "").replace(/扑飞：/g, "").replace(/扑飞，/g, "").replace(/扑飞,/g, "");
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/<div class="thumb">\s*<img src="([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}

	       	// console.log(comicinfo);
	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

	       		// 插入数据之前，先把数据搞一下
	       		exports.buildComic({
	       			query: {
	       				comic: comicinfo.z_ch_name,
	       				isgetcomment: 1
	       			}
	       		}, {
	       			jsonp: function (data4) {
	       				var comments = "";
	       				if (data4.ret == 0 && data4.data && data4.data.length) {
	       					comments = JSON.stringify(data4.data);
	       				}
	       				_toinsert.comments = comments;
	       				// 先把漫画插入到表中
				        comicsDao.add(function (err1, data1) {
					        if (err1) {
					        	console.log(err1);
					            // 写入db报错
					            res.jsonp({
					            	ret: 4,
					            	msg: "写入db报错"
					            });
					        } else {
					        	// callback("", "写入db成功");
					        	// console.log(data1);
					        	// 还要写入章节表
					        	// console.log(data1.insertId);
					        	
					        	// setTimeout(function () {
					        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
					        	// }, 100);

					        	res.jsonp({
					            	ret: 0,
					            	msg: "正在构建中"
					            });
					        }
					    }, _toinsert , {
					        key: "name"
					    });
	       			}
	       		});
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });


    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.replace(/[\r\n\t]/g,"");
                // console.log(data);
                try {
                	// console.log("function base64decode" + data.match(/<script type="text\/javascript">\s*function base64decode((?:(?!<\/script>).)+)<\/script>/)[1].replace("$(function () {", "").replace(/IMH\.reader.*$/, ""));
                	eval("function base64decode" + data.match(/<script type="text\/javascript">\s*function base64decode((?:(?!<\/script>).)+)<\/script>/)[1].replace("$(function () {", "").replace(/IMH\.reader.*$/, ""))
                } catch(e) {
                	console.log(e);
                }
                var arr = [39,1172,49,997,148,472,1542,460,74,214,164,420,504,2216,1120,825,756,471,2128,1009,93,60,245,1294,215,2367,413,2288,1785,29,923,456,1335,3081,1522,357,468,473,3039,418,2226,126,108,515,611,1848,2137,94,80,2198,2555,1777,159,459,1822,271,501,369,7,653,147,2434,2463,1458,696,243,1381,86,570,2464,446,1560,2147];

                function fixurl(url) {
		            if (url.indexOf('http://') != -1 || url.indexOf('https://') != -1) {
		                return url;
		            }
		            var path_arr = url.split('/');
		            var path_str = path_arr[0] + path_arr[1];
		            if (path_str <= 201801) {
		                //r.host = 'http://res.img.pufei.net/';
						var host = 'http://res.img.220012.net/';
		            }
		            var cur_href = obj.url;//取当前网址
		            var mh = cur_href.split("/");//分割获取id
		            for(let i=0; i<arr.length; i++) {
		                if(arr[i] == mh[4]) {
		                   // r.host='http://img_pf_u2fsdgvkx189qe2xuzec2bo5fndiuhzzkrwfbrx6r1f1.hcomic.cc/';
							var host='http://res.img.1fi4b.cn/';
		                }
		            }
		            return (host ? host : 'http://res.img.220012.net/') + url;
		        }

		        // 来组合数据吧
		        var urls = [];
		        _cuRs.forEach(function (ceil) {
		        	urls.push(fixurl(ceil));
		        });
		        // console.log(urls);
                // 获得urls
                // var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://mhpic.dongzaojiage.com" + (chapterPath ? "/" + chapterPath : "") + ceil);});
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}

// 构建兔兔漫画
exports.buildComic6 = function (req, res, next) {
	// kehuan!!fengshenji
	if (!req.query.comic || req.query.comic.split("!!").length != 2) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}
	var comic1 = req.query.comic.split("!!")[0];
	var comic2 = req.query.comic.split("!!")[1];
	
	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
		// request({
		// 	url: url
		// }).on('response',function(res){
	 //    	var chunks = [];
	 //    	res.on('data',function(chunk){
	 //        	chunks = chunks.concat(chunk);
	 //    	})

	 //    	res.on('end',function(){
	 //        	var buf = Buffer.concat(chunks);
	 //        	// 转码
	 //        	var text = iconvLite.decode(buf,'gbk');
	 //        	// console.log(text);
	 //        	_doback && _doback("", text);
	 //    	})
		// });
	}

    // http://m.tutumanhua.com/kehuan/fengshenji
    var link = "http://m.tutumanhua.com/" + comic1 + "/" + comic2;
    requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        var regex = new RegExp("<li><a href=" + "\"\\\/" + comic1 + "\\\/" + comic2 + "((?:(?!<\\\/li>).)+)<\\\/li>", "g");
	        var temChars = data.match(regex);
	        var charactors = [];
	        temChars.forEach(function (ceil) {
	            charactors.push({
	                url: "http://m.tutumanhua.com" + ceil.match(/href="([^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.match(/>([^<]+)</)[1]
	            });
	        });

	        charactors.reverse();
	     	
	        // 获得中文名
	        var zname = data.match(/txtItme h1">([^<]+)</)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "tutu--" + req.query.comic,
	        	z_ch_name: zname,
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: 0
	        };
	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/"txtItme">作者：([^<]+)</);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        var tags = data.match(/"txtItme">标签：([^<]+)</);
	        if (tags) {
	        	comicinfo.tags = tags[1].trim();
	        }

	        // var characs = comicinfo.tags;
	        if (tags) {
	        	tags = [tags[1].trim()];
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
		        		case "少年热血": characs += "热血,"; break;
		        		case "武侠格斗": characs += "武侠,"; break;
		        		case "科幻魔幻": characs += "仙侠,奇幻,玄幻,"; break;
		        		case "侦探推理": characs += "推理,烧脑,悬疑,"; break;
		        		case "恐怖灵异": characs += "猎奇,奇幻,悬疑,"; break;
		        		case "耽美人生": characs += "恋爱,后宫,治愈,"; break;
		        		case "少女爱情": characs += "恋爱,后宫,"; break;
		        		case "恋爱生活": characs += "恋爱,后宫,萌系,"; break;
		        		case "生活漫画": characs += "日常,治愈,"; break;
		        		case "战争漫画": characs += "热血,日常,"; break;
		        		case "爆笑喜剧": characs += "搞笑,日常,"; break;
		        		case "搞笑喜剧": characs += "搞笑,日常,"; break;
		        		case "耽美BL": characs += "彩虹,"; break;
		        		case "玄幻": characs += "玄幻,热血,冒险,"; break;
		        		case "爱情": characs += "恋爱,后宫,"; break;
		        		case "热血": characs += "热血,冒险,"; break;
		        		case "恋爱": characs += "恋爱,后宫,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }

	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/<p class="d-nowrap-clamp d-nowrap-clamp-2">([^<]+)</);
	       	if (descs) {
	       		comicinfo.descs = descs[1].replace("&nbsp;", "").trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/id="Cover">\s*<img src="([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}

	       	// console.log(comicinfo);
	       	// return false;
	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

	       		// 插入数据之前，先把数据搞一下
	       		exports.buildComic({
	       			query: {
	       				comic: comicinfo.z_ch_name,
	       				isgetcomment: 1
	       			}
	       		}, {
	       			jsonp: function (data4) {
	       				var comments = "";
	       				if (data4.ret == 0 && data4.data && data4.data.length) {
	       					comments = JSON.stringify(data4.data);
	       				}
	       				_toinsert.comments = comments;
	       				// 先把漫画插入到表中
				        comicsDao.add(function (err1, data1) {
					        if (err1) {
					        	console.log(err1);
					            // 写入db报错
					            res.jsonp({
					            	ret: 4,
					            	msg: "写入db报错"
					            });
					        } else {
					        	// callback("", "写入db成功");
					        	// console.log(data1);
					        	// 还要写入章节表
					        	// console.log(data1.insertId);
					        	
					        	// setTimeout(function () {
					        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
					        	// }, 100);

					        	res.jsonp({
					            	ret: 0,
					            	msg: "正在构建中"
					            });
					        }
					    }, _toinsert , {
					        key: "name"
					    });
	       			}
	       		});
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs, 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                	
                var key = data.match(/var\s*qTcms_S_m_murl_e="([^"]+)"/)[1];

		        // 来组合数据吧
		        var urls = base64_decode(key).split("$qingtiandy$");

		        // console.log(urls);
                // 获得urls
                // var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://mhpic.dongzaojiage.com" + (chapterPath ? "/" + chapterPath : "") + ceil);});
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}


function utf8_decode ( str_data ) {
    var tmp_arr = [], i = 0, ac = 0, c1 = 0, c2 = 0, c3 = 0;
    str_data += '';
    while ( i < str_data.length ) {
        c1 = str_data.charCodeAt(i);
        if (c1 < 128) {
            tmp_arr[ac++] = String.fromCharCode(c1);
            i++;
        } else if ((c1 > 191) && (c1 < 224)) {
            c2 = str_data.charCodeAt(i+1);
            tmp_arr[ac++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            i += 2;
        } else {
            c2 = str_data.charCodeAt(i+1);
            c3 = str_data.charCodeAt(i+2);
            tmp_arr[ac++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }
    }
    return tmp_arr.join('');
}
function base64_decode (data) {
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
    if (!data) {return data;}
    data += '';
    do { 
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));
        bits = h1<<18 | h2<<12 | h3<<6 | h4;
        o1 = bits>>16 & 0xff;
        o2 = bits>>8 & 0xff;
        o3 = bits & 0xff;
        if (h3 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
            tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
    } while (i < data.length);
    dec = tmp_arr.join('');
    dec = utf8_decode(dec);
    return dec;
}


// 构建漫画DB漫画
exports.buildComic7 = function (req, res, next) {
	// kehuan!!fengshenji
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}

	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
		// request({
		// 	url: url
		// }).on('response',function(res){
	 //    	var chunks = [];
	 //    	res.on('data',function(chunk){
	 //        	chunks = chunks.concat(chunk);
	 //    	})

	 //    	res.on('end',function(){
	 //        	var buf = Buffer.concat(chunks);
	 //        	// 转码
	 //        	var text = iconvLite.decode(buf,'gbk');
	 //        	// console.log(text);
	 //        	_doback && _doback("", text);
	 //    	})
		// });
	}

    // http://m.tutumanhua.com/kehuan/fengshenji
    var link = "https://www.manhuadb.com/manhua/" + req.query.comicid;
    requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        var temChars = data.match(/<li class="sort_div(?:(?!<\/li>).)+<\/li>/g);
	        var charactors = [];
	        temChars.forEach(function (ceil) {
	            charactors.push({
	                url: "http://www.manhuadb.com" + ceil.match(/href="([^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.match(/title="([^"]+)"/)[1]
	            });
	        });

	        // charactors.reverse();
	     	
	        // 获得中文名
	        var zname = data.match(/"comic-title">([^<]+)</)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "manhuadb--" + req.query.comicid,
	        	z_ch_name: zname,
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: 0
	        };
	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/comic-creator">([^<]+)</);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        var tags = data.match(/class="comic_tags">([^<]+)</g);
        	if (tags) {
        		var _t_tag = [];
        		tags.forEach(function (ceil) {
        			_t_tag.push(ceil.match(/class="comic_tags">([^<]+)</)[1].trim());
        		});
        		tags = _t_tag;
        	}
        	comicinfo.tags = tags ? tags.join(",") : "";

	        // var tags = data.match(/class="comic_tags">([^<]+)</g);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].trim();
	        // }

	        // var characs = comicinfo.tags;
	        var chars = data.match(/title="分类:([^"]+)"/g), char_t = [];
	        chars.forEach(function (ceil) {
	        	char_t.push(ceil.match(/title="分类:([^"]+)"/)[1]);
	        });
	        if (char_t) {
	        	var characs = "";
	        	char_t.forEach(function (ceil) {
	        		switch (ceil) {
		        		case "爱情": characs += "恋爱,"; break;
		        		case "魔幻": characs += "玄幻,"; break;
		        		case "生活": characs += "日常,"; break;
		        		case "动作": characs += "冒险,"; break;
		        		case "喜剧": characs += "搞笑,"; break;
		        		case "格斗": characs += "冒险,武侠,"; break;
		        		case "耽美": characs += "彩虹,"; break;
		        		case "鬼神": characs += "恐怖,奇幻,玄幻,"; break;
		        		case "魔法": characs += "玄幻,奇幻,"; break;
		        		case "历史": characs += "古风,"; break;
		        		case "侦探": characs += "推理,烧脑,"; break;
		        		case "惊悚": characs += "恐怖,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }

	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/"comic_story">([^<]+)</);
	       	if (descs) {
	       		comicinfo.descs = descs[1].replace("&nbsp;", "").trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/"comic-cover"><img src="([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1].indexOf("http") == 0 ? indexpic[1] : "https://www.manhuadb.com" + indexpic[1];
	       	}

	       	// console.log(comicinfo);
	       	// return false;
	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

	       		// 插入数据之前，先把数据搞一下
	       		exports.buildComic({
	       			query: {
	       				comic: comicinfo.z_ch_name,
	       				isgetcomment: 1
	       			}
	       		}, {
	       			jsonp: function (data4) {
	       				var comments = "";
	       				if (data4.ret == 0 && data4.data && data4.data.length) {
	       					comments = JSON.stringify(data4.data);
	       				}
	       				_toinsert.comments = comments;
	       				// 先把漫画插入到表中
				        comicsDao.add(function (err1, data1) {
					        if (err1) {
					        	console.log(err1);
					            // 写入db报错
					            res.jsonp({
					            	ret: 4,
					            	msg: "写入db报错"
					            });
					        } else {
					        	// callback("", "写入db成功");
					        	// console.log(data1);
					        	// 还要写入章节表
					        	// console.log(data1.insertId);
					        	
					        	// setTimeout(function () {
					        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
					        	// }, 100);

					        	res.jsonp({
					            	ret: 0,
					            	msg: "正在构建中"
					            });
					        }
					    }, _toinsert , {
					        key: "name"
					    });
	       			}
	       		});
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs, 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                	
                var key = data.match(/img_data\s*=\s*'([^']+)'/)[1];
                var prefix = data.match(/data-img_pre="([^"]+)"/)[1];
		        // 来组合数据吧
		        var urls = JSON.parse(base64_decode(key)), _t_urls = [];

		        urls.forEach(function (ceil) {
		        	_t_urls.push("https://i1.manhuadb.com" + prefix + ceil.img);
		        });
		        urls = _t_urls;

		        // console.log(urls);
                // 获得urls
                // var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://mhpic.dongzaojiage.com" + (chapterPath ? "/" + chapterPath : "") + ceil);});
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}

// 构建有码漫画
exports.buildComic5 = function (req, res, next) {
	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request({
			url: url, 
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36"
			}
		}, _doback);
	}

	var cid = "";
	// 二选一吧
	if (req.query.comicname) {
		var reg = /（全集无删减）|\(全集无删减\)|（无删减）|\(无删减\)|（全集）|\(全集\)|（完结）|\(完结\)/g;
		// 是漫画名
		request({
            url: "https://www.youmahm.com/index.php/search?key=" + encodeURIComponent(req.query.comicname.replace(reg, "")) + "&_t=" + Math.random(), 
            strictSSL: false
        }, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                data = data.match(/<a href="\/book\/\d+" target="_blank">[^<]+<\/a>/g);

                data = data.filter(function (cceil) {return sim.simplify(cceil.match(/_blank">([^<]+)</)[1].replace(reg, "")) == sim.simplify(req.query.comicname.replace(reg, ""))});
                if (data && data[0] && data[0].match(/\/book\/(\d+)"/)[1]) {
                	// 有的
                	cid = data[0].match(/\/book\/(\d+)"/)[1];
                	comicsDao.queryList(function (err3, data3) {
                		// console.log(err3, data3);
                		if (err3) {
                			res.jsonp({
				            	ret: 17,
				            	msg: err3
				            });
                		} else {
                			data3 = data3.data.filter(function (ceil) {return ceil.name.indexOf("youma--") != -1});
                			if (data3.length) {
                				handleData(data3);
                			} else {
                				// 不存在，就去构建吧
                				handleData("");
                			}
                		}
                	}, {
		       			z_ch_name: {
		       				type: "=",
		       				value: req.query.comicname
		       			}
		       		})
                } else {
                	// 没有
                	console.log("没有" + req.query.comicname);
                	res.jsonp({
		            	ret: 15,
		            	msg: "没有" + req.query.comicname
		            });
		            return false;
                }
            } catch(e) {
            	// 没有数据
            	console.log(e, req.query.comicname);
            	res.jsonp({
	            	ret: 16,
	            	msg: req.query.comicname + " " + e.toString()
	            });
	            return false;
            }
        });
        return false;
	} else {
		// 一定要有漫画名字
		if (!req.query.comicid) {
			res.jsonp({ret: 1, msg: "param err"});
			return false;
		}
		// 要抓一下数据，判断是否有替代资源
		comicsDao.queryById(function (err3, data3) {
			handleData(data3);
	   	}, "youma--" + req.query.comicid);
	}

	function handleData (data3) {
		// 是否之前有
		var evergot = "";
		if (data3 && data3[0]) {
			evergot = data3[0].name.replace("youma--", "");
		}

  //  		if (data3 && data3[0] && data3[0].replacesource) {
  //  			if (data3[0].replacesource == "empty") {
  //  				res.jsonp({
	 //            	ret: 14,
	 //            	msg: "是empty"
	 //            });
	 //            return false;
  //  			} else {
  //  				var sourceurl = data3[0].replacesource;
  //  			}
  //  		} else {
   			var sourceurl = "https://www.youmahm.com/book/" + (req.query.comicid || cid);
   		// }
   		requestTry(sourceurl, function (err, data) {
			try {
				try {
					data = data.body.replace(/[\r\n\t]/g,"");
				} catch (e){
					console.log(sourceurl, err, data);
					res.jsonp({
		            	ret: 4,
		            	msg: "获得数据报错"
		            });
		            return false;
				}
		        
		        // console.log(data.match(/chapter-list-1(?:(?!<\/ul>).)+<\/ul>/)[0]);
		        // console.log(data);
		        var temChars = data.match(/<a class="j-chapter-link" href="\/chapter\/\d+(?:(?!<\/a>).)+<\/a>/g);
		        var charactors = [];
		        temChars.forEach(function (ceil) {
		        	var _t1 = ceil.match(/\/chapter\/(\d+)/);
		        	var _t2 = ceil.replace(/<[^>]+>/g, "").trim();
		        	if (_t1 && _t2) {
		        		charactors.push({
			                url: "https://www.youmahm.com/chapter/" + _t1[1],
			                // name: ceil.match(/>([^>]+)<i>/)[1]
			                name: _t2.replace(/&hellip;/g, "…")
			            });
		        	}
		        });
		        // charactors.reverse();
		     	
		        // 获得中文名
		        var zname = data.match(/comic-title j-comic-title">([^><]+)</)[1];

		        // 获得其他信息
		        var comicinfo = {
		        	name: "youma--" + (evergot ? evergot : (10000 + +cid)),
		        	z_ch_name: zname,
		        	charactor_counts: charactors.length,
		        	share_reward: 3,
		        	ad_reward: 1,
		        	freechars: charactors.length < 10 ? 2 : 5,
		        	listwidth: "350",
		        	charactors: "韩国",
		        	limitinfo: 1,
		        	replacesource: sourceurl
		        };

		        // 获得作者信息
		        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
		        var author = data.match(/<img class="avatar" src="[^"]+" alt="([^"]+)/);
		        if (author) {
		        	comicinfo.author = author[1].trim().replace(/amp;/g, "");
		        }
		        // 获得类目信息
		        // var tags = data.match(/booklist\/\?tag=([^"]+)"/);
		        // if (tags) {
		        // 	comicinfo.tags = tags[1].trim();
		        // }
		        comicinfo.tags = "韩国";
		       	// 描述
		       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
		       	var descs = data.match(/class="intro-total">([^<]+)</);
		       	if (descs) {
		       		comicinfo.descs = descs[1].trim().replace(/&hellip;/g, "…");
		       	} else {
		       		comicinfo.descs = "";
		       	}

		       	// 主图
	       		// comicinfo.indexpic = "https://p.youma.org/static/upload/book/" + req.query.comicid + "/cover.jpg";
	       		// console.log(data.match(/data-original="([^"]+)"/)[1]);
	       		// return false;
	       		comicinfo.indexpic = data.match(/<div class="de-info__cover"><img class="lazy" src="([^"]+)"/)[1];
	       		
		       	// console.log(comicinfo);
		     	comicsDao.queryById(function (err3, data3) {
		       		if (data3 && data3.length != 0) {
		       			// 有数据，有一些是不更新的
		       			// 要插入的数据
			       		var _toinsert = {
					        name: comicinfo.name,
					        // z_ch_name: comicinfo.z_ch_name,
					        author: comicinfo.author,
					        charactor_counts: comicinfo.charactor_counts,
					        charactors: comicinfo.charactors,
					        updatetime: new Date(),
					        freechars: comicinfo.freechars,
					        tags: comicinfo.tags,
					        descs: comicinfo.descs,
					        // indexpic: comicinfo.indexpic,
				        	replacesource: comicinfo.replacesource
					        // comments: _b.length ? JSON.stringify(_b) : "",
					    };
		       		} else {
		       			// 要插入的数据
			       		var _toinsert = {
					        name: comicinfo.name,
					        z_ch_name: comicinfo.z_ch_name,
					        author: comicinfo.author,
					        charactor_counts: comicinfo.charactor_counts,
					        tags: comicinfo.tags,
					        charactors: comicinfo.charactors,
					        descs: comicinfo.descs,
					        more: "",
					        indexpic: comicinfo.indexpic,
					        share_reward: comicinfo.share_reward,
					        ad_reward: comicinfo.ad_reward,
					        freechars: comicinfo.freechars,
					        listwidth: comicinfo.listwidth,
					        createtime: new Date(),
					        updatetime: new Date(),
					        limitinfo: 1,
				        	replacesource: comicinfo.replacesource
					    };
		       		}

		       		// 获得搜索关键字
		       		comicsDao.queryList(function (err2, data2) {
		       			if (err2 || !(data2 && data2.data && data2.data.length)) {
		       				var searchtags = "";
		       			} else {
		       				var searchtags = data2.data[0].searchtags;
		       			}
		       			_toinsert.searchtags = searchtags;
		       			// 先把漫画插入到表中
				        comicsDao.add(function (err1, data1) {
					        if (err1) {
					        	console.log(err1);
					            // 写入db报错
					            res.jsonp({
					            	ret: 4,
					            	msg: "写入db报错"
					            });
					        } else {
					        	// callback("", "写入db成功");
					        	// console.log(data1);
					        	// 还要写入章节表
					        	// console.log(data1.insertId);
					        	
					        	// setTimeout(function () {
					        	if (req.query.range) {
					        		var rangestart = req.query.range.split("_")[0];
					        		var rangeend = req.query.range.split("_")[1];
					        		rangeend = rangeend || (+rangestart + 1);
					        		render(data1.insertId, rangestart - 1, rangeend - 1);
					        	} else {
					        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
					        	}
					        	// }, 100);

					        	res.jsonp({
					            	ret: 0,
					            	msg: "正在构建中"
					            });
					        }
					    }, _toinsert , {
					        key: "name"
					    });
		       		}, {
		       			z_ch_name: {
		       				type: "=",
		       				value: zname
		       			}
		       		}, {pagesize: 10000});
		       	}, comicinfo.name);

		        function render (comicid, fromlen, tolen) {
		            var funcs = [];
		            console.log(fromlen, tolen);
		            charactors.forEach(function (ceil, index) {
		                funcs.push(function (innerCall) {
		                    getPage({
		                        url: ceil.url,
		                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
		                        index: index,
		                        comicid: comicid,
		                        comicname: comicinfo.name
		                    }, function (err, data) {
		                    	setTimeout(function () {
		                    		innerCall("", data);
		                    	}, 5000);
		                    });
		                });
		            });
		            // 数据fromlen ? funcs.slice(fromlen) : funcs
		            // async.parallelLimit(funcs, 1, function(err, data) {
	            	async.parallelLimit(fromlen && tolen ? funcs.slice(fromlen, tolen) : (fromlen && !tolen) ? funcs.slice(fromlen) : funcs, 1, function(err, data) {
		            // async.parallelLimit(funcs.slice(5,6), 3, function(err, data) {
		                // res.jsonp("", JSON.stringify(data));
			            console.log(JSON.stringify(data));
		            });
		        }

	        } catch (e) {
	        	console.log(sourceurl, e);
	            // 页面内部解析出错
	            res.jsonp({
	            	ret: 4,
	            	msg: "获得数据报错"
	            });
	        }
		});
	}

	function getPage (obj, pagecallback) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
		        // 来组合数据吧
		        var urls = [];

		        data.match(/data-original="[^"]+"/g).forEach(function (ceil) {
		        	urls.push(ceil.match(/original="([^"]+)"/)[1]);
		        });
		        // console.log(urls);
                // 获得urls
                // var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://mhpic.dongzaojiage.com" + (chapterPath ? "/" + chapterPath : "") + ceil);});
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 页面内部解析出错
                pagecallback("", {
                    url: obj.url,
                    reason: e.toString()
                });
            }
        });
    }
}


// 构建有码漫画
exports.buildComic16 = function (req, res, next) {
	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request({
			url: url, 
			headers: {
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36",
				"Cookie": "mc_user_id=f77cQnbyNNkAf-yq4uO6s%2Fq%2FPOclt86heZk8wG6CgZC6; mc_user_login=9a22U3sGzOtk3zkQQKftCa-hYvM%2FtDoVzbO96a4QGyFUeFRqbALgdyVyET1DKkAvEJc3TE-h62C7NJV%2FvA"
			}
		}, _doback);
	}

	var cid = "";
	// 二选一吧
	if (req.query.comicname) {
		var reg = /（全集无删减）|\(全集无删减\)|（无删减）|\(无删减\)|（全集）|\(全集\)|（完结）|\(完结\)/g;
		// 是漫画名
		request({
            url: "https://www.05mh.com/index.php/search?key=" + encodeURIComponent(req.query.comicname.replace(reg, "")) + "&_t=" + Math.random(), 
            strictSSL: false,
			headers: {
				"User-Agent": "jdpingou;android;1.0;5.0.1;869511021531997-98e7f57ed6d0;network/wifi;model/HUAWEI GRA-TL00;appBuild/1;;;Mozilla/5.0 (Linux; Android 5.0.1; HUAWEI GRA-TL00 Build/HUAWEIGRA-TL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/6.2 TBS/044504 Mobile Safari/537.36"
			}
        }, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                data = data.match(/item comic-item(?:(?!<\/li>).)+<\/li>/g);
				// console.log(data);
                data = data.filter(function (cceil) {return sim.simplify(cceil.match(/title="([^"]+)"/)[1].split(',')[0].replace(reg, "")) == sim.simplify(req.query.comicname.replace(reg, ""))});
                if (data && data[0] && data[0].match(/href="\/comic\/([^"]+)"/)[1]) {
                	// 有的
                	cid = data[0].match(/href="\/comic\/([^"]+)"/)[1];
                	comicsDao.queryList(function (err3, data3) {
                		// console.log(err3, data3);
                		if (err3) {
                			res.jsonp({
				            	ret: 17,
				            	msg: err3
				            });
                		} else {
                			data3 = data3.data.filter(function (ceil) {return ceil.name.indexOf("youma--") != -1});
                			if (data3.length) {
                				handleData(data3);
                			} else {
                				// 不存在，就去构建吧
                				handleData("");
                			}
                		}
                	}, {
		       			z_ch_name: {
		       				type: "=",
		       				value: req.query.comicname
		       			}
		       		})
                } else {
                	// 没有
                	console.log("没有" + req.query.comicname);
                	res.jsonp({
		            	ret: 15,
		            	msg: "没有" + req.query.comicname
		            });
		            return false;
                }
            } catch(e) {
            	// 没有数据
            	console.log(e, req.query.comicname);
            	res.jsonp({
	            	ret: 16,
	            	msg: req.query.comicname + " " + e.toString()
	            });
	            return false;
            }
        });
        return false;
	} else {
		// 一定要有漫画名字
		if (!req.query.comicid) {
			res.jsonp({ret: 1, msg: "param err"});
			return false;
		}
		// 要抓一下数据，判断是否有替代资源
		comicsDao.queryById(function (err3, data3) {
			handleData(data3);
	   	}, "youma--" + req.query.comicid);
	}

	function handleData (data3) {
		// 是否之前有
		var evergot = "";
		if (data3 && data3[0]) {
			evergot = data3[0].name.replace("youma--", "");
		}

  //  		if (data3 && data3[0] && data3[0].replacesource) {
  //  			if (data3[0].replacesource == "empty") {
  //  				res.jsonp({
	 //            	ret: 14,
	 //            	msg: "是empty"
	 //            });
	 //            return false;
  //  			} else {
  //  				var sourceurl = data3[0].replacesource;
  //  			}
  //  		} else {
   			var sourceurl = "https://www.05mh.com/comic/" + (req.query.comicid || cid);
   		// }
   		requestTry(sourceurl, function (err, data) {
			try {
				try {
					data = data.body.replace(/[\r\n\t]/g,"");
				} catch (e){
					console.log(sourceurl, err, data);
					res.jsonp({
		            	ret: 4,
		            	msg: "获得数据报错"
		            });
		            return false;
				}
		        
		        // console.log(data.match(/chapter-list-1(?:(?!<\/ul>).)+<\/ul>/)[0]);
		        // console.log(data);
		        // var temChars = data.match(/<a class="j-chapter-link" href="\/chapter\/\d+(?:(?!<\/a>).)+<\/a>/g);
		        var charlist = data.match(/var chapter_list = ([^;]+);/)[1];
		        var temChars = JSON.parse(charlist.replace(/'/g, "\""));
		        var charactors = [];
		        temChars.forEach(function (ceil) {
	        		charactors.push({
		                url: "https://www.05mh.com" + ceil.url,
		                id: ceil.id,
		                // name: ceil.match(/>([^>]+)<i>/)[1]
		                name: ceil.name
		            });
		        });
		        // charactors.reverse();
		        // 获得中文名
		        var zname = data.match(/<title>(.+)漫画下拉式/)[1];
		        // 获得其他信息
		        var comicinfo = {
		        	name: "youma--" + (evergot ? evergot : (10000 + +cid)),
		        	z_ch_name: zname,
		        	charactor_counts: charactors.length,
		        	share_reward: 3,
		        	ad_reward: 1,
		        	freechars: charactors.length < 10 ? 2 : 5,
		        	listwidth: "350",
		        	charactors: "韩国",
		        	limitinfo: 1,
		        	replacesource: sourceurl
		        };

		        // 获得作者信息
		        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
		        // var author = data.match(/<img class="avatar" src="[^"]+" alt="([^"]+)/);
		        // if (author) {
		        // 	comicinfo.author = author[1].trim().replace(/amp;/g, "");
		        // }
		        // 获得类目信息
		        // var tags = data.match(/booklist\/\?tag=([^"]+)"/);
		        // if (tags) {
		        // 	comicinfo.tags = tags[1].trim();
		        // }
		        comicinfo.tags = "韩国";
		       	// 描述
		       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
		       	var descs = data.match(/简介 ：<\/span>\s*((?:(?!<\/p>).)+)\s*<\/p>/);
		       	if (descs) {
		       		comicinfo.descs = descs[1].trim().replace(/&hellip;/g, "…");
		       	} else {
		       		comicinfo.descs = "";
		       	}

		       	// 主图
	       		// comicinfo.indexpic = "https://p.youma.org/static/upload/book/" + req.query.comicid + "/cover.jpg";
	       		// console.log(data.match(/data-original="([^"]+)"/)[1]);
	       		// return false;
	       		comicinfo.indexpic = data.match(/<div class="detail-cover">(?:(?!background).)+background: url\('([^']+)'.+<\/div>/)[1];

		     	comicsDao.queryById(function (err3, data3) {
		       		if (data3 && data3.length != 0) {
		       			// 有数据，有一些是不更新的
		       			// 要更新的数据
			       		var _toinsert = {
					        name: comicinfo.name,
					        // z_ch_name: comicinfo.z_ch_name,
					        // author: comicinfo.author,
					        // charactor_counts: comicinfo.charactor_counts,
					        // charactors: comicinfo.charactors,
					        updatetime: new Date(),
					        // freechars: comicinfo.freechars,
					        // tags: comicinfo.tags,
					        // descs: comicinfo.descs,
					        indexpic: comicinfo.indexpic,
				        	// replacesource: comicinfo.replacesource
					        // comments: _b.length ? JSON.stringify(_b) : "",
					    };
						if (comicinfo.charactor_counts - data3[0].charactor_counts > 0) {
							// 新数据章节比较多
							_toinsert.charactor_counts = comicinfo.charactor_counts;
							_toinsert.freechars = comicinfo.freechars;
						}
		       		} else {
		       			// 要插入的数据
			       		var _toinsert = {
					        name: comicinfo.name,
					        z_ch_name: comicinfo.z_ch_name,
					        author: "韩国",
					        charactor_counts: comicinfo.charactor_counts,
					        tags: comicinfo.tags,
					        charactors: comicinfo.charactors,
					        descs: comicinfo.descs,
					        more: "",
					        indexpic: comicinfo.indexpic,
					        share_reward: comicinfo.share_reward,
					        ad_reward: comicinfo.ad_reward,
					        freechars: comicinfo.freechars,
					        listwidth: comicinfo.listwidth,
					        createtime: new Date(),
					        updatetime: new Date(),
					        limitinfo: 1,
				        	replacesource: comicinfo.replacesource
					    };
		       		}

		       		// 获得搜索关键字
		       		comicsDao.queryList(function (err2, data2) {
		       			if (err2 || !(data2 && data2.data && data2.data.length)) {
		       				var searchtags = "";
		       			} else {
		       				var searchtags = data2.data[0].searchtags;
		       			}
		       			_toinsert.searchtags = searchtags;
		       			// 先把漫画插入到表中
				        comicsDao.add(function (err1, data1) {
					        if (err1) {
					        	console.log(err1);
					            // 写入db报错
					            res.jsonp({
					            	ret: 4,
					            	msg: "写入db报错"
					            });
					        } else {
					        	// callback("", "写入db成功");
					        	// console.log(data1);
					        	// 还要写入章节表
					        	// console.log(data1.insertId);
					        	
					        	// setTimeout(function () {
					        	if (req.query.range) {
					        		var rangestart = req.query.range.split("_")[0];
					        		var rangeend = req.query.range.split("_")[1];
					        		rangeend = rangeend || (+rangestart + 1);
					        		render(data1.insertId, rangestart - 1, rangeend - 1);
					        	} else {
					        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
					        	}
					        	// }, 100);

					        	res.jsonp({
					            	ret: 0,
					            	msg: "正在构建中"
					            });
					        }
					    }, _toinsert , {
					        key: "name"
					    });
		       		}, {
		       			z_ch_name: {
		       				type: "=",
		       				value: zname
		       			}
		       		}, {pagesize: 10000});
		       	}, comicinfo.name);

		        function render (comicid, fromlen, tolen) {
		            var funcs = [];
		            console.log(fromlen, tolen);
		            charactors.forEach(function (ceil, index) {
		                funcs.push(function (innerCall) {
		                    getPage({
		                        url: ceil.url,
		                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
		                        index: index,
		                        comicid: comicid,
		                        comicname: comicinfo.name,
		                        id: ceil.id
		                    }, function (err, data) {
		                    	setTimeout(function () {
		                    		innerCall("", data);
		                    	}, 5000);
		                    });
		                });
		            });
		            // 数据fromlen ? funcs.slice(fromlen) : funcs
		            // async.parallelLimit(funcs.slice(3,4), 1, function(err, data) {
	            	async.parallelLimit(fromlen && tolen ? funcs.slice(fromlen, tolen) : (fromlen && !tolen) ? funcs.slice(fromlen) : funcs, 1, function(err, data) {
		            // async.parallelLimit(funcs.slice(5,6), 3, function(err, data) {
		                // res.jsonp("", JSON.stringify(data));
			            console.log(JSON.stringify(data));
		            });
		        }

	        } catch (e) {
	        	console.log(sourceurl, e);
	            // 页面内部解析出错
	            res.jsonp({
	            	ret: 4,
	            	msg: "获得数据报错"
	            });
	        }
		});
	}

	function getPage (obj, pagecallback) {
        requestTry("https://www.05mh.com/index.php/api/comic/isbuy?id=" + obj.id, function (err, data) {
            try {
            	// console.log(data.body);
          //   	return false;
          //       data = data.body.replace(/[\r\n\t]/g,"");
		        // // 来组合数据吧
		        // var urls = [];

		        // data.match(/data-original="[^"]+"/g).forEach(function (ceil) {
		        // 	urls.push(ceil.match(/original="([^"]+)"/)[1]);
		        // });
		        var urls = Array.from(JSON.parse(data.body).pic, function (ceil) {
		        	return ceil.img;
		        });

		        // console.log(urls);
                // 获得urls
                // var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://mhpic.dongzaojiage.com" + (chapterPath ? "/" + chapterPath : "") + ceil);});
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            burls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 页面内部解析出错
                pagecallback("", {
                    url: obj.url,
                    reason: e.toString()
                });
            }
        });
    }
}

// 构建多多漫画 duoduo--chaoyoubing
exports.buildComic8 = function (req, res, next) {
	// chaoyoubing
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}

	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
	}

    // http://www.duoduomh.com/manhua/chaoyoubing
    var link = "http://m.duoduomh.com/manhua/" + req.query.comicid;
    requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        
	        var temChars = data.match(/<li>\s*<a href="[^"]+"\s*class((?:(?!<\/a>).)+)<\/a>/g);
	        var charactors = [];
	        temChars.forEach(function (ceil) {
	            charactors.push({
	                url: ceil.match(/href="([^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.replace(/<\/?.+?\/?>/g, "").trim()
	            });
	        });

	        // charactors.reverse();
	     	
	        // 获得中文名
	        var zname = data.match(/id="comicName">((?:(?!<\/div>).)+)<\/div>/)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "duoduo--" + req.query.comicid,
	        	z_ch_name: zname,
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: data.match(/list\/wanjie/g) && data.match(/list\/wanjie/g).length == 2 ? 1 : 0
	        };

	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/icon01"><\/span>([^<]+)</);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }

	        // 获得类目信息
	        var tags = data.match(/icon icon02((?:(?!icon icon02).)+)icon icon02/);
	        if (tags) {
	        	// 存在
	        	tags = tags[1].match(/>([^<\s]+)</g);
	        	if (tags) {
	        		var _t_tag = [];
	        		tags.forEach(function (ceil) {
	        			_t_tag.push(ceil.replace(/[<>]/g,""));
	        		});
	        		tags = _t_tag;
	        	}
	        }
	        comicinfo.tags = tags ? tags.join(",") : "";

	        // var tags = data.match(/class="comic_tags">([^<]+)</g);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].trim();
	        // }
	        if (tags) {
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
						case "欢乐向": characs += "搞笑,欢乐向,"; break;
						case "爱情": characs += "恋爱,"; break;
						case "科幻": characs += "奇幻,冒险,科幻,"; break;
						case "魔法": characs += "玄幻,魔法,"; break;
						case "职场": characs += "都市,职场,"; break;
						case "侦探": characs += "悬疑,推理,侦探,"; break;
						case "生活": characs += "日常,"; break;
						case "其他": characs += "日常,"; break;
						case "格斗": characs += "武侠,"; break;
						case "伪娘": characs += "彩虹,"; break;
						case "神鬼": characs += "猎奇,神鬼,"; break;
						case "惊悚": characs += "猎奇,惊悚,"; break;
						case "节操": characs += "搞笑,节操"; break;
						case "纯爱": characs += "恋爱,"; break;
						case "魔幻": characs += "玄幻,"; break;
						case "历史": characs += "古风,历史，"; break;
						case "性转换": characs += "彩虹,性转换,"; break;
						case "爆笑": characs += "搞笑,"; break;
						case "浪漫": characs += "恋爱,"; break;
						case "蔷薇": characs += "百合,"; break;
						case "科幻魔幻": characs += "奇幻,玄幻,"; break;
						case "少女爱情": characs += "恋爱,"; break;
						case "高智商": characs += "推理,"; break;
						case "悬疑推理": characs += "悬疑,推理,"; break;
						case "侦探推理": characs += "推理,"; break;
						case "神话": characs += "仙侠,"; break;
						case "恐怖": characs += "猎奇,"; break;
						case "未来": characs += "冒险,奇幻,"; break;
						case "动作": characs += "热血,"; break;
						case "异能": characs += "玄幻,异能,"; break;
						case "少年": characs += "热血,"; break;
						case "爆笑喜剧": characs += "搞笑,"; break;
						case "惊奇": characs += "猎奇,"; break;
						case "修真": characs += "玄幻,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.slice(0,5).join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }

	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/id="simple-des">([^<]+)</);
	       	if (descs) {
	       		comicinfo.descs = descs[1].replace("&nbsp;", "").trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/id="Cover">\s*<img [^"]+"([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}

	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        indexpic: comicinfo.indexpic,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        isover: comicinfo.isover,
				        tags: comicinfo.tags,
				        descs: comicinfo.descs,
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

   				// 先把漫画插入到表中
		        comicsDao.add(function (err1, data1) {
			        if (err1) {
			        	console.log(err1);
			            // 写入db报错
			            res.jsonp({
			            	ret: 4,
			            	msg: "写入db报错"
			            });
			        } else {
			        	// callback("", "写入db成功");
			        	// console.log(data1);
			        	// 还要写入章节表
			        	// console.log(data1.insertId);
			        	
			        	// setTimeout(function () {
			        		// render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
			        		render(data1.insertId, 0);
			        	// }, 100);

			        	res.jsonp({
			            	ret: 0,
			            	msg: "正在构建中"
			            });
			        }
			    }, _toinsert , {
			        key: "name"
			    });
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs.slice(0,1), 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                	
          //       var key = data.match(/img_data\s*=\s*'([^']+)'/)[1];
          //       var prefix = data.match(/data-img_pre="([^"]+)"/)[1];
		        // // 来组合数据吧
		        // var urls = JSON.parse(base64_decode(key)), _t_urls = [];

		        // urls.forEach(function (ceil) {
		        // 	_t_urls.push("https://i1.manhuadb.com" + prefix + ceil.img);
		        // });
		        // urls = _t_urls;

		        // console.log(urls);
                // 获得urls
                var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                // console.log(obj.url);
                // return false;
                // var sign = data.match(/var\s*sign\s*=\s*'([^']+)'/)[1];
                // var publicKey = data.match(/var\s*publicKey\s*=\s*'([^']+)'/)[1];
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                // var nowdomain = data.match(/getCih1\(\){return '([^']+)'/)[1];

                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://res.duoduomh.com" + ceil + (sign && publicKey ? "?sign=" + publicKey + sign : ""));});
                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : (nowdomain + ceil)});
                get302Url(obj.url.replace(/\.s?html$/, ""), chapterImages, function (err, data) {
                	// console.log(data, data.length);
                	doByUrls(data);
                });
                // 获得urls之后要做的事情
                // doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }

    // 获得302之后的图片
    function get302Url (baseurl, urls, callback) {
    	var funcs = [];
        urls.forEach(function (ceil, index) {
            funcs.push(function (innerCall) {
                // getPage({
                //     url: ceil.url,
                //     name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
                //     index: index,
                //     comicid: comicid
                // }, function (err, data) {
                //     innerCall("", data);
                // });
                // callback("", ceil);
                // ceil.match(/^https?:\/\/((?:(?!com).)+com)/)[0]
                var ceillink = baseurl + "-" + (index + 1) + ".html";
                requestTry(ceillink, function (err, data) {
		            try {
		                data = data.body.replace(/[\r\n\t]/g,"");
		    //             var _dd_aaa = {'initBan':function(){}};
						// var _myimg_ = {};
						// var _dd_bbb = {'getElementById': function(){_myimg_ =  {id:'',src:'',getElementsByTagName: function(){}}; return _myimg_;}};
						// var _dd_ccc = function(){return {src:''}};
						// var _dd_link = "";
		    //             eval("eval(function(p,a,c,k,e,d)" + data.match(/eval\(function\(p,a,c,k,e,d\)((?:(?!\.split\('\|'\),0,\{\}\)\)).)+)\.split\('\|'\),0,\{\}\)\)/)[1].replace('sinChapter', '_dd_aaa').replace('document', '_dd_bbb').replace('|Image|', '|_dd_ccc|').replace('return|', 'debugger;return _dd_link=|').replace('for', 'getI6(_myimg_.innerHTML.match(/_src="([^"]+)"/)[1]);return false; for') + ".split('|'),0,{}))");
		                
		    //             // console.log(_dd_link, baseurl.match(/^https?:\/\/((?:(?!com).)+com)/)[1], ceillink);
		    //             // 发302请求
		    			var _dd_link = data.match(/id="image" ((?:(?!src=").)+)src="([^"]+)/)[2];
		    			if (_dd_link) {
		    				if (/\.jpg|png|jpeg$/i.test(_dd_link)) {
		    					innerCall("", _dd_link);
		    				} else {
		    					request({
								    url: _dd_link,
								    method: 'get',
								    followRedirect: false, 
								    headers: {
								    	"Host": _dd_link.match(/^https?:\/\/((?:(?!com).)+com)/)[1],
										"Connection": "keep-alive",
										"Pragma": "no-cache",
										"Cache-Control": "no-cache",
										"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
										"Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
										"Sec-Fetch-Site": "same-site",
										"Sec-Fetch-Mode": "no-cors",
										"Sec-Fetch-Dest": "image",
										"Referer": ceillink,
										"Accept-Encoding": "gzip",
										"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6",
										"Cookie": "__cfduid=d83538f3f9f16c301530d022c6104a7e51593498358; UM_distinctid=17303e756292fd-0bf244a205e0d2-143c6251-1aeaa0-17303e7562a479; _ga=GA1.2.1639221923.1593498360; _gid=GA1.2.1440859473.1593498360; Hm_lvt_aede123658cb87128b46867083acca1e=1593498360,1593498370; Hm_lpvt_aede123658cb87128b46867083acca1e=1593509262; _gat_gtag_UA_19293709_3=1"
								    }
								}, function(error, response, body){
								    // console.log(_dd_link, error, response && response.headers.location);
								    innerCall("", response && response.headers && response.headers.location);
								});
		    				}
		    			} else {
		    				innerCall("", "");
		    			}
						// innerCall("", data.match(/id="image" ((?:(?!src=").)+)src="([^"]+)/)[2]);
		            } catch(e) {
		            	innerCall("", "");
		            }
		        });
            });
        });
        // console.log(charactors.length);
        // 数据
        async.parallelLimit(funcs, 20, function(err, data) {
            callback("", data);
        })
    }
}


// 构建依依漫画 yiyi--shijie2
exports.buildComic9 = function (req, res, next) {
	// shijie2
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}

	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
	}

    // https://www.yiyimanhua.com/manhua/shijie2/
    var link = "http://m.yiyimanhua.com/manhua/" + req.query.comicid + "/";
    var link2 = "http://www.yiyimanhua.com/manhua/" + req.query.comicid + "/";

    requestTry(link2, function (err2, data2) {
    	requestTry(link, function (err, data) {
	    	try {
	    		data2 = data2.body.replace(/[\r\n\t]/g,"");
		        data = data.body.replace(/[\r\n\t]/g,"");
		        
		        var temChars = data.match(/<li>\s*<a href="\/manhua\/((?:(?!<\/a>).)+)<\/a>/g);
		        var charactors = [];
		        temChars.forEach(function (ceil) {
		            charactors.push({
		                url: "http://m.yiyimanhua.com" + ceil.match(/href="([^"]+)"/)[1],
		                // name: ceil.match(/>([^>]+)<i>/)[1]
		                name: ceil.replace(/<\/?.+?\/?>/g, "").trim()
		            });
		        });

		        charactors.reverse();
		     	
		        // 获得中文名
		        var zname = data.match(/<h1 class="title">((?:(?!<\/h1>).)+)<\/h1>/)[1];

		        // 获得其他信息
		        var comicinfo = {
		        	name: "yiyi--" + req.query.comicid,
		        	z_ch_name: zname.replace(/漫画$/, ""),
		        	charactor_counts: charactors.length,
		        	share_reward: 10,
		        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
		        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
		        	listwidth: "350",
		        	isover: 0
		        };

		        // 获得作者信息
		        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
		        var author = data.match(/作者：<\/dt>\s*<dd class="left">([^<]+)</);
		        if (author) {
		        	comicinfo.author = author[1].trim();
		        }
		        // 获得类目信息
		        var tags = data2.match(/<p><em>剧情类别：<\/em>((?:(?!<\/p>).)+)<\/p>/);
		        if (tags) {
		        	// 存在
		        	tags = tags[1].match(/<a[^>]+>([^<\s|]+)</g);
		        	if (tags) {
		        		var _t_tag = [];
		        		tags.forEach(function (ceil) {
		        			_t_tag.push(ceil.replace(/[^>]+>|</g,""));
		        		});
		        		tags = _t_tag;
		        	}
		        }
		        comicinfo.tags = tags ? tags.join(",") : "";

		        // var tags = data.match(/class="comic_tags">([^<]+)</g);
		        // if (tags) {
		        // 	comicinfo.tags = tags[1].trim();
		        // }
		        if (tags) {
		        	var characs = "";
		        	tags.forEach(function (ceil) {
		        		switch (ceil) {
							case "欢乐向": characs += "搞笑,欢乐向,"; break;
							case "爱情": characs += "恋爱,"; break;
							case "科幻": characs += "奇幻,冒险,科幻,"; break;
							case "魔法": characs += "玄幻,魔法,"; break;
							case "职场": characs += "都市,职场,"; break;
							case "侦探": characs += "悬疑,推理,侦探,"; break;
							case "生活": characs += "日常,"; break;
							case "其他": characs += "日常,"; break;
							case "格斗": characs += "武侠,"; break;
							case "伪娘": characs += "彩虹,"; break;
							case "神鬼": characs += "猎奇,神鬼,"; break;
							case "惊悚": characs += "猎奇,惊悚,"; break;
							case "节操": characs += "搞笑,节操"; break;
							case "纯爱": characs += "恋爱,"; break;
							case "魔幻": characs += "玄幻,"; break;
							case "历史": characs += "古风,历史，"; break;
							case "性转换": characs += "彩虹,性转换,"; break;
							case "爆笑": characs += "搞笑,"; break;
							case "浪漫": characs += "恋爱,"; break;
							case "蔷薇": characs += "百合,"; break;
							case "科幻魔幻": characs += "奇幻,玄幻,"; break;
							case "少女爱情": characs += "恋爱,"; break;
							case "侦探推理": characs += "推理,"; break;
							case "神话": characs += "仙侠,"; break;
							case "恐怖": characs += "猎奇,"; break;
							case "未来": characs += "冒险,奇幻,"; break;
							case "动作": characs += "热血,"; break;
							case "异能": characs += "玄幻,异能,"; break;
							case "少年": characs += "热血,"; break;
							case "爆笑喜剧": characs += "搞笑,"; break;
							case "惊奇": characs += "猎奇,"; break;
							case "修真": characs += "玄幻,"; break;
							case "少年热血": characs += "热血,"; break;
			        		case "武侠格斗": characs += "武侠,"; break;
			        		case "科幻魔幻": characs += "仙侠,奇幻,玄幻,"; break;
			        		case "侦探推理": characs += "推理,烧脑,悬疑,"; break;
			        		case "恐怖灵异": characs += "猎奇,奇幻,悬疑,"; break;
			        		case "耽美人生": characs += "蔷薇,恋爱,治愈,"; break;
			        		case "少女爱情": characs += "恋爱,后宫,"; break;
			        		case "恋爱生活": characs += "恋爱,后宫,萌系,"; break;
			        		case "生活漫画": characs += "日常,治愈,"; break;
			        		default: characs += ceil + ",";
			        	}
		        	});
		        	// 去重
		        	comicinfo.charactors = [];
		        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
		        		if (comicinfo.charactors.indexOf(ceil) == -1) {
		        			comicinfo.charactors.push(ceil);
		        		}
		        	});
		        	comicinfo.charactors = comicinfo.charactors.slice(0,5).join(",");
		        } else {
		        	comicinfo.charactors = "日常";
		        }

		       	// 描述
		       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
		       	var descs = data.match(/txtDesc autoHeight">([^<]+)</);
		       	if (descs) {
		       		comicinfo.descs = descs[1].replace("&nbsp;", "").trim();
		       	} else {
		       		comicinfo.descs = "";
		       	}

		       	// 主图
		       	var indexpic = data.match(/<mip-img(?:(?!src).)+src="([^"]+)"/);
		       	if (indexpic) {
		       		comicinfo.indexpic = indexpic[1];
		       	}

		     	comicsDao.queryById(function (err3, data3) {
		       		if (data3 && data3.length != 0) {
		       			// 有数据，有一些是不更新的
		       			// 要插入的数据
			       		var _toinsert = {
					        name: comicinfo.name,
					        charactor_counts: comicinfo.charactor_counts,
					        charactors: comicinfo.charactors,
					        updatetime: new Date(),
					        freechars: comicinfo.freechars,
					        // comments: _b.length ? JSON.stringify(_b) : "",
					        isover: comicinfo.isover
					    };
		       		} else {
		       			// 要插入的数据
			       		var _toinsert = {
					        name: comicinfo.name,
					        z_ch_name: comicinfo.z_ch_name,
					        author: comicinfo.author,
					        charactor_counts: comicinfo.charactor_counts,
					        tags: comicinfo.tags,
					        charactors: comicinfo.charactors,
					        descs: comicinfo.descs,
					        more: "",
					        indexpic: comicinfo.indexpic,
					        share_reward: comicinfo.share_reward,
					        ad_reward: comicinfo.ad_reward,
					        freechars: comicinfo.freechars,
					        listwidth: comicinfo.listwidth,
					        createtime: new Date(),
					        updatetime: new Date(),
					        // comments: _b.length ? JSON.stringify(_b) : "",
					        isover: comicinfo.isover
					    };
		       		}

	   				// 先把漫画插入到表中
			        comicsDao.add(function (err1, data1) {
				        if (err1) {
				        	console.log(err1);
				            // 写入db报错
				            res.jsonp({
				            	ret: 4,
				            	msg: "写入db报错"
				            });
				        } else {
				        	// callback("", "写入db成功");
				        	// console.log(data1);
				        	// 还要写入章节表
				        	// console.log(data1.insertId);
				        	
				        	// setTimeout(function () {
				        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
				        	// }, 100);

				        	res.jsonp({
				            	ret: 0,
				            	msg: "正在构建中"
				            });
				        }
				    }, _toinsert , {
				        key: "name"
				    });
		       	}, comicinfo.name);

		        function render (comicid, fromlen) {
		        	console.log(comicid, fromlen);
		            var funcs = [];
		            // console.log(comicid, charactors);
		            charactors.forEach(function (ceil, index) {
		                funcs.push(function (innerCall) {
		                    getPage({
		                        url: ceil.url,
		                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
		                        index: index,
		                        comicid: comicid,
		                        comicname: comicinfo.name
		                    }, function (err, data) {
		                        innerCall("", data);
		                    });
		                });
		            });
		            // 数据fromlen ? funcs.slice(fromlen) : funcs
		            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
		            // async.parallelLimit(funcs.slice(0,1), 3, function(err, data) {
		                // res.jsonp("", JSON.stringify(data));
			            console.log(JSON.stringify(data));
		            });
		        }

	        } catch (e) {
	        	console.log(e);
	            // 页面内部解析出错
	            res.jsonp({
	            	ret: 4,
	            	msg: "获得数据报错"
	            });
	        }
	    });
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                
          //       var key = data.match(/img_data\s*=\s*'([^']+)'/)[1];
          //       var prefix = data.match(/data-img_pre="([^"]+)"/)[1];
		        // // 来组合数据吧
		        // var urls = JSON.parse(base64_decode(key)), _t_urls = [];

		        // urls.forEach(function (ceil) {
		        // 	_t_urls.push("https://i1.manhuadb.com" + prefix + ceil.img);
		        // });
		        // urls = _t_urls;

		        // console.log(urls);
                // 获得urls
                var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://res.yiyimanhua.com" + ceil);});
                get302Url(obj.url, urls, function (err, data) {
                	// console.log(data, data.length);
                	doByUrls(data);
                });
                // 获得urls之后要做的事情
                // doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }

    // 获得302之后的图片
    function get302Url (baseurl, urls, callback) {
    	var funcs = [];
        urls.forEach(function (ceil, index) {
            funcs.push(function (innerCall) {
                // getPage({
                //     url: ceil.url,
                //     name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
                //     index: index,
                //     comicid: comicid
                // }, function (err, data) {
                //     innerCall("", data);
                // });
                // callback("", ceil);
                request({
				    url: ceil,
				    method: 'get',
				    followRedirect: false, 
				    headers: {
				    	"Host": "res.yiyimanhua.com",
						"Connection": "keep-alive",
						"Pragma": "no-cache",
						"Cache-Control": "no-cache",
						"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
						"Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
						"Sec-Fetch-Site": "same-site",
						"Sec-Fetch-Mode": "no-cors",
						"Sec-Fetch-Dest": "image",
						"Referer": baseurl,
						"Accept-Encoding": "gzip",
						"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6",
						"Cookie": "__cfduid=d83538f3f9f16c301530d022c6104a7e51593498358; UM_distinctid=17303e756292fd-0bf244a205e0d2-143c6251-1aeaa0-17303e7562a479; _ga=GA1.2.1639221923.1593498360; _gid=GA1.2.1440859473.1593498360; Hm_lvt_aede123658cb87128b46867083acca1e=1593498360,1593498370; Hm_lpvt_aede123658cb87128b46867083acca1e=1593509262; _gat_gtag_UA_19293709_3=1"
				    }
				}, function(error, response, body){
				    // console.log(error, response && response.headers.location);
				    innerCall("", response && response.headers && response.headers.location);
				});
            });
        });
        // console.log(charactors.length);
        // 数据
        async.parallelLimit(funcs, 20, function(err, data) {
            callback("", data);
        })
    }
}


// 构建国漫吧漫画 gm--20820
exports.buildComic10 = function (req, res, next) {
	// 20820
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}

	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
	}

    // https://www.yiyimanhua.com/manhua/shijie2/
    var link = "http://www.guoman8.cc/" + req.query.comicid + "/";

	requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        
	        // 找到ullist
	        var charuls = (data.match(/id="chpater-list-1">((?:(?!<\/ul><\/div>).)+)<\/ul><\/div>/)[1] + "</ul>").match(/<ul((?:(?!<\/ul>).)+)<\/ul>/g);

	        var charactors = [];
	        charuls.forEach(function (ceil) {
	        	var listchar = ceil.match(/<a(?:(?!><).)+></g).reverse();
	        	listchar.forEach(function (cceil) {
	        		charactors.push({
		                url: "http://www.guoman8.cc" + cceil.match(/href="([^"]+)"/)[1],
		                // name: ceil.match(/>([^>]+)<i>/)[1]
		                name: cceil.match(/title="([^"]+)"/)[1]
		            });
	        	});
	        });
	     	
	        // 获得中文名
	        var zname = data.match(/<h1>((?:(?!<\/h1>).)+)<\/h1>/)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "gm--" + req.query.comicid,
	        	z_ch_name: zname.replace(/漫画$/, ""),
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: 0
	        };

	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/search\/q_([^"]+)"/);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        var tags = data.match(/漫画剧情：<\/strong>((?:(?!<strong>).)+)<strong>/);
	        if (tags) {
	        	// 存在
	        	tags = tags[1].match(/">((?:(?!<\/a>).)+)<\/a>/g);
	        	if (tags) {
	        		var _t_tag = [];
	        		tags.forEach(function (ceil) {
	        			_t_tag.push(ceil.replace(/">|<.+$/g,""));
	        		});
	        		tags = _t_tag;
	        	}
	        }
	        comicinfo.tags = tags ? tags.join(",") : "";

	        // var tags = data.match(/class="comic_tags">([^<]+)</g);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].trim();
	        // }
	        if (tags) {
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
						case "爱情": characs += "恋爱,"; break;
						case "科幻": characs += "奇幻,冒险,科幻,"; break;
						case "魔法": characs += "玄幻,魔法,"; break;
						case "神鬼": characs += "猎奇,神鬼,"; break;
						case "格斗": characs += "格斗,武侠,"; break;
						case "机战": characs += "奇幻,冒险,机战,"; break;
						case "历史": characs += "古风,"; break;
						case "伪娘": characs += "彩虹,"; break;
						case "恐怖": characs += "猎奇,"; break;
						case "耽美": characs += "彩虹,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.slice(0,5).join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }

	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/id="intro-cut">((?:(?!<\/p>).)+)<\/p>/);
	       	if (descs) {
	       		comicinfo.descs = descs[1].match(/>([^<]+)</)[1].trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/hcover"><img src="([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}

	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

   				// 先把漫画插入到表中
		        comicsDao.add(function (err1, data1) {
			        if (err1) {
			        	console.log(err1);
			            // 写入db报错
			            res.jsonp({
			            	ret: 4,
			            	msg: "写入db报错"
			            });
			        } else {
			        	// callback("", "写入db成功");
			        	// console.log(data1);
			        	// 还要写入章节表
			        	// console.log(data1.insertId);
			        	
			        	// setTimeout(function () {
			        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
			        	// }, 100);

			        	res.jsonp({
			            	ret: 0,
			            	msg: "正在构建中"
			            });
			        }
			    }, _toinsert , {
			        key: "name"
			    });
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs.slice(0,1), 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                // 获得urls
                eval("eval(function(p,a,c,k,e,d)" + data.match(/eval\(function\(p,a,c,k,e,d\)((?:(?!\.split\('\|'\),0,\{\}\)\)).)+)\.split\('\|'\),0,\{\}\)\)/)[1] + ".split('|'),0,{}))");
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                var urls = Array.from(cInfo.fs, function (ceil) {return /^http/.test(ceil) ? ceil : ("http://imagesold.benzidui.com/" + ceil);});
                doByUrls(urls);
                // 获得urls之后要做的事情
                // doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}


// 构建veryim漫画 vi--maoxian!!36033
exports.buildComic11 = function (req, res, next) {
	// maoxian!!36033
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}
	var comic1 = req.query.comicid.split("!!")[0];
	var comic2 = req.query.comicid.split("!!")[1];
	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
	}

    // http://comic.veryim.com/maoxian/36033/
    var link = "http://comic.veryim.com/" + comic1 + "/" + comic2 + "/";

	requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        
	        var reg = new RegExp('<a href="\\/' + comic1 + '\\/' + comic2 + '((?:(?!<\/a>).)+)<\/a>', "g");
	        var temChars = data.match(reg);
	        var charactors = [];
	        temChars.forEach(function (ceil) {
	            charactors.push({
	                url: "http://comic.veryim.com" + ceil.match(/href="([^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.match(/title="([^"]+)"/)[1]
	            });
	        });

	        charactors.reverse();
	     	
	        // 获得中文名
	        var zname = data.match(/<h1>((?:(?!<\/h1>).)+)<\/h1>/)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "vi--" + req.query.comicid,
	        	z_ch_name: zname.replace(/漫画$/, ""),
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: 0
	        };

	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/相关作品">([^<]+)</);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        var tags = data.match(/题材：((?:(?!<\/li>).)+)<\/li>/);
	        if (tags) {
	        	// 存在
	        	tags = tags[1].match(/">((?:(?!<\/a>).)+)<\/a>/g);
	        	if (tags) {
	        		var _t_tag = [];
	        		tags.forEach(function (ceil) {
	        			_t_tag.push(ceil.replace(/">|<.+$/g,""));
	        		});
	        		tags = _t_tag;
	        	}
	        }
	        comicinfo.tags = tags ? tags.join(",") : "";

	        // var tags = data.match(/class="comic_tags">([^<]+)</g);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].trim();
	        // }
	        if (tags) {
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
						case "欢乐向": characs += "搞笑,欢乐向,"; break;
						case "爱情": characs += "恋爱,"; break;
						case "科幻": characs += "奇幻,冒险,科幻,"; break;
						case "魔法": characs += "玄幻,魔法,"; break;
						case "职场": characs += "都市,职场,"; break;
						case "侦探": characs += "悬疑,推理,侦探,"; break;
						case "生活": characs += "日常,"; break;
						case "其他": characs += "日常,"; break;
						case "格斗": characs += "武侠,"; break;
						case "伪娘": characs += "彩虹,"; break;
						case "神鬼": characs += "猎奇,神鬼,"; break;
						case "惊悚": characs += "猎奇,惊悚,"; break;
						case "节操": characs += "搞笑,节操"; break;
						case "纯爱": characs += "恋爱,"; break;
						case "魔幻": characs += "玄幻,"; break;
						case "历史": characs += "古风,历史，"; break;
						case "性转换": characs += "彩虹,性转换,"; break;
						case "爆笑": characs += "搞笑,"; break;
						case "浪漫": characs += "恋爱,"; break;
						case "蔷薇": characs += "百合,"; break;
						case "科幻魔幻": characs += "奇幻,玄幻,"; break;
						case "少女爱情": characs += "恋爱,"; break;
						case "侦探推理": characs += "推理,"; break;
						case "神话": characs += "仙侠,"; break;
						case "恐怖": characs += "猎奇,"; break;
						case "未来": characs += "冒险,奇幻,"; break;
						case "动作": characs += "热血,"; break;
						case "异能": characs += "玄幻,异能,"; break;
						case "少年": characs += "热血,"; break;
						case "爆笑喜剧": characs += "搞笑,"; break;
						case "惊奇": characs += "猎奇,"; break;
						case "修真": characs += "玄幻,"; break;
						case "少年热血": characs += "热血,"; break;
		        		case "武侠格斗": characs += "武侠,"; break;
		        		case "科幻魔幻": characs += "仙侠,奇幻,玄幻,"; break;
		        		case "侦探推理": characs += "推理,烧脑,悬疑,"; break;
		        		case "恐怖灵异": characs += "猎奇,奇幻,悬疑,"; break;
		        		case "耽美人生": characs += "蔷薇,恋爱,治愈,"; break;
		        		case "少女爱情": characs += "恋爱,后宫,"; break;
		        		case "恋爱生活": characs += "恋爱,后宫,萌系,"; break;
		        		case "生活漫画": characs += "日常,治愈,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.slice(0,5).join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }

	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/"content_wrapper">([^<]+)</);
	       	if (descs) {
	       		comicinfo.descs = descs[1].trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/"info">\s*<img src="([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}

	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

   				// 先把漫画插入到表中
		        comicsDao.add(function (err1, data1) {
			        if (err1) {
			        	console.log(err1);
			            // 写入db报错
			            res.jsonp({
			            	ret: 4,
			            	msg: "写入db报错"
			            });
			        } else {
			        	// callback("", "写入db成功");
			        	// console.log(data1);
			        	// 还要写入章节表
			        	// console.log(data1.insertId);
			        	
			        	// setTimeout(function () {
			        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
			        	// }, 100);

			        	res.jsonp({
			            	ret: 0,
			            	msg: "正在构建中"
			            });
			        }
			    }, _toinsert , {
			        key: "name"
			    });
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs.slice(0,1), 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                // 获得urls
                // eval("eval(function(p,a,c,k,e,d)" + data.match(/eval\(function\(p,a,c,k,e,d\)((?:(?!\.split\('\|'\),0,\{\}\)\)).)+)\.split\('\|'\),0,\{\}\)\)/)[1] + ".split('|'),0,{}))");
                var key = data.match(/var\s*qTcms_S_m_murl_e="([^"]+)"/)[1];

                // var m_httpurl = data.match(/var\s*qTcms_S_m_mhttpurl="([^"]+)"/);
                // if (m_httpurl) {
                // 	m_httpurl = base64_decode(m_httpurl[1]);
                // } else {
                // 	m_httpurl = "";
                // }


                var qTcms_S_m_mhttpurl = data.match(/var\s*qTcms_S_m_mhttpurl="([^"]+)"/);
                qTcms_S_m_mhttpurl = qTcms_S_m_mhttpurl && qTcms_S_m_mhttpurl[1] || "";

                var qTcms_m_weburl = data.match(/var\s*qTcms_m_weburl="([^"]+)"/);
                qTcms_m_weburl = qTcms_m_weburl && qTcms_m_weburl[1] || "";

                var qTcms_Pic_m_if = data.match(/var\s*qTcms_Pic_m_if="([^"]+)"/);
                qTcms_Pic_m_if = qTcms_Pic_m_if && qTcms_Pic_m_if[1] || "";

                var qTcms_m_indexurl = data.match(/var\s*qTcms_m_indexurl="([^"]+)"/);
                qTcms_m_indexurl = qTcms_m_indexurl && qTcms_m_indexurl[1] || "";

		        // 来组合数据吧
		        var datas = base64_decode(key).split("$qingtiandy$"); 

		        // console.log(datas);
		        // console.log(qTcms_S_m_mhttpurl, qTcms_m_weburl, qTcms_Pic_m_if, qTcms_m_indexurl);
          		var urls = Array.from(datas, function (ceil) {
          			var s = ceil;
					if(qTcms_Pic_m_if!="2"){
						ceil=ceil.replace(/\?/gi,"a1a1").replace(/&/gi,"b1b1").replace(/%/gi,"c1c1");	
						var m_httpurl="";
						if(typeof(qTcms_S_m_mhttpurl)!="undefined")m_httpurl=base64_decode(qTcms_S_m_mhttpurl);
						s=qTcms_m_indexurl+"statics/pic/?p="+escape(ceil)+"&picid="+comic2+"&m_httpurl="+escape(m_httpurl);
					}
					if(s.substring(0,1)=="/"){
						s=qTcms_m_weburl.replace(/\/$/, "")+s;
					}
					return s;
                });

          		// http://comic.veryim.com/statics/pic/?p=http%3A//manhua1020-104-250-150-10.cdndm5.com/9/8525/95515/16_5540.pnga1a1cid%3D95515b1b1key%3Df4ecbd28fb3b60cf7643f6926d4bc4d0b1b1type%3D1&picid=36033&m_httpurl=http%3A//m.dm5.com/m95515/
          		get302Url(obj.url, urls, function (err, data) {
                	// console.log(data, data.length);
                	doByUrls(Array.from(data, function (ceil) {return "http://comic.veryim.com" + ceil;}));
                });
                // console.log(urls);
                // return false;
                // doByUrls(urls);
                // 获得urls之后要做的事情
                // doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }



    // 获得302之后的图片
    function get302Url (baseurl, urls, callback) {
    	var funcs = [];
        urls.forEach(function (ceil, index) {
            funcs.push(function (innerCall) {
                // getPage({
                //     url: ceil.url,
                //     name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
                //     index: index,
                //     comicid: comicid
                // }, function (err, data) {
                //     innerCall("", data);
                // });
                // callback("", ceil);
                request({
				    url: ceil,
				    method: 'get',
				    followRedirect: false, 
				    headers: {
				    	"Host": "comic.veryim.com",
						"Connection": "keep-alive",
						"Pragma": "no-cache",
						"Cache-Control": "no-cache",
						"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
						"Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
						"Sec-Fetch-Site": "same-site",
						"Sec-Fetch-Mode": "no-cors",
						"Sec-Fetch-Dest": "image",
						"Referer": baseurl,
						"Accept-Encoding": "gzip",
						"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6"
				    }
				}, function(error, response, body){
					// console.log(ceil + " " + response.headers.location + "\n");
				    // console.log(error, response && response.headers.location);
				    innerCall("", response && response.headers && response.headers.location);
				});
            });
        });
        // console.log(charactors.length);
        // 数据
        async.parallelLimit(funcs, 20, function(err, data) {
            callback("", data);
        })
    }
}


// 构建漫漫看漫画 manmankan--6321
exports.buildComic12 = function (req, res, next) {
	// 6321
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}

	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了.
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
	}

    // https://manmankan.cc/manhua/40745/
    var link = "https://manmankan.cc/manhua/" + req.query.comicid + "/";
    requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        
	        var temChars = data.match(/<li>\s*<a href="[^"]+"\s*target="_blank"><p>((?:(?!<\/a>).)+)<\/a>/g);
	        var charactors = [];
	        temChars.forEach(function (ceil) {
	            charactors.push({
	                url: "https://manmankan.cc" + ceil.match(/href="([^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.replace(/<\/?.+?\/?>/g, "").trim()
	            });
	        });

	        charactors.reverse();
	     	
	        // 获得中文名
	        var zname = data.match(/<h1>((?:(?!<\/h1>).)+)<\/h1>/)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "manmankan--" + req.query.comicid,
	        	z_ch_name: zname,
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: /已完结/.test(data) ? 1 : 0
	        };

	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/<span>作者：([^<]+)</);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }

	        // 获得类目信息
	        var tags = data.match(/<a class="tags" href="\/sort\/t[^>]+>/g);
	        if (tags) {
	        	// 存在
	        	// tags = tags[1].match(/>([^<\s]+)</g);
	        	// if (tags) {
        		var _t_tag = [];
        		tags.forEach(function (ceil) {
        			_t_tag.push(ceil.match(/title="([^"]+)"/)[1]);
        		});
        		tags = _t_tag;
	        	// }
	        }
	        comicinfo.tags = tags ? tags.join(",") : "";

	        // var tags = data.match(/class="comic_tags">([^<]+)</g);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].trim();
	        // }
	        if (tags) {
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
						case "欢乐向": characs += "搞笑,欢乐向,"; break;
						case "爱情": characs += "恋爱,"; break;
						case "科幻": characs += "奇幻,冒险,科幻,"; break;
						case "魔法": characs += "玄幻,魔法,"; break;
						case "职场": characs += "都市,职场,"; break;
						case "侦探": characs += "悬疑,推理,侦探,"; break;
						case "生活": characs += "日常,"; break;
						case "其他": characs += "日常,"; break;
						case "格斗": characs += "武侠,"; break;
						case "伪娘": characs += "彩虹,"; break;
						case "神鬼": characs += "猎奇,神鬼,"; break;
						case "惊悚": characs += "猎奇,惊悚,"; break;
						case "节操": characs += "搞笑,节操"; break;
						case "纯爱": characs += "恋爱,"; break;
						case "魔幻": characs += "玄幻,"; break;
						case "历史": characs += "古风,历史，"; break;
						case "性转换": characs += "彩虹,性转换,"; break;
						case "爆笑": characs += "搞笑,"; break;
						case "浪漫": characs += "恋爱,"; break;
						case "蔷薇": characs += "百合,"; break;
						case "科幻魔幻": characs += "奇幻,玄幻,"; break;
						case "少女爱情": characs += "恋爱,"; break;
						case "高智商": characs += "推理,"; break;
						case "悬疑推理": characs += "悬疑,推理,"; break;
						case "侦探推理": characs += "推理,"; break;
						case "神话": characs += "仙侠,"; break;
						case "恐怖": characs += "猎奇,"; break;
						case "未来": characs += "冒险,奇幻,"; break;
						case "动作": characs += "热血,"; break;
						case "异能": characs += "玄幻,异能,"; break;
						case "少年": characs += "热血,"; break;
						case "爆笑喜剧": characs += "搞笑,"; break;
						case "惊奇": characs += "猎奇,"; break;
						case "修真": characs += "玄幻,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.slice(0,5).join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }

	        // 是否是日本
	        if (/<span>地区：<a href="\/sort\/a1\/">日本<\/a><\/span>/.test(data)) {
	        	comicinfo.charactors = "日本," + comicinfo.charactors;
	        }

	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/id="comic-description[^>]+>([^<]+)</);
	       	if (descs) {
	       		comicinfo.descs = descs[1].replace("&nbsp;", "").trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/<img src="([^"]+)" class="pic"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}

	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

   				// 先把漫画插入到表中
		        comicsDao.add(function (err1, data1) {
			        if (err1) {
			        	console.log(err1);
			            // 写入db报错
			            res.jsonp({
			            	ret: 4,
			            	msg: "写入db报错"
			            });
			        } else {
			        	// callback("", "写入db成功");
			        	// console.log(data1);
			        	// 还要写入章节表
			        	// console.log(data1.insertId);
			        	
			        	// setTimeout(function () {
			        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
			        	// }, 100);

			        	res.jsonp({
			            	ret: 0,
			            	msg: "正在构建中"
			            });
			        }
			    }, _toinsert , {
			        key: "name"
			    });
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs.slice(0,1), 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
          //       var key = data.match(/img_data\s*=\s*'([^']+)'/)[1];
          //       var prefix = data.match(/data-img_pre="([^"]+)"/)[1];
		        // // 来组合数据吧
		        // var urls = JSON.parse(base64_decode(key)), _t_urls = [];

		        // urls.forEach(function (ceil) {
		        // 	_t_urls.push("https://i1.manhuadb.com" + prefix + ceil.img);
		        // });
		        // urls = _t_urls;

		        // console.log(urls);
                // 获得urls
                var urls = data.match(/"page_url":"([^"]+)"/)[1].split("|72cms|");
                doByUrls(urls);
                // var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]+\])/)[1]);
                // console.log(obj.url);
                // return false;
                // var sign = data.match(/var\s*sign\s*=\s*'([^']+)'/)[1];
                // var publicKey = data.match(/var\s*publicKey\s*=\s*'([^']+)'/)[1];
                // var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                // var nowdomain = data.match(/getCih1\(\){return '([^']+)'/)[1];

                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://res.duoduomh.com" + ceil + (sign && publicKey ? "?sign=" + publicKey + sign : ""));});
                // var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : (nowdomain + ceil)});
                // get302Url(obj.url.replace(/\.s?html$/, ""), chapterImages, function (err, data) {
                // 	// console.log(data, data.length);
                // 	doByUrls(data);
                // });
                // 获得urls之后要做的事情
                // doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}

// request 统一加上重试一次
// var _oriRequest = request;
function requestTry (url, callit, times) {
	var _hasBack = false;
	var _tt = setTimeout(function () {
		// 重试吧
		if (!times) {
			console.log("链接：" + url + " 请求超时，准备重试第一次");
			// _doback = function () {};
			_hasBack = true;
			// 可以重试
			requestTry (url, callit, 1);
		} else if (times == 1) {
			console.log("链接：" + url + " 请求超时，准备重试第二次");
			// _doback = function () {};
			_hasBack = true;
			// 可以重试
			requestTry (url, callit, 2);
		} else {
			console.log("链接：" + url + " 再次超时，不再重试了");
			// 不支持重试了.
			_doback();
		}
	}, 20000);

	var _doback = function (e, d) {
		if (_tt) {
			clearTimeout(_tt);
		}
		if (_hasBack) return false;
		_hasBack = true;
		// _doback = function () {};
		callit(e, d);
	};

	request(url, _doback);
}

// 构建漫漫台 mt--heitong
exports.buildComic13 = function (req, res, next) {
	// heitong
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}

    // https://www.yiyimanhua.com/manhua/shijie2/
    var link = "https://www.manmantai.com/manhua/" + req.query.comicid + "/";

	requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        
	        // 找到ullist
	        var listchar = data.match(/<li>\s*<a href="\/manhua(?:(?!<\/li>).)+<\/li>/g);
	        var charactors = [];
        	listchar.forEach(function (ceil) {
        		charactors.push({
	                url: "https://www.manmantai.com" + ceil.match(/<a href="(\/[^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.match(/<span>((?:(?!<\/span>).)+)<\/span>/)[1].trim()
	            });
        	});
	     	charactors.reverse();

	        // 获得中文名
	        var zname = data.match(/<img class="pic"(?:(?!alt).)+alt="([^"]+)"/)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "mt--" + req.query.comicid,
	        	z_ch_name: zname.replace(/漫画$/, ""),
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: /strong>漫画状态：<\/strong>\s*<a href="\/list\/lianzai\/">/.test(data) ? 0 : 1
	        };

	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/漫画作者：<\/strong><a href="\/author[^"]+">([^<]+)</);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        var tags = data.match(/漫画剧情：<\/strong>(?:(?!<\/span>).)+<\/span>/);
	        if (tags) {
	        	// 存在
	        	tags = tags[0].match(/<a(?:(?!<\/a>).)+<\/a>/g);
	        	if (tags) {
	        		var _t_tag = [];
	        		tags.forEach(function (ceil) {
	        			_t_tag.push(ceil.replace(/^[^>]+>|<\/a>/g, ''));
	        		});
	        		tags = _t_tag;
	        	}
	        }
	        comicinfo.tags = tags ? tags.join(",") : "";
	        // var tags = data.match(/class="comic_tags">([^<]+)</g);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].trim();
	        // }
	        if (tags) {
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
						case "少女爱情": characs += "恋爱,"; break;
						case "爱情": characs += "恋爱,"; break;
						case "少女爱情": characs += "恋爱,"; break;
						case "科幻": characs += "奇幻,冒险,科幻,"; break;
						case "魔法": characs += "玄幻,魔法,"; break;
						case "神鬼": characs += "猎奇,神鬼,"; break;
						case "格斗": characs += "格斗,武侠,"; break;
						case "机战": characs += "奇幻,冒险,机战,"; break;
						case "历史": characs += "古风,"; break;
						case "伪娘": characs += "彩虹,"; break;
						case "恐怖": characs += "猎奇,"; break;
						case "耽美": characs += "彩虹,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.slice(0,5).join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }
	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/<div id="intro-all"(?:(?!;">).)+;">((?:(?!<\/p>).)+)<\/p>/);
	       	if (descs) {
	       		comicinfo.descs = descs[1].trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/<img class="pic" src="([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}
	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

   				// 先把漫画插入到表中
		        comicsDao.add(function (err1, data1) {
			        if (err1) {
			        	console.log(err1);
			            // 写入db报错
			            res.jsonp({
			            	ret: 4,
			            	msg: "写入db报错"
			            });
			        } else {
			        	// callback("", "写入db成功");
			        	// console.log(data1);
			        	// 还要写入章节表
			        	// console.log(data1.insertId);
			        	
			        	// setTimeout(function () {
			        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
			        	// }, 100);

			        	res.jsonp({
			            	ret: 0,
			            	msg: "正在构建中"
			            });
			        }
			    }, _toinsert , {
			        key: "name"
			    });
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs.slice(0,1), 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                // 获得urls
                var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]*\])/)[1]);

                var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://img001.36man.cc/" + chapterPath + ceil);});
                // console.log(urls);
                // doByUrls(urls);
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}

// 构建蒂亚漫画 dy--liangbuyi
exports.buildComic14 = function (req, res, next) {
	// liangbuyi
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}

    // https://www.diya1.com/manhua/liangbuyi/
    var link = "https://www.diya1.com/manhua/" + req.query.comicid + "/";

	requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        
	        // 找到ullist
	        var listchar = data.match(/<li>\s*<a href="\/manhua(?:(?!<\/li>).)+<\/li>/g);
	        var charactors = [];
        	listchar.forEach(function (ceil) {
        		charactors.push({
	                url: "https://www.diya1.com" + ceil.match(/<a href="(\/[^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.match(/<span>((?:(?!<\/span>).)+)<\/span>/)[1].trim()
	            });
        	});
	     	// charactors.reverse();
	        // 获得中文名
	        var zname = data.match(/<img class="pic"(?:(?!alt).)+alt="([^"]+)"/)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "dy--" + req.query.comicid,
	        	z_ch_name: zname.replace(/漫画$/, ""),
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: /strong>漫画状态：<\/strong>\s*<a href="\/list\/lianzai\/">/.test(data) ? 0 : 1
	        };

	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/漫画作者：<\/strong><a href="\/author[^"]+">([^<]+)</);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        var tags = data.match(/漫画类型：<\/strong>(?:(?!<\/span>).)+<\/span>/);
	        if (tags) {
	        	// 存在
	        	tags = tags[0].match(/<a(?:(?!<\/a>).)+<\/a>/g);
	        	if (tags) {
	        		var _t_tag = [];
	        		tags.forEach(function (ceil) {
	        			_t_tag.push(ceil.replace(/^[^>]+>|<\/a>/g, ''));
	        		});
	        		tags = _t_tag;
	        	}
	        }
	        comicinfo.tags = tags ? tags.join(",") : "";
	        // var tags = data.match(/class="comic_tags">([^<]+)</g);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].trim();
	        // }
	        if (tags) {
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
						case "少女爱情": characs += "恋爱,"; break;
						case "爱情": characs += "恋爱,"; break;
						case "少女爱情": characs += "恋爱,"; break;
						case "科幻": characs += "奇幻,冒险,科幻,"; break;
						case "魔法": characs += "玄幻,魔法,"; break;
						case "神鬼": characs += "猎奇,神鬼,"; break;
						case "格斗": characs += "格斗,武侠,"; break;
						case "机战": characs += "奇幻,冒险,机战,"; break;
						case "历史": characs += "古风,"; break;
						case "伪娘": characs += "彩虹,"; break;
						case "恐怖": characs += "猎奇,"; break;
						case "耽美": characs += "彩虹,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.slice(0,5).join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }
	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/<div id="intro-all"(?:(?!;">).)+;">((?:(?!<\/p>).)+)<\/p>/);
	       	if (descs) {
	       		comicinfo.descs = descs[1].trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/<img class="pic" src="([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}
	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

   				// 先把漫画插入到表中
		        comicsDao.add(function (err1, data1) {
			        if (err1) {
			        	console.log(err1);
			            // 写入db报错
			            res.jsonp({
			            	ret: 4,
			            	msg: "写入db报错"
			            });
			        } else {
			        	// callback("", "写入db成功");
			        	// console.log(data1);
			        	// 还要写入章节表
			        	// console.log(data1.insertId);
			        	
			        	// setTimeout(function () {
			        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
			        	// }, 100);

			        	res.jsonp({
			            	ret: 0,
			            	msg: "正在构建中"
			            });
			        }
			    }, _toinsert , {
			        key: "name"
			    });
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs.slice(0,1), 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                // 获得urls
                var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]*\])/)[1]);

                var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://img.diya1.com/" + chapterPath + ceil);});
                // doByUrls(urls);
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}

// 构建古风漫画 gf--huangdaohuanshenyouxi
exports.buildComic15 = function (req, res, next) {
	// huangdaohuanshenyouxi
	if (!req.query.comicid) {
		res.jsonp({ret: 1, err: "param err"});
		return false;
	}

    // https://www.gufengmh8.com/manhua/huangdaohuanshenyouxi/
    var link = "https://www.gufengmh8.com/manhua/" + req.query.comicid + "/";

	requestTry(link, function (err, data) {
    	try {
	        data = data.body.replace(/[\r\n\t]/g,"");
	        
	        // 找到ullist
	        var listchar = data.match(/<li>\s*<a href="\/manhua(?:(?!<\/li>).)+<\/li>/g);
	        var charactors = [];
        	listchar.forEach(function (ceil) {
        		charactors.push({
	                url: "https://www.gufengmh8.com" + ceil.match(/<a href="(\/[^"]+)"/)[1],
	                // name: ceil.match(/>([^>]+)<i>/)[1]
	                name: ceil.match(/<span>((?:(?!<\/span>).)+)<\/span>/)[1].trim()
	            });
        	});
	     	// charactors.reverse();
	     	// console.log(charactors);

	        // 获得中文名
	        var zname = data.match(/<img class="pic"(?:(?!alt).)+alt="([^"]+)"/)[1];

	        // 获得其他信息
	        var comicinfo = {
	        	name: "gf--" + req.query.comicid,
	        	z_ch_name: zname.replace(/漫画$/, ""),
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350",
	        	isover: /strong>漫画状态：<\/strong>\s*<a href="\/list\/lianzai\/">/.test(data) ? 0 : 1
	        };

	        // 获得作者信息
	        // var author = data.match(/原著作者：<\/em>([^<]*)<\/p>/);
	        var author = data.match(/漫画作者：<\/strong><a href="\/author[^"]+">([^<]+)</);
	        if (author) {
	        	comicinfo.author = author[1].trim();
	        }
	        // 获得类目信息
	        var tags = data.match(/漫画类型：<\/strong>(?:(?!<\/span>).)+<\/span>/);
	        if (tags) {
	        	// 存在
	        	tags = tags[0].match(/<a(?:(?!<\/a>).)+<\/a>/g);
	        	if (tags) {
	        		var _t_tag = [];
	        		tags.forEach(function (ceil) {
	        			_t_tag.push(ceil.replace(/^[^>]+>|<\/a>/g, ''));
	        		});
	        		tags = _t_tag;
	        	}
	        }
	        comicinfo.tags = tags ? tags.join(",") : "";
	        // var tags = data.match(/class="comic_tags">([^<]+)</g);
	        // if (tags) {
	        // 	comicinfo.tags = tags[1].trim();
	        // }
	        if (tags) {
	        	var characs = "";
	        	tags.forEach(function (ceil) {
	        		switch (ceil) {
						case "少女爱情": characs += "恋爱,"; break;
						case "爱情": characs += "恋爱,"; break;
						case "少女爱情": characs += "恋爱,"; break;
						case "科幻": characs += "奇幻,冒险,科幻,"; break;
						case "魔法": characs += "玄幻,魔法,"; break;
						case "神鬼": characs += "猎奇,神鬼,"; break;
						case "格斗": characs += "格斗,武侠,"; break;
						case "机战": characs += "奇幻,冒险,机战,"; break;
						case "历史": characs += "古风,"; break;
						case "伪娘": characs += "彩虹,"; break;
						case "恐怖": characs += "猎奇,"; break;
						case "耽美": characs += "彩虹,"; break;
		        		default: characs += ceil + ",";
		        	}
	        	});
	        	// 去重
	        	comicinfo.charactors = [];
	        	characs.replace(/,$/, "").split(",").forEach(function (ceil) {
	        		if (comicinfo.charactors.indexOf(ceil) == -1) {
	        			comicinfo.charactors.push(ceil);
	        		}
	        	});
	        	comicinfo.charactors = comicinfo.charactors.slice(0,5).join(",");
	        } else {
	        	comicinfo.charactors = "日常";
	        }
	       	// 描述
	       	// var descs = data.match(/介：<\/em>((?:(?!<a).)+)<a/);
	       	var descs = data.match(/<div id="intro-all"(?:(?!;">).)+;">((?:(?!<\/p>).)+)<\/p>/);
	       	if (descs) {
	       		comicinfo.descs = descs[1].trim();
	       	} else {
	       		comicinfo.descs = "";
	       	}

	       	// 主图
	       	var indexpic = data.match(/<img class="pic" src="([^"]+)"/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[1];
	       	}
	     	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        charactors: comicinfo.charactors,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        // comments: _b.length ? JSON.stringify(_b) : "",
				        isover: comicinfo.isover
				    };
	       		}

   				// 先把漫画插入到表中
		        comicsDao.add(function (err1, data1) {
			        if (err1) {
			        	console.log(err1);
			            // 写入db报错
			            res.jsonp({
			            	ret: 4,
			            	msg: "写入db报错"
			            });
			        } else {
			        	// callback("", "写入db成功");
			        	// console.log(data1);
			        	// 还要写入章节表
			        	// console.log(data1.insertId);
			        	
			        	// setTimeout(function () {
			        		render(data1.insertId, req.query.type == 1 ? 0 : (data3 && data3[0] && data3[0].charactor_counts));
			        	// }, 100);

			        	res.jsonp({
			            	ret: 0,
			            	msg: "正在构建中"
			            });
			        }
			    }, _toinsert , {
			        key: "name"
			    });
	       	}, comicinfo.name);

	        function render (comicid, fromlen) {
	        	console.log(comicid, fromlen);
	            var funcs = [];
	            // console.log(comicid, charactors);
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid,
	                        comicname: comicinfo.name
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                });
	            });
	            // 数据fromlen ? funcs.slice(fromlen) : funcs
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs.slice(0,1), 3, function(err, data) {
	                // res.jsonp("", JSON.stringify(data));
		            console.log(JSON.stringify(data));
	            });
	        }

        } catch (e) {
        	console.log(e);
            // 页面内部解析出错
            res.jsonp({
            	ret: 4,
            	msg: "获得数据报错"
            });
        }
    });

    function getPage (obj, pagecallback, trytime) {
    	// console.log(obj);
        requestTry(obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                // 获得urls
                var chapterPath = data.match(/var chapterPath = "([^"]*)"/)[1];
                var chapterImages = JSON.parse(data.match(/var chapterImages = (\[[^\]]*\])/)[1]);

                var urls = Array.from(chapterImages, function (ceil) {return /^http/.test(ceil) ? ceil : ("https://res.xiaoqinre.com/" + chapterPath + ceil);});
                // doByUrls(urls);
                // 获得urls之后要做的事情
                doByUrls(urls);
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: obj.comicname,
			            route: obj.comicname + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: obj.url,
	                    reason: e.toString()
	                });
            	}
            }
        });
    }
}

// 有一些列表
exports.gettobuild = function (req, res, next) {
	comicsDao.queryList(function (err, data) {
		if (err || !(data && data.data && data.data.length)) {
			res.jsonp({ret: 1, msg: err});
		} else {
			// 找到本周阅读榜单
			var _data = [], _mh = [], _nomh = [];
			data.data.forEach(function (ceil) {
				if (ceil.name.indexOf("mh1234") != -1) {
					_mh.push(ceil);
				} else if (ceil.name.indexOf("dfvcb") == -1) {
					_nomh.push(ceil);
				}
			});
			_mh.forEach(function (ceil) {
				if (!_nomh.some(function (cceil) {return ceil.z_ch_name == cceil.z_ch_name})) {
					_data.push({
						name: ceil.name,
						z_ch_name: ceil.z_ch_name,
						weekcount: +ceil.week1_count + +ceil.week2_count + +ceil.week3_count + +ceil.week4_count + +ceil.week5_count + +ceil.week6_count + +ceil.week7_count
					});
				}
			});
			_data.sort(function (a, b) {
				if (a.weekcount > b.weekcount) {
					return -1;
				} else if (a.weekcount < b.weekcount) {
					return 1;
				} else {
					return 0;
				}
			});
			res.jsonp({ret: 0, data: _data.slice(0,100)});
		}
	}, {}, {pagesize: 10000});
}

// isout
exports.outit = function (req, res, next) {
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	comicsDao.update(function (err2, data2) {
		if (err2) {
			res.jsonp({ret: 3, msg: err2});
		} else {
			res.jsonp({ret: 0, msg: ""});
		}
	}, {
		isout: req.query.type == 1 ? "" : "1"
	}, req.query.comic);
}

// isoffline
exports.offlineit = function (req, res, next) {
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	comicsDao.update(function (err2, data2) {
		if (err2) {
			res.jsonp({ret: 3, msg: err2});
		} else {
			res.jsonp({ret: 0, msg: ""});
		}
	}, {
		isoffline: req.query.type == 1 ? "" : "1"
	}, req.query.comic);
}

// 购买免广卡
exports.buycard = function (req, res, next) {
	// 必要的参数
	if (!req.query.uid || !req.query.num) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 查询用户信息
	comicusersDao.queryById(function (err1, data1) {
		if (err1 || (data1 && data1.length == 0)) {
			// 返回异常
			res.jsonp({ret: 5, msg: "err1", data: []});
			return false;
		}
		// 写入免广卡数据
		comicusersDao.update(function (err2, data2) {
			if (err2) {
				res.jsonp({ret: 3, msg: "err1", data: []});
			} else {
				res.jsonp({ret: 0, msg: "", data: []});
			}
		}, {
			adscardscount: req.query.clean ? 0 : (data1[0].adscardscount ? +data1[0].adscardscount + +req.query.num : req.query.num)
		}, req.query.uid);
	}, req.query.uid);
}

// 生肖将新增
exports.zodiacadd = function (req, res, next) {
	// 必要的参数还是要有的
	if (!req.query.sx || !req.query.uid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	// 当前用户
	var userid = req.cookies.nameid || req.query.nameid;

	// 先查询自己，找自己的master
	comicusersDao.queryById(function (err1, data1) {
		if (err1 || (data1 && data1.length == 0)) {
			// 返回异常
			res.jsonp({ret: 5, msg: "err1", data: []});
			return false;
		}
		// 一个人只能有一个master
		if (!data1[0].mymaster) {
			// 查询分享用户的信息
			comicusersDao.queryById(function (err, data) {
				if (err || (data && data.length == 0)) {
					// 返回异常
					res.jsonp({ret: 3, msg: "err1", data: []});
					return false;
				}
				// 转化一下
				try {
					// 读取信息
					var adscardinfo = JSON.parse(data[0].adscardinfo || "[]");

					// 判断一下啊，sx的坑位必须有
					if (adscardinfo.filter(function (ceil) {return ceil.name == req.query.sx}).length > 0) {
						// 坑位被占了
						res.jsonp({ret: 7, msg: "sx late", data: []});
						return false;
					}

					// 已经是的，不能重复参与
					if (adscardinfo.filter(function (ceil) {return ceil.uid == userid}).length > 0) {
						// 坑位被占了
						res.jsonp({ret: 0, msg: "iam already yours", data: []});
						return false;
					}
					// 插入
					adscardinfo.push({
						name: req.query.sx,
						uid: userid
					});

					// 取出信息之后判断
					// 写入数据，写入自己的数据，也要写入别人的数据
					comicusersDao.update(function (err2, data2) {

					}, {
						mymaster: req.query.uid
					}, userid);

					comicusersDao.update(function (err2, data2) {
						
					}, {
						adscardinfo: JSON.stringify(adscardinfo)
					}, req.query.uid);

					// 自己要变成vip
		            userDao.update(function (err, data) {
		            }, {
		            	isvip: "1"
		            } ,userid);
		            
					res.jsonp({ret: 0, msg: ""});
					// res.jsonp({
					// 	ret: 0,
					// 	data: data[0].adscardinfo
					// });
				} catch(e) {
					console.log(e);
					res.jsonp({ret: 4, msg: e, data: []});
				}
			}, req.query.uid);
		} else {
			if (data1[0].mymaster == req.query.uid) {
				// 已经是了
				res.jsonp({ret: 0, msg: "already"});
			} else {
				// 不是
				res.jsonp({ret: 6, msg: "have master", data: data1[0].mymaster});
			}
		}
	}, userid);
}

// 判断我是否是已经是他的生肖将了
exports.judgemaster = function (req, res, next) {
	// 必要的参数还是要有的
	if (!req.query.uid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	// 当前用户
	var userid = req.cookies.nameid || req.query.nameid;
	comicusersDao.queryById(function (err1, data1) {
		if (err1 || (data1 && data1.length == 0)) {
			// 返回异常
			res.jsonp({ret: 5, msg: "err1", data: []});
			return false;
		}
		// 我的
		if (data1[0].mymaster && data1[0].mymaster == req.query.uid) {
			res.jsonp({ret: 0, msg: "err1", data: 1});
		} else {
			res.jsonp({ret: 0, msg: "err1", data: 0});
		}
	}, userid);
}

// 获得我的生肖信息
exports.querymysxinfo = function (req, res, next) {
	var userid = req.cookies.nameid || req.query.nameid;

	// 查询分享用户的信息
	comicusersDao.queryById(function (err, data) {
		if (err || (data && data.length == 0)) {
			// 返回异常
			res.jsonp({ret: 3, msg: "err1", data: []});
			return false;
		}
		// 转化一下
		try {
			// 读取信息
			var lists = [{
                name: "鼠",
                color: "#5bb71f",
                // uid: "mankgo",
                // pic: "http://m.qpic.cn/psc?/V12IMQdX2eTPzw/XhAcrxMqcT2aH2KuaPXKTbVzGYOefthVzBV9cuMiJM.7I2jExqzN0.sH1o8G.jXiXYpYccNItKuFhOp*2FJsOw!!/b&bo=hACEAAAAAAARBzA!&rf=viewer_4",
                // user: "漫客谷",
                // adcount: 9,
                // time: "2020/3/22"
            },{
                name: "牛",
                color: "#1794a4"
            },{
                name: "虎",
                color: "#5c5a98"
            },{
                name: "兔",
                color: "#8f398f"
            },{
                name: "龙",
                color: "#e25925"
            },{
                name: "蛇",
                color: "#dd3b1e"
            },{
                name: "马",
                color: "#056f9c"
            },{
                name: "羊",
                color: "#d31754"
            },{
                name: "猴",
                color: "#7e09cc"
            },{
                name: "鸡",
                color: "#739838"
            },{
                name: "狗",
                color: "#dca142"
            },{
                name: "猪",
                color: "#8f398f"
            }];
            var adscardinfo = JSON.parse(data[0].adscardinfo || "[]"), uids = [];

            // 兼容新的
            if (adscardinfo.filter(function (ceil) {return ceil.uid == "mankgo"}).length == 0) {
            	var _tinfo = {
					name: "鼠",
					uid: "mankgo",
					adcount: 10,
					time: $formatDate(new Date(), "YYYY/MM/DD")
				};
            	// 如果是空的，就需要有一个mankgo
	            // 先写入
	           	adscardinfo.push(_tinfo);
	            comicusersDao.update(function (err2, data2) {
				}, {
					adscardinfo: JSON.stringify(adscardinfo)
				}, userid);
            } else {
            	// 判断今天有没有更新，如果没有更新就更新一下
	            var _todaySign = adscardinfo.filter(function (ceil) {return ceil.uid == "mankgo"});
	            if (_todaySign.length != 0) {
	            	if (_todaySign[0].time != $formatDate(new Date(), "YYYY/MM/DD")) {
	            		// 今天没有
		            	var _fix = (new Date($formatDate(new Date(), "YYYY/MM/DD")) - new Date(_todaySign[0].time)) / 86400000;
		            	// 几天
		            	_todaySign[0].adcount = +_todaySign[0].adcount + (_fix > 3 ? 3 : _fix) * 10;
	            	}
	            } else {
	            	adscardinfo.push({
						name: "鼠",
						uid: "mankgo",
						adcount: 10,
						time: $formatDate(new Date(), "YYYY/MM/DD")
					});
	            }
            }

            adscardinfo.forEach(function (ceil) {
            	if (ceil.uid != "mankgo") {
	            	uids.push(ceil.uid);	
            	}
            });
            // 判断有无
            if (uids.length == 0) {
            	var _tmank = lists.filter(function (ceil) {return ceil.name == "鼠"});
            	_tmank[0].uid = "mankgo";
                _tmank[0].pic = "http://m.qpic.cn/psc?/V12IMQdX2eTPzw/XhAcrxMqcT2aH2KuaPXKTbVzGYOefthVzBV9cuMiJM.7I2jExqzN0.sH1o8G.jXiXYpYccNItKuFhOp*2FJsOw!!/b&bo=hACEAAAAAAARBzA!&rf=viewer_4";
                _tmank[0].user = "漫客谷";
                _tmank[0].adcount = adscardinfo[0].adcount || 0,
                _tmank[0].time = adscardinfo[0].time;
                _tmank[0].transcount = adscardinfo[0].transcount || 0;
                _tmank[0].left = _tmank[0].adcount - _tmank[0].transcount;
                _tmank[0].amount = 100;

            	// 不存在
            	res.jsonp({ret: 0, msg: "", data: {
            		mycard: data[0].adscardscount || 0,
            		lastest: "牛",
            		list: lists
            	}});
            } else {
            	// 去读取这些用户的头像昵称
	            userDao.queryList(function (err2, data2) {
	            	if (err2) {
	            		console.log(err2);
						// 返回异常
						res.jsonp({ret: 4, msg: err2, data2: []});
						return false;
					}
					// res.jsonp({ret: 0, msg: "", data: data2});
					lists.forEach(function (ceil) {
					// adscardinfo.forEach(function (ceil) {
						// 写入数据
						var _tb = adscardinfo.filter(function (cceil) {return cceil.name == ceil.name});
						// 是否存在
						if (_tb && _tb.length > 0) {
			                ceil.uid = _tb[0].uid;
			                ceil.adcount = _tb[0].adcount;
			                ceil.transcount = _tb[0].transcount;
			                ceil.left = _tb[0].left;
			                ceil.time = _tb[0].time;
			                // ceil.amount = _tb[0].amount;

			                if (_tb[0].uid == "mankgo") {
			                	ceil.user = "漫客谷";
								ceil.pic = "http://m.qpic.cn/psc?/V12IMQdX2eTPzw/XhAcrxMqcT2aH2KuaPXKTbVzGYOefthVzBV9cuMiJM.7I2jExqzN0.sH1o8G.jXiXYpYccNItKuFhOp*2FJsOw!!/b&bo=hACEAAAAAAARBzA!&rf=viewer_4";
			                } else {
			                	var _ta = data2.data.filter(function (cceil) {return cceil.userid == ceil.uid});
								if (_ta && _ta.length > 0) {
									ceil.user = _ta[0].nickName || ("漫友" + _ta[0].userid);
		                			ceil.pic = _ta[0].avatarUrl || "https://img10.360buyimg.com/jdphoto/s120x120_jfs/t13840/48/224229347/6400/4eec0fe2/5a0697abN8a425d5c.png";
								}
								ceil.user = ceil.user || "漫友" + ceil.uid;
								ceil.pic = ceil.pic || "https://img10.360buyimg.com/jdphoto/s120x120_jfs/t13840/48/224229347/6400/4eec0fe2/5a0697abN8a425d5c.png";
			                }
						}
					});
					// 可以返回了吗？

					if (adscardinfo.length > 0) {
						// 排个序
						lists.forEach(function (ceil, index) {
							ceil.adcount = ceil.adcount || "0";
							ceil.index = index;
							ceil.transcount = ceil.transcount || "0";
							ceil.left = ceil.adcount - ceil.transcount;
						});
						lists.sort(function (a, b) {
							if (a.left - b.left > 0) return -1;
							else if (a.left - b.left < 0) return 1;
							else {
								return a.index - b.index;
							};
						});
						var _tc = lists[0].left;
						lists.forEach(function (ceil) {
							ceil.amount = +ceil.left ? Math.round(ceil.left / _tc * 100) : 0;
						});
					}

					// 给一个值
					var lastest = lists.filter(function (ceil) {return !ceil.uid});
					res.jsonp({ret: 0, msg: "", data: {
	            		mycard: data[0].adscardscount || 0,
	            		lastest: (lastest && lastest[0] && lastest[0].name) || "牛",
	            		list: lists
	            	}});
	            }, {
		            userid: {
		                type: "in",
		                value: uids
		            }
		        }, {pagesize: 20});
            }
		} catch(e) {
			console.log(e);
			res.jsonp({ret: 4, msg: e, data: []});
		}
	}, userid);
}

// 转化
exports.dotranssx = function (req, res, next) {
	var userid = req.cookies.nameid || req.query.nameid;
	if (!req.query.uid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	// 转化成我的
	comicusersDao.queryById(function (err1, data1) {
		if (err1 || (data1 && data1.length == 0)) {
			// 返回异常
			res.jsonp({ret: 1, msg: "err1", data: []});
			return false;
		}
		// 我的
		// 拿到这人的数据
		try {
			// 读取信息
			var adscardinfo = JSON.parse(data1[0].adscardinfo || "[]");
			var nowindex = -1;
			var nowinfo = adscardinfo.filter(function (ceil, index) {
				if (ceil.uid == req.query.uid) {
					nowindex = index;
					return true;
				} else {
					return false;
				}
			});
			if (nowinfo.length == 0) {
				// 不存在
				res.jsonp({ret: 4, msg: "not exiat", data: []});
				return false;
			}

			// 要给漫客谷转化一下
			var _todaySign = adscardinfo.filter(function (ceil) {return ceil.uid == "mankgo"});
            if (_todaySign.length != 0 && _todaySign[0].time != $formatDate(new Date(), "YYYY/MM/DD")) {
            	// 今天没有
            	var _fix = (new Date($formatDate(new Date(), "YYYY/MM/DD")) - new Date(_todaySign[0].time)) / 86400000;
            	// 几天
            	_todaySign[0].time = $formatDate(new Date(), "YYYY/MM/DD");
            	_todaySign[0].adcount = +_todaySign[0].adcount + (_fix > 3 ? 3 : _fix) * 10;
            }

			// console.log(nowindex, adscardinfo);
			// nowindex = nowindex - 1;
			// console.log(nowindex, adscardinfo[nowindex], adscardinfo);
			// 存在
			if ((adscardinfo[nowindex].adcount || 0) - (adscardinfo[nowindex].transcount || 0) < 3) {
				// 不够啊
				res.jsonp({ret: 5, msg: "not enough", data: []});
				return false;
			}

			// 可以
			var cancount = Math.floor(((adscardinfo[nowindex].adcount || 0) - (adscardinfo[nowindex].transcount || 0)) / 3);
			adscardinfo[nowindex].transcount = +(adscardinfo[nowindex].transcount || 0) + cancount * 3;

			// 更新
			comicusersDao.update(function (err2, data2) {
				if (err2) {
					console.log(err2);
					res.jsonp({ret: 6, msg: "err2", data: []});
					return false;
				}
				res.jsonp({ret: 0, msg: "", data: []});
			}, {
				adscardscount: +data1[0].adscardscount + cancount,
				adscardinfo: JSON.stringify(adscardinfo)
			}, userid);
		} catch(e) {
			console.log(e);
			res.jsonp({ret: 3, msg: e, data: []});
		}

	}, userid);
}

// 移除生肖将
exports.removesx = function (req, res, next) {
	var userid = req.cookies.nameid || req.query.nameid;
	if (!req.query.uid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	// 需要删除我本人的数组数据，还要删除好友的mymaster数据
	// 查询我的数据
	comicusersDao.queryById(function (err1, data1) {
		if (err1 || (data1 && data1.length == 0)) {
			// 返回异常
			res.jsonp({ret: 4, msg: "err1", data: []});
			return false;
		}
		// 我的
		// 拿到这人的数据
		try {
			// 读取信息
			var adscardinfo = JSON.parse(data1[0].adscardinfo || "[]");
			adscardinfo.some(function (ceil, index) {
				if (ceil.uid == req.query.uid) {
					adscardinfo.splice(index, 1);
					return true;
				}
			});

			// 更新
			comicusersDao.update(function (err2, data2) {
				if (err2) {
					console.log(err2);
					res.jsonp({ret: 6, msg: "err2", data: []});
					return false;
				}

				// 再去更新一下好友的信息
				comicusersDao.update(function (err3, data3) {
					console.log(err3, data3);
				}, {
					mymaster: 0	
				}, req.query.uid);

				res.jsonp({ret: 0, msg: "", data: []});
			}, {
				adscardinfo: JSON.stringify(adscardinfo)
			}, userid);
		} catch(e) {
			console.log(e);
			res.jsonp({ret: 3, msg: e, data: []});
		}

	}, userid);
}


exports.getAll = function (req, res, next) {
	comicsDao.queryList(function (err, data) {
		if (err || !(data && data.data && data.data.length)) {
			res.jsonp({ret: 1, msg: err});
		} else {
			var _data = [];
			data.data.forEach(function (ceil) {
				ceil.indexpic = ceil.indexpic.replace("p.youma.org", "bbb.youma.org").replace("bbb.youma.org", "cdn.wwwcom.xyz").replace("tu.mh1234.com", "img.wszwhg.net").replace("220012.net", "youzipi.net");
                ceil.indexpic = ceil.indexpic.replace(/^https:\/\//g, "http://");

				_data.push({
					name: ceil.name,
					z_ch_name: ceil.z_ch_name,
					indexpic: ceil.indexpic
				});
			});
			res.jsonp({ret: 0, data: _data});
		}
	}, {}, {pagesize: 10000});
}

// 查询，一直要做的东西！
exports.search = function (req, res, next) {
	// 一定要有漫画名字
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	req.query.comic = decodeURIComponent(encodeURIComponent(req.query.comic).replace(/^%08/, ""));

	// 是否特殊指令
	if (req.query.comic == "zerahuang") {
		// 去更新用户信息
		userDao.update(function (err, data) {
        }, {
        	issuper: "1"
        } ,req.cookies.nameid || req.query.nameid);

		res.jsonp({ret: 0, msg: "zerahuang", data: []});
		return false;
	}

	// 判断是否有加标志
	var isforce = /^全站[\:：]/.test(req.query.comic);
	req.query.comic = req.query.comic.replace(/^全站[\:：]/, "");

	// 一定要有漫画名字
	if (!req.query.comic) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	
	// 要返回的内容
	var _t = [], _timer = null;

	function sendBack(data) {
		if (_timer) {
            clearTimeout(_timer);
        }
        
		sendBack = function () {}
		// 做一个排序，toho优先
		data.data.sort(function (a, b) {
			if (!a.name && b.name) {
				return 1;
			} else if (a.name && !b.name) {
				return -1;
			} else if (!a.name && !b.name) {
				return 0;
			} else {
				// var aw = 0, bw = 0;
				// if (a.name.indexOf("pufei") != -1 || a.name.indexOf("dfvcb") != -1) {
				// 	aw = -1;
				// }
				// if (b.name.indexOf("pufei") != -1 || b.name.indexOf("dfvcb") != -1) {
				// 	bw = -1;
				// }
				// return bw - aw > 0 ? 1 : bw - aw < 0 ? -1 : 0;
				if (a.readcount > b.readcount) {
					return -1;
				} else if (a.readcount < b.readcount) {
					return 1;
				} else {
					return 0;
				}
				// if (a.name.indexOf("mh1234") != -1 && b.name.indexOf("mh1234") != -1) {
				// 	return 0;
				// } else if (a.name.indexOf("mh1234") != -1 && b.name.indexOf("mh1234") == -1) {
				// 	return 1;
				// } else if (a.name.indexOf("mh1234") == -1 && b.name.indexOf("mh1234") != -1) {
				// 	return -1;
				// } else {
				// 	return 0;
				// }
			}
		});

		// 扑飞的放前面
		data.data = data.data.filter(function (ceil) {return ceil.name && ceil.name.indexOf("pufei") != -1}).concat(data.data.filter(function (ceil) {return !(ceil.name && ceil.name.indexOf("pufei") != -1)}));

		var showKorea = false;

		var userid = req.cookies.nameid || req.query.nameid;
		if (userid) {
			// 查询用户信息，是否展示韩漫
	        comicusersDao.queryById(function (usererr, userdata) {
	            if (!usererr && (userdata.length != 0)) {
	                userdata = userdata[0];
	                var _usertype = userdata && userdata.adscount <= 5 && userdata.readcount <= 40 ? 100 : new Date() - new Date(userdata.registertime) > 2000 * 60 * 60 * 24 ? 3 : new Date() - new Date(userdata.registertime) > 1000 * 60 * 60 * 24 ? 2 : 1;
	                showKorea = _usertype == 2 || _usertype == 3;
	            }
	            if (showKorea) {
	            	doRespons(true);
	            } else {
	            	doRespons();
	            }
	        }, userid);
		} else {
			doRespons();
		}
        

		function doRespons(isolduser) {
			// 如果是isforce，就什么都不去掉，如果是的。就去掉isout和dfvcb
	    	if (!isforce) {
	    		// 再去掉isout的和dfvcb的
	        	data.data = data.data.filter(function (ceil) {return !+ceil.isout && (!ceil.name || (ceil.name && ceil.name.indexOf("dfvcb") == -1))});
	        	// isoffline是被迫下线的，新用户搜不到，老用户可以搜出来
		    	if (!isolduser) {
		    		// 新用户隐藏
		    		data.data = data.data.filter(function (ceil) {return !+ceil.isoffline && (!ceil.name || (ceil.name && ceil.name.indexOf("youma") == -1))});
		    	}
	    	}

	    	if (data.data && data.data.length == 0) {
	        	// 不存在
	        	data.ret = 6;
	        }
			res.jsonp(data);
		}
	}

	// 查询有的
	comicsDao.queryList(function (err2, data2) {
		if (err2) {
			console.log(err2);
			res.jsonp({ret: 5, msg: "query comic error", data: []});
		} else {
			data2 && data2.data && data2.data.forEach(function (ceil) {
				// 如果是韩国漫画，必须要名字全对！而且不能是isout的
				if (!ceil.limitinfo || (ceil.limitinfo == 1 && (ceil.z_ch_name == req.query.comic || ceil.searchtags && ceil.searchtags.split(",").some(function (cceil) {return cceil == req.query.comic})))) {
					_t.push({
						name: ceil.name,
		    			zname: ceil.z_ch_name,
		    			pic: ceil.indexpic,
		    			readcount: ceil.readcount,
		    			isout: ceil.isout,
		    			isoffline: ceil.isoffline
					});
				}
			});

			_t.sort(function (a, b) {
				if (+a.readcount > +b.readcount) {
					return -1;
				} else if (+a.readcount < +b.readcount) {
					return 1;
				} else {
					return 0;
				}
			});

			// 再去查询没有构建的
			// 设置超时时间
			_timer = setTimeout(function () {
				sendBack({ret: 0, msg: "", data: _t});
			}, 8000);

			// 去mh1234搜索
			// request("https://m.mh1234.com/search/?keywords=" + encodeURIComponent(req.query.comic), function (err, data0) {
			let buf = iconvLite.encode(req.query.comic, 'gbk');
			var _strname = '';
			for (var i = 0; i < buf.length; i++) {
			    _strname += '%' + buf[i].toString(16).toUpperCase();
			}
			request({
				url: "http://m.pufei.cc/e/search/?searchget=1&tbname=mh&show=title,player,playadmin,bieming,pinyin,playadmin&tempid=4&keyboard=" + _strname
			}).on('response',function(res){
		    	var chunks = [];
		    	res.on('data',function(chunk){
		        	chunks = chunks.concat(chunk);
		    	})

		    	res.on('end',function(){
		        	var buf = Buffer.concat(chunks);
		        	// 转码
		        	var text = iconvLite.decode(buf,'gbk');
		        	// console.log(text);
		        	_doback && _doback("", text);
		    	})
			}).on('error', function (res) {
				_doback && _doback("请求异常了！", "");
			});

			function _doback (err, data) {
				// 回来之后，就把计时器去掉
		       	clearTimeout(_timer);

		       	try {
		       		data0 = data.replace(/[\r\n\t]/g,"");
			        var haveResult = false;
			        if (!/没有搜索到相关的内容/.test(data0)) {
			        	haveResult = true;
			        }
			        if (haveResult) {
			        	try {
			        		// data0 = data0.match(/mh-list col7(?:(?!<\/ul>).)+<\/ul>/)[0].match(/<li>(?:(?!<\/li>).)+<\/li>/g);
				        	// data0 = data0.match(/am-thumbnails list">(?:(?!<\/ul>).)+<\/ul>/)[0].match(/<li(?:(?!<\/li>).)+<\/li>/g);
				        	data0 = data0.match(/<a href="\/manhua\/\d+"(?:(?!<\/dl><\/a>).)+<\/dl><\/a>/g);
				        	// 返回列表
				        	data0.forEach(function (ceil) {
				        		// var _tname = ceil.match(/href="\/([^\/]+)\/"/)[1];
				        		var _tname = ceil.match(/<h3>((?:(?!<\/h3>).)+)<\/h3>/)[1];
				        		if (!_t.some(function (cceil) {return cceil.zname == _tname})) {
				        			// _t.push({
					        		// 	name: _tname,
					        		// 	zname: ceil.match(/title="([^"]+)"/)[1],
					        		// 	// pic: ceil.match(/<img src="([^"])+)/)[1].replace(/^https:/, "http:"),
					        		// 	pic: ceil.match(/<img src="([^"]+)/)[1].replace(/^https:/, "http:"),
					        		// 	more: ceil.match(/<span class="tip">([^<]+)</)[1],
					        		// 	nobuild: true
					        		// });
					        		_t.push({
					        			// name: _tname,
					        			zname: _tname,
					        			// pic: ceil.match(/<img src="([^"])+)/)[1].replace(/^https:/, "http:"),
					        			pic: ceil.match(/data-src="([^"]+)/)[1].replace(/^https:/, "http:"),
					        			// more: ceil.match(/<span class="tip">([^<]+)</)[1],
					        			id: ceil.match(/href="\/manhua\/(\d+)/)[1],
					        			more: ceil.match(/更新至：<\/dt><dd>((?:(?!<\/dd>).)+)<\/dd>/)[1],
					        			nobuild: true
					        		});
				        		}
				        	});
				        	// if (_t.length > 0) {
				        		sendBack({ret: 0, msg: "", data: _t});
				        	// } else {
				        	// 	sendBack({ret: 6, msg: "", data: _t});
				        	// }
				        	
				        	// var name = data0.match(/href="\/([^\/]+)\/"/)[1];
				        	// // 找到漫画之后，开始去下载了
				        	// var zname = data0.match(/title="([^"]+)"/)[1];
				        	
				        	// 处理数据
				        	// getWecUrl(zname, name, function (err2, data2) {
				        	// 	// 构建完成了！
				        	// 	console.log("build success");
				        	// });
				        	// res.jsonp({ret: 0, msg: "正在构建中"});
			        	} catch(e) {
			        		console.log("搜索解析报错", e);
			        		sendBack({ret: 0, msg: "解析报错", data: _t});
			        	}
			        } else {
			        	sendBack({ret: 0, msg: "", data: _t});
			        }
		       	} catch (e) {
		       		console.log("搜索解析报错2", e);
		       		sendBack({ret: 0, msg: "", data: _t});
		       	}
			}
		}
	}, [{
		z_ch_name: {
			type: "like",
			value: req.query.comic
		}
	}, {
		searchtags: {
			type: "like",
			value: req.query.comic
		}
	}, {
		author: {
			type: "like",
			value: req.query.comic
		}
	}], {pagesize: 10000});
} 

// 记录要构建的内容
exports.record = function (req, res, next) {
	// 一定要有漫画名字
	if (!req.query.value) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	if (!req.query.key) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 拿到数据
	basic.get(function (err, data) {
		if (err) {
			// 记录失败
			res.jsonp({ret: 1, msg: "param err"});
			return false;
		}
		var _t = JSON.parse(data || "[]");

		// 构建漫画是的
		if (req.query.key == "wantedComics") {
			// 一个人最多有3部正在构建的
			if (_t.some(function (ceil) {return ceil.v == req.query.value && ceil.userid == (req.cookies.nameid || req.query.nameid)})) {
				// 不能构建相同的漫画
				res.jsonp({ret: 3, msg: "same"});
				return false;
			}

			// 不超过3个
			if (_t.filter(function (ceil) {return ceil.userid == (req.cookies.nameid || req.query.nameid)}).length >= 3) {
				res.jsonp({ret: 4, msg: "max"});
				return false;
			}
		}

		var _obj = {
			v: req.query.value,
			t: new Date(),
			userid: req.cookies.nameid || req.query.nameid
		};

		// 记录appid
		if (req.query.key == "wantedComics") {
			var nowappid = req.headers.referer.match(/servicewechat\.com\/([^\/]+)/);
		    if (nowappid) {
		      	_obj.appid = nowappid[1];
		    }
		}
		_t.push(_obj);

		// 继续保存
		basic.set(function (err, data) {
			if (err) {
				// 记录失败
				res.jsonp({ret: 1, msg: "param err"});
				return false;
			}
			res.jsonp({ret: 0, msg: "成功"});
			if (!req.query.nomail) {
				basic.mailme("漫客谷提醒：" + req.query.key + "-" + req.query.value);
			}
		}, req.query.key, JSON.stringify(_t), 60 * 60 * 24 * 7);
	}, req.query.key);
}

// 查询列表
exports.getRecord = function (req, res, next) {
	if (!req.query.key) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 拿到数据
	basic.get(function (err, data) {
		if (err) {
			// 记录失败
			res.jsonp({ret: 1, msg: "param err"});
			return false;
		}
		var _t = JSON.parse(data || "[]");
		_t.forEach(function (ceil) {
			ceil.t = $formatDate(new Date(ceil.t), "YYYY-MM-DD HH:II:SS")
		});
		res.jsonp({ret: 0, msg: "", data: _t});
	}, req.query.key);
}

// 清空要构建列表
exports.clearRecord = function (req, res, next) {
	if (!req.query.key) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	// 拿到数据
	basic.set(function (err, data) {
		if (err) {
			// 记录失败
			res.jsonp({ret: 1, msg: "param err"});
			return false;
		}
		res.jsonp({ret: 0, msg: "成功"});
	}, req.query.key, "", 60 * 60 * 24 * 7);
}

// 通知构建
exports.noticebuildsuccess = function (req, res, next) {
	// 需要有漫画信息和用户信息
	if (!req.query.userid || !req.query.comic) {
		res.jsonp({ret: 1, msg: "参数错误"});
		return false;
	}

	// 判断是否有appid
	if (req.query.appid) {
		var nowappid = req.query.appid;
	} else {
		// 获得appid
		var nowappid = req.headers.referer.match(/servicewechat\.com\/([^\/]+)/);
	    if (!nowappid) {
	      	res.jsonp({ret: 7, msg: "not wxapp"});
	      	return false;
	    } else {
	      	nowappid = nowappid[1];
	    }
	}
    // 根据appid，查询template_id信息
    cpsuserDao.queryById(function (apperr , appdata) {
    	if (apperr || (appdata && appdata.length == 0)) {
			// 返回就好
			res.jsonp({ret: 8, msg: "appdata info: " + nowappid});
	      	return false;
		}	
		appdata = appdata[0];
		// 查询用户信息
		userDao.queryById(function (err, data) {
	        if (err || (data && data.length == 0)) {
	            // 用户不存在
	            res.jsonp({
	                ret: 2,
	                msg: "用户不存在"
	            });
	        } else {
	        	if (req.query.type == 1) {
	        		// 不构建
	        		basic.doSubscribeMessage(data, {
			          	template_id: appdata.tplid_build_success,
			          	appid: nowappid,
			          	page: "/pages/index/index?url=%2Fpages%2Ftv%2Findex%3Fpage%3Dlistrow%26type%3D1%26name%3D%E6%9C%80%E6%96%B0%26showtime%3D1",
			          	data: {
			          		"thing1":{"value":"由于资源缺失，暂时无法构建"},
							"thing2":{"value": decodeURIComponent(req.query.comic)},
							"date3":{"value": $formatDate(new Date(), "YYYY年MM月DD日")},
							"thing4":{"value": "点击查看最新构建"}
						}
			        }, function (err, data) {
			        	if (data && data[0] && data[0].indexOf("发放成功") != -1) {
			        		res.jsonp({ret: 0, msg: ""});
			        	} else {
			        		res.jsonp({ret: 4, msg: data[0]});
			        	}
			        });
			  		// console.log("不构建");
	      //           res.jsonp({ret: 0, msg: ""});
	        	} else {
	        		// 去查询漫画信息
					comicsDao.queryList(function (err3, data3) {
						// 查询出漫画的基本信息
						if (err3 || (data3 && data3.data && data3.data.length == 0)) {
							// 返回异常
							res.jsonp({ret: 5, msg: err3 || "漫画本不存在"});
							return false;
						}

		                // // 用户存在的
		                // console.log(data3.data[0]);
		                // res.jsonp({ret: 0, msg: ""});
						// 查询成功，去发服务通知啦
						basic.doSubscribeMessage(data, {
				          	template_id: appdata.tplid_build_success,
				          	appid: nowappid,
				          	page: "/pages/index/index?url=" + encodeURIComponent("/pages/tv/index?page=comicindex&comic=" + data3.data[0].name),
				          	data: {
								"thing1":{"value": "构建完成" + data3.data[0].charactor_counts + "章。详情可点击通知查看。"},
								"thing2":{"value": data3.data[0].z_ch_name},
								"date3":{"value": $formatDate(new Date(), "YYYY年MM月DD日")},
								"thing4":{"value": "免费看漫画，上漫客谷"}
							}
				        }, function (err, data) {
				        	// if (err) {
				        	// 	res.jsonp({ret: 4, msg: err});
				        	// } else {
				        	// 	res.jsonp({ret: 0, msg: ""});
				        	// }
				        	if (data && data[0] && data[0].indexOf("发放成功") != -1) {
				        		res.jsonp({ret: 0, msg: ""});
				        	} else {
				        		res.jsonp({ret: 4, msg: data[0]});
				        	}
				        });
			        }, {
						z_ch_name: {
							type: "=",
							value: req.query.comic
						}
					});
	        	}
	        }
		}, req.query.userid);
    }, nowappid);
}

// 开通VIP
exports.openvip = function (req, res, next) {
	// res.jsonp({ret: 0});
	// 一定要有key参数"duannao_端脑_1"  "vip-1_1_1"
	if (!req.query.key) {
		res.jsonp({ret: 1, msg: "参数错误"});
		return false;
	}

	var keys = req.query.key.split("_");

	if (keys[0].indexOf("vip") != -1) {
		// 是开通vip的请求
		var vipflag = keys[0];
		var userid = keys[1];
		var day = keys[2];
		
		comicusersDao.queryById(function (err, data) {
			if (err || !(data && data[0])) {
				// 返回异常
				res.jsonp({ret: 4, msg: "err1"});
				return false;
			}
			// vip-1是续费会员，vip-2是新开通会员
			if (vipflag == "vip-1") {
				var viptime = +data[0].viptime + (day * 24 * 60 * 60 * 1000);
			} else if (vipflag == "vip-3") {
				if (!+data[0].viptime || (+data[0].viptime && new Date() >= new Date(+data[0].viptime))) {
					var viptime = new Date("2021/5/5 23:59:59").getTime();
				} else {
					res.jsonp({ret: 5, err: "您已经是会员咯，尽情享受吧~", data: []});
					return false;
				}
			} else if (vipflag == "vip-4") {
				// 这个既可能是续费会员，也可能是新会员
				if (data[0].viptime && new Date() < new Date(+data[0].viptime)) {
					// 是续费会员
					var viptime = +data[0].viptime + (day * 24 * 60 * 60 * 1000);
				} else {
					// 是新会员
					var viptime = new Date().getTime() + (day * 24 * 60 * 60 * 1000);
				}
			} else {
				var viptime = new Date().getTime() + (day * 24 * 60 * 60 * 1000);
			}
			// 更新
			comicusersDao.update(function (err2, data2) {
				// 修改成功
				res.jsonp({ret: 0, err: err2, data: data2, viptime: $formatDate(new Date(viptime), "YYYY-MM-DD HH:II"), type: !!data[0].viptime});
			}, {
				viptime: viptime
			}, userid);
		}, userid);
	} else {
		// 是一般的请求
		var userid = keys[keys.length - 1];
		var comic = keys[0];
		// 查询漫画信息，最新两章给他加上VIP
		comicsDao.queryById(function (err3, data3) {
			// 查询出漫画的基本信息
			if (err3 || (data3 && data3.length == 0)) {
				// 返回异常
				res.jsonp({ret: 5, msg: "err2"});
				return false;
			}
			// 直接去修改这个用户的信息
			comicusersDao.queryById(function (err, data) {
				if (err) {
					// 返回异常
					res.jsonp({ret: 4, msg: "err1"});
					return false;
				}

				// 拿到用户的信息
				var _infos = JSON.parse(data[0].infos || "{}");
				_infos[comic].vip = 1;

				var myrange = _infos[comic].range ? _infos[comic].range : [[1, data3[0].freechars]];

				_infos[comic].range = myrange.concat([[data3[0].charactor_counts - 1, data3[0].charactor_counts]]);

				comicusersDao.update(function (err2, data2) {
					// 修改成功
					res.jsonp({ret: 0, err: err2, data: data2});
				}, {
					// lastviewed: new Date(),
					infos: JSON.stringify(_infos)
				}, userid);
			}, userid);
		}, comic);
	}
}

// 首页banner
exports.getbanner = function (req, res, next) {
	var _banner = [{
		// 雏蜂
		"name":"chufeng","pic":"http://m.qpic.cn/psc?/V12IMQdX2eTPzw/ruAMsa53pVQWN7FLK88i5rfQUA5SAx6icUx5oNTeqQwuBEd1VnfyBog584KmWYd4QDgVypTk5QMxNaHyKQqOMXjipUGl0KvNXp17kSZP*dU!/b&bo=kAQJAgAAAAADB70!&rf=viewer_4"
	},{
		// 铁姬钢兵
		"name":"pufei--190","pic":"https://manhua.qpic.cn/operation/0/12_11_43_a6be39a4fd1c1b00bfa58f12c2aab78b_1562903008651.jpg/0"
	},{
		// 王妃的婚后指南
		"name":"pufei--2137","pic":"http://m.qpic.cn/psb?/V12IMQdX2eTPzw/n7KbYzymJX7Th9QzBZ8Kgt7biY0SeqjstB51DDkkvE4!/b/dMMAAAAAAAAA&bo=7gKIAQAAAAARB1U!&rf=viewer_4"
	}
	,{
		// 一人之下
		"name":"pufei--419","pic":"https://manhua.qpic.cn/operation/0/14_10_04_96c16a9f2c491350e7cb09a62996b8b5_1555207448452.jpg/0"
	}
	,{
		// 我是大神仙
		"name":"pufei--1204","pic":"https://manhua.qpic.cn/operation/0/26_00_10_f5dd7251b17eb51266eb4f39814ff0c7_1574698204013.jpg/0"
	}
	,{
		// 桃花宝典
		"name":"mh1234--10869","pic":"http://m.qpic.cn/psc?/V12IMQdX2eTPzw/45NBuzDIW489QBoVep5mcU6ruahdVO3.O4FnVaPB*holDzOcIJ5A6EB7wpV7UuhGzHQNs5og7hQhFiMzpAko8XAjVflGX.neGZHrxELcJ3U!/b&bo=hwQIAgAAAAADJ4s!&rf=viewer_4"
	}
	,{
		// 百炼成神
		"name":"pufei--49","pic":"https://manhua.qpic.cn/operation/0/13_00_10_2e9970fa473c11cc707db9b01828eaa4_1573575008542.jpg/0"
	}
	,{
		// 狐妖小红娘
		"name":"pufei--320","pic":"https://manhua.qpic.cn/operation/0/02_00_10_ae9d6e064764453fcd04a2598d6f3d8c_1572624604205.jpg/0"
	}
	,{
		// 通灵妃
		"name":"pufei--172","pic":"http://i0.hdslb.com/bfs/archive/46ac47fe62ea35de6f3b1ea993dc4101df0b95d6.jpg"
	},{
		// 是男人就上一百次
		"name":"pufei--2998","pic":"https://manhua.qpic.cn/operation/0/07_00_10_59f861b3493a988f4b0cdc7806011c86_1573056605536.jpg/0"
	}
	,{
		// 据说我是王的女儿
		"name":"mh1234--10282","pic":"http://m.qpic.cn/psc?/V12IMQdX2eTPzw/45NBuzDIW489QBoVep5mcU6ruahdVO3.O4FnVaPB*hrmLHwmijFlc0akSJe1dXVVx4jn5wEuhd2NQoekkr5TGiEMVSsDuJvzc2qF9xM5H8k!/b&bo=hQUGAgAAAAADN5Y!&rf=viewer_4"
	}
	,{
		// 都市封神
		"name":"mh1234--16916","pic":"https://manhua.qpic.cn/operation/0/21_00_10_ec975d0fcef4cd0da767381de2d45fac_1574266203846.jpg/0"
	},{
		// 我在异界当乞丐
		"name":"pufei--2177","pic":"https://manhua.qpic.cn/operation/0/16_00_10_1c93752ca5b314977a560986acf1dbc0_1573834203750.jpg/0"
	},{
		// 妹子与科学
		"name":"pufei--255","pic":"https://manhua.qpic.cn/operation/0/21_00_10_6157c0445fe59934cd7bf64f80628ee7_1574266203411.jpg/0"
	},{
		// 深夜猎奇
		"name":"pufei--2977","pic":"https://manhua.qpic.cn/operation/0/16_00_10_53101ee46565809b730e9088eb8adf92_1573834204518.jpg/0"
	}
	,{
		// 万界仙踪
		"name":"mh1234--12680","pic":"http://m.qpic.cn/psc?/V12IMQdX2eTPzw/45NBuzDIW489QBoVep5mcU6ruahdVO3.O4FnVaPB*hp3R7UWfGo6IlRhH2fT**4QYNPPWml0QMRiKBdWM2NGLEVzsObNAzVXqdWiwTQUnNE!/b&bo=uQQGAgAAAAADJ7s!&rf=viewer_4"
	}
	,{
		// 妖怪名单
		"name":"pufei--234","pic":"http://m.qpic.cn/psc?/V12IMQdX2eTPzw/Yy1IgXYwVlwETHKTB4JpvKfQm2kf*XsguL5xsxNUMap.OGv8Kf5osshUaOj1bUP45z6fHujG0N3WHM7M80JSs4KSa7PTqHKWqaURB8V4njk!/b&bo=WAJRAQAAAAARBzo!&rf=viewer_4"
	}
	, {
		// 妖神记
		"name": "pufei--243",
		"pic": "http://cms.samanlehua.com/cms/zengqiang/3f9779b0-0ff4-11ea-b570-ad93e31fa8b1.jpg"
	},{
		// 斗罗大陆4终极斗罗
		"name":"pufei--3001","pic":"https://manhua.qpic.cn/operation/0/26_00_10_47426f50606c620633c17dae83b69b71_1574698203260.jpg/0"
	},{
		// 放开那个女巫
		"name":"mh1234--15632","pic":"https://manhua.qpic.cn/operation/0/14_00_10_1713fde22c60e5f22bc22a1e5cee4471_1573661404375.jpg/0"
	}
	,{
		"name":"pufei--20","pic":"http://www.nadianshi.com/wp-content/uploads/2019/04/image001-1.jpg"
	}
	,{
		// 神蛹降临
		"name":"pufei--219","pic":"https://manhua.qpic.cn/operation/0/07_00_10_fb1cedfad0f7c3aa875c2c89c8a75c33_1573056604928.jpg/0"
	},{
		// 斗破苍穹
		"name":"pufei--420","pic":"https://manhua.qpic.cn/operation/0/18_00_10_468a7cf9d7963df488c2803f66183526_1574007003926.jpg/0"
	},{
		// 仙山传奇
		"name":"mh1234--15624","pic":"https://manhua.qpic.cn/operation/0/19_00_10_0a0d9465e051e4e15a739e0721717bd5_1576685403901.jpg/0"
	},{
		// 驭灵师
		"name":"pufei--51","pic":"https://manhua.qpic.cn/operation/0/19_00_10_fee9902bbdd22f2434acd49cbe19e6d0_1576685404464.jpg/0"
	},{
		// 妖精种植手册
		"name":"pufei--244","pic":"https://manhua.qpic.cn/operation/0/16_18_08_b1168289660d42b6fb762c9d6a41e1ab_1579169313391.jpg/0"
	}, {
		// 武动乾坤
		"name": "wudonggankunmanhua",
		"pic": "http://images.qiniu.kuman.com/banner/%E6%AD%A6%E5%8A%A8%E4%B9%BE%E5%9D%A4%20copy%203.png"
	}, {
		// 剑仁
		"name": "pufei--3060",
		"pic": "http://cms.samanlehua.com/cms/zengqiang/6e6469e0-f95d-11e9-bfd1-85cf9c30b899.jpg"
	}];
	// 按时间洗牌，每隔1天，走一个
    var _t = Math.round(new Date().getTime() / (24 * 60 * 60 * 1000)) % (_banner.length);
    _banner = _banner.concat(_banner).slice(_t, _t + (req.query.length || 4));
    // 返回
    res.jsonp({ret: 0, msg: "", data: _banner.reverse()});
}

exports.getWecUrl = getWecUrl;
// getWecUrl("尸界", "shijie", function (err, data) {
// 	console.log(err, data);
// });
// 获得数据
function getWecUrl (comicname1, comicname2, callback, forceall, isgetcomment) {
	// request 统一加上重试一次
	// var _oriRequest = request;
	function requestTry (url, callit, times) {
		var _hasBack = false;
		var _tt = setTimeout(function () {
			// 重试吧
			if (!times) {
				console.log("链接：" + url + " 请求超时，准备重试第一次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 1);
			} else if (times == 1) {
				console.log("链接：" + url + " 请求超时，准备重试第二次");
				// _doback = function () {};
				_hasBack = true;
				// 可以重试
				requestTry (url, callit, 2);
			} else {
				console.log("链接：" + url + " 再次超时，不再重试了");
				// 不支持重试了
				_doback();
			}
		}, 20000);

		var _doback = function (e, d) {
			if (_tt) {
				clearTimeout(_tt);
			}
			if (_hasBack) return false;
			_hasBack = true;
			// _doback = function () {};
			callit(e, d);
		};

		request(url, _doback);
	}

    // https://www.tohomh123.com/duannao/
    requestTry("http://www.tohomh123.com/" + comicname2 + "/", function (err, data) {
    	// console.log("in");
    	// return false;
    	try {
	        // console.log(data.body);
	        // return false;
	        data = data.body.replace(/[\r\n\t]/g,"");

	        var _b = [];
	       	try {
	       		var commnets = data.match(/<ul class="postlist">(?:(?!<\/ul>).)+<\/ul>/);
	            // console.log(commnets[0]);
	            commnets = commnets[0].match(/<li(?:(?!<\/li>).)+<\/li>/g);
	            commnets && commnets.slice(0,10).forEach(function (ceil) {
	                _b.push({
	                    pic: "http://www.tohomh123.com" + ceil.match(/src="([^"]+)"/)[1],
	                    nick: filterNicknameWithEmoj(ceil.match(/title">((?:(?!<\/p>).)+)<\/p>/)[1]),
	                    text: filterNicknameWithEmoj(ceil.match(/content">((?:(?!<\/p>).)+)<\/p>/)[1]),
	                    time: ceil.match(/bottom">((?:(?!<span).)+)<span/)[1].trim(),
	                });
	            });
	       	} catch(e){}

	        if (isgetcomment) {
	        	// 只是想知道是否完结是吧
	        	callback && callback("", _b.length ? _b : "");
	        	return false;
	        }

	        // console.log(data);
	        var temChars = data.match(/detail-list-select-2(?:(?!<\/ul>).)+<\/ul>/)[0].match(/<li>(?:(?!<\/li>).)+<\/li>/g);
	        var charactors = [];
	        temChars.forEach(function (ceil) {
	            charactors.push({
	                url: ceil.match(/href="([^"]+)"/)[1],
	                name: ceil.match(/>([^>]+)<span>/)[1],
	                pics: ceil.match(/（(\d+)P）/)[1]
	            });
	        });

	        // 获得其他信息
	        var comicinfo = {
	        	name: comicname2,
	        	z_ch_name: comicname1,
	        	charactor_counts: charactors.length,
	        	share_reward: 10,
	        	ad_reward: charactors.length < 100 ? 1 : (charactors.length >= 100 && charactors.length < 300) ? 2 : 3,
	        	freechars: charactors.length < 10 ? 3 : (charactors.length >= 10 && charactors.length < 100) ? Math.floor(charactors.length / 3) : (charactors.length >= 100 && charactors.length < 600) ? Math.floor(charactors.length / 4) : 150,
	        	listwidth: "350"
	        };

	        // 获得作者信息
	        var author = data.match(/<p class="subtitle">作者：([^<]*)<\/p>/);
	        if (author) {
	        	comicinfo.author = author[1];
	        }
	        // 获得类目信息
	        var characs = data.match(/block ticai">(?:(?!<\/span>).)+<\/span>/)[0].match(/target="_blank">(?:(?!<\/a>).)+<\/a>/g);
	        if (characs) {
	        	comicinfo.charactors = Array.from(characs, x => x.match(/target="_blank">((?:(?!<\/a>).)+)<\/a>/)[1]).join(",");
	        }
	        // 获得tag信息
	        var tags = data.match(/<span class="block">标签：(?:(?!<\/span>).)+<\/span>/)[0].match(/target="_blank">(?:(?!<\/a>).)+<\/a>/g);
	       	if (tags) {
	       		comicinfo.tags = Array.from(tags, x => x.match(/target="_blank">((?:(?!<\/a>).)+)<\/a>/)[1]).join(",");
	       	}

	       	// 描述
	       	var descs = data.match(/vertical;">((?:(?!<\/p>).)+)<\/p>/);
	       	if (descs) {
	       		comicinfo.descs = descs[1];
	       	}

	       	// 主图
	       	var indexpic = data.match(/class="cover">((?:(?!alt).)+)alt/);
	       	if (indexpic) {
	       		comicinfo.indexpic = indexpic[0].match(/<img src="([^"]+)"/)[1];
	       	}

	       	// 查询这本漫画之前是否有过构建！
	       	comicsDao.queryById(function (err3, data3) {
	       		if (data3 && data3.length != 0) {
	       			// 有数据，有一些是不更新的
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        charactor_counts: comicinfo.charactor_counts,
				        updatetime: new Date(),
				        freechars: comicinfo.freechars,
				        comments: _b.length ? JSON.stringify(_b) : ""
				    };
	       		} else {
	       			// 要插入的数据
		       		var _toinsert = {
				        name: comicinfo.name,
				        z_ch_name: comicinfo.z_ch_name,
				        author: comicinfo.author,
				        charactor_counts: comicinfo.charactor_counts,
				        tags: comicinfo.tags,
				        charactors: comicinfo.charactors,
				        descs: comicinfo.descs,
				        more: "",
				        indexpic: comicinfo.indexpic,
				        share_reward: comicinfo.share_reward,
				        ad_reward: comicinfo.ad_reward,
				        freechars: comicinfo.freechars,
				        listwidth: comicinfo.listwidth,
				        createtime: new Date(),
				        updatetime: new Date(),
				        comments: _b.length ? JSON.stringify(_b) : ""
				    };
	       		}

	       		// 判断是否完结
	       		exports.buildComic2({
	       			query: {
	       				comic: comicinfo.z_ch_name,
	       				getisover: 1
	       			}
	       		}, {
	       			jsonp: function (data4) {
	       				console.log(data4);
	       				var isover = 0;
	       				if (data4.ret == 0 && data4.data == 1) {
	       					isover = 1;
	       				}
	       				_toinsert.isover = isover;
	       				// console.log(comicinfo);
				        // 先把漫画插入到表中
				        comicsDao.add(function (err1, data1) {
					        if (err1) {
					        	console.log(err1);
					            // 写入db报错
					            callback("", "写入db报错");
					        } else {
					        	// callback("", "写入db成功");
					        	// console.log(data1);
					        	// 还要写入章节表
					        	render(data1.insertId, forceall ? "" : (data3 && data3[0] && data3[0].charactor_counts));
					        }
					    }, _toinsert, {
					        key: "name"
					    });
	       			}
	       		});
	       	}, comicname2);

	        function render (comicid, fromlen) {
	            var funcs = [];
	            charactors.forEach(function (ceil, index) {
	                funcs.push(function (innerCall) {
	                    getPage({
	                        url: ceil.url,
	                        name: ceil.name.replace(/\?/g, "").replace(/\:/g, "_"),
	                        index: index,
	                        comicid: comicid
	                    }, function (err, data) {
	                        innerCall("", data);
	                    });
	                    // callback("", ceil);
	                });
	            });
	            // console.log(charactors.length);
	            // 数据
	            async.parallelLimit(fromlen ? funcs.slice(fromlen) : funcs, 3, function(err, data) {
	            // async.parallelLimit(funcs.slice(400), 3, function(err, data) {
	                callback("", JSON.stringify(data));
	            })

	            // 做数据校验
	            // charactors.forEach(function (ceil, index) {
	            //     // funcs.push(function (callback) {
	            //     if (index < 300) {
	            //         var dirs = fs.readdirSync(path.join(process.cwd(),"comic",comicname1, (index + 1) + "_" + ceil.name.replace(/ /g, "\ ").replace(/\:/g, "_")));
	            //         if (dirs.length != ceil.pics) {
	            //             console.log(ceil.name + "有问题！ 需要：" + ceil.pics + " 实际：" + dirs.length);
	            //         }
	            //     }
	            //     // });
	            // });
	        }

        } catch (e) {
            // 页面内部解析出错
            callback("", isgetcomment ? "" : "获得数据报错");
        }
    });


    function getPage (obj, pagecallback, trytime) {
        requestTry("http://www.tohomh123.com" + obj.url, function (err, data) {
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                // console.log(data);
                var p1 = data.match(/var pl = '([^']+)'/)[1];
                var count = +(data.match(/var pcount\s*=\s*(\d+)/)[1]);
                var did = +(data.match(/var did=(\d+)/)[1]);
                var sid = +(data.match(/var sid=(\d+)/)[1]);
                var bq = +(data.match(/var bq\s*=\s*(\d+)/)[1]);

                // console.log("", obj, p1, count, did, sid);
                // return false;
                // var links = []; _t = p1.match(/((?:(?!\d+\.[^\.\/]+$).)+)(\d+)(\.[^\.\/]+$)/);
                // for (var i = 0 ; i < count; i++) {
                //     links.push({
                //         link: "http://m-tohomh123-com.mipcdn.com/i/" + _t[1].replace(/https?\:\/\//, "") + (pictype == 1 ? ("000" + (+_t[2] + i)) : ("000" + (+_t[2] + i)).slice(-4)) + _t[3],
                //         id: ("000" + (+_t[2] + i)),
                //         ext: _t[3]
                //     });
                // }
                // console.log(count, did, sid);
                
                // 去获得标准图片
                var links = [], _t = p1.match(/((?:(?!\d+\.[^\.\/]+$).)+)(\d+)(\.[^\.\/]+$)/);
                // console.log(p1);
                // 判断是否下线了
               	if (bq == 1 || bq == 0) {
               		// console.log("下线的漫画");
               		// 已经下线了
               		// 要获得新的urls
               		// 判断是否超过10个
               		var urls = [];
               		var _newtemp = p1.match(/(\d+)_(\d+)/);
               		if (_newtemp) {
               			// 是新的类型
               			for (var i = 0 ; i < count ; i++) {
               				urls.push(p1.replace(/\d+_\d+.*$/, "") + ("00000" + (+_newtemp[1] + i)).slice(-_newtemp[1].length) + "_" + (+_newtemp[2] + i) + p1.replace(/^.*\d+_\d+/, ""));
               			}
               			doByUrls(urls);
               		} else {
               			if (+_t[2] + count - 1 >= 10) {
	               			// 要去试一下，该用哪种数据
	               			getNumberLength(_t[1], _t[3] ,function (err, len) {
	               				if (_t[2].length == 2) {
	               					len = 2;
	               				}

	               				// console.log("类型是：" + len);
	               				// type == 1 0011  type == 2 00011 type == 3 11 type == 4 011 type == 5 0011
	               				// for (var i = 0 ; i < 10 ; i++) {
		               			// 	urls.push(_t[1] + ("00000" + (+_t[2] + i)).slice(-_t[2].length) + _t[3]);
		               			// }
	               				// for (var i = 10 ; i < count ; i++) {
		               			// 	urls.push(_t[1] + ("00000" + (+_t[2] + i)).slice(i >= 100 ? -(len + 1) : -len) + _t[3]);
		               			// }
		               			
		               			// 还有可能大于100张图片的
		               			if (+_t[2] + count - 1 >= 100) {
		               				getNumberLength(_t[1], _t[3] ,function (err, len100) {
		               					if (_t[2].length == 3) {
			               					len = 3;
			               				}
		               					for (var i = 0 ; i < count; i++) {
				               				if (+_t[2] + i >= 10) {
				               					// 是双位数的
				               					urls.push(_t[1] + ("00000" + (+_t[2] + i)).slice(i >= 100 ? -len100 : -len) + _t[3]);
				               				} else {
				               					// 是单位数的
				               					urls.push(_t[1] + ("00000" + (+_t[2] + i)).slice(-_t[2].length) + _t[3]);
				               				}
				               			}

				               			doByUrls(urls);
		               				}, 100);
		               			} else {
		               				for (var i = 0 ; i < count; i++) {
			               				if (+_t[2] + i >= 10) {
			               					// 是双位数的
			               					urls.push(_t[1] + ("00000" + (+_t[2] + i)).slice(-len) + _t[3]);
			               				} else {
			               					// 是单位数的
			               					urls.push(_t[1] + ("00000" + (+_t[2] + i)).slice(-_t[2].length) + _t[3]);
			               				}
			               			}

			               			doByUrls(urls);
		               			}
	               			});
	               		} else {
	               			// 没有超过10的话，直接替换最后
	               			for (var i = 0 ; i < count ; i++) {
	               				urls.push(_t[1] + ("00000" + (+_t[2] + i)).slice(-_t[2].length) + _t[3]);
	               			}
	               			doByUrls(urls);
	               		}
               		}
               	} else {
               		console.log("在线");
               		// 正常在线的
               		count = (("" + _t[2]).length == 1 && _t[2] == 1) ? count - 1 : count;
	                for (var i = 0 ; i < count ; i++) {
	                    links.push({
	                        did: did,
	                        sid: sid,
	                        iid: i + 1,
	                        id: "000" + i,
	                        link: _t[1] + (_t[2].length == 4 ? ("000" + (+_t[2] + i)).slice(-4) : _t[2].length == 2 ? ((+_t[2] + i >= 10 ? "00" : "") + ("0" + +_t[2] + i).slice(-2)) : (+_t[2] + i)) + ".jpg",
	                        ext: ".jpg"
	                    });
	                }
	                var myfuncs = [];
	                links.forEach(function (ceil) {
	                    myfuncs.push(function (calllink) {
	                        getLink(ceil.did, ceil.sid, ceil.iid, function (err3, data3) {
	                            ceil.link = data3;
	                            // console.log(ceil);
	                            calllink("", data3);
	                        });
	                    });
	                });
	                async.parallelLimit(myfuncs, 20, function(err3, data3) {
	                    // 得到了所有图片了
	                    // 要去插入图片了啊
	                    var urls = data3;
	                    // links.forEach(function (ceil) {
	                    // 	urls.push(ceil.link);
	                    // });
	                    // console.log(err3, data3);
	           			// console.log({
				        //     name: obj.name,
				        //     comic_index: obj.index + 1,
				        //     pic_count: urls.length,
				        //     comic_name: comicname2,
				        //     route: comicname2 + "/" + (obj.index + 1),
				        //     read_count: 0,
				        //     urls: JSON.stringify(urls)
				        // });
	                    // console.log(("0" + (obj.comicid % 100)).slice(-2));
	                    // return false;
	                    // 写入db数据
	                   	doByUrls(urls);
	                });
               	}

                // 获得urls之后要做的事情
                function doByUrls (urls) {
                	charactorsDao.add(function (err2, data2) {
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		// console.log("第" + (obj.index + 1) + "章 " + obj.name + " 执行" + (err2 ? "失败" : "成功"));
			            
                   		if (err2) {
                   			console.log(err2);
                   		}
                   		// console.log("AAAAA", obj + " " + (err2 ? JSON.stringify(err2) : ""));
                   		console.log("number" + (obj.index + 1) + ". " + obj.name + " exec " + (err2 ? "failed" : "success"));
			            
			            // 要写入成功之后，才结束
			            pagecallback("", err2 ? {
		                    url: "http://www.tohomh123.com" + obj.url,
		                    reason: err2.toString()
		                } : "");
			        }, {
			            name: obj.name,
			            comic_index: obj.index + 1,
			            pic_count: urls.length,
			            comic_name: comicname2,
			            route: comicname2 + "/" + (obj.index + 1),
			            read_count: 0,
			            comic_id: 0,
			            urls: JSON.stringify(urls)
			        }, {
			            key: "route",
			            tablename: "charactors_" + ("0" + (obj.comicid % 100)).slice(-2)
			        });
                }
            } catch(e) {
            	// 执行失败之后，再次重试一遍吧
            	if (!trytime) {
            		getPage (obj, pagecallback, 1);
            	} else {
            		// 页面内部解析出错
	                pagecallback("", {
	                    url: "http://www.tohomh123.com" + obj.url,
	                    reason: e.toString()
	                });
            	}
            }

            // request(p1).pipe(fs.createWriteStream(process.cwd() + "/comic/端脑/" + obj.name + "/" + p1.match(/\d+\.[^\/\.]+$/)[0]));
            // console.log(process.cwd());
            // callback("", {
            //     pl: , 
            //     count: data.match(/var pcount = (\d+)/)[1]
            // });
        });
    }

    function getNumberLength (link, ext, mycall, num) {
    	// type == 1 0011  type == 2 00011 type == 3 11 type == 4 011 type == 5 0011
    	// 一次性发多个请求，看哪个成功了
    	var _tnum = num || "10";
    	var _len = (_tnum + "").length;
        // console.log(charactors.length);
        // 数据
        async.parallel({
        	2: function (ceilcall) {
        		testLink(link + _tnum + ext, ceilcall, num);
        	},
        	3: function (ceilcall) {testLink(link + "0" + _tnum + ext, ceilcall, num);},
        	4: function (ceilcall) {testLink(link + "00" + _tnum + ext, ceilcall, num);},
        	5: function (ceilcall) {testLink(link + "000" + _tnum + ext, ceilcall, num);}
        }, function(err, data) {
        	// console.log(data);
        	// 取不到10，就去取11
        	var _tlen = (!data[2]) ? _len : (!data[3]) ? (_len + 1) : (!data[4]) ? (_len + 2) : (!data[5]) ? (_len + 3) : (_len + 4);
        	if (_tlen == (_len + 4) && num % 10 == 0) {
        		console.log(link + "找不到的，就去找11");
        		// 找不到的，就去找11
        		// mycall("", );
        		getNumberLength (link, ext, mycall, +num + 1);
        	} else {
        		mycall("", _tlen);
        	}
        })

    	function testLink (ceillink, testcall, isproxy) {
    		isproxy = false;
    		if (/zhengdongwuye/.test(ceillink)) {
    			isproxy = true;
    			ceillink = "https://m-tohomh123-com.mipcdn.com/i/" + ceillink.replace(/^https?:\/\//, "");
    		}
    		requestTry(ceillink, function (err, data) {
	            try {
	            	if (isproxy) {
	            		testcall("", data.statusCode != 200);
	            	} else {
	            		data = data.body.replace(/[\r\n\t]/g,"");
		                // 判断是否有404
		                testcall("", /404/.test(data));
	            	}
	            } catch (e) {
	                // 页面内部解析出错
	                testcall("", false);
	            }
	        });
    	}
    }

    // 获得图片
    function getLink(did, sid, iid, mycall) {
        requestTry("https://www.tohomh123.com/action/play/read?did=" + did + "&sid=" + sid + "&iid=" + iid, function (err, data) {
            // console.log(data.body);
            try {
                data = data.body.replace(/[\r\n\t]/g,"");
                mycall("", JSON.parse(data).Code);
            } catch (e) {
                // 页面内部解析出错
                mycall("", "http://mh1.zhengdongwuye.cn/upload/jingtanzhiye/20/0009.jpg");
                return false;
            }
        });
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

function shuffle(arr) {  
    var array = arr.concat();  
    for(var j, x, i = array.length; i; j = parseInt(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);   
    return array;  
}


// 发射弹幕
exports.setBullet = function (req, res, next) {
	var userid = req.cookies.nameid || req.query.nameid;
	// 没有登录，就直接返回吧
	if (!userid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	if (!req.query.epos || !req.query.wh || !req.query.comic || !req.query.comicid || !req.query.cindex || !req.query.v) {
		res.jsonp({ret: 1, msg: "参数错误"});
		return false;
	}
	if (req.query.epos == 0) {
		req.query.epos = req.query.wh;
	}

	if (req.query.v.length > 16) {
		res.jsonp({ret: 1, msg: "参数错误"});
		return false;
	}
	// 搞事情
    charactorsDao.queryById(function (err2, data2) {
        if (err2 || (data2 && data2.length == 0)) {
            res.jsonp({
                ret: 5,
                msg: "query error"
            });
        } else {
        	var bullets = JSON.parse(data2[0].bullets || "[]");
        	// 一个用户最多可以在一个章节发3条
        	if (userid != 1 && bullets.filter(function (ceil) {return ceil.u == userid}).length >= 5) {
        		// 不行了
        		res.jsonp({ret: 3, msg: "user max"});
        	} else {
        		// 还可以
        		// 判断吐槽的位置
        		var poi = 0;
        		if (Math.abs(req.query.epos - req.query.wh) < 100) {
        			// 是第一屏幕
        			poi = req.query.wh * Math.random() * 0.8 + req.query.wh * 0.1;
        		} else {
        			poi = Math.floor(req.query.epos - req.query.wh / 2);
        			poi = poi + Math.random() * 200 - 100;
        		}

        		bullets.unshift({
        			u: userid,
        			v: req.query.v,
        			p: Math.round(poi)
        		});
        		// 再写入db
        		charactorsDao.update(function (err3, data3) {
			        if (err3) {
			        	res.jsonp({ret: 4, msg: "user max"});
			        } else {
			        	res.jsonp({ret: 0, msg: ""});
			        }
			    }, {
			    	bullets: JSON.stringify(bullets.slice(0,100))
			    }, req.query.comic + "/" + req.query.cindex, {
			        tablename: "charactors_" + ("0" + (req.query.comicid % 100)).slice(-2)
			    });

			    // 写入basic
			    basic.get(function (err, data) {
					if (err) {
						// 记录失败
						return false;
					}
					var _t = JSON.parse(data || "[]");
					_t.unshift({
						v: req.query.v,
						comic: req.query.comic,
						comicid: req.query.comicid,
						cindex: req.query.cindex
					});
					_t = _t.slice(0, 500);
					// 继续保存
					basic.set(function (err, data) {
					}, "bulletsample", JSON.stringify(_t), 60 * 60 * 24 * 7);
				}, "bulletsample");
        	}
        }
    }, req.query.comic + "/" + req.query.cindex, {
        tablename: "charactors_" + ("0" + (req.query.comicid % 100)).slice(-2)
    });
}

// 获得弹幕信息
exports.getBullets = function (req, res, next) {
	// 必须要有开始是结束的pos
	if (!req.query.spos || !req.query.epos || !req.query.wh || !req.query.comic || !req.query.comicid || !req.query.cindex) {
		res.jsonp({ret: 1, msg: "参数错误"});
		return false;
	}
	if (req.query.epos - req.query.spos > req.query.wh) {
		req.query.spos = req.query.epos - req.query.wh;
	}
	// 实际是X轴随机, Y是确定的
	getit(function (data) {
		var _ret = [];
		data.forEach(function (ceil) {
			ceil.X = 375 * Math.random();
			ceil.direction = Math.random() > 0.5;
			ceil.Y = ceil.p; 
			if (ceil.Y > req.query.spos && ceil.Y <= req.query.epos) {
				// ceil.Y = (Math.random() > 0.5 ? ceil.Y - req.query.wh / 3 * Math.random() : ceil.Y + req.query.wh / 3 * Math.random());
				// var _z = Math.round(ceil.Y - req.query.wh / 3 * 2 * Math.random());
				// ceil.Y = _z < req.query.spos + 10 ? ceil.Y : _z;
				
				// 如果是在最下面的100像素，手动移上去
				if (req.query.epos - ceil.Y < 150) {
					ceil.Y = ceil.Y - 150;
				}
				_ret.push(ceil);
			}
		});
		res.jsonp({ret: 0, data: shuffle(_ret)});
	});
	

	function getit(callback) {
		// 获得数据
		charactorsDao.queryById(function (err2, data2) {
	        if (err2 || (data2 && data2.length == 0)) {
	            callback([]);
	        } else {
	        	var bullets = JSON.parse(data2[0].bullets || "[]");
	        	callback(bullets);
	        }
	    }, req.query.comic + "/" + req.query.cindex, {
	        tablename: "charactors_" + ("0" + (req.query.comicid % 100)).slice(-2)
	    });
		// var _t = [];
		// for (var i = 0 , len = 10; i < len; i++) {
		// 	_t.push({
		// 		Y: +req.query.spos + (req.query.epos - req.query.spos) * Math.random(),
		// 		v: "这是测试弹幕" + i
		// 	});
		// }
		// callback(_t);
	}
}

// 删除劣质弹幕
exports.delBullets = function (req, res, next) {
	// 参数要齐全
	if (!req.query.comic || !req.query.comicid || !req.query.cindex || !req.query.v) {
		res.jsonp({ret: 1, msg: "参数错误"});
		return false;
	}

	async.parallel({
    	delsample: function (ceilcall) {
    		delsample(ceilcall);
    	},
    	delreal: function (ceilcall) {
    		delreal(ceilcall);
    	}
    }, function(err, data) {
    	if (err) {
    		// 有报错
    		res.jsonp({ret: 3, msg: err});
    	} else {
    		res.jsonp({ret: 0});
    	}
    });

	// 删除弹幕sample
	function delsample (callback) {
		// 拿到弹幕信息
		basic.get(function (err, data) {
			if (err) {
	            console.log(err);
	            // 记录失败
	            callback && callback("get bullet error");
	            return false;
	        }
	        // 拿到弹幕信息
	        try {
	        	data = JSON.parse(data);
	        	// 剔除ta
	        	for (var i = 0 , len = data.length ; i < len ; i++) {
	        		if (data[i].v == req.query.v && data[i].comicid == req.query.comicid && data[i].cindex == req.query.cindex) {
	        			// 匹配到了
	        			data.splice(i, 1);
	        			break;
	        		}
	        	}
	        	// 再写入即可
	        	basic.set(function (err1, data1) {
	        		if (err1) {
			            console.log(err1);
			            // 记录失败
			            callback && callback("set bullet error");
			        } else {
			        	callback && callback("");
			        }
				}, "bulletsample", JSON.stringify(data), 60 * 60 * 24 * 7);
	        } catch(e) {
	        	callback && callback("parse error");
	        }
		}, "bulletsample");
	}
	// 真实删除
	function delreal (callback) {
		// 先获得弹幕的位置
		charactorsDao.queryById(function (err2, data2) {
	        if (err2 || (data2 && data2.length == 0)) {
	            callback && callback("query bullet error");
	        } else {
	        	var bullets = JSON.parse(data2[0].bullets || "[]");
	        	// 一个用户最多可以在一个章节发3条
	        	// if (userid != 1 && bullets.filter(function (ceil) {return ceil.u == userid}).length >= 5) {
	        	// 	// 不行了
	        	// 	res.jsonp({ret: 3, msg: "user max"});
	        	// } else {
	        		// 还可以
        		// 判断吐槽的位置
        		// var poi = 0;
        		// if (Math.abs(req.query.epos - req.query.wh) < 100) {
        		// 	// 是第一屏幕
        		// 	poi = req.query.wh * Math.random() * 0.8 + req.query.wh * 0.1;
        		// } else {
        		// 	poi = Math.floor(req.query.epos - req.query.wh / 2);
        		// 	poi = poi + Math.random() * 200 - 100;
        		// }

        		// bullets.unshift({
        		// 	u: userid,
        		// 	v: req.query.v,
        		// 	p: poi
        		// });
        		for (var i = 0 , len = bullets.length ; i < len ; i++) {
	        		if (bullets[i].v == req.query.v) {
	        			// 匹配到了
	        			bullets.splice(i, 1);
	        			break;
	        		}
	        	}
        		
        		// 再写入db
        		charactorsDao.update(function (err3, data3) {
			        if (err3) {
			        	callback && callback("update bullet error");
			        } else {
			        	callback && callback("");
			        }
			    }, {
			    	bullets: JSON.stringify(bullets)
			    }, req.query.comic + "/" + req.query.cindex, {
			        tablename: "charactors_" + ("0" + (req.query.comicid % 100)).slice(-2)
			    });
	        }
	    }, req.query.comic + "/" + req.query.cindex, {
	        tablename: "charactors_" + ("0" + (req.query.comicid % 100)).slice(-2)
	    });
	}
}

// 签到
exports.sign = function (req, res, next) {
	var userid = req.cookies.nameid || req.query.nameid;
	// 没有登录，就直接返回吧
	if (!userid) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
	// 获取这个用户的信息
	comicusersDao.queryById(function (err, data) {
		if (err) {
			// 返回异常
			res.jsonp({ret: 4, msg: "err1"});
			return false;
		}

		// 看看签到了几天了
		// console.log(data);
		var signvalue = [10, 16, 22, 28, 34, 40, 50] , nowsignindex = 0;
		data = data[0];
		// 昨天签到了
		if (data.lastsigned) {
			// 存在，再判断是否是昨天的
			//
		}
	}, userid);
}

function isYesterday(time) {
	const date = new Date();
	const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const today = `${year}/${month}/${day}`; 
    const todayTime = new Date(today).getTime(); // 当天凌晨的时间
    const yesterdayTime = new Date(todayTime - 24 * 60 * 60 * 1000).getTime(); // 昨天凌晨的时间
    return time < todayTime && yesterdayTime <= time;
}
    
// 获得所有漫画本信息
exports.getall = function (req, res, next) {
	comicsDao.queryList(function (err, data) {
		if (err) {
			res.jsonp({
				ret: 1,
				msg: "query error"
			});
		} else {
			var _t = [];
			data.data.forEach(function (ceil) {
				_t.push({
					name: ceil.name,
					z_ch_name: ceil.z_ch_name,
					indexpic: ceil.indexpic
				});
			});
			data.data = _t;
			res.jsonp({
				ret: 0,
				msg: "",
				data: data
			});
		}
	}, {}, {
		pagesize: 100000,
		sortkey: "createtime"
	});
}

const userAgents = [
    "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Acoo Browser; SLCC1; .NET CLR 2.0.50727; Media Center PC 5.0; .NET CLR 3.0.04506)",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20",
    "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.71 Safari/537.1 LBBROWSER",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 2.0.50727; Media Center PC 6.0) ,Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9",
    "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)",
    "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)",
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:2.0b13pre) Gecko/20110307 Firefox/4.0b13pre",
    "Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; fr) Presto/2.9.168 Version/11.52",
    "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; LBBROWSER)",
    "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6",
    "Mozilla/5.0 (X11; U; Linux; en-US) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.6",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)",
    "Opera/9.25 (Windows NT 5.1; U; en), Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9",
    "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36"
];
 
function randomHead() {
    return userAgents[
        Math.floor(Math.random() * (0 - userAgents.length) + userAgents.length)
    ];
}

function returnIp() {
    return (
        Math.floor(Math.random() * (10 - 255) + 255) +
        "." +
        Math.floor(Math.random() * (10 - 255) + 255) +
        "." +
        Math.floor(Math.random() * (10 - 255) + 255) +
        "." +
        Math.floor(Math.random() * (10 - 255) + 255)
    );
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

exports.proxy3 = function (req, res, next) {
	var _url = decodeURIComponent(req.query.image);
	getips(function (errip, dataip) {
		if (errip) {
			res.writeHead(302, {'Location': _url});
			res.end();
		} else {
			var nowip = getfromips(dataip);
		    if (nowip) {
		        _url = "http://" + nowip.ip + ":" + nowip.p + "/?image=" + encodeURIComponent(_url);
		    } else {
		        _url = "http://onhit.cn/sanpk/comic-proxy?image=" + encodeURIComponent(_url.replace(/^https?:\/\//, ""));
		    }
		    res.writeHead(302, {'Location': _url});
			res.end();
		}
	});
}

// 二级代理
// exports.proxy = function (req, res, next) {
// 	res.writeHead(301, {'Location': "http://onhit.cn/sanpk/comic-proxy1?image=" + encodeURIComponent(req.query.image)});
// 	res.end();
// }

exports.proxy2 = function (req, res, next) {
	var _url = decodeURIComponent(req.query.image).replace(/^https?:\/\//, "https://");
	res.writeHead(302, {'Location': _url});
	res.end();
}

// 试试代理吧
exports.proxy = function (req, res, next) {
	// // 必须要有image
	if (!req.query.image) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}

	var _url = decodeURIComponent(req.query.image);
	// 判断是不是二次代理
	if (_url.indexOf("proxy2") != -1 && _url.match(/proxy2\?image=(.+)/)) {
		_url = decodeURIComponent(_url.match(/proxy2\?image=(.+)/)[1]);
	}

	_url = /zhengdongwuye/.test(_url) ? "https://m-tohomh123-com.mipcdn.com/i/" + _url.replace(/^https?:\/\//, "") : _url;

	_url = _url.replace(/^https?:\/\//, "https://");
	var _purl = url.parse(_url);
	var options = {
	    hostname: _purl.hostname,
	    port: _purl.port,
	    path: _purl.path,
	    method: "GET",
	    headers: {
	         "Connection": "keep-alive",
	         "Pragma": "no-cache",
	         "Cache-Control": "no-cache",
	         "Upgrade-Insecure-Requests": "1",
	         "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Mobile/13F69 MicroMessenger/6.3.9 NetType/WIFI Language/zh_CN",
	         "Sec-Fetch-Mode": "navigate",
	         "Sec-Fetch-User": "?1",
	         "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
	         "Sec-Fetch-Site": "none",
	         "Accept-Encoding": "gzip",
	         "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6"
	    }
	};
	var request = https.request(options, function(response){
	    var chunks = [];
	    var size = 0;
	    response.on('data', function(chunk){
	    	chunks.push(chunk);
	        size += chunk.length;
	    });
	    response.on('end', function(){
	    	var data = Buffer.concat(chunks, size);
			// var base64Img = data.toString('base64');
	        res.set('Content-Type', 'image/jpeg');
	        res.send(data);
	    });
	});

	request.on('error', function(e) {
	    res.send({ret:1,errmsg:'problem with request: ' + e.message});
	}); 

	request.end();
	


	// request("https://mh1.zhengdongwuye.cn/pic/manhua/images/439891201888.jpg", function (err, data) {
	// 	res.set('Content-Type', 'image/jpeg');
	// 	res.send(data.body);
	// }); 

	// res.redirect(decodeURIComponent(req.query.image).replace(/^https?:\/\//, "http://"));


	// https.get(decodeURIComponent(req.query.image).replace(/^https?:\/\//, "https://"),function(picdata){
 //        var chunks = []; //用于保存网络请求不断加载传输的缓冲数据
 //        var size = 0;　　 //保存缓冲数据的总长度

 //        picdata.on('data',function(chunk){
 //            chunks.push(chunk);
 //            size += chunk.length;
 //        });
 //        picdata.on('end',function(err){
 //            var data = Buffer.concat(chunks, size);
 //            // var base64Img = data.toString('base64');
 //            res.set('Content-Type', 'image/jpeg');
 //            res.send(data);
 //        });
 //    });
}

// 获得首页数据
exports.getHomeList = function (req, res, next) {
	async.parallel({
    	chars_love: function (ceilcall) {
    		exports.getList({
    			query: {
    				cate: "恋爱",
    				length: 6,
    				shuffle: 2
    			}
    		}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	newlist: function (ceilcall) {
    		exports.getList({
    			query: {
    				type: 1,
    				length: 6
    			}
    		}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	todaylist: function (ceilcall) {exports.getList({query: {type: 2,length: 10}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	newpublishlist: function (ceilcall) {exports.getList({query: {type: 6,length: 6}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	freelist: function (ceilcall) {exports.getList({query: {type: 7,length: 6}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	chars_kb: function (ceilcall) {exports.getList({query: {cate:"猎奇",length:3,shuffle:2}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	tclist: function (ceilcall) {exports.getList({query: {type: 9,length: 6}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	key_jx: function (ceilcall) {exports.getList({query: {key:"jx",length:6,shuffle:2}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	key_sn: function (ceilcall) {exports.getList({query: {key:"sn",length:4,shuffle:2}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	key_hot: function (ceilcall) {exports.getList({query: {key:"hot",length:4,shuffle:2}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    	banners: function (ceilcall) {exports.getbanner({query: {length: 4}}, {
    			jsonp: function (data) {
    				ceilcall("", data.ret == 0 && data.data ? data.data : []);
    			}
    		});
    	},
    }, function(err, data) {
    	res.jsonp({ret: 0, data: data});
    });
}

// 获得列表
exports.getList = function (req, res, next) {
	// 可以获得全部的，也可以按类型获取（默认是全部）
	// 可以按照最新更新获取，也可以按照最热获取（todo，也可以有一个当天热度，本周热度）（默认是最热）
	var cate = req.query.cate && req.query.cate != "undefined" ? req.query.cate : "";
	var type = req.query.type && req.query.type != "undefined" ? req.query.type : ""; // 0 或空是 最热，1 是最新，2 是当天，3是本周，4是自己看过的，5是查询自己的, 6是新上架，7是查询免费的！, 8 是已完结, 9是最新吐槽
	var key = req.query.key && req.query.key != "undefined" ? req.query.key : "";
	var myshuffle = req.query.shuffle && req.query.shuffle != "undefined" ? req.query.shuffle : "";
	var pageindex = req.query.pageindex && req.query.pageindex != "undefined" ? req.query.pageindex : "";
	var length = req.query.length && req.query.length != "undefined" ? req.query.length : "";
	// 如果是查询自己的
	if (type == 5) {
		exports.queryComic(req, res, next);
	} else {
		// 获得列表
		comiclist.getlist(function (data) {
			if (length) {
				data.data = data.data.slice(0, length);
			}
			// 来吧，再加一个东东
			data.data.forEach(function (ceil) {
				ceil.flag = ceil.name.indexOf("youma") != -1 ? "Y" : ceil.name.indexOf("pufei") != -1 ? "P" : ceil.name.indexOf("duoduo") != -1 ? "DD" : ceil.name.indexOf("yiyi") != -1 ? "YY" : ceil.name.indexOf("vi--") != -1 ? "VI" : ceil.name.indexOf("manmankan--") != -1 ? "K" : ceil.name.indexOf("tutu") != -1 ? "U" : ceil.name.indexOf("manhuadb") != -1 ? "B" : ceil.name.indexOf("mh1234") != -1 ? "M" : ceil.name.indexOf("dfvcb") != -1 ? "D" : ceil.name.indexOf("gm--") != -1 ? "G" : ceil.name.indexOf("mt--") != -1 ? "MT" : ceil.name.indexOf("dy--") != -1 ? "DY" : ceil.name.indexOf("gf--") != -1 ? "GF" : "T";
			});
			res.jsonp(data);
		}, {
			cate: cate,
			type: type,
			key: key,
			myshuffle: myshuffle,
			pageindex: pageindex,
			length: length
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