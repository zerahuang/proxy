var comicsDao = require("../dao/comics");
var charactorsDao = require("../dao/charactors");
var request = require('request');
var async = require("async");
var fs = require("fs");

// var baseUrl = '/Users/huangshaolu/Documents/comics';
var baseUrl = '/opt/comics';

function getList (name, outcall, allnew) {
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

                    // 新建目录
                    // 判断是否有目录
                    try {
                        fs.statSync(baseUrl + "/" + data[0].name);
                    } catch (e) {
                        fs.mkdirSync(baseUrl + "/" + data[0].name, 0777);
                    }
                    // 去创建一下cover
                    // console.log("https" + (data[0].indexpic).replace(/^https?/, '') + (data[0].indexpic.indexOf("?") != -1 ? '&' : '?') + "t=" + Math.random());
                    var readStream = request({
                        url: "https" + (data[0].indexpic).replace(/^https?/, '') + (data[0].indexpic.indexOf("?") != -1 ? '&' : '?') + "t=" + Math.random(),
                        // url: "https://img.beiaduo.org/storage/yy_images/1621160221287642.webp?t=xxa",
                        followRedirect: false, 
                        rejectUnauthorized: false,
                        headers: {
                            "Referer": "https://www.56hm.com/",
                            // "Host": "img.xikami.com",
                            // "Host": "img.beiaduo.org",
                            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                            "Sec-Fetch-Site": "cross-site",
                            "Sec-Fetch-Mode": "no-cors",
                            "Sec-Fetch-Dest": "image",
                            "Accept-Encoding": "gzip",
                            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6"
                       }
                    });
                    readStream.pipe(fs.createWriteStream(baseUrl + "/" + data[0].name + "/cover"));
                    readStream.on('end', function() {
                        console.log('封面下载成功', baseUrl + "/" + data[0].name + "/cover", data[0].indexpic);
                    });
                    readStream.on('error', function(err) {
                        console.log("封面错误信息:" + err, baseUrl + "/" + data[0].name + "/cover", data[0].indexpic);
                    })
                    
                    // 要去下载所有章节
                    var funcs = [];
                    data2.data.forEach(function (ceil, index) {
                        funcs.push(function (innerCall) {
                            downloadOne(ceil, innerCall, allnew);
                        });
                    });
                    // 数据
                    async.parallelLimit(funcs.slice(0,+data[0].charactor_counts), 3, function(err, data) {
                        // console.log("", JSON.stringify(data));
                        setTimeout(function () {
                            outcall && outcall('', data);
                        }, 3000);
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
function downloadOne (info, callback, allnew) {
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
                try {
                    var fileinfo = fs.statSync(baseUrl + "/" + info.comic_name + "/" + info.comic_index + "/" + index);

                    if (!fileinfo.size || allnew) {
                        // console.log(fileinfo);
                        // 为空
                        throw new Error('size Error')
                        return false;
                    }
                    innerCall('');
                } catch (e) {
                    function docall (a, b) {
                        clearTimeout(_timer);
                        docall = function () {}
                        innerCall(a, b);
                    }
                    var _timer = setTimeout(function () {
                        console.log('超时了');
                        docall('');
                    }, 15000);
                    var readStream = request({
                        url: ceil + (ceil.indexOf("?") != -1 ? '&' : '?') + "t=" + Math.random(),
                        headers: {
                            // "Referer": "https://www.84hm.com/",
                            "Referer": "https://www.56hm.com/",
                            // "Host": "img.beiaduo.org",
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
                        docall('');
                    });
                    readStream.on('error', function(err) {
                        console.log("错误信息:" + err, info.comic_index + "/" + index);
                        docall('');
                    })
                }
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
if (process.argv[2]) {
    getList("youma--" + process.argv[2], function (err, data) {
        console.log(data);
    }, process.argv[3]);
} else {
    var funcs = [];
    ["1404", "10046", "1518", "10113", "10882", "10120", "1396", "1386", "1382", "1145", "10002", "10084", "1623", "1420", "1096", "1102", "10042", "269", "972", "10228", "10144", "1126", "10156", "10921", "241", "1093", "968", "10007", "10095", "1248", "1407", "243", "10005", "176"].forEach(function (ceil, index) {
        funcs.push(function (innerCall) {
            getList("youma--" + ceil, innerCall);
        });
    });
    // 数据
    async.parallelLimit(funcs, 1, function(err, data) {
        // console.log("", JSON.stringify(data));
        console.log(data);
    });
}