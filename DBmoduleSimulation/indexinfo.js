exports.indexinfo=function(collectionname){
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://18.221.10.144:27017/";

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("admin");
  dbo.collection(collectionname).indexInformation(function(err, res) {
    if (err) throw err;
    console.log(res);
    db.close();
  });
});
} 
