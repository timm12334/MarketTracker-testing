exports.positionquery= function wewe(collectionname,index,time){
  //collectionname, index=string
  //begin, end= unixtimestamp(number)s
  //if begin=100 end=110
  //we will get the data from 100 to 109
  //110 is not included.
  return new Promise((resolve,reject)=>{ 
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://18.221.10.144:27017/";
    var doc={}
    doc[index]=time  
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("admin");
      dbo.collection(collectionname).findOne(doc,(function(err, res) {
        if (err) throw err;
        //if(res==null){resolve({a:0})}
        resolve(res)  
        db.close();
        }));
    });
  })
} 

