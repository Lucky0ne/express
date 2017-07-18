/**
 * Created by igorgo on 21.06.2017.
 */

var express = require('express');
var router = express.Router();
var db = require('../db/database');

function login(req, res, next){
    var params = req.body;
    params.session = req.session;
    params.session.app = 'Admin';
    params.session.company = 'Организация';
    params.session.lang = 'RUSSIAN';
    params.session.browser = req.header('user-agent');
    params.sessionID = req.sessionID;
    db.login(params).then(function (params){
        req.session.username = params.username;
        res.sendStatus(200);
    })
        .catch(next);
}

function logoff(req, res, next){
    var params = req.body;
    params.sessionID = req.sessionID;
    params.session = req.session;
    db.logoff(params).then(function (params){
        req.session.destroy();
        res.sendStatus(200);
    })
        .catch(next);

}


router.post('/login',login);
router.post('/logoff',logoff);


module.exports = router;