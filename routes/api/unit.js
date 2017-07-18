/**
 * Created by sasmb on 18.07.2017.
 */
var db = require('../../db/database');
var fs = require('fs');
var obj;
var sSQL;


function ShowUnitContent(){
db.simpleLogin();
fs.readFile('./meta/agnlist.med', 'utf8', function(err, contents) {
    console.log(contents);
    if (err) throw err;
    obj = JSON.parse(contents);
    sSQL='select '+obj.selectable.split(',')+' from '+obj.table+' where '+obj.divide+'=1';
    console.log(sSQL);
});
db.execSql({
        sql: sSQL,
        binds: {},
        getArray: true,
        sessionID: sessionID});

console.log('after calling readFile');
}
module.exports.ShowUnitContent=ShowUnitContent;