// const routerIndex = require('./index');
module.exports = function (router) {
    router.get('/latest', require('./index'));
};
