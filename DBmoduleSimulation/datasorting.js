exports.datasorting= function wewe(collectionname,index,sequence){
  //collectionname, index=string
  //begin, end= unixtimestamp(number)s
  //if begin=100 end=110
  //we will get the data from 100 to 109
  //110 is not included.
  return new Promise((resolve,reject)=>{ 
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://18.221.10.144:27017/";
    var doc={}
    doc[index]=sequence
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("admin");
      console.log(doc)
      dbo.collection(collectionname).find().sort(doc).limit(1).toArray(function(err, res) {
        if (err) throw err;
        //if(res==null){resolve({a:0})}
        resolve(res)  
        console.log(res)
        db.close();
        });
    });
  })
} 

