var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var request = require("request");
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/routes', usersRouter);
app.use("/sanpk", function (req, res, next) {
    //所有动态请求的入口
    /*
     做了简单的改造，可以匹配/action,method然后调用对应的模块暴露出来的接口
    */
    var reqRoute = path.normalize(process.cwd() + "/routes" + req.url.replace(/\//g, "/").replace(/\?.*/, ""));
    // console.log(reqRoute);
    var _reqArr  = reqRoute.split(/[,-]/);
    reqRoute     = _reqArr.length > 1 ? _reqArr[0] : reqRoute;
    var method   = _reqArr.length > 1 ? _reqArr[1] : "init";
    
    try {
        // console.log(reqRoute);
        //先去尝试是否有对应的routes
        var appModule = require(reqRoute);
        appModule[method](req, res, next);
    } catch (e) {
        if (e.message == "Cannot find module '" + reqRoute + "'") {
            next();
        } else {
            //如果是模块里面出错，则直接打出出错信息
            res.render("error", {
                message: e.message,
                error  : e
            });
        }
    }
});

setInterval(function () {
    // 判断韩漫是否可用
    request('https://img.beiaduo.org/storage/yy_images/1621129813577123.webp', function (err, data) {
        if (!err && data && data.headers && data.headers['content-length'] == "27162") {
            console.log("韩漫无异常");
            global.hmng = false;
        } else {
            console.log('韩漫有异常');
            // 重写global
            global.hmng = true;
        }
    });
}, 60000);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
