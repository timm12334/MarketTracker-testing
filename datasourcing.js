const periods=2016 //how many period of data wanna look back to
const periodlength=1  //Period counted by 5mins, if period counted by 1 hr, then preiodlength=12
var dataset=[]
const insertdata=require('./insertdata')
// dataset is organized data after getting from the web
// dataset={h:[],l:[],o:[],c:[],t:[],tr:[],atr:[]}
//index of array indicates which period, present time will be i= 'var periods' given above, index of 1 will be farest period.
//if periodlength =24 means, one period = one day, h(high), l(low), o(opening price), c(closing), t(tiempstamp)
//tr is calulated for ATR
const request=require('request')
const myAPIKEY=require('./APIKEY')
let key=myAPIKEY.APIKEY()
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(key);
var schedule = require('node-schedule');

schedule.scheduleJob('0 10 * * 1',function(){
    exec()
})

async function exec(){
    var currenttime=Math.floor(new Date().getTime()/1000)
    url= await UpdateUrl(currenttime)
    dataset= await UpdateData(url)
    insertdata.insertdata('BTCchartMins',dataset)
    console.log(dataset[0],' ',dataset[periods-1],'t:',currenttime)
    SendMailTopDivergence(dataset[0].t,dataset[periods-1].t)
}
function SendMailTopDivergence(begin,end){
    console.log('sending')
    const msg = {
        to: ['timlai@tokenite.co'],
        from: 'hsinyang@bu.edu',
        subject: 'Update-DB',
        text: 'what!!',
        html: '<strong>'+begin+' '+end+'</strong>'
    }
    console.log(msg)
    sgMail.send(msg);
    console.log('sent')
}   
function UpdateUrl(currenttime){
    //  updating the new url base on epoch time
    //periodlenth is 5mins, so periodlength*300(secs)
    var timebegin=currenttime-periodlength*300*periods
    let url='https://www.bitmex.com/api/udf/history?symbol=XBTUSD&resolution=5&from='+timebegin+'&to='+currenttime
    
    console.log(url)
    return url
}
function UpdateData(url){
    return new Promise((resolve,reject)=>{
    // sorting the data using the updated url 
        let newdata= request(url,(err,res,body)=>{
        var data=JSON.parse(body)
        //Data get from the website is sorted by hour per array
            var obj={}
            let array=[]
            for(i=0;i<periods;i++){
                var obj={}
                //i = periods count i: 0=farest time period, i:periods = current time
                //for every period, we need 1. opening price at beginning of that period= closing price of previous period
                //2. closeing price at end of period
                obj.o=data.o[i*periodlength]
                obj.c=data.c[i*periodlength]
                obj.l=data.l[i*periodlength]
                obj.h=data.h[i*periodlength]
                obj.t=data.t[i*periodlength]
                obj.v=data.v[i*periodlength]
                array.push(obj)
                //   Finally we put the data into the "obj", obj.t is means the timestamp at the end of that period
            }
        resolve(array)
        })
    })
}
