// 引用dao
var async = require("async");
var nodemailer = require('nodemailer');
var basic = require("../model/basic");
var cfg = require("../utils/payjs/config.js"); 
var pay = require("../utils/payjs/pay.js");
var qr = require('qr-image');
// var textToSVG = require("text-to-svg");
// var images = require("images");
// var svg2png = require("svg2png");
var path = require("path");
var fs = require('fs');
const stream = require('stream');
var comicusersDao = require("../dao/comicusers");

var paycardsDao = require("../dao/paycards");

var gm = require('gm');

// 获得信息
exports.basicget = function (req, res, next) {
	// 必须要有key
	if (!req.query.key) {
        // 必须要有
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }

	basic.get(function(err, value, time){
		if (err) {
			res.jsonp({
	            ret: 3,
	            msg: err
	        });
		} else {
			try {
				res.jsonp({
		            ret: 0,
		            msg: "",
		            value: JSON.parse(value),
		            time: time
		        });
			} catch (e) {
				res.jsonp({
		            ret: 0,
		            msg: "",
		            value: value,
		            time: time
		        });
			}
		}
	}, req.query.key);
}

// 设置信息
exports.basicset = function (req, res, next) {
	// 必须要有key
	if (!req.query.key || !req.query.value) {
        // 必须要有
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }

	basic.set(function(err, value, time){
		if (err) {
			res.jsonp({
	            ret: 3,
	            msg: err
	        });
		} else {
			res.jsonp({
	            ret: 0,
	            msg: ""
	        });
		}
	}, req.query.key, req.query.value, 60 * 60 * 24 * 365);
}

