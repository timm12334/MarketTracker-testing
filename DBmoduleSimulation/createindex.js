exports.createindex=function(collectionname,index){
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://18.221.10.144:27017/";
let collectionname='BTCchartMins'
let index={t:1}
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("admin");
  dbo.collection(collectionname).createIndex(index,function(err, res) {
    if (err) throw err;
    console.log(res);
    db.close();
  });
});
} 
