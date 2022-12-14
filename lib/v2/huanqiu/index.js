const got = require('#got');
const cheerio = require('cheerio');
const { parseDate } = require('#parse-date');
const timezone = require('#timezone');

function getKeysRecursive(dic, key, attr, array) {
    Object.values(dic).forEach((v) => {
        if (v[key] !== undefined) {
            getKeysRecursive(v[key], key, attr, array);
        } else {
            array.push(v[attr]);
        }
    });
    return array;
}

module.exports = async (ctx) => {
    const category = ctx.params.category ?? 'china';
    const host = 'https://' + category + '.huanqiu.com';

    const resp = await got({
        method: 'get',
        url: host.concat('/api/channel_pc'),
    }).json();
    const name = getKeysRecursive(resp.children, 'children', 'domain_name', [])[0];

    const nodes = getKeysRecursive(resp.children, 'children', 'node', [])
        .map((x) => '"' + x + '"')
        .join();
    const req = await got({
        method: 'get',
        url: host.concat('/api/list?node=') + nodes.concat(`&offset=0&limit=${ctx.query.limit ?? 20}`),
    }).json();

    let items = req.list
        .filter((item) => item.aid)
        .map((item) => ({
            link: host.concat('/article/' + item.aid),
            title: item.title,
        }));

    items = await Promise.all(
        items.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = cheerio.load(detailResponse.data);
                item.description = content('article').html();
                item.author = content('span', '.source').text();
                item.pubDate = timezone(parseDate(content('p.time').text()), +8);
                return item;
            })
        )
    );

    ctx.state.data = {
        title: `${name} - 环球网`,
        link: host,
        description: '环球网',
        language: 'zh-cn',
        item: items,
    };
};
