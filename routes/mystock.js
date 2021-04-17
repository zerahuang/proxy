// 引用dao
var mystockDao = require("../dao/mystock");

// 上报rd，未登录也可以上报RD
exports.query = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "https://caibaoshuo.com");
    // 必须要有stock名字
    if (!req.query.code) {
        res.send("1:");
        return false;
    }
    // 然后去查找
    mystockDao.queryList(function (err, data) {
    	res.send("0:"+JSON.stringify(data));
    }, {
    	code: {
    		type: "in",
    		value: req.query.code.split(",")
    	}
    }, {
    	pagesize: 300
    });
}

// 新增或者修改
exports.add = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "https://caibaoshuo.com");
	if (!req.query.code) {
    	res.send("1:");
    	return false;
    }

    // 去修改
    mystockDao.add(function (err, data) {
    	res.send("0:");
    }, {
    	msg: req.query.msg,
    	code: req.query.code,
    	name: req.query.name || "",
    	time: new Date(),
    	status: req.query.status || 0
    });
}