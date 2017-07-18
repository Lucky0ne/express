var express = require('express');
var unit = require('./api/unit');
var router = express.Router();

unit.ShowUnitContent;
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});



module.exports = router;
