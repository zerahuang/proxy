var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    // host: 'smtp.ethereal.email',
    service: 'qq', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
    port: 465, // SMTP 端口
    secureConnection: true, // 使用了 SSL
    auth: {
        // user: '534144977@qq.com',//你的邮箱
        // // 这里密码不是qq密码，是你设置的smtp授权码
        // pass: 'nxurggfiumxfbgfg',
        user: '1599832042@qq.com',//你的邮箱
        // 这里密码不是qq密码，是你设置的smtp授权码
        pass: 'pgbccqpnhppijjdf'
    }
});

// 发邮件
function sendit(obj) {
    var mailOptions = {
    from: '"泽拉图" <1599832042@qq.com>', // sender address
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
        <p align="left" style="font-size: medium; text-align: left;"><b>方法2.</b> 微信扫码进入</p>\
        <p align="left" style="font-size: medium; text-align: left;"><img diffpixels="5px" modifysize="42%" src="' + obj.pic + '" style="width: 180px; height: 180px;" /></p>'
    };
    // （如果还不行可以去“太阿轻互动”公众号，回复漫画名，或者扫下面的二维码）
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId, "发送成功");
    });
}

// 端脑
// sendit({
//     to: "",
//     subject: "【个人收藏】端脑漫画全集云盘资源和免费在线渠道",
//     code1: "14LNmRPSja_R2jiYdTFIPow",
//     code2: "73rM",
//     name: "端脑",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/dNpC8wpGFyyOipqEucHKN0s2*dQ9aF67YYvne6F.V5c!/b/dIMAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
// });

// // // 镇魂街
// sendit({
//     to: "924894654@qq.com",
//     subject: "【个人收藏】镇魂街漫画全集云盘资源和免费在线渠道",
//     code1: "1Df4Eg5xRTgrfgtTMeDL6Ag",
//     code2: "863C",
//     name: "镇魂街",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/F.o52pUzyOW6OKb.ByaOEsrGO1gIOJINqLyCz9X7aQs!/b/dLgAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
// });

// 黑瞳
sendit({
    to: "2024885653@qq.com, 2686528457@qq.com, 2541496696@qq.com, 1466225175@qq.com, 2737779301@qq.com, 1931412394@qq.com, 2929198795@qq.com, 2427977377@qq.com, 3412722618@qq.com",
    subject: "【群福利】黑瞳漫画全集云盘资源和免费在线渠道",
    code1: "1t-s8oOG8iHtVJ6JdlrRikw",
    code2: "Ul51",
    name: "黑瞳",
    pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/igytbEt4jzabmSvplQ1WnnoqGWARDAzuLufusS1trgk!/b/dDQBAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
});

// 西行纪
// sendit({
//     to: "534144977@qq.com",
//     subject: "【个人收藏】西行纪漫画全集云盘资源和免费在线渠道",
//     code1: "1Df4Eg5xRTgrfgtTMeDL6Ag",
//     code2: "863C",
//     name: "西行纪",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/nf1HKqR5Gj0FzlPwP8o4MilAp*rBlRilsJyIa.xgZVs!/b/dDABAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
//     nobaidu: true,
//     noGz: true
// });

// 王爵的私有宝贝
// sendit({
//     to: "2411282819@qq.com",
//     subject: "【个人收藏】王爵的私有宝贝漫画全集云盘资源和免费在线渠道",
//     code1: "1Df4Eg5xRTgrfgtTMeDL6Ag",
//     code2: "863C",
//     name: "王爵的私有宝贝",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/F.o52pUzyOW6OKb.ByaOEsrGO1gIOJINqLyCz9X7aQs!/b/dLgAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
//     nobaidu: true
// });

// sendit({
//     to: "534144977@qq.com",
//     subject: "金助理怎么突然这样漫画全集免费看 云盘和在线",
//     code1: "1BstIQ1ZQ3jQWhJIQec_UmQ",
//     code2: "N09k",
//     name: "金助理怎么突然这样",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/ItoGU6s34UEKOwVlczVj9NgKmUorOH8xEO68Ljps6So!/b/dL8AAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
// });

// // 一人之下
// sendit({
//     to: "1599832042@qq.com",
//     subject: "一人之下漫画全集免费看 云盘和在线",
//     code1: "1RrzfVSbV5kXdP0sbFMRlTQ",
//     code2: "B83y",
//     name: "一人之下",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/C*263IU8W0Fxm0hGAtx8c3VmRXK2bQY4qNOM5aCFuY8!/b/dLYAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
// });

// // 十冷
// sendit({
//     to: "1510485479@qq.com",
//     subject: "十冷漫画全集免费看 云盘和在线",
//     code1: "1avbULUgnf_e5DJf4hmmxNQ",
//     code2: "3O85",
//     name: "十冷",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/l6bx5qovn.ZuMDo68WbGmdYHjCnJi.Xkdb8kgMv6Ta4!/b/dLYAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4"
// });

// 惊叹之夜
// sendit({
//     to: "1443155404@qq.com",
//     // to: "534144977@qq.com",
//     subject: "【个人收藏】惊叹之夜漫画全集云盘资源和免费在线渠道",
//     name: "惊叹之夜",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2eTPzw/L1nKetqJojDV*TuP7EhFZVEYsoV*4T63rY*VyuAhR0o!/b/dFQBAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
//     nobaidu: true
// });


// 雏蜂
// sendit({
//     to: "448948352@qq.com",
//     subject: "【个人收藏】雏蜂漫画全集云盘资源和免费在线渠道",
//     code1: "1z6NuJuPFbzJDEX8ttJ_TmQ",
//     code2: "26E8",
//     name: "雏蜂",
//     pic: "http://m.qpic.cn/psb?/V12IMQdX2IphLw/UZjvRShRGRn4uNeJpfFJfC7qL1mUBmA5fyRyyfqeYpI!/b/dLYAAAAAAAAA&bo=rgGuAQAAAAADByI!&rf=viewer_4",
//     // nobaidu: true
// });