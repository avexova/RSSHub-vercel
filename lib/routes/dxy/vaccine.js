const got = require('#got');

module.exports = async (ctx) => {
    const province = ctx.params.province || '';
    const city = ctx.params.city || '';
    const location = ctx.params.location || '';
    let fullLocation = '';
    if (province) {
        fullLocation += `/${province}`;
        if (city) {
            fullLocation += `/${city}`;
            if (location) {
                fullLocation += `/${location}`;
            }
        }
    }

    const rootUrl = 'https://mama.dxy.com';
    const currentUrl = `${rootUrl}/client/vaccine/new-crown-vaccine`;
    const apiUrl = `${rootUrl}/api/vaccine/client/vaccination-point/all`;

    const apiResponse = await got({
        method: 'get',
        url: apiUrl,
    });

    const response = await got({
        method: 'get',
        url: apiResponse.data.results.fileUrl,
    });

    const allPoints = [],
        allLocations = {},
        allLocationIds = {},
        pointDataArray = response.data.results.pointData;

    for (const data of pointDataArray) {
        allLocations[data.locationName] = data.locationId;
        allLocationIds[data.locationId] = data.locationName;
        if (data.points) {
            allPoints.push(...data.points);
        } else {
            pointDataArray.push(...data.pointData);
        }
    }

    const list = allPoints.map((item) => {
        const locationId = item.locationId;
        const province = locationId - (locationId % 10000);
        const city = locationId - (locationId % 100);

        return {
            title: `${allLocationIds[province]}/${allLocationIds.hasOwnProperty(city) ? `${allLocationIds[city]}/` : `${allLocationIds[province]}/`}${allLocationIds[locationId]}`,
            link: item.contentUrl,
            pubDate: new Date(item.modifyDate).toUTCString(),
        };
    });

    const items = await Promise.all(
        list
            .filter((item) => {
                if (fullLocation !== '') {
                    const locationSplit = item.title.split('/');
                    const fullLocationSplit = fullLocation.split('/');

                    for (let index = 0; index < fullLocationSplit.length; index++) {
                        if (locationSplit[index] !== fullLocationSplit[index]) {
                            return false;
                        }
                    }
                }
                return true;
            })
            .map((item) =>
                ctx.cache.tryGet(item.link, async () => {
                    const detailResponse = await got({
                        method: 'get',
                        url: item.link,
                    });
                    const result = detailResponse.data.results;

                    const description =
                        `<h1> ${result.point.pointName}</h1>` +
                        '<ul>' +
                        `<li>???????????????${result.point.registerLimit}</li>` +
                        `<li>???????????????${result.point.serviceTag}</li>` +
                        `<li>???????????????${result.detail.serviceTime}</li>` +
                        `<li>?????????${result.point.address}</li>` +
                        `<li>?????????${result.point.phoneNo}</li>` +
                        `<li>???????????????${result.detail.targetPeople}</li>` +
                        `<li>?????????????????????${result.detail.materials}</li>` +
                        `<li>???????????????${result.detail.reserveSteps}</li>` +
                        '</ul>';

                    item.description = description;
                    item.title = `${result.point.pointName}???${item.title}???`;
                    item.link = `${rootUrl}/client/vaccine/vaccination-point?pointId=${result.point.id}`;

                    return item;
                })
            )
    );

    ctx.state.data = {
        title: `???????????????????????????${fullLocation ? `???${fullLocation}???` : ''} - ?????????`,
        link: currentUrl,
        item: items,
    };
};
