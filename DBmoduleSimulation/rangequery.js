exports.rangequery=function (collectionname,index,begin,end){
  //collectionname, index=string
  //begin, end= unixtimestamp(number)s
  //if begin=100 end=110
  //we will get the data from 100 to 109
  //110 is not included.
  return new Promise((resolve,reject)=>{ 
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://18.221.10.144:27017/";
    var max={}
    var min={}
    max[index]=end+1  //to include the exact time, +1 is needed
    min[index]=begin  //By default, min has included the exact time, no +1 
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("admin");
      dbo.collection(collectionname).find({}).max(max).min(min).toArray(function(err, res) {
        if (err) throw err;
        resolve(res)  
        db.close();
        });
    });
  })
} 