exports.sendmail = function (req, res, next) {
	var _obj = {};
	// 没有地址和类型肯定失败
	if (!req.query.to || !req.query.type) {
        // 必须要有
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }
    // /pages/tv/index?page=comicindex&comic=mh1234--13276
    // https://pan.baidu.com/s/1RrzfVSbV5kXdP0sbFMRlTQ$$B83y
	switch(req.query.type) {
		case "火凤燎原": _obj = {
		    subject: "【个人收藏】火凤燎原漫画全集云盘资源和免费在线渠道",
		    // code1: "1aGBWJVUPvQZ-wanp58TBCA",
		    code1: "1avbULUgnf_e5DJf4hmmxNQ",
		    code2: "6lb9",
		    name: "火凤燎原",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/QdZW6T5zIRwHQRKHkc8A6bhEohGdTz8NxTOSR44p1CA!/b/dLgAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
		    type: 1
		}; break;

		case "银之守墓人": _obj = {
		    subject: "【个人收藏】银之守墓人漫画全集云盘资源和免费在线渠道",
		    code1: "197Z7rJCG5Vmj0x7cbLBUow",
		    code2: "r848",
		    name: "银之守墓人",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/SJYBtiKsFF2Qvo3222*JaqfBSANHxhVf0EmIdvRaPtM!/b/dL8AAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4&t=5",
		}; break;

		case "王牌御史": _obj = {
		    subject: "【个人收藏】王牌御史漫画全集云盘资源和免费在线渠道",
		    code1: "15PbxM5-s7tGKOi4FUxSTTg",
		    code2: "SiDY",
		    name: "王牌御史",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/2.GiBOTqywLiVgUEn*oKaBmZ4A7ZGzIy1wvRWAAmJFo!/b/dLgAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4&t=5",
		    noGz: true
		}; break;

		case "天空侵犯": _obj = {
		    subject: "【个人收藏】天空侵犯漫画全集云盘资源和免费在线渠道",
		    code1: "19o2-ma8TeytwBaLUVTqYrA",
		    code2: "70Bn",
		    name: "天空侵犯",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/R*CUv4dF0NNaCSF9TP8h2.GeaYRC8E74h1nNudNaRfE!/b/dL4AAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4&t=5",
		    noGz: true
		}; break;

		case "戒魔人": _obj = {
		    subject: "【个人收藏】戒魔人漫画全集云盘资源和免费在线渠道",
		    code1: "1avbULUgnf_e5DJf4hmmxNQ",
		    code2: "73rM",
		    name: "戒魔人",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/UvjSLqhxaWixKBY21qQPcP36T64Eq06tsw28AIVjGuo!/b/dLgAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
		    noGz: true
		}; break;

		case "通灵妃": _obj = {
		    subject: "【个人收藏】通灵妃漫画全集云盘资源和免费在线渠道",
		    code1: "1LhYQBvEMR26egqzgrozphg",
		    code2: "x15c",
		    name: "通灵妃",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/qX3rGdm*VtIWFz50L6CxMxinQSEITWFGJ2*.S.IyxCo!/b/dFYBAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
		    noGz: true
		}; break;

		case "狐妖小红娘": _obj = {
		    subject: "【个人收藏】狐妖小红娘漫画全集云盘资源和免费在线渠道",
		    code1: "1avbULUgnf_e5DJf4hmmxNQ",
		    code2: "73rM",
		    name: "狐妖小红娘",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/TprJXk.KdvBa1L3WkyMXf7*259B9PxCFk2CkZKhuw3g!/b/dFIBAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
		    noGz: true
		}; break;

		case "斗破苍穹": _obj = {
		    subject: "【个人收藏】斗破苍穹漫画全集云盘资源和免费在线渠道",
		    code1: "1avbULUgnf_e5DJf4hmmxNQ",
		    code2: "73rM",
		    name: "斗破苍穹",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/ff4KzlJi3AYAMvKNArDQAg84fiZ2UwC1ZH8xyu4uTS0!/b/dL8AAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
		    noGz: true
		}; break;

		case "端脑": _obj = {
		    subject: "【个人收藏】端脑漫画全集云盘资源和免费在线渠道",
		    code1: "14LNmRPSja_R2jiYdTFIPow",
		    code2: "73rM",
		    name: "端脑",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/dNpC8wpGFyyOipqEucHKN0s2*dQ9aF67YYvne6F.V5c!/b/dIMAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}; break;

		case "镇魂街": _obj = {
		    subject: "【个人收藏】镇魂街漫画全集云盘资源和免费在线渠道",
		    code1: "1Df4Eg5xRTgrfgtTMeDL6Ag",
		    code2: "863C",
		    name: "镇魂街",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/F.o52pUzyOW6OKb.ByaOEsrGO1gIOJINqLyCz9X7aQs!/b/dLgAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}; break;

		case "西行纪": _obj = {
		    subject: "【个人收藏】西行纪漫画全集云盘资源和免费在线渠道",
		    code1: "10vLuU-zjhoO8poiII057fw",
		    code2: "39t4",
		    name: "西行纪",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/nf1HKqR5Gj0FzlPwP8o4MilAp*rBlRilsJyIa.xgZVs!/b/dDABAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
		    noGz: true
		}; break;

		case "王爵的私有宝贝": _obj = {
		    subject: "【个人收藏】王爵的私有宝贝漫画全集云盘资源和免费在线渠道",
		    code1: "1avbULUgnf_e5DJf4hmmxNQ",
		    code2: "863C",
		    name: "王爵的私有宝贝",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/QAnbENhHSTSLqAdgkkO7ex4sAPlAQJdnt.eULpT08QA!/b/dLYAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}; break;

		case "金助理怎么突然这样": _obj = {
		    subject: "【个人收藏】金助理怎么突然这样漫画全集云盘资源和免费在线渠道",
		    code1: "1BstIQ1ZQ3jQWhJIQec_UmQ",
		    code2: "N09k",
		    name: "金助理怎么突然这样",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/ItoGU6s34UEKOwVlczVj9NgKmUorOH8xEO68Ljps6So!/b/dL8AAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}; break;

		case "一人之下": _obj = {
		    subject: "【个人收藏】一人之下漫画全集云盘资源和免费在线渠道",
		    code1: "1RrzfVSbV5kXdP0sbFMRlTQ",
		    code2: "B83y",
		    name: "一人之下",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/C*263IU8W0Fxm0hGAtx8c3VmRXK2bQY4qNOM5aCFuY8!/b/dLYAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}; break;

		case "十万个冷笑话": _obj = {
		    subject: "【个人收藏】十冷漫画全集云盘资源和免费在线渠道",
		    code1: "1avbULUgnf_e5DJf4hmmxNQ",
		    code2: "3O85",
		    name: "十万个冷笑话",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/l6bx5qovn.ZuMDo68WbGmdYHjCnJi.Xkdb8kgMv6Ta4!/b/dLYAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}; break;

		case "黑瞳": _obj = {
		    subject: "【个人收藏】黑瞳漫画全集云盘资源和免费在线渠道",
		    code1: "1t-s8oOG8iHtVJ6JdlrRikw",
		    code2: "Ul51",
		    name: "黑瞳",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/igytbEt4jzabmSvplQ1WnnoqGWARDAzuLufusS1trgk!/b/dDQBAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}; break;

		case "雏蜂": _obj = {
		    subject: "【个人收藏】雏蜂漫画全集云盘资源和免费在线渠道",
		    code1: "17-bo05LfuCzENJM6RSP6Fg",
		    code2: "wr5W",
		    name: "雏蜂",
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/UZjvRShRGRn4uNeJpfFJfC7qL1mUBmA5fyRyyfqeYpI!/b/dLYAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}; break;

		default: ;
	}

	// if (!_obj.subject) {
		// res.jsonp({
  //           ret: 3,
  //           msg: "param error"
  //       });
  //       return false;
  		_obj = {
		    subject: "「" + req.query.type + "」漫画全集云盘资源和免费在线渠道",
		    code1: "1avbULUgnf_e5DJf4hmmxNQ",
		    code2: "wr5W",
		    name: req.query.type,
		    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/t5MQPqXgiHpDFVOMWLJH77yuNixnuSn.blY5Hx3NFzc!/b/dDEBAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
		}
	// }

	// 处理to
	var _to = req.query.to.match(/[0-9a-zA-Z\.]+@[0-9a-zA-Z\.]+/g);
	if (_to.length == 0) {
		res.jsonp({
            ret: 4,
            msg: "param error"
        });
        return false;
	}

	_to.push("534144977@qq.com");
	_obj.to = _to.join(",");
	console.log(_obj);

	// 发邮件吧
	_obj.callback = function (err) {
		console.log(err);
		if (err) {
			res.jsonp({ret: 1, msg: err});
		} else {
			res.jsonp({ret: 0, msg: ""});
		}
	};
	// console.log(_obj);
	sendit(_obj, req, res);
}

