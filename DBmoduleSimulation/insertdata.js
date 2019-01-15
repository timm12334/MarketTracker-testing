exports.insertdata=function(collectionname,datatoinsert){
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://18.221.10.144:27017/";

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("admin");
  dbo.collection(collectionname).insertMany(datatoinsert, function(err, res) {
    if (err) throw err;
    console.log("Number of documents inserted: " + res.insertedCount);
    db.close();
  });
});
} 