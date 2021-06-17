var express = require('express');
var router = express.Router();
var https = require("https");
var http = require("http");
var url = require("url");
var request = require("request");
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
	_url = "http://" + _url.replace(/^https?:\/\//, "");
	// var _purl = url.parse(_url);
	var options = {
        url: _url,
	    // hostname: _purl.hostname,
	    // port: _purl.port,
	    // path: _purl.path,
	    method: "GET",
        timeout: 8000,
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

    function doback () {
        try {
            req.query.times = /^\d+$/.test(req.query.times) ? req.query.times : 0;
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
        doback();
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
