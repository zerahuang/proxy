var express = require('express');
var router = express.Router();
var https = require("https");
var url = require("url");
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
    var request_timer = null;
	var request = https.request(options, function(response){
        // 取消
        clearTimeout(request_timer);
        // 等待响应60秒超时
        var response_timer = setTimeout(function() {
            request.destroy();
            console.log('Response Timeout.');
            res.writeHead(403);
            res.end();
        }, 8000);

		if (response && response.headers && response.headers.location) {
            req.query.image = response.headers.location;
            routeFunc(req, res, next);
        } else {
            var chunks = [];
            var size = 0;
            response.on('data', function(chunk){
                chunks.push(chunk);
                size += chunk.length;
            });
            response.on('end', function(){
                clearTimeout(response_timer);
                var data = Buffer.concat(chunks, size);
                res.set('Content-Type', 'image/jpeg');
                res.send(data);
            });
       	}
	});

    // 请求5秒超时
    request_timer = setTimeout(function() {
        request.abort();
        console.log('Request Timeout.');
    }, 5000);

	request.on('error', function(e) {
	    // res.send({ret:1,errmsg:'problem with request: ' + e.message});
        res.writeHead(403);
        res.end(); 
	}); 

	request.end();
});

module.exports = router;
