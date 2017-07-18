var express = require('express');
var unit = require('./api/unit');
var router = express.Router();
console.log('before');
unit.ShowUnitContent();
console.log('after');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});



module.exports = router;
