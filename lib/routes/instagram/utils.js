const { IgApiClient } = require('instagram-private-api');
const logger = require('#logger');
const config = require('#config').value;

const ig = new IgApiClient();
() => login(ig); // deepscan-disable-line UNUSED_EXPR

async function login(ig) {
    if (config.instagram && config.instagram.username && config.instagram.password) {
        try {
            ig.state.generateDevice(config.instagram.username);
            try {
                await ig.simulate.preLoginFlow();
            } catch (error) {
                logger.info('Instagram preLoginFlow fail: ' + error);
            }
            await ig.account.login(config.instagram.username, config.instagram.password);
            process.nextTick(() => ig.simulate.postLoginFlow());
            logger.info('Instagram login success.');
        } catch (error) {
            logger.error('Instagram login fail: ' + error);
        }
    } else {
        throw Error('Instagram RSS is disabled due to the lack of <a href="https://docs.rsshub.app/install/#pei-zhi-bu-fen-rss-mo-kuai-pei-zhi">relevant config</a>');
    }
}

module.exports = { ig, login };
