/**
 * Created by igorgo on 17.06.2017.
 */
var db = require('../../db/database');
//var xml2js = require('xml2js');
var xmldoc = require('xmldoc');
/* GET users listing. */
var apicall = function (req, res, next) {

    db.execSql({
            sql: "select CMENU from V_APPLIST_MENU t where sappcode='Account'",
            binds: {},
            getArray: false,
            sessionID: req.sessionID
        }
    ).then(function (params) {
        var cmenu = params.dataset.rows[0].CMENU;

        var document = new xmldoc.XmlDocument(cmenu);
        // todo: shrink unusable
        /* document.children.forEach(function (p1, p2, p3) {
         if (p2==0) {console.log(p1)}

         }); */
        res.status(200).json(document);
    })
        .catch(next);
}

module.exports = apicall;
