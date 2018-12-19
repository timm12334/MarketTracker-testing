var Upward=[]
var RS=[]
var RSI=[]
var max={}
var upavg=[]
var davg=[]
const myAPIKEY=require('./APIKEY')
let key=myAPIKEY.APIKEY()
const myEmailList=require('./EmailList')
let email=myEmailList.EmailList()
console.log(email)
var Downward=[]
var Lastdavg=0
var Lastupavg=0
// var closePriceByHour=[]
// var highPriceByHour=[]
// var lowPriceByHour=[]
var newdata
var report={}
var time=[]
var currenttime
const request=require('request')
const cheerio=require('cheerio')
var url
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(key);
setInterval(function(){exec()}, 14400000);
async function exec(){
    currenttime= Math.floor(new Date().getTime()/1000)
    console.log('start')
    // for(t=40;t>=0;t--){
        // console.log(currenttime)
        // currenttime= 1513555200-t*3600
                   
    url=await UpdateUrl(currenttime)
    //getting new URL by the very last hr
    newdata= await UpdateData()
    //getting the data of latest 168 hrs
    RSI= await RSIcalculator()
    max=await RSIMaximum()
     //after getting the RSI, we take last 48 hrs RSI to find the lowest/highest RSI, belowing 30.
    //else we return no extreme over-sold/buy condition. 
    report= await RSIcomparison(max)
    if(report){
    SendMailTopDivergence(report)
    report={}
    }
    // }
}      
function SendMailTopDivergence(report){
    console.log('sending')
    const msg = {
        to: email,
        from: 'hsinyang@bu.edu',
        subject: report.t,
        text: 'what!!',
        html: '<strong>'+"Top Divergence- Sell Short"+"<br>"+'Highest RSI: '+ report.max.r.toFixed(3)+' Price: '+report.max.p+'<br>'+'Current RSI: '+report.r.toFixed(3)+' Price '+report.p+'</strong>',
      };
    console.log(msg)
    sgMail.send(msg);
    console.log('sent')
}
function RSIcomparison(){
    if(max.r>=70){
        //RSI higher than 70
        var report={}
        if (RSI[168]>=max.r){
            max.r=RSI[168]
            max.p=newdata.c[168]
            // console.log('making higher RSI ',max.r,newdata.c[168])
            // console.log(' ')
            report = {t:'Making higher RSI',max}
            // console.log(report)
             //no divergence, RSI is highest at the momment
             console.log(report)
        }
        else if(RSI[168]<max.r&&newdata.c[168]>max.p){
            // console.log("RSI/Price Top divergence ")
            // console.log("Current RSI", RSI[168],"Higher Price ",newdata.c[168],"Highest RSI ",max)
            // console.log(' ')
            report = {t:'4-Hr Top divergence ',max,r: RSI[168],p:newdata.c[168]}
            // console.log(report,'r')
            return report
        }
        else{
            console.log('price is lower',RSI[168],newdata.c[168],max)
            console.log(' ')
        }
    }
    else{
        console.log("no RSI is higher than 70s in past 60 hrs",max,newdata.c[168])
        console.log(' ')
    }
}
function RSIMaximum(){
     //calculate the max of past 60 hrs RSI
    return new Promise((resolve,reject)=>{
        try{
            var newmax
            max.r=0
            for(i=108;i<168;i++){
                newmax=Math.max(max.r,RSI[i])
                if(newmax!=max.r){
                    max.r=newmax
                    max.p=newdata.h[i+1]
                }
            }      
            resolve(max)
        } 
        catch(err){
            reject('damnmin')
        }     
    })
}
function RSIcalculator(){
    var currentpricediff= newdata.c[168]-newdata.o[168]
    if(currentpricediff==0){
        Upward[168]=0
        Downward[168]=0   
    }
    if(currentpricediff>0){
        Upward[168]=currentpricediff
        Downward[168]=0
    }
    if(currentpricediff<0){
        Upward[168]=0
        Downward[168]=currentpricediff
    }           
    // Calculate the concurrent RSI from (current closing value) - (current period opening value)
        for(i=0;i<168;i++){
        // After getting the newdata, we calaulate price difference
        //Upward contains price differences of the last 14 days, likewise for Downewda
        //price diff between 168-167 will be store at index 167
        let pricediff= newdata.o[i+1]-newdata.o[i]
            if(pricediff>0){
            Upward[i]=pricediff
            Downward[i]=0
            }
            if(pricediff<0){
            Downward[i]=pricediff
            Upward[i]=0
            }
            if(pricediff==0){
            Downward[i]=0
            Upward[i]=0
            }
        }
        for(a=0;a<14;a++){
        //Calculate the first 14 periods of price avg
            Lastupavg=Lastupavg+Upward[a]
            Lastdavg=Downward[a]+Lastdavg      
            upavg[13]=Lastupavg/14
            davg[13]=Lastdavg/14
        }
        for(i=14;i<=168;i++){
        //calculate each period price avg(here price avg is not regular avg)
        //price avg = (13 * last period price avg + current price diff)/14 
        upavg[i]=((upavg[i-1]*13+Upward[i])/14)
        davg[i] =((davg[i-1]*13+Downward[i])/14)
        RS[i]=upavg[i]/(-davg[i])
        RSI[i]=100-100/(1+RS[i])
        }      
return RSI
}
function UpdateUrl(currenttime){
    //  updating the new url base on epoch time
    time[168]=currenttime   
        for (i=168;i>0;i--){
        time[i-1]=time[i]-14400
        }
    let url= 'https://www.bitmex.com/api/udf/history?symbol=.BXBT&resolution=60&from='+time[0]+'&to='+time[168]
    return url
}
function UpdateData(){
    return new Promise((resolve,reject)=>{
    // sorting the data using the updated url
        let newdata= request(url,(err,res,body)=>{
        var obj=JSON.parse(body)
        // console.log(obj.o[168],obj.c[168])
        resolve(obj)
        })
    })
}
