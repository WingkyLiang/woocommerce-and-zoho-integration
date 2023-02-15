const zohoAPI = require("./API/zohoInventoryAPI.js")

const woo_connector = require('./connector/zohoInventory_woocommerce_connector.js')

const express = require("express")
const converter = require('json-2-csv')
const fs = require("fs")
const path = require(`path`);
const Multer = require('multer');
// const {Storage} = require('@google-cloud/storage');
const bodyParser = require("body-parser")
// const { BucketActionToHTTPMethod } = require("@google-cloud/storage/build/src/bucket.js")
// const { FileExceptionMessages } = require("@google-cloud/storage/build/src/file.js")
// const winston = require("winston")
// const {LoggingWinston} = require("@google-cloud/logging-winston") 
// const mysql = require("promise-mysql")
// const storage = new Storage();
const app = express();

app.enable('trust proxy');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

//add header for CORS
app.use(function (req, res, next) {    // 解决跨域问题
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS")
  res.header("Access-Control-Allow-Credentials","true")
  res.header("X-Powered-by",'3.2.1')    
  res.header("Content-Type","application/json;charset=utf-8")
  next()
}); 

// test only
app.get('/', async (req, res) => {
  // pool = pool || (await createPool())
  res.send("hello google app engine");
});
//After set up refeshtoken for quickbooks below, visit the this endpoint to set refeshToken up (if needed)
// app.get('/setUpQuickBooksRefreshToken', async (req, res) => {
//   // pool = pool || (await createPool())
//   const file = bucket.file('quickbooks_refreshToken.txt');
//   // quickbooks refershtoken paste below
//   file.save("AB11665170437ICys7cmIftE7sIrf00jIjn48IzGKeqlfMsnPD",(err)=>{if(err){res.send(err)}else{res.send('refresh token set up successfully')}})
// });
app.get('/readTmpFile', async (req, res) => {
  // pool = pool || (await createPool())
  const testFile = bucket.file('quickbooks_refreshToken.txt');
  // testFile.createReadStream()
  // .on('error',(err)=>res.send(err))
  // .on('data',(data)=>stringResponse.push(data))
  // .end('end',()=>{res.send(stringResponse)})
  const refreshToken = await new Promise((response,rej)=>{testFile.download((err,contents)=>response(contents))})
  res.send(refreshToken)
});
app.get('/image/:id', async (req, res) => {
  // pool = pool || (await createPool())
  const itemID = req.params.id
  await zohoAPI.zohoTokenTest()
  const image = await zohoAPI.getImageFromZohoForURL(itemID)
  const file = Buffer.from(image,'base64')
  // res.writeHead(200, {
  //     'Content-Type': 'image/jpeg',
  //     'Content-Length': file.length
  //   });
  res.setHeader('Content-Type','image/jpeg')
  res.setHeader('Content-Length',file.length)
  res.send(file);

});

app.post('/orderCreated', async (req, res) => {
  // pool = pool || (await createPool())
  const salesOrder = {
    siteName:"wordpress",
    orderID:req.body.data.id
  }
  //console.log(req.body)
  const scope = req.body.scope.split('/')[2]??null
  if(woocommerceAPI.checkStoreHash(req.body.producer)&&scope==='created'){
    res.send("place order success");
    await zohoInventory_woocommerce_connector.placeOrder(salesOrder)
  }else{
    res.send("place order failed");
  }
  
});

app.post('/salesOrder/statusUpdated', async (req, res) => {
  // pool = pool || (await createPool())
  const salesOrder = {
    siteName:"wordpress",
    orderID:req.body.data.id
  }
  console.log(req.body)
  // const scope = req.body.scope.split('/')[2]??null
  // if(bigcommerceAPI.checkStoreHash(req.body.producer)&&scope==='created'){
  //   res.send("place order success");
  //   await bigcommerce_connector.placeOrder(salesOrder)
  // }else{
  //   res.send("place order failed");
  // }
  
});

app.post('/salesOrder/updated', async (req, res) => {
  // pool = pool || (await createPool())
  const salesOrder = {
    siteName:"wordpress",
    orderID:req.body.data.id
  }
  const scope = req.body.scope.split('/')[2]??null
  if(bigcommerceAPI.checkStoreHash(req.body.producer)&&scope==='updated'){
    res.send("place order success");
    await zohoInventory_woocommerce_connector.updateOrder(salesOrder)
  }else{
    res.send("place order failed");
  }
  
});



app.post('/webhook', async (req, res) => {
  // pool = pool || (await createPool())
  console.log(req.body)
  /*quickbooks webhooks*/
  // console.log(req.body.eventNotifications?.[0]?.dataChangeEvent.entities)
  /*clover webhhoks*/
  console.log(req.body.merchants)
  console.log(req.body.merchants['5ECQ502C4PZV1']?.[0])
  console.log(req.body.merchants['5ECQ502C4PZV1']?.[0]?.object)
  res.send("hello google app engine");
});
app.post('/clover/members', async (req, res) => {
  // pool = pool || (await createPool())
  console.log(req.body)
  /*quickbooks webhooks*/
  // console.log(req.body.eventNotifications?.[0]?.dataChangeEvent.entities)
  /*clover webhhoks*/
  const response = req.body?.merchants?.['5ECQ502C4PZV1']?.[0]
  console.log(response)
  console.log(response.type)
  console.log(response?.object?.emailAddresss?.[0].emailAddresses)
  if(response &&  response.type == "CREATE" && response?.object?.emailAddresses?.[0].emailAddress){
    const client = {
      email: response.object?.emailAddresses?.[0].emailAddress??"",
      firstName: response.object?.firstName??"",
      lastName: response.object?.lastName??"",
      address: response.object?.addresses?.[0]?.address1??"",
      city:response.object?.addresses?.[0]?.city??"",
      state: response.object?.addresses?.[0]?.state??"",
      zip: response.object?.addresses?.[0]?.zip??"",
      phone: response.object?.phoneNumbers?.[0].phoneNumber??""
    }
    console.log(client)
    await mailchimpAPI.addMember(client)
  }
  // console.log(req.body.merchants)
  // console.log(req.body.merchants['5ECQ502C4PZV1']?.[0])
  // console.log(req.body.merchants['5ECQ502C4PZV1']?.[0]?.object)
  res.send("hello google app engine");
});

