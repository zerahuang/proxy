var comicsDao = require("../dao/comics");
var charactorsDao = require("../dao/charactors");
var request = require('request');
var async = require("async");
var fs = require("fs");
// exports.getlist = function (callback, opt) {
    
// }
function getList (name) {
    comicsDao.queryById(function (err, data) {
        if (err || !(data && data[0])) {
            console.log(err, data, '异常1');
        } else {
            // console.log(err, data);
            // 去获得章节信息
            charactorsDao.queryList(function (err2, data2) {
                if (err2 || (data2 && data2.data && data2.data.length == 0)) {
                    console.log(err2, data2, '异常2');
                } else {
                    // console.log(data2.data.length, data2.data[0]);
                    // 下载一个章节的图片
                    // downloadOne(data2.data[0]);
                    // 要去下载所有章节
                    var funcs = [];
                    data2.data.forEach(function (ceil, index) {
                        funcs.push(function (innerCall) {
                            downloadOne(ceil, innerCall);
                        });
                    });
                    // 数据
                    async.parallelLimit(funcs, 3, function(err, data) {
                        console.log("", JSON.stringify(data));
                    });
                }
            }, {
                comic_name: {
                    type: "=",
                    value: data[0].name
                }
            }, {
                pagesize: 10000,
                tablename: "charactors_" + ("0" + (data[0].id % 100)).slice(-2)
            });
        }
    }, name);
}

// 下载一个章节
function downloadOne (info, callback) {
    // var baseUrl = '/Users/huangshaolu/Documents/comics';
    var baseUrl = '/root/comics';
    // 判断是否有目录
    try {
        fs.statSync(baseUrl + "/" + info.comic_name);
    } catch (e) {
        fs.mkdirSync(baseUrl + "/" + info.comic_name, 0777);
    }
    
    try {
        fs.statSync(baseUrl + "/" + info.comic_name + "/" + info.comic_index);
    } catch (e) {
        fs.mkdirSync(baseUrl + "/" + info.comic_name + "/" + info.comic_index, 0777);
    }

    // 开始下载
    try {
        var _urls = JSON.parse(info.urls);
        // console.log(_urls);
        var funcs = [];
        _urls.forEach(function (ceil, index) {
            funcs.push(function (innerCall) {
                console.log(ceil);
                var readStream = request({
                    url: ceil,
                    headers: {
                        "Referer": "https://www.84hm.com/",
                        "Host": "img.beiaduo.org",
                        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                        "Sec-Fetch-Site": "cross-site",
                        "Sec-Fetch-Mode": "no-cors",
                        "Sec-Fetch-Dest": "image",
                        "Accept-Encoding": "gzip",
                        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6"
                   }
                });
                readStream.pipe(fs.createWriteStream(baseUrl + "/" + info.comic_name + "/" + info.comic_index + "/" + index));
                readStream.on('end', function() {
                    console.log('文件下载成功', info.comic_index + "/" + index);
                    innerCall('');
                });
                readStream.on('error', function() {
                    console.log("错误信息:" + err, info.comic_index + "/" + index);
                    innerCall('');
                })
                // writeStream.on("finish", function() {
                //     console.log("文件写入成功", info.comic_index + "/" + index);
                //     writeStream.end();
                //     innerCall();
                // });
            });
        });
        // 数据
        async.parallelLimit(funcs, 3, function(err, data) {
            // console.log("", JSON.stringify(data));
            callback && callback('', JSON.stringify(data));
        });
    } catch(e) {}
}

// downloadOne();
getList("youma--1491");