/**
 * 数据库连接池工具类
 */
var mysql = require('mysql');
var dbconfig = require('../config/dbconfig');
var env = require("./env");
var pool = {};
var nowenv = env.getEnv();

/**
 * 获取数据库连接
 * @param cbk
 */
exports.getConnection = function(cbk,extstr){
    extstr = extstr ? extstr : "";
    if(!pool["db" + extstr]){
        pool["db" + extstr] = mysql.createPool(dbconfig["_db_" + nowenv + extstr]);
    }

    pool["db" + extstr].getConnection(function(err, connection){
        //获取数据库连接出错
        if(err||!connection){
            throw err;
        }
        cbk(connection);
    });
}

/**
 * 获取数据库连接池
 * @returns {*}
 */
exports.getPool = function(extstr){
    extstr = extstr ? extstr : "";
    if(!pool["db" + extstr]){
        pool["db" + extstr] = mysql.createPool(dbconfig["_db_" + nowenv + extstr]);
    }
    return pool["db" + extstr];
}