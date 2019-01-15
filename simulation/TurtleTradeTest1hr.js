var currenttime=Math.floor(new Date().getTime()/1000)
const rangequery=require('../DBmoduleSimulation/rangequery')
const positionquery=require('../DBmoduleSimulation/positionquery')
const insertdataone=require('../DBmoduleSimulation/insertdataone')
// dataset is organized data after getting from the web
// dataset={h:[],l:[],o:[],c:[],t:[],tr:[],atr:[]}
//index of array indicates which period, present time will be i= 'var periods' given above, index of 1 will be farest period.
//if periodlength =24 means, one period = one day, h(high), l(low), o(opening price), c(closing), t(tiempstamp)
//tr is calulated for ATR
const sgMail = require('@sendgrid/mail');
const myAPIKEY=require('../APIKEY')
let key=myAPIKEY.APIKEY()
sgMail.setApiKey(key);
const myEmailList=require('../EmailList')
let email=myEmailList.EmailList()
console.log(email)
var periodlength=12 // 1 unit is 5 mins by default, 12 make current periodlength to 1 hrs.  
var periods=56 
//24 periods to get from DB, if above periodlength equals 12, which means we take 24hrs data from DB.
//if want to look back 55 periods remember to plus one,55+1=56, so we can find out 55 Max&Min. 
//recommend to fix periods at 56
var ATRperiods=14
const Startthreshold=300*periods*periodlength+1451031300 //start time must be later than startthreshold for enough data to make decision.
const Start=Startthreshold //simulation boundaries start time
const end=1547483700  //simulation boundaries end time  
var asset=3 
var roi=0
const startingasset=asset
const collectionname='BTCposition-1hr'
exec()
async function exec(){
    if(end>Start){
        var endthreshold=await rangequery.rangequery('BTCchartMins','t',end-300,end)
        if(Start>=Startthreshold && endthreshold){
            for(t=Start;t<end;t+=periodlength*300){
                var timeST=t-300*periodlength*periods
                var timeED=t
                var datadb= await rangequery.rangequery('BTCchartMins','t',timeST, timeED)
                dataset= await UpdateData(datadb,periods,periodlength)
                var TR= await TrueRange(dataset,periods)
                dataset.atr=await AverageTrueRange(ATRperiods,periods)
                var position=await positionquery.positionquery(collectionname,'t',timeED-300*periodlength)
                var MaxandMin20= await FindPeriodsMaxandMin(20)
                var MaxandMin10= await FindPeriodsMaxandMin(10)
                var MaxandMin55= await FindPeriodsMaxandMin(55)
                console.log(position)
                if(roi<=0){
                    if(position==null||position.s==0){
                        S1(position,dataset.c[periods],MaxandMin20.max,MaxandMin20.min,asset/3,collectionname)
                    }  
                    else if(position.s==1||position.s==-1){
                        S11(position,dataset.c[periods],MaxandMin10.max,MaxandMin10.min,asset/3,dataset.atr[periods],collectionname) 
                    }
                    else if(position.s==11||position.s==-11){
                        S12(position,dataset.c[periods],MaxandMin10.max,MaxandMin10.min,asset/3,dataset.atr[periods],collectionname) 
                    }
                    else {
                        S1clear(position,dataset.c[periods],MaxandMin10.max,MaxandMin10.min,asset/3,dataset.atr[periods],collectionname) 
                    }
                }
                else{
                    if(position==null||position.s==0){
                        S2(position,dataset.c[periods],MaxandMin55.max,MaxandMin55.min,asset/3,collectionname)
                    }  
                    else if(position.s==2||position.s==-2){
                        S21(position,dataset.c[periods],MaxandMin20.max,MaxandMin20.min,asset/3,dataset.atr[periods],collectionname) 
                    }
                    else if(position.s==21||position.s==-21){
                        S22(position,dataset.c[periods],MaxandMin20.max,MaxandMin20.min,asset/3,dataset.atr[periods],collectionname) 
                    }
                    else {
                        S2clear(position,dataset.c[periods],MaxandMin20.max,MaxandMin20.min,asset/3,dataset.atr[periods],collectionname) 
                    }
                }   
            }
            console.log(startingasset,'StartBalance')
            SendMail(asset)
        }
        else{console.log('Start time should be later start time threshold, pls move start time later than: ',Startthreshold, 'or End time exceed the latest data time.')}
    }
    else{console.log('End time must be later than Start time')}
}
// function s1stop(cp,MaxandMin10,MaxandMin20,atr){
//     if(cp<MaxandMin10.min||cp<(MaxandMin20.max-2*atr)){
//         console.log()
//     }
// }
function S1(Cposition,Cprice,max,min,commit,collectionname){
    //Cposition = at the moment the outstanding position
    //Cprice = current price
    //max/ min is 20 days Max & Min for S1 stage
    // Commit = is the amount to enter market if price is met
    console.log('S1 Check')
        var action={}
        action.t=t
    //S1 decision making
        if(Cprice>max){
            action.a=commit
            action.s=1
            action.balance=asset-commit
            action.price=(Cprice+max)/2
            action.avgprice=action.price
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('S1-buy')
        }    
        else if(Cprice<min){
            action.a=commit
            action.s=-1
            action.balance=asset-commit
            action.price=(Cprice+min)/2
            action.avgprice=action.price
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('S1-Short')
        }
        else{
            action.a=0
            action.s=0
            action.balance=asset
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('no move')
        }
    }