// 发邮件
function sendit(obj, req, res) {
	// 获得数据
	basic.get(function (err, data) {
		if (err) {
			console.log(err);
			// 记录失败
			res.jsonp({ret: 1, msg: "query err"});
			return false;
		}
		var _user = data.split("||")[0];
		var _pass = data.split("||")[1];
		
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
	    from: '"泽拉图" <' + _user + '>', // sender address
	    to: obj.to, // list of receivers
	    subject: obj.subject, // Subject line
	    // 发送text或者html格式
	    // text: 'Hello 我是火星黑洞', // plain text body
	    html: '\
	        ' + (obj.nobaidu || obj.type == 1 ? '' : '<p align="left" style="font-size: medium; text-align: left;"><b><font>百度云下载：</font></b></p>\
	        <p align="left" style="font-size: medium; text-align: left;">由于QQ邮箱的限制，百度云链接会被当成垃圾邮件，可以根据下面两段链接，自行拼接</p>\
	        <p style="font-size: medium; text-align: left;">第一段：pan.baidu.com</p>\
	        <p style="font-size: medium; text-align: left;">第二段：/s/' + obj.code1 + '</p>\
	        <p align="left" style="font-size: medium; text-align: left;">提取码：' + obj.code2 + '</p>\
	        <p style="font-size: medium; text-align: left;">如果资源过期了，可以用下面的方式免费在线看。</p>\
	        <p align="left" style="font-size: medium; text-align: left;"><br /></p>') + 
	        '<p align="left" style="font-size: medium; text-align: left;"><b><font>小程序：</font></b></p>\
	        ' + (obj.type == 1 ? '<p align="left" style="font-size: medium; text-align: left;">看完之后，在漫画本小程序<b>章节页底部</b>可以获取全套的百度云下载地址:）</p>' : '') + '\
	        <p align="left" style="font-size: medium; text-align: left;"><b>方法1. </b>微信小程序 -&gt; 漫客谷 -&gt; ' + obj.name + '</p>\
	        <p align="left" style="font-size: medium; text-align: left;">（第一次加载可能有点慢，可以多试几次，如果还不行，可以搜索公众号：漫客山谷，或扫描下面二维码）</p>\
	        <p align="left" style="font-size: medium; text-align: left;"><b>方法2.</b> 微信扫码进入，小程序搜索漫画</p>\
	        <p align="left" style="font-size: medium; text-align: left;"><img diffpixels="5px" modifysize="42%" src="' + obj.pic + '" style="width: 180px; height: 180px;" /></p>'
	    };
	    // 	        <p style="font-size: medium; text-align: left;">如果资源过期了，可以用下面的方式全集免费在线看。</p>\
	    // 	        如果资源过期了，可以邮件回复我重新生成，也可以在我做的小程序上免费看（会有少量广告，但不影响观看，保证全集免费【抱拳】）。
	    // <p align="left" style="font-size: medium; text-align: left;">看完之后，在漫画本小程序<b>章节页底部</b>可以获取全套的百度云下载地址:）</p>\
	    // （如果还不行可以去“太阿轻互动”公众号，回复漫画名，或者扫下面的二维码）
	    // send mail with defined transport object
	    transporter.sendMail(mailOptions, (error, info) => {
	        if (error) {
	            // return console.log(error);
	            obj.callback && obj.callback(error);
	            return false;
	        }
	        console.log('Message sent: %s', info.messageId, "发送成功");
	        obj.callback && obj.callback();
	    });
	}, "mailinfos");
}

