const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const config = {
  url:'https://ea7fe40c31.nxcli.io/',
  consumerKey:'ck_120dd155390b999a3349cdd7a634a9f6d129fdec',
  consumerSecret:'cs_12667020fb4d728505f7eb38020e7705cd0b7e4b',
  categories: null
}
var WooCommerce = null

/*
  Seting website Configuration to connect differnt woocommerce websites
  Parameter:
  - data {
    woocommerce_key (String, woocommerce key string)
    woocommerce_secret (String, woocommerce secret string)
    url (String, woocommerce base url string)
  }
*/

const data = {
  woocommerce_key:'ck_120dd155390b999a3349cdd7a634a9f6d129fdec',
  woocommerce_secret: 'cs_12667020fb4d728505f7eb38020e7705cd0b7e4b',
  url: 'https://ea7fe40c31.nxcli.io/'
}


function setConfig(data){
  config.consumerKey = data.woocommerce_key,
  config.consumerSecret = data.woocommerce_secret
  config.url = data.url
  config.categories = null
  WooCommerce = new WooCommerceRestApi({
    url: config.url, // Your store URL
    consumerKey: config.consumerKey, // Your consumer key
    consumerSecret: config.consumerSecret, // Your consumer secret
    version: 'wc/v2', // WooCommerce WP REST API version
    queryStringAuth: true
  });
}

/*
  Get all category from woocommerce website
  return [category information] (Array, elements are categories information object)
*/

async function wooGetCategory(){
  return await new Promise((res,rej)=>{
    WooCommerce.get("products/categories?per_page=100")
    .then((response) => {
      console.log(response.data);
      res(response.data)
    })
    .catch((error) => {
      // console.log(error.response.data);
      res(error.response.data)
    });
  })
}

/*
  Add new product in woocommerce website
  Parameter:
  - data (object, check in woocommerce API)
  return Woocommerce response (Object, check in woocommerce API)
*/
async function wooAddProduct(data){
  return await new Promise((res,rej)=>{
    WooCommerce.post("products", data)
    .then((response) => {
      // console.log(response.data);
      res(response.data)
    })
    .catch((error) => {
      console.log(error.response.data);
      console.log(data.attributes[0].options[0])
      res(error.response.data)
    });
  })
}
/*
  get all products from woocommerce website (mainly for test)
  return product object (Object, first product object in response)
*/
async function wooGetProduct(){
  WooCommerce.get("products")
  .then((response) => {
    // console.log(response.data[0]);
  })
  .catch((error) => {
    console.log(error.response.data);
  });
}
/*
  Add new product in woocommerce website
  Parameter:
  - item_id (String, item id in woocommerce)
  - data (object, check in woocommerce API)
  return Woocommerce response (Object, check in woocommerce API)
*/
async function wooUpdateProduct(item_id,data){
  return await new Promise((res,rej)=>{
    WooCommerce.put(`products/${item_id}`,data)
    .then((response) => {
      // console.log("Woocommerce updated success data:",response.data)
      res(response.data);

    })
    .catch((error) => {
      // console.log("Woocommerce updated error data:",error.response.data)
      res(error.response.data);
    });
  })
}
/*
  delete product in woocommerce website (currently not use)
  Parameter:
  - item_id (String, item id in woocommerce) 
  return Woocommerce response (Object, check in woocommerce API)
*/
async function wooDeleteProduct(item_id){
  WooCommerce.delete(`products/${item_id}`, {
    force: true
  })
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.log(error.response.data);
    });
}
/*
  Comparing the category name in zoho inventory and category name in woocommerce to find the category id in woocommerce
  Parameter:
  - category_name (String, category name in zoho inventory)
  return category ID (Number, 108 means uncategory)
*/
async function getCategoryID(category_name){
  if(!config.categories){
    config.categories = await wooGetCategory()
  }
  for(const category of config.categories){
    // console.log(category.name)
    if(category.name === category_name){
      // console.log(category.id);
      return category.id;
    }
  }
  return 108;
}
/*
  Get sales order details in woocommerce by order ID
  Parameter:
  - orderID (String, order ID in woocommerce)
  return sales order object (Object, check properties in woocommerce API)
*/
async function wooGetOrder(orderID){
  const orderInfo = await WooCommerce.get(`orders/${orderID}`)
  .then((response) => {
    // console.log(response.data);
    return response.data
  })
  .catch((error) => {
    console.log(error.response.data);
  });

  return orderInfo
}
/*
  Get customer details in woocommerce by customer ID
  Parameter:
  - customerId (String, customer ID in woocommerce)
  return Customer object (Object, check properties in woocommerce API)
*/
async function wooGetCustomer(customerId){
  const customerInfo = await WooCommerce.get(`customers/${customerId}`)
  .then((response) => {
    // console.log(response.data);
    return response.data
  })
  .catch((error) => {
    console.log(error.response.data);
  });

  return customerInfo
}
/*
  Get all attributes in woocommerce (use for setting generlink filter in generlink website)
  return [Attribute information] (Array, elements are attribute object in woocommerce)
*/
async function wooGetAttributes(){
  //products/attributes/4/terms
  const result = await WooCommerce.get("products/attributes")
  .then((response) => {
    return(response.data);
  })
  .catch((error) => {
    console.log(error.response.data);
  });
  return result
}
/*
  Get all attributes id in woocommerce (use for setting generlink filter in generlink website)
  return Object (Object, properties name is lowercase attribute name, properties value is attributes id)
*/
async function getAttributeIdList(){
  const attributeList = await wooGetAttributes()
  const result = {}
  for(const attribute of attributeList){
    result[attribute.name.toLowerCase()] = attribute.id
  }
  return result
}

async function wooGetAllProducts(){
  const productObject = {}
  let pageNum = 1
  while(true){
    const products = await wooGetProductByPage(pageNum++)
    if(products.length === 0){
      break
    }
    for(const product of products){
      productObject[product.sku]={
        name:product.name,
        id:product.id,
        type:product.type,
        status:product.status,
        description:product.description,
        short_description:product.short_description,
        sku:product.sku,
        price:product.price,
        regular_price:product.regular_price,
        stock_quantity:product.stock_quantity,
        in_stock:product.in_stock,
        categories:product.product,
        images:product.images,
        weight:product.weight,
        dimensions:product.dimensions,
        tax_status:product.tax_status
      }
    }
  }
  return productObject
}

async function wooBatchUpsertProducts(data){
  return await new Promise((res,rej)=>{
    WooCommerce.put(`products/batch`,data)
    .then((response) => {
      // console.log("Woocommerce updated success data:",response.data)
      res(response.data);

    })
    .catch((error) => {
      // console.log("Woocommerce updated error data:",error.response.data)
      res(error.response.data);
    });
  })
}
module.exports={
  wooGetCategory,
  wooAddProduct,
  wooGetProduct,
  wooUpdateProduct,
  getCategoryID,
  setConfig,
  wooGetCustomer,
  wooGetOrder,
  getAttributeIdList,
  wooGetAllProducts,
  wooBatchUpsertProducts
}

