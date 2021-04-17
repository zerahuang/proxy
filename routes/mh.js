// 引用dao
var async = require("async");
var path = require("path");
var fs = require('fs');
// 引用route
var comicRoute = require("./comic");
var pageRoute = require("./page");
var basic = require("../model/basic");

// 首页
exports.index = function (req, res, next) {
	comicRoute.getList({
		query: {
			type: 2,
			length: 50
		}
	}, {
		jsonp: function (data) {
			data.baiduSiteVerification = req.headers.host == "onhit.cn" ? "JobgqTcIrr" : "s1xvYsfQO5";
			data.domainhost = req.headers.host;
			if (!(data && data.data && data.data.length)) {
				data.data = [];
			}

			// 还需要获得当前的吐槽列表
			basic.get(function (err, tdata) {
	            if (err) {
	            	data.tclist = [];
	                // 记录失败
	                res.render("home", data);
	                return false;
	            }
	            var _t = JSON.parse(tdata || "[]");
	            // 如果有多条，则取最新的一条就好了
	            // 根据吐槽信息查询
	            var _tclist = [], _tobj = {};
	            _t.forEach(function (ceil, index) {
	                if (!_tobj[ceil.comic]) {
	                    _tobj[ceil.comic] = 1;
	                    ceil.index = index;
	                    _tclist.push(ceil.v);
	                }
	            });
	            data.tclist = _tclist;
	            res.render("home", data);
	        }, "bulletsample");
		}
	});
}

// 目录页
exports.comicindex = function (req, res, next) {
	pageRoute.getcomic({
		query: {
			comic: req.query.comic
		},
		headers: {
			referer: "https://onhit.cn/"
		},
		cookies: {}
	}, {
		jsonp: function (data) {
			if (data && data.data) {
				res.render("comicindex", data);
			} else {
				res.render("comicindex", {data: {charas:[]}});
			}
		}
	});
}

// 漫画页
exports.comic = function (req, res, next) {
	// 一定要有
	pageRoute.getcharsinfo({
		query: {
			comic: req.query.comic,
			comic_index: req.query.cindex
		},
		headers: {
			referer: "https://onhit.cn/"
		},
		cookies: {}
	}, {
		jsonp: function (data) {
			if (data && data.data) {
				res.render("comic", data);
			} else {
				res.render("comic", {data: {charainfo:{
					urls: []
				}}});
			}
		}
	});
}