app.get('/zohoInventory/dailybackup',async (req,res)=>{
  // pool = pool || (await createPool())
  await zohoAPI.zohoTokenTest()
  const allPriceItems = await zohoAPI.getAllPrice('1773918000002188008')
  console.log(allPriceItems)
  const regex = / /g
  const dateString = new Date().toDateString()
  const convertedString = dateString.replace(regex,'_')
  const file = daily_backup_bucket.file(`${convertedString}.txt`)
  // let content = 'Item ID\tItem Name\tPriceList Rate\n'
  // for(const priceItem of allPriceItems){
  //   content = content + `${priceItem.item_id}\t${priceItem.name}\t${priceItem.pricebook_rate}\n`
  // }
  file.save(JSON.stringify(allPriceItems),(err)=>{if(err){res.send(err)}else{res.send('refresh token set up successfully')}})
    //console.log(sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss'))
})
app.get('/zohoInventory/dailybackup/csv',async (req,res)=>{
  // pool = pool || (await createPool())
  await zohoAPI.zohoTokenTest()
  const allPriceItems = await zohoAPI.getAllPrice('1773918000002188008')
  const recordItems = []
  for(const priceItem of allPriceItems){
    recordItems.push({'Item ID':`${priceItem.item_id}\t`,'Item Name':priceItem.name,'PriceList Rate':priceItem.pricebook_rate})
  }
  const testFile = await daily_backup_bucket.getFiles().then((data)=> data[0])
  if(testFile.length > 2){
    let oldestFile = null
    for(const file of testFile){
      if(!oldestFile){
        const timeStamp = new Date(file.name.split('.')[0]).getTime()
        oldestFile = {
          name:file.name,
          timeStamp: timeStamp
        }
      }else{
        const timeStamp = new Date(file.name.split('.')[0]).getTime()
        if(oldestFile.timeStamp > timeStamp){
          oldestFile = {
            name:file.name,
            timeStamp: timeStamp
          }
        }
      }
    }
    const file = daily_backup_bucket.file(oldestFile.name)
    file.delete((err,apiResponse)=>{
      if(err){
        console.log(err)
      }else{
        console.log(apiResponse)
        console.log(oldestFile.name + " has been deleted!")
      }
    })
  }
  const csvString = converter.json2csv(recordItems,(err,csv)=>{
    if(err){
      console.log(err)
      return ''
    }
    console.log(`This is in callback function: `)
    console.log(csv)
    const dateString = new Date().toDateString()
    const file = daily_backup_bucket.file(`${dateString}.csv`)
    file.save(csv,(err)=>{if(err){res.send(err)}else{res.send('refresh token set up successfully')}})
    return csv
  })
  
  // let content = 'Item ID\tItem Name\tPriceList Rate\n'
  // for(const priceItem of allPriceItems){
  //   content = content + `${priceItem.item_id}\t${priceItem.name}\t${priceItem.pricebook_rate}\n`
  // }
  
    //console.log(sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss'))
})
app.get('/zohoInventory/recover/daily',async (req,res)=>{
  // pool = pool || (await createPool())
  console.log(`username: ${req.query.username}, password: ${req.query.password}, fileName: ${req.query.fileName}`)
  const testFile = daily_backup_bucket.file(`${req.query.fileName}.txt`);
  const refreshToken = await new Promise((response,rej)=>{testFile.download((err,contents)=>response(contents))})
  res.send(refreshToken)
})
app.get('/zohoInventory/backupFiles',async (req,res)=>{
  // pool = pool || (await createPool())

  // const testFile = daily_backup_bucket.getFiles((err,files)=>{
  //   if(err){
  //     res.send(err)
  //     return null
  //   }
  //   res.send("success")
  //   for(const file of files){
  //     console.log(file)
  //   }
  //   return files
  // })
  const testFile = await daily_backup_bucket.getFiles().then((data)=> data[0])
  
  if(testFile.length > 2){
    let oldestFile = null
    for(const file of testFile){
      if(!oldestFile){
        const timeStamp = new Date(file.name.split('.')[0]).getTime()
        oldestFile = {
          name:file.name,
          timeStamp: timeStamp
        }
      }else{
        const timeStamp = new Date(file.name.split('.')[0]).getTime()
        if(oldestFile.timeStamp > timeStamp){
          oldestFile = {
            name:file.name,
            timeStamp: timeStamp
          }
        }
      }
    }
    const file = daily_backup_bucket.file(oldestFile.name)
    file.delete((err,apiResponse)=>{
      if(err){
        console.log(err)
      }else{
        console.log(apiResponse)
        console.log(oldestFile.name + " has been deleted!")
      }
    })
  }
  res.send("success")
})
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

process.on('unhandledRejection', err => {
  console.error(err);
  throw err;
});
// will delete later
// function test(){
//   const dateString = new Date().toDateString()
//   console.log(new Date(dateString).getTime())
// }
const stayAlive = async (mainAsyncFunc) => {
  const intervalId = setInterval(sendAppRequest, 60000);
  await mainAsyncFunc();
  clearInterval(intervalId);
};

const sendAppRequest = () => {
  console.log("Stayin alive");
  axios.get(appUrl);
};

