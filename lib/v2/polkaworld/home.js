const got = require('#got');
const { parseDate } = require('#parse-date');
const timezone = require('#timezone');

module.exports = async (ctx) => {
    const limit = ctx.query.limit ? parseInt(ctx.query.limit) : 10;
    const response = await got({
        method: 'get',
        url: 'https://pub.polkaworld.pro/articles?_sort=PublishDate:desc&_limit=' + limit,
    });
    const docList = response.data;

    ctx.state.data = {
        title: 'PolkaWorld-资讯',
        link: 'https://www.polkaworld.org/',
        item: docList.map((item) => ({
            title: item.Title,
            description: item.Title,
            pubDate: timezone(parseDate(item.PublishDate), 0),
            author: item.author.Name,
            link: 'https://www.polkaworld.org/articles/' + item.URL,
        })),
    };
};
