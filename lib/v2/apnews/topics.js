const got = require('#got');
const cheerio = require('cheerio');
const { parseDate } = require('#parse-date');
const { art } = require('#render');
const path = require('path');
const HOME_PAGE = 'https://apnews.com';

module.exports = async (ctx) => {
    const { topic = 'trending-news' } = ctx.params;
    const urlLink = `${HOME_PAGE}/hub/${topic}`;
    const response = await got(urlLink);
    const $ = cheerio.load(response.data);
    const data = JSON.parse(
        $('script')
            .not('[src], [type]')
            .text()
            .match(/window\['titanium-state'\] = (.*)\nwindow\['titanium-cacheConfig'\]/)[1]
    );
    const meta = data.hub.data[`/${topic}`];

    const items = meta.cards.map((item) => {
        const description = cheerio.load(item.contents[0].storyHTML, null, false);
        description('.ad-placeholder').remove();
        return {
            title: item.contents[0].headline,
            description: art(path.join(__dirname, 'templates/description.art'), {
                media: item.contents[0].media,
                description: description.html(),
            }),
            link: `${HOME_PAGE}/article/${item.contents[0].canonicalUrl}-${item.contents[0].shortId}`,
            author: item.contents[0].bylines ? item.contents[0].bylines.slice(3) : null,
            pubDate: parseDate(item.contents[0].published),
            category: item.contents[0].tagObjs.map((tag) => tag.name),
        };
    });

    ctx.state.data = {
        title: meta.tagObjs[0].seoTitle,
        description: meta.tagObjs[0].seoDescription,
        link: urlLink,
        item: items,
        language: $('html').attr('lang'),
    };
};