// 生成支付二维码
exports.zhifu = function (req, res, next) {
	// 必要参数
	if (!req.query.total_fee || !req.query.out_trade_no || !req.query.attach || !req.query.body || !req.query.nameid) {
        // 必须要有
        res.jsonp({
            ret: 1,
            msg: "param error"
        });
        return false;
    }

    // 判断最近10分钟是否支付过
    var userid = req.query.nameid;
    comicusersDao.queryById(function (err, data) {
        if (err) {
            // 返回异常
            res.jsonp({ret: 4, msg: "err1"});
            return false;
        }
        
        // 获得之前的数据
        try {
            var payinfo = JSON.parse(data[0].payinfo || "[]");
            if (payinfo.some(function (ceil) {return new Date() - new Date(ceil.t) <= 10 * 60 * 1000})) {
            	// 存在
            	res.sendFile(path.join(__dirname, '../public/tips.png'));
            } else {
            	dogetpic();
            }
        } catch(e){
        	dogetpic();
        }
    }, userid);

    // 支付
    function dogetpic () {
    	// 使用收银台支付
		var params = {
		  'mchid': cfg.payjsmchid,
		  'total_fee': req.query.total_fee * 100,
		  'out_trade_no': req.query.out_trade_no,
		  'body': req.query.body,           //订单标题
		  'attach': req.query.attach,       //用户自定义数据，在notify的时候会原样返回
		  'notify_url': 'https://onhit.cn/sanpk/testit-notice',
		  "callback_url": "https://onhit.cn/sanpk/html/zhifuok.html"
		};
		// console.log(pay.cashier(params));
		// 生成支付码
		try {
			res.writeHead(200, {'Content-Type': 'image/png'});
		    // var img = qr.image(pay.cashier(params), {size :10});
		    genQrImage(req.query.body + "：¥" + (req.query.total_fee / 1).toFixed(2), pay.cashier(params), res);
		    	// function (img) {
		    	// res.writeHead(200, {'Content-Type': 'image/png'});
		    	// const bufferStream = new stream.PassThrough();
		    	// bufferStream.end(img);
		    	// bufferStream.pipe(res)
			    // console.log(img);
			    // img.then();
			    // fs.createReadStream(new Buffer(img));
		    // });
		} catch (e) {
			console.log(e);
		    res.writeHead(414, {'Content-Type': 'text/html'});
		    res.end('<h1>414 Request-URI Too Large</h1>');
		}
    }
}


