/**
 * Created by igorgo on 19.06.2017.
 */
var checkAuth = function (req, res, next) {
    if (req.session && req.session.username)
        return next();
    else {
        req.session.afterLogin = req.originalUrl;
        return res.sendStatus(401);
    }
};

module.exports = checkAuth;