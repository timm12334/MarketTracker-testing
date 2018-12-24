var currenttime=Math.floor(new Date().getTime()/1000)
const periods=100  //how many period of data wanna look back to
const periodlength=24  //Period counted by, hence periodlength=24 hrs, if period counted by 4 hrs, then preiodlength=4  
const ARTperiods=14
var dataset
// dataset is organized data after getting from the web
// dataset={h:[],l:[],o:[],c:[],t:[],tr:[],atr:[]}
//index of array indicates which period, present time will be i= 'var periods' given above, index of 1 will be farest period.
//if periodlength =24 means, one period = one day, h(high), l(low), o(opening price), c(closing), t(tiempstamp)
//tr is calulated for ATR
const request=require('request')
const sgMail = require('@sendgrid/mail');
const myAPIKEY=require('./APIKEY')
let key=myAPIKEY.APIKEY()
sgMail.setApiKey(key);
const myEmailList=require('./EmailList')
let email=myEmailList.EmailList()
console.log(email)

setInterval(function(){exec()}, 3600000);

async function exec(){
    console.log(currenttime)
    url= await UpdateUrl(currenttime)
    dataset= await UpdateData(url)
    var MaxandMin20= await FindPeriodsMaxandMin(20)
    var MaxandMin10= await FindPeriodsMaxandMin(10)
    var MaxandMin55= await FindPeriodsMaxandMin(55)
    var TR= await TrueRange(dataset)
    dataset.atr=await AverageTrueRange(ARTperiods)
    var report20=S1(MaxandMin10,MaxandMin20,dataset.c[periods],dataset.atr[periods],3)
    var report55=S2(MaxandMin10,MaxandMin20,dataset.c[periods],dataset.atr[periods],3)
    if(report20){
        SendMail(report20)
    }
    if(report55){
        SendMail(report55)
    }
}
// function s1stop(cp,MaxandMin10,MaxandMin20,atr){
//     if(cp<MaxandMin10.min||cp<(MaxandMin20.max-2*atr)){
//         console.log()
//     }
// }
function S1(MaxandMin10,MaxandMin20,cp,atr,addon){
    //cp = currentprice, addon= times of followup position into market. 
    let report={}
    console.log(cp,'1212',MaxandMin20.min.toFixed(3))
    if(cp<MaxandMin20.min){ 
        report.title='Turtle trade S1 Sell'
        //sell short
        report.a= 'Sell Short at Price: '+MaxandMin20.min.toFixed(3)+'<br>'+'add postion: '
        report.a= 'Sell Short at Price: '+MaxandMin20.min.toFixed(3)+'<br>'+'add postion: '
        for(i=0;i<addon;i++){
            addonP=(MaxandMin20.min-(atr/2)*(i+1)).toFixed(3)
            report.a=report.a.concat(addonP,', ')  
        }
        report.stop1='Stop at 10 days high: '+MaxandMin10.max.toFixed(3)
        report.stop2='Stop at 2ART: '+(cp+atr*2).toFixed(3)
        return report
    }
    if(cp>MaxandMin20.max){
        report.title='Turtle trade S1 buy'
        //buy long
        report.a= 'Buy long at Price: '+MaxandMin20.max.toFixed(3)+'<br>'+'add postion: '
        for(i=0;i<addon;i++){
            addonP=(MaxandMin20.max+(atr/2)*(i+1)).toFixed(3)
            report.a=report.a.concat(addonP,', ')  
        }
        report.stop1='Stop at 10 days high: '+MaxandMin10.min.toFixed(3)
        report.stop2='Stop at 2ART: '+(cp-atr*2).toFixed(3)
        return report
    }
    else{
        return false
    }
}
function S2(MaxandMin20,MaxandMin55,cp,atr,addon){
    //cp = currentprice, addon= times of followup position into market. 
    let report={}
    if(cp<MaxandMin55.min){ 
        report.title='Turtle trade S2 Sell'
        //sell short
        report.a= 'Sell Short at Price: '+MaxandMin55.min.toFixed(3)+'<br>'+'add postion: '
        for(i=0;i<addon;i++){
            addonP=(MaxandMin55.min-(atr/2)*(i+1)).toFixed(3)
            report.a=report.a.concat(addonP,', ')  
        }
        report.stop1='Stop at 20 days high: '+MaxandMin20.max.toFixed(3)
        report.stop2='Stop at 2ART: '+(cp+atr*2).toFixed(3)
        return report
    }
    if(cp>MaxandMin55.max){
        report.title='Turtle trade S2 buy'
        //buy long
        report.a= 'Buy long at Price: '+MaxandMin55.max.toFixed(3)+'</n>'+'add postion: '
        for(i=0;i<addon;i++){
            addonP=(MaxandMin55.max+(atr/2)*(i+1)).toFixed(3)
            report.a=report.a.concat(addonP,', ')  
        }
        report.stop1='Stop at 20 days high: '+MaxandMin20.min.toFixed(3)
        report.stop2='Stop at 2ART: '+(cp-atr*2).toFixed(3)
        return report
    }
    else{
        return false
    }
}
function SendMail(report){
    console.log('sending')
    const msg = {
        to: email,
        from: '',
        subject: report.title,
        text: 'what!!',
        html: '<h>'+report.a+'ATR/2: '+(dataset.atr[periods]/2).toFixed(3)+'<h>'+'<ul>'+'<li>'+report.stop1+'</li>'+'<li>'+report.stop2 +'</li>'+'</ul>',
      };
    console.log(msg)
    sgMail.send(msg);
    console.log('sent')
}
function TrueRange(dataset){
    return new Promise((resolve,reject)=>{
        for(i=1;i<=periods;i++){
            var HighminusLow=Math.abs(dataset.h[i]-dataset.l[i])
            var HighminusPreviousClose=Math.abs(dataset.h[i]-dataset.c[i])
            var LowminusPreviousClose=Math.abs(dataset.l[i]-dataset.c[i])
            var truerange=Math.max(HighminusLow,HighminusPreviousClose,LowminusPreviousClose)
            dataset.tr[i]=truerange
            // console.log(HighminusLow,dataset.h[i],dataset.l[i],HighminusPreviousClose,dataset.h[i],dataset.c[i],dataset.l[i],dataset.c[i],LowminusPreviousClose,dataset.tr[i],dataset.t[i])
        }
    resolve(dataset.tr)
    })
}
function AverageTrueRange(ATRperiods){
    return new Promise((resolve,reject)=>{
    var ATR=[]
    ATR[ATRperiods]=0
        for(i=1;i<=ATRperiods;i++){
            ATR[ATRperiods]=dataset.tr[i]+ATR[ATRperiods]
        } 
        ATR[ATRperiods]=ATR[ATRperiods]/ATRperiods  
        for(i=ATRperiods+1;i<=periods;i++){
            ATR[i]=((ATR[i-1]*(ATRperiods-1))+dataset.tr[i])/ATRperiods
            //Set ATR as index of 14 periods   ATR[15]=(ATR[14]*13+ATR[15])/14 
        }     
        console.log(ATR)
        resolve(ATR)
    })
}
function FindPeriodsMaxandMin(p){
    //find certain max&min in certain periods. 
    return new Promise((resolve,reject)=>{
var max=dataset.h[periods-p+1]
var min=dataset.l[periods-p+1]
    for(i=periods-p;i<periods;i++){
        max=Math.max(dataset.h[i],max)
        min=Math.min(min,dataset.l[i])
    }
    var MaxandMin={max:max,min:min}
    console.log(MaxandMin,p)
    resolve(MaxandMin)  
})
}
function UpdateUrl(currenttime){
    //  updating the new url base on epoch time
    var timebegin=currenttime-86400*periods
    let url= 'https://www.bitmex.com/api/udf/history?symbol=.BXBT&resolution=60&from='+timebegin+'&to='+currenttime
    return url
}
function UpdateData(url){
    return new Promise((resolve,reject)=>{
    // sorting the data using the updated url 
        let newdata= request(url,(err,res,body)=>{
        var data=JSON.parse(body)
        //Data get from the website is sorted by hour per array
            var obj={t:[],o:[],c:[],l:[],h:[],tr:[],atr:[]}
            for(i=1;i<=periods;i++){
                //i = periods count i: 0=farest time period, i:periods = current time
                //for every period, we need 1. opening price at beginning of that period= closing price of previous period
                //2. closeing price at end of period
                obj.o[i]=data.c[(i-1)*periodlength]
                obj.c[i]=data.c[i*periodlength]
                obj.l[i]=data.l[i*periodlength]//set obj.l the latest hour low of that period to compare with outher hour within that period
                obj.h[i]=data.h[i*periodlength]//set obj.h the latest hour high of that period to compare with outher hour within that period
                for(a=0;a<periodlength;a++){
                    obj.l[i]=Math.min(data.l[i*periodlength-a],obj.l[i])
                     //3. Lowest price across the periodlength
                    obj.h[i]=Math.max(data.h[i*periodlength-a],obj.h[i])
                     //4. Highest price across the periodlength 
                }
                obj.t[i]=data.t[i*periodlength]
                //   Finally we put the data into the "obj", obj.t is means the timestamp at the end of that period
            }
        resolve(obj)
        })
    })
}