const got = require('#got');
const cheerio = require('cheerio');
const { parseDate } = require('#parse-date');
const { art } = require('#render');
const path = require('path');

const rootUrl = 'http://ccfcv.ccf.org.cn';

const cateTitleMap = {
    xsdt: {
        xsqy: '学术前沿',
        rdzw: '热点征文',
        xshy: '学术会议',
    },
};

module.exports = async (ctx) => {
    const channel = ctx.params.channel;
    const cate = ctx.params.category;

    const url = `${rootUrl}/ccfcv/${channel}/${cate}/`;
    const response = await got(url);
    const $ = cheerio.load(response.data);

    let items = $('div.article-item')
        .toArray()
        .map((item) => {
            item = $(item);
            return {
                title: item.find('h3 a').text(),
                link: (cate === 'xsqy' ? rootUrl : '') + item.find('h3 a').attr('href'),
                pubDate: parseDate(item.find('div p').text()),
            };
        });

    if (cate === 'xsqy') {
        items = await Promise.all(
            items.map((item) =>
                ctx.cache.tryGet(item.link, async () => {
                    let detailResponse;

                    try {
                        detailResponse = await got(item.link);
                    } catch (error) {
                        item.status = 404;
                    }

                    if (item.status !== 404) {
                        const content = cheerio.load(detailResponse.data);
                        const pdfUrl = content('div.g-box1 p a').attr('href');
                        item.description = art(path.join(__dirname, 'templates/description.art'), {
                            pdfUrl,
                        });
                    }

                    delete item.status;
                    return item;
                })
            )
        );
    }

    ctx.state.data = {
        title: `计算机视觉专委 - ${cateTitleMap[channel][cate]}`,
        link: url,
        item: items,
    };
};
