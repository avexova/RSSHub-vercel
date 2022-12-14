const got = require('#got');
const cheerio = require('cheerio');
const { parseDate } = require('#parse-date');
const getCookie = require('../utils/pypasswaf');
const host = 'http://aao.nuaa.edu.cn/';

const map = new Map([
    ['tzgg', { title: '通知公告 | 南京航空航天大学教务处', suffix: '8222/list.htm' }],
    ['jxfw', { title: '教学服务 | 南京航空航天大学教务处', suffix: '8230/list.htm' }],
    ['xspy', { title: '学生培养 | 南京航空航天大学教务处', suffix: '8231/list.htm' }],
    ['jxjs', { title: '教学建设 | 南京航空航天大学教务处', suffix: '8232/list.htm' }],
    ['jxzy', { title: '教学资源 | 南京航空航天大学教务处', suffix: '8233/list.htm' }],
]);

module.exports = async (ctx) => {
    const type = ctx.params.type;
    const suffix = map.get(type).suffix;
    const getDescription = Boolean(ctx.params.getDescription) || false;

    const link = new URL(suffix, host).href;
    const cookie = await getCookie(host);
    const gotConfig = {
        headers: {
            cookie,
        },
    };
    const response = await got(link, gotConfig);
    const $ = cheerio.load(response.data);

    const list = $('#wp_news_w8 ul li')
        .slice(0, 10)
        .map(function () {
            const info = {
                title: $(this).find('a').text(),
                link: $(this).find('a').attr('href'),
                date: $(this).find('span').text(),
            };
            return info;
        })
        .get();

    const out = await Promise.all(
        list.map((info) => {
            const title = info.title || 'tzgg';
            const date = info.date;
            const itemUrl = new URL(info.link, host).href;

            return ctx.cache.tryGet(itemUrl, async () => {
                const arr = itemUrl.split('.');
                const pageType = arr[arr.length - 1];

                // 南航新 WAF 过于敏感
                // 目前 description 需要遍历页面，会被 WAF 拦截导致无法输出
                // 考虑换一种获取 description 的方式或者将标题当作 title。
                let description = title + '<br><a href="' + itemUrl + '" target="_blank">查看原文</a>';
                if (getDescription) {
                    description = itemUrl;
                    if (pageType === 'htm' || pageType === 'html') {
                        const response = await got(itemUrl, gotConfig);
                        const $ = cheerio.load(response.data);
                        description = $('.wp_articlecontent').html() + '<br><hr /><a href="' + itemUrl + '" target="_blank">查看原文</a>';
                    }
                }

                const single = {
                    title,
                    link: itemUrl,
                    description,
                    pubDate: parseDate(date),
                };
                return single;
            });
        })
    );

    ctx.state.data = {
        title: map.get(type).title,
        link,
        description: '南京航空航天大学教务处RSS',
        item: out,
    };
};