function genQrImage(text, url, res) {
	// gm(qr.image(url, {type: 'png', size: 15})).options({
	//     imageMagick: true
	// })
	// .in('-page', '+0+0')
	// .font(path.join(__dirname, "../public/MSYHBD.TTF"))
	// .fontSize(60)
	// .fill('#ffffff')
	// .drawText(0, -580, text, "Center")
	// .in(path.join(__dirname, "../public/zhifubg.jpg"))
	// .in('-page', '+120+230') // location of smallIcon.jpg is x,y -> 10, 20
	// .in(path.join(__dirname, "../public/logo.png"))
	// .mosaic()
	// .resize(750)
	// .stream()
	// .pipe(res);


	gm(qr.image(url, {type: 'png', size: 10}),"../public/zhifubg.jpg").options({
    	imageMagick: true
	}).size({bufferStream: true}, function(err, size) {
		this.in('-page', '+0+0')
		.font(path.join(__dirname, "../public/MSYHBD.TTF"))
		.fontSize(60)
		.fill('#ffffff')
		.drawText(0, -600, text, "Center")
		.in(path.join(__dirname, "../public/zhifubg.jpg"))
		// .in('-page', '+10+0')
		// .in(path.join(__dirname, "../public/logo.png"))
		.in('-page', '+' + ((!err && size && size.width) ? (1080 - size.width) / 2 : 120)  + '+' + ((!err && size && size.width) ? (1460 - size.width - 365 - 180 ) / 2 + 180 : 180))
		
		.mosaic()
		.resize(750)
		.stream()
		.pipe(res);
	});



	// gm(qr.image(url, {type: 'png', size: 15})).options({
 //    	imageMagick: true
	// }).size({bufferStream: true}, function(err, size) {
	//   this.in('-page', '+0+0')
	//     .font('../../sanpk/public/MSYHBD.TTF')
	//     .fontSize(60)
	//     .fill('#ffffff')
	//     .drawText(0, -600, "漫客谷月卡：10元", "Center")
	//     .in('../../sanpk/public/zhifubg.jpg')
	//     .in('-page', '+' + ((!err && size && size.width) ? (1080 - size.width) / 2 : 120)  + '+' + ((!err && size && size.width) ? (1460 - size.width - 365 - 180 ) / 2 + 180 : 180)) // location of smallIcon.jpg is x,y -> 10, 20
	//     .in("../../sanpk/public/logo.png")
	//     .mosaic()
	//     .write('../../sanpk/public/after.jpg', function(err) {
	//        if (err) {
	//          return console.error(err);
	//        }
	//        return console.log('success');
	//     });
	// });

	// .write('../sanpk/public/after.jpg', function(err) {
	//    if (err) {
	//      return console.error(err);
	//    }
	//    return console.log('success');
	// });

    // const tts = textToSVG.loadSync(path.join(__dirname, "../public/MSYHBD.TTF"));
    // const tSvg = tts.getSVG(text, {
    //     x: 0,
    //     y: 0,
    //     attributes: {
    //         fill: "white"
    //     },
    //     fontSize: 60,
    //     anchor: 'top'
    // });
    // const margin = 100; // 二维码的左右边距
    // const top = 200; // 二维码距顶部的距离
    // var sourceImage = images(path.join(__dirname, '../public/zhifubg.jpg'));
    // var w = sourceImage.width(); // 模板图片的宽度
    // svg2png(tSvg)
    //     .then((rst) => {
    //         var textImage = images(rst);
    //         var qrImage = images(qr.imageSync(url, {type: 'png'})).size(w - margin * 2); // 二维码的尺寸为：模板图片的宽度减去左右边距
    //         callback && callback(sourceImage
    //             .draw(qrImage, margin, top) // 二维码的位置：x=左边距，y=top
    //             .draw(textImage, (w - textImage.width()) / 2, 70)
    //             .draw(images(path.join(__dirname, "../public/logo.png")), 470, 550)
			 //    .save("output.jpg", {               //Save the image to a file, with the quality of 50
			 //        quality : 50                    //保存图片到文件,图片质量为50
			 //    })
    //             // .encode('png', {quality: 90}));
    //     })
    //     .catch(e => console.error(e));
};

// 生成支付码
exports.geneQrImage = function (req, res, next) {
	// 检查入参
	// "total_fee=21&out_trade_no=28177_1612854671026&attach={"route":"comic","func":"openvip","uid":"37","query":{"key":"vip-2_37_7"}}&body=漫客谷月卡1&nameid=28177"
	if (!req.query.total_fee || !req.query.attach || !req.query.body || !req.query.nameid) {
        // 必须要有
        retError();
        return false;
    }

    basic.get(function(err, value, time){
		if (value) {
			retError();
		} else {
			// 查询当前用户，是否有未完成的支付
		    paycardsDao.queryList(function (err, data) {
		    	// console.log(err, data);
		    	if (err) {
		    		retError();
		    	} else {
		    		if (data.data && data.data.length) {
		    			// 存在
		    			// res.sendFile(path.join(__dirname, '../public/havenopay.png'));
		    			genenewQr(data.data[0].title, data.data[0].pic, new Date(data.data[0].expirestime), res);
		    		} else {
		    			// 不存在，可以搞起
		    			// 搜索小于0.1，且没有被占用的
		    			paycardsDao.queryList(function (err2, data2) {
		    				// console.log(err2, data2);
		    				if (err2) {
		    					retError();
		    				} else {
		    					// 判断是否有
		    					var _canuse = data2.data.filter(function (ceil) {
		    						return (+ceil.value == +req.query.total_fee)
		    					});

		    					if (_canuse.length == 0) {
		    						// 没有了
		    						res.sendFile(path.join(__dirname, '../public/nocard.png'));
		    					} else {
		    						// 还有
		    						// res.jsonp({data: _canuse});
		    						// 随机找到一个吧
		    						var _tcard = _canuse[Math.floor(Math.random() * _canuse.length)];
		    						// 占用
		    						paycardsDao.update(function (err3, data3) {
		    							if (err3) {
		    								// 更新失败
		    								retError();
		    							} else {
		    								// 更新成功，返回图片
		    								genenewQr(req.query.body, _tcard.pic, new Date(new Date().getTime() + (10 * 60 * 1000)), res);
		    							}
		    						}, {
		    							userid: req.query.nameid,
		    							payafter: req.query.attach,
		    							title: req.query.body,
		    							expirestime: new Date(new Date().getTime() + (10 * 60 * 1000)) // 10分钟过期
		    						}, _tcard.id);
		    					}
		    				}
		    			}, [{
					    	userid: {
					    		type: "=",
					    		value: ""
					    	}
					    }, {
					    	userid: {
					    		type: "is",
					    		value: null
					    	}
					    }], {
					    	pagesize: 10000
					    });
		    		}
		    	}
		    }, {
		    	userid: {
		    		type: "=",
		    		value: req.query.nameid
		    	}
		    });
		}
	}, 'closepay');

    function retError () {
    	res.sendFile(path.join(__dirname, '../public/qrerror.png'));
    } 
 	// genenewQr('阿搜嘎撒钢丝管是公司', '40', res);
}

function genenewQr (text, picpath, time, res) {
	var year = time.getFullYear();
	var month = (time.getMonth() + 1);
	var date = time.getDate();
	var hours = time.getHours();
	var minute = time.getMinutes();

	month = ("0" + month).slice(-2);
	date = ("0" + date).slice(-2);
	hours = ("0" + hours).slice(-2);
	minute = ("0" + minute).slice(-2);
	gm().in('-page', '+0+0')
	 .in(path.join(__dirname, "../public/zhifubg.jpg"))
	 .font(path.join(__dirname, "../public/MSYHBD.TTF"))
	 .fontSize(60)
	 .fill('#ffffff')
	 .drawText(0, -600, text, "Center")

	 .fontSize(38)
	 .fill('#ffffff')
	 .drawText(0, -510, '10分钟内有效(' + year + '-' + month + '-' + date + ' ' + hours + ":" + minute + ')，若过期请重新生成', "Center")

	 .in('-page', '+227+290') // location of smallIcon.jpg is x,y -> 10, 20
	 .in(path.join(__dirname, "../public/zhifucard/" + picpath + (/\./.test(path) ? '' : '.png')))
	 .mosaic()
	 // .resize(750)
	 .write(path.join(__dirname, '../public/temp.jpg'), function (err) {
	    if (err) {
	    	console.log(err);
	    	res.sendFile(path.join(__dirname, '../public/qrerror.png'));
	    } else {
	    	res.sendFile(path.join(__dirname, '../public/temp.jpg'));
	    }
	 });
}

// 查询是否有支付信息
exports.queryQrImage = function (req, res, next) {
	var userid = req.cookies.nameid || req.query.nameid;
	paycardsDao.queryList(function (err, data) {
    	// console.log(err, data);
    	if (err) {
    		// 有异常
    		res.jsonp({ret: 3});
    	} else {
    		if (data.data && data.data.length) {
    			// 存在
    			res.jsonp({ret: 0, data: 'yes'});
    		} else {
    			// 不存在，可以搞起
    			res.jsonp({ret: 0, data: 'no'});
    		}
    	}
    }, {
    	userid: {
    		type: "=",
    		value: userid
    	}
    });
}

// 取消支付码接口
exports.cancelQrImage = function (req, res, next) {
	var userid = req.cookies.nameid || req.query.nameid;
	paycardsDao.update(function (err3, data3) {
		if (err3) {
			// 更新失败
			res.jsonp({ret: 3});
		} else {
			// 更新成功
			res.jsonp({ret: 0});
		}
	}, {
		userid: "",
		payafter: "",
		title: ""
	}, {
		userid: {
    		type: "=",
    		value: userid
    	}
	});
}

// exports.genQrImage("漫客谷月卡：¥30.00", "https://onhit.cn/sanpk/tools-zhifu?total_fee=2&out_trade_no=123afafg&attach=xafa&body=%E6%B5%8B%E8%AF%95");

// 更新sitemap
exports.updatesitemap = function(req, res, next) {
	basic.exportsitemap();
}