/**
 * 新建excel
 * @author huangshaolu
 */
var ejsexcel = require("ejsexcel");
var fs = require("fs");

/**
 * 创建excel
 * @author huangshaolu
 * @date   2019-04-09
 * @param  {Function} callback 回调函数
 * @param  {String}   xlsxpath excel地址
 * @param  {Array & Object}   data     数据
 */
exports.createExcel = function (callback, xlsxname, data, outputname) {
    try{
        var exlBuf = fs.readFileSync(process.cwd() + "/resource/" + xlsxname);
        ejsexcel.renderExcel(exlBuf, data).then(function (data2) {
            var outputpath = process.cwd() + "/userfiles/" + outputname + "_" + new Date().getTime() + ".xlsx";
            fs.writeFileSync(outputpath, data2);
            console.log("写入成功");
            callback("", outputpath);
        }).catch(function (e) {
            console.log("写入失败", e);
            callback("white file error");
        });
    }catch(e){
        console.log("写入失败", e);
        callback("file not exit");
    }
}