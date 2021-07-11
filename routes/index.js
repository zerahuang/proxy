var express = require('express');
var router = express.Router();
var https = require("https");
var http = require("http");
var url = require("url");
var request = require("request");
var fs = require("fs");
var path = require("path");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
global.errortimes = 0;
/* GET home page. */
router.get('/', function(req, res, next) {
	var routeFunc = arguments.callee;
	if (req.headers.referer) {
	var referer = url.parse(req.headers.referer);
	if (!(referer.hostname == "onhit.cn" || referer.hostname == "taie.fun" || (referer.hostname == "servicewechat.com"))) {
		res.jsonp({ret: 1, msg: "403"});
		return false;
	}
	}

	if (!req.query.image) {
		res.jsonp({ret: 1, msg: "param err"});
		return false;
	}
    var _url = decodeURIComponent(req.query.image);
	_url = "https://" + _url.replace(/^https?:\/\//, "");
	
    // 判断是否需要本地
    if (req.query.path) {
        // var baseUrl = '/Users/huangshaolu/Documents/comics';
        var baseUrl = '/opt/comics';
        try {
            var _pic = fs.statSync(baseUrl + "/" + decodeURIComponent(req.query.path));
            // 有之
            // 判断大小，如果是0size，就当没有
            if (!_pic.size) {
                // 空的
                throw new Error('size Error')
                return false;
            }
            res.set('Content-Type', 'image/jpeg');
            // res.set('Accept-Ranges', 'bytes');
            // res.set('Cache-Control', 'public, max-age=0');
            // res.set('Connection', 'keep-alive');
            // res.set('Date', 'Wed, 30 Jun 2021 02:45:45 GMT');
            // res.set('ETag', 'W/"2ef64-17a51ea4897"');
            // res.set('Last-Modified', 'Mon, 28 Jun 2021 09:19:06 GMT');

            res.sendFile(baseUrl + "/" + decodeURIComponent(req.query.path));
            // fs.createReadStream(baseUrl + "/" + decodeURIComponent(req.query.path)).pipe(res);
            return true;
        } catch (e) {
            // 判断是否要给模板
            if (global.hmng) {
                // 韩漫不可用，就不直接返回了
                res.sendFile(path.join(process.cwd(), "./public/images/ng.jpg"));
            } else {
                // 没有的，就302
                res.writeHead(302, {'Location': _url + (_url.indexOf('?') != -1 ? '&' : '?') + "_t=" + Math.round(new Date().getTime() / (1000 * 60 * 5))});
                res.end();
            }
        }
        return false;
    }
	// var _purl = url.parse(_url);
	var options = {
        url: _url,
	    // hostname: _purl.hostname,
	    // port: _purl.port,
	    // path: _purl.path,
	    method: "GET",
        timeout: 8000,
        pool: {maxSockets: Infinity},
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

    if (_url.indexOf('xikami') != -1) {
        options.headers["Referer"] = "https://www.05mh.com/";
    }
    
    function doback (ishm) {
        try {
            req.query.times = /^\d+$/.test(req.query.times) ? req.query.times : 0;
            if (!ishm) {
                setTimeout(function () {
                  // 判断一下是否需要重启
                  if (global.errortimes >= 10) {
                    // 需要重启
                    console.log("需要重启");
                    var a = null;
                    a.b;
                  } else {
                    global.errortimes++;
                    console.log("global.errortimes=" + global.errortimes);
                  }
                }, 10);
            } else {
                console.log("韩漫无需记录");
            }
            
            if (req.query.times >= 2) {
                // 3次了，直接403
                res.writeHead(403);
                res.end();
            } else {
                res.writeHead(302, {'Location': "http://onhit.cn/sanpk/comic-proxy3?image=" + encodeURIComponent(_url.replace(/^https?:\/\//, "")) + "&times=" + (+req.query.times + 1)});
                res.end();
            }
        } catch(e) {
            console.log(e, 'timeout');
        }
    }

    request(options).on('error', function(err) {
        console.log(err);
        var _t = err.toString();
        console.log(222, _t, 111);
        doback(_t && _t.indexOf("-104") != -1);
    }).pipe(res);
    
    // var _t = request(options, function (error, response, body) {
    //     // if (!error && response.statusCode == 200) {
    //     //     res.set('Content-Type', 'image/png;');
    //     //     console.log("body",body);
    //     //     res.send(body);
    //     // }
    //     _t.pipe(res);
    // });

 //    var request_timer = null;
	// var request = http.request(options, function(response){
 //        // 取消
 //        clearTimeout(request_timer);
 //        // 等待响应60秒超时
 //        var response_timer = setTimeout(function() {
 //            request.destroy();
 //            console.log('Response Timeout.');
 //            // 判断一下是要302，还是要403
 //            // req.query.times = /^\d+$/.test(req.query.times) ? req.query.times : 0;
 //            // if (req.query.times >= 3) {
 //                // 3次了，直接403
 //                // res.writeHead(403);
 //                // res.end();
 //            // } else {
 //            //     res.writeHead(302, {'Location': "http://onhit.cn/sanpk/comic-proxy3?image=" + encodeURIComponent(_url.replace(/^https?:\/\//, "")) + "&times=" + (+req.query.times + 1)});
 //            //     res.end();
 //            // }
 //        }, 8000);

	// 	if (response && response.headers && response.headers.location) {
 //            req.query.image = response.headers.location;
 //            routeFunc(req, res, next);
 //        } else {
 //            var chunks = [];
 //            var size = 0;
 //            response.on('data', function(chunk){
 //                chunks.push(chunk);
 //                size += chunk.length;
 //            });
 //            response.on('end', function(){
 //                clearTimeout(response_timer);
 //                var data = Buffer.concat(chunks, size);
 //                res.set('Content-Type', 'image/jpeg');
 //                res.send(data);
 //            });
 //       	}
	// });

 //    // 请求5秒超时
 //    request_timer = setTimeout(function() {
 //        request.abort();
 //        console.log('Request Timeout.');
 //    }, 5000);

	// request.on('error', function(e) {
 //        clearTimeout(request_timer);
 //        request.abort();
	//     // res.send({ret:1,errmsg:'problem with request: ' + e.message});
 //        req.query.times = /^\d+$/.test(req.query.times) ? req.query.times : 0;
 //        // if (req.query.times >= 3) {
 //            // 3次了，直接403
 //            res.writeHead(403);
 //            res.end();
 //        // } else {
 //        //     res.writeHead(302, {'Location': "http://onhit.cn/sanpk/comic-proxy3?image=" + encodeURIComponent(_url.replace(/^https?:\/\//, "")) + "&times=" + (+req.query.times + 1)});
 //        //     res.end();
 //        // }
	// }); 

	// request.end();
});

module.exports = router;