function S11(Cposition,Cprice,max,min,commit,atr,collectionname){
    //Cposition is the current position at the MK, so if we are at period 10, then we need to look at period 9 to find the last status position.

    console.log('S11 Check',atr)
    if(Cposition.s==1){
        var action={}
        action.t=t
        if(Cprice>(1/2*atr+Cposition.price)){
            action.a=Cposition.a+commit
            action.balance=asset-action.a
            action.s=11
            action.roi=roi
            action.price=(Cprice+(1/2*atr+Cposition.price))/2
            action.avgprice=(action.price*commit+Cposition.price*Cposition.a)/(action.a)
            insertdataone.insertdataone(collectionname,action)
            console.log('Buy S11',action)
        }
        else if(Cprice<(Cposition.price-2*atr)){
            action.profit=((Cposition.price-2*atr)/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+action.profit+Cposition.a
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price-2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buys -2ATR',action)
        }
        else if(Cprice<min){
            action.profit=(min/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=min
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buy min',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('No S11 Buy action')}
    }
    if(Cposition.s==-1){
        var action={}
        action.t=t
        if(Cprice<(Cposition.price-1/2*atr)){
            action.a=Cposition.a+commit
            action.balance=asset-action.a
            action.s=-11
            action.roi=roi
            action.price=(Cprice+(Cposition.price-1/2*atr))/2
            action.avgprice=(action.price*commit+Cposition.price*Cposition.a)/(action.a)
            insertdataone.insertdataone(collectionname,action)
            console.log('Short S11',action)
        }
        else if(Cprice>(Cposition.price+2*atr)){
            action.profit=(1-(Cposition.price+2*atr)/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price+2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts -2ATR',action)
        }
        else if(Cprice>max){
            action.profit=(1-max/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=max
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts- max',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('No S11 Short action')}
    }   
}
function S12(Cposition,Cprice,max,min,commit,atr,collectionname){
    //Cposition is the current position at the MK, so if we are at period 10, then we need to look at period 9 to find the last status position.
    
    console.log('S12 Check',atr)
    if(Cposition.s==11){
        var action={}
        action.t=t
        if(Cprice>(1/2*atr+Cposition.price)){
            action.a=Cposition.a+commit
            action.balance=asset-action.a
            action.s=12
            action.roi=roi
            action.price=(Cprice+(1/2*atr+Cposition.price))/2
            action.avgprice=(action.price*commit+Cposition.price*Cposition.a)/(action.a)
            insertdataone.insertdataone(collectionname,action)
            console.log('Buy S12',action)
        }
        else if(Cprice<(Cposition.price-2*atr)){
            action.profit=((Cposition.price-2*atr)/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+action.profit+Cposition.a
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price-2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buys -2ATR',action)
        }
        else if(Cprice<min){
            action.profit=(min/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=min
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buy min',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.roi=roi
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            insertdataone.insertdataone(collectionname,action)
            console.log('No S12 Buy action')}
    }
    if(Cposition.s==-11){
        var action={}
        action.t=t
        if(Cprice<(Cposition.price-1/2*atr)){
            action.a=Cposition.a+commit
            action.balance=asset-action.a
            action.s=-12
            action.roi=roi
            action.price=(Cprice+(Cposition.price-1/2*atr))/2
            action.avgprice=(action.price*commit+Cposition.price*Cposition.a)/(action.a)
            insertdataone.insertdataone(collectionname,action)
            console.log('Short S12',action)
        }
        else if(Cprice>(Cposition.price+2*atr)){
            action.profit=(1-(Cposition.price+2*atr)/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price+2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts -2ATR',action)
        }
        else if(Cprice>max){
            action.profit=(1-max/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=max
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts- max',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.roi=roi
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            insertdataone.insertdataone(collectionname,action)
            console.log('No S12 Short action')}
    }   
}
function S1clear(Cposition,Cprice,max,min,commit,atr,collectionname){
    //Cposition is the current position at the MK, so if we are at period 10, then we need to look at period 9 to find the last status position.
    
    console.log('S1clear Check',atr)
    if(Cposition.s==12){
        var action={}
        action.t=t
        if(Cprice<(Cposition.price-2*atr)){
            action.profit=((Cposition.price-2*atr)/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+action.profit+Cposition.a
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price-2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buys -2ATR',action)
        }
        else if(Cprice<min){
            action.profit=(min/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=min
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buy min',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('No S1 Clear action')}
    }
    if(Cposition.s==-12){
        var action={}
        action.t=t
        if(Cprice>(Cposition.price+2*atr)){
            action.profit=(1-(Cposition.price+2*atr)/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price+2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts -2ATR',action)
        }
        else if(Cprice>max){
            action.profit=(1-max/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=max
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts- max',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.roi=roi
            action.balance=Cposition.balance
            insertdataone.insertdataone(collectionname,action)
            console.log('No S1 Clear action')}
    }   
}
function S2(Cposition,Cprice,max,min,commit,collectionname){
    //Cposition = at the moment the outstanding position
    //Cprice = current price
    //max/ min is 20 days Max & Min for S1 stage
    // Commit = is the amount to enter market if price is met
    console.log('S2 Check')
        var action={}
        action.t=t
    //S1 decision making
        if(Cprice>max){
            action.a=commit
            action.s=2
            action.balance=asset-commit
            action.price=(Cprice+max)/2
            action.avgprice=action.price
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('S2-buy')
        }    
        else if(Cprice<min){
            action.a=commit
            action.s=-2
            action.balance=asset-commit
            action.price=(Cprice+min)/2
            action.avgprice=action.price
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('S2-Short')
        }
        else{
            action.a=0
            action.s=0
            action.balance=asset
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('no move')
        }
    }
function S21(Cposition,Cprice,max,min,commit,atr,collectionname){
    //Cposition is the current position at the MK, so if we are at period 10, then we need to look at period 9 to find the last status position.

    console.log('S21 Check',atr)
    if(Cposition.s==2){
        var action={}
        action.t=t
        if(Cprice>(1/2*atr+Cposition.price)){
            action.a=Cposition.a+commit
            action.balance=asset-action.a
            action.s=21
            action.roi=roi
            action.price=(Cprice+(1/2*atr+Cposition.price))/2
            action.avgprice=(action.price*commit+Cposition.price*Cposition.a)/(action.a)
            insertdataone.insertdataone(collectionname,action)
            console.log('Buy S21',action)
        }
        else if(Cprice<(Cposition.price-2*atr)){
            action.profit=((Cposition.price-2*atr)/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+action.profit+Cposition.a
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price-2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buys -2ATR',action)
        }
        else if(Cprice<min){
            action.profit=(min/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=min
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buy min',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('No S21 Buy action')}
    }
    if(Cposition.s==-2){
        var action={}
        action.t=t
        if(Cprice<(Cposition.price-1/2*atr)){
            action.a=Cposition.a+commit
            action.balance=asset-action.a
            action.s=-21
            action.roi=roi
            action.price=(Cprice+(Cposition.price-1/2*atr))/2
            action.avgprice=(action.price*commit+Cposition.price*Cposition.a)/(action.a)
            insertdataone.insertdataone(collectionname,action)
            console.log('Short S21',action)
        }
        else if(Cprice>(Cposition.price+2*atr)){
            action.profit=(1-(Cposition.price+2*atr)/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price+2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts -2ATR',action)
        }
        else if(Cprice>max){
            action.profit=(1-max/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=max
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts- max',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('No S21 Short action')}
    }   
}
function S22(Cposition,Cprice,max,min,commit,atr,collectionname){
    //Cposition is the current position at the MK, so if we are at period 10, then we need to look at period 9 to find the last status position.
    
    console.log('S22 Check',atr)
    if(Cposition.s==21){
        var action={}
        action.t=t
        if(Cprice>(1/2*atr+Cposition.price)){
            action.a=Cposition.a+commit
            action.balance=asset-action.a
            action.s=22
            action.roi=roi
            action.price=(Cprice+(1/2*atr+Cposition.price))/2
            action.avgprice=(action.price*commit+Cposition.price*Cposition.a)/(action.a)
            insertdataone.insertdataone(collectionname,action)
            console.log('Buy S22',action)
        }
        else if(Cprice<(Cposition.price-2*atr)){
            action.profit=((Cposition.price-2*atr)/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+action.profit+Cposition.a
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price-2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buys -2ATR',action)
        }
        else if(Cprice<min){
            action.profit=(min/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=min
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buy min',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.roi=roi
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            insertdataone.insertdataone(collectionname,action)
            console.log('No S22 Buy action')}
    }
    if(Cposition.s==-21){
        var action={}
        action.t=t
        if(Cprice<(Cposition.price-1/2*atr)){
            action.a=Cposition.a+commit
            action.balance=asset-action.a
            action.s=-22
            action.roi=roi
            action.price=(Cprice+(Cposition.price-1/2*atr))/2
            action.avgprice=(action.price*commit+Cposition.price*Cposition.a)/(action.a)
            insertdataone.insertdataone(collectionname,action)
            console.log('Short S22',action)
        }
        else if(Cprice>(Cposition.price+2*atr)){
            action.profit=(1-(Cposition.price+2*atr)/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price+2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts -2ATR',action)
        }
        else if(Cprice>max){
            action.profit=(1-max/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=max
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts- max',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.roi=roi
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            insertdataone.insertdataone(collectionname,action)
            console.log('No S12 Short action')}
    }   
}
function S2clear(Cposition,Cprice,max,min,commit,atr,collectionname){
    //Cposition is the current position at the MK, so if we are at period 10, then we need to look at period 9 to find the last status position.
    
    console.log('S2clear Check',atr)
    if(Cposition.s==22){
        var action={}
        action.t=t
        if(Cprice<(Cposition.price-2*atr)){
            action.profit=((Cposition.price-2*atr)/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+action.profit+Cposition.a
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price-2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buys -2ATR',action)
        }
        else if(Cprice<min){
            action.profit=(min/Cposition.avgprice-1)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=min
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Buy min',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.balance=Cposition.balance
            action.roi=roi
            insertdataone.insertdataone(collectionname,action)
            console.log('No S2 Clear action')}
    }
    if(Cposition.s==-22){
        var action={}
        action.t=t
        if(Cprice>(Cposition.price+2*atr)){
            action.profit=(1-(Cposition.price+2*atr)/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=Cposition.price+2*atr
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts -2ATR',action)
        }
        else if(Cprice>max){
            action.profit=(1-max/Cposition.avgprice)*Cposition.a
            action.balance=Cposition.balance+Cposition.a+action.profit
            roi=action.profit/asset
            action.roi=roi
            asset=action.balance
            action.s=0
            action.price=max
            insertdataone.insertdataone(collectionname,action)
            console.log('Clear Shorts- max',action)
        }
        else{
            action.s=Cposition.s
            action.a=Cposition.a
            action.price=Cposition.price
            action.avgprice=Cposition.avgprice
            action.roi=roi
            action.balance=Cposition.balance
            insertdataone.insertdataone(collectionname,action)
            console.log('No S2 Clear action')}
    }   
}
function SendMail(report){
    console.log('sending')
    const msg = {
        to: 'hsinyang@bu.edu',
        from: 'timlai@tokenite.co',
        subject: collectionname,
        text: 'what!!',
        html: '<h>'+report+'<h>',
      };
    console.log(msg)
    sgMail.send(msg);
    console.log('sent')
}
function TrueRange(dataset,periods){
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
function AverageTrueRange(ATRperiods,periods){
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
        //console.log(ATR)
        resolve(ATR)
    })
}
function FindPeriodsMaxandMin(p){
    //find certain max&min in certain periods. 
    //compare start from array[periods - p +1 ] to array[periods]
    //try to find 20 day Max & Min, compare start from array[55-20=25] to array[55](in last 55 days data)
    //array[0] is Nah from dataset, so skip
    return new Promise((resolve,reject)=>{
var max=dataset.h[periods-p]
var min=dataset.l[periods-p]
    for(i=periods-p;i<periods;i++){
        max=Math.max(dataset.h[i],max)
        min=Math.min(min,dataset.l[i])
    }
    var MaxandMin={max:max,min:min}
    console.log(MaxandMin,dataset.c[periods],dataset.t[periods])
    resolve(MaxandMin)  
})
}
function UpdateData(data,periods,periodlength){
//each document from DB by default is 5 mins, hence periodlength = 1 =>5 mins, if period counted by 1 hrs, then preiodlength=12 (60/5). 
//periods means how many period of data wanna look back to. 
//(if periods = 5 , periodlength=12, look back 5 hrs, increments= 1hr)(if periods=5, periodlength=288, look back 5 days, increments= 1 day)
    return new Promise((resolve,reject)=>{
        //Data get from the website is sorted by hour per array
            var obj={t:[],o:[],c:[],l:[],h:[],tr:[],atr:[]}
            for(i=1;i<=periods;i++){
                //i = periods count i: 0=farest time period, i:periods = current time
                //for every period, we need 1. opening price at beginning of that period= closing price of previous period
                //2. closeing price at end of period
                if(data[i]){
                obj.o[i]=data[(i-1)*periodlength].c
                obj.c[i]=data[i*periodlength].c
                obj.l[i]=data[i*periodlength].l//set obj.l the latest hour low of that period to compare with outher hour within that period
                obj.h[i]=data[i*periodlength].h//set obj.h the latest hour high of that period to compare with outher hour within that period
                for(a=0;a<periodlength;a++){
                    obj.l[i]=Math.min(data[i*periodlength-a].l,obj.l[i])
                     //3. Lowest price across the periodlength
                    obj.h[i]=Math.max(data[i*periodlength-a].h,obj.h[i])
                     //4. Highest price across the periodlength 
                }
                obj.t[i]=data[i*periodlength].t
                //   Finally we put the data into the "obj", obj.t is means the timestamp at the end of that period
            }
        else{break}
        }
        resolve(obj)
        })
}