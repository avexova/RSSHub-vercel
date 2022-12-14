const got = require('#got');
const cheerio = require('cheerio');
const { parseDate } = require('#parse-date');

const rootUrl = 'https://18comic.org';

module.exports = {
    rootUrl,
    ProcessItems: async (ctx, currentUrl) => {
        currentUrl = currentUrl.replace(/\?$/, '');

        const response = await got({
            method: 'get',
            url: currentUrl,
        });

        const $ = cheerio.load(response.data);

        let items = $('.video-title')
            .slice(0, ctx.query.limit ? parseInt(ctx.query.limit) : 20)
            .toArray()
            .map((item) => {
                item = $(item);

                return {
                    title: item.text().trim(),
                    link: `${rootUrl}${item.prev().prev().attr('href')}`,
                };
            });

        items = await Promise.all(
            items.map((item) =>
                ctx.cache.tryGet(item.link, async () => {
                    const detailResponse = await got({
                        method: 'get',
                        url: item.link,
                    });

                    const content = cheerio.load(detailResponse.data);

                    item.pubDate = parseDate(content('div[itemprop="datePublished"]').first().attr('content'));
                    item.category = content('span[data-type="tags"]')
                        .first()
                        .find('a')
                        .toArray()
                        .map((c) => $(c).text());
                    item.author = content('span[data-type="author"]')
                        .first()
                        .find('a')
                        .toArray()
                        .map((a) => $(a).text())
                        .join(', ');
                    item.description = `<p>${content('#intro-block .p-t-5').text()}</p><img src="${content('.img_zoom_img img')
                        .toArray()
                        .map((image) => content(image).attr('src'))
                        .join('"><img src="')}">`;

                    return item;
                })
            )
        );

        return {
            title: $('title').text(),
            link: currentUrl,
            item: items,
            description: $('meta[property="og:description"]').attr('content'),
            allowEmpty: true,
        };
    },
};
