const fetch = require("node-fetch")



//https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id={client_id}&response_type=code&access_type={"offline"or"online"}&redirect_uri={redirect_uri}
// const zohoToken_back = {
// id: 1,
// access_token: '1000.ad931bcd7c047e656a9cea26b020f899.dd5bbf1ce0f4f6a3db8904df2658c8e0',
// refresh_token: '1000.0d7b009364b0aa94ae359b8dbe603bb3.9fe6fe2f64e33cad065a05d22f024045',
// user:"Bigcommerce"
// }
const zohoConfigs= {
clientId: "1000.6P30Y5CPK8RGC20PU9P1YNW8VLDS7A", //process.env.ZOHO_CLIENT_ID  //'';
clientSecret: "aa668a1cef53bde434a93a7069ee4386587167eb07", //process.env.ZOHO_CLIENT_SECRET  //''
code :'1000.dcd58682ca7eea708a93674e2bde2047.919e40813b226f371e5bce30d46ef20b',
organizationId:"684402960",
token :{},
};
const zohoToken = {
id: 1,
access_token: '1000.80f94459f926af5edeb4b4cfa2e3d0e2.62bcdaaea4011aac02a5d52c5b717aa5',
refresh_token: '1000.69d959a5462164a65d3bbd488b455dab.cbb7d9b700976ab534ef6076ebebf3c7',
user:"RaySolar"
}

/*
Set zohoToken configuration for call zoho inventory API
Parameter: token (object, all fields in PIM database tokens table)
  - id: unique id for record in tokens(auto increament) 
  - access_token: access token string
  - refresh_token: refresh token string
  - user: user case (name indicate where to use this token)
*/
async function setToken(token){
zohoToken.access_token = token.access_token,
zohoToken.refresh_token = token.refresh_token,
zohoToken.user = token.user,
zohoToken.id = token.id
}

/*
Get Token from zoho invenotry, only used for the first time to create new access token and fresh token based on selected fields
Set zohoConfigs properties for use
return: zoho Inventory response (Object)
*/
async function getToken(){
  const params = new URLSearchParams();
  params.append("code", zohoConfigs.code);
  params.append("client_id", zohoConfigs.clientId);
  params.append("client_secret", zohoConfigs.clientSecret);
  params.append("redirect_uri", "http://127.0.0.1:8080");
  params.append("grant_type", "authorization_code");

  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "post",
    body: params,
  });
  const response = await res.json();
  zohoConfigs.token = response;
  console.log(response);
  return response;
}
/*
Get new access token by using refresh token
Set zohoToken properties for use
return: zoho access token (string)
*/
async function getAccessToken() {
  const params = new URLSearchParams();
  params.append("refresh_token",zohoToken.refresh_token);
  params.append("client_id", zohoConfigs.clientId);
  params.append("client_secret", zohoConfigs.clientSecret);
  params.append("grant_type", "refresh_token");

  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "post",
    body: params,
  });
  const response = await res.json();
  zohoConfigs.token = response;
  zohoToken.access_token = response.access_token;
  console.log(response);
  return response.access_token;
}

/* 
  Get organization ID from zoho inventory (mainly for test whether zoho token is valid or not)
  
  return: Zoho Inventory Response (Object)
  scope required:ZohoInventory.settings.READ
*/
async function getOrganization(){
    const res = await fetch("https://inventory.zoho.com/api/v1/organizations", {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    const response = await res.json();
    console.log(response);
    return response;
  }
  /*
    API to get Items from zoho inventory based on page number
    Parameters: page (Number) 
    return: [items information] (Array)
    scope required:ZohoInventory.items.READ 
  */
  async function getItems(page,orgId=zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/items?page=${page}&organization_id=${orgId}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    return response.items;
  }
  /*
    Get all items from zoho inventory where item status is 'active'
    return: [All items information] (Array)
  */
  async function getAllItems(orgId=zohoConfigs.organizationId){
    let count = 0;
    let current = 0;
    let all_items = [];
    for(let i = 1; current != -1 ; i++){
      const items = await getItems(i,orgId);
      current = items.length;
      count += current;
      if(current === 0){
        current = -1;
      }
      for(const item of items){
        if(item.sku !== "" && item.status == 'active'){
          all_items.push(item);
        }
      }
      console.log(count)
    }
    console.log(all_items.length)
    return all_items;
  }
  /*
    API to get composite Items from zoho inventory based on page number
    Parameters: page (Number) 
    return: [composite items information] (Array)
    scope required:ZohoInventory.compositeitems.READ 
  */
  async function getCompositeItems(page,orgId=zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/compositeitems?organization_id=${orgId}&page=${page}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    // console.log(response);
    return response.composite_items
  }
  /*
    API to retrieve composite Items from zoho inventory based on composite item id
    Parameters: item_id (String, composite item id in zoho inventory) 
    return: [composite compoenent items information] (Array, the single items in composite item) 
    
    scope required:ZohoInventory.compositeitems.READ 
  */
  async function retrievingCompositeItems(item_id,orgId=zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/compositeitems/${item_id}?organization_id=${orgId}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    // console.log(response.composite_item.composite_component_items);
    return response.composite_item.composite_component_items;
  }
  
  /*
    API to get price list for items from zoho inventory based on price book id
    Parameters: priceBookId (String, price book id in zoho inventory) 
    return: [items information in price book] (Array, the items price information in price book)
    
    scope required:ZohoInventory.settings.READ 
  */
  async function retrievePriceList(priceBookId = '283036000011817003',orgId=zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/pricebooks/${priceBookId}?organization_id=${orgId}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    // console.log(response.pricebook.pricebook_items[0])
    return response.pricebook.pricebook_items;
  }
  /*
    API to get primary image for items from zoho inventory based on items id
    Parameters: itemId (String, item id in zoho inventory) 
    return: binary data of image (Bolb, the binary data of image) 
    scope required:ZohoInventory.items.READ 
  */
  async function getImageFromZoho(itemId,orgId=zohoConfigs.organizationId){
    return new Promise((res,rej)=>{
      setTimeout(async () => {
        const response = await fetch(`https://inventory.zoho.com/api/v1/items/${itemId}/image?organization_id=${orgId}`, {
          method: "GET",
          headers: {
            Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
          },
        });
        const data = await response.blob();
        const bufferdata = await data.arrayBuffer();
        let buffer = Buffer.from(bufferdata)
        // console.log(data)
        // console.log(buffer)
        res(buffer);
      }, 500);
    })
   
  }
  /*
    API to get item stock from zoho inventory based on items id (for updating stock)
    Parameters: itemId (String, item id in zoho inventory) 
    return: {item id, stock} (Object, only contains item id and stock) 
    scope required:ZohoInventory.items.READ 
  */
  async function getItemStock(itemId,orgId=zohoConfigs.organizationId){
    return new Promise((res,rej)=>{
      setTimeout(async () => {
        var zoho_response = await fetch(`https://inventory.zoho.com/api/v1/items/${itemId}?organization_id=${orgId}`, {
          method: "GET",
          headers: {
            Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
          },
        });
        var response = await zoho_response.json();
        const item = response.item
        if(!item){
          console.log(response)
        }
        const data = {
          id: item.item_id,
          stock: item.available_for_sale_stock ? item.available_for_sale_stock : 0,
          // is_update: true
        }
        // console.log(data)
        res(data)
      }, 500);
    })
    
  }
  /*
    API to get invoice line items information from zoho inventory based on invoice id
    Parameters: invoiceID (String, invoice id in zoho inventory) 
    return: [invoice line items information] (Array, line items information array of invoice) 
    scope required:ZohoInventory.invoices.READ 
  */
  async function getInvoiceItems(invoiceID,orgId=zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/invoices/${invoiceID}?organization_id=${orgId}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    console.log(response?.invoice?.line_items??response)
    return response.invoice.line_items;
  }
  /*
    API to get tax information from zoho inventory
    return: [taxes information] (Array, tax information array) 
    scope required:ZohoInventory.settings.READ 
  */
  async function getTaxList(orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/settings/taxes?organization_id=${orgId}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    // console.log(response)
    return response.taxes
  }
  /*
    API to get contact information from zoho inventory based on page number
    Parameters: page (Number, page number)
    
    return: [contacts information] (Array, contacts information array) 
    scope required:ZohoInventory.contacts.READ 
  */
  async function getContacts(page,orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/contacts?organization_id=${orgId}&page=${page}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    return response.contacts
  }
  /*
    API to create contact in zoho inventory
    Parameters: data (Object, fields for creating zoho inventoryy contact in zoho inventory API document) 
    
    return: zoho response (Object, response data from zoho inventory, check zoho inventory API document) 
    
    scope required: ZohoInventory.contacts.CREATE 
  */
  async function createContact(data, orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/contacts?organization_id=${orgId}`, {
      method: "POST",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
        'Content-Type': "application/json;charset=UTF-8"
      },
      body: JSON.stringify(data)
    });
    var response = await res.json();
    // console.log(response)
    // console.log(response.contact)
    return response
  }
  /*
    API to update contact in zoho inventory
    Parameters: 
    - contactId (String, contact id in zoho inventory)
    - data (Object, fields for updating zoho inventoryy contact in zoho inventory API document) 
    
    return: zoho response (Object, response data from zoho inventory, check zoho inventory API document) 
    scope required:ZohoInventory.contacts.UPDATE
  */
  async function updateContact(contactId,data,orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/contacts/${contactId}?organization_id=${orgId}`, {
      method: "PUT",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
      body: JSON.stringify(data)
    });
    var response = await res.json();
    // for(const name in response){
    //   console.log(name)
    // }
    // console.log(response)
    return response
  }
  
  /*
    API to get contact information in zoho inventory by contact id
    Parameters: 
    - contactId (String, contact id in zoho inventory)
    
    return: {contact information} (Object, contact information) 
    scope required:ZohoInventory.contacts.READ 
  */
  async function getContactByID(contactId,orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/contacts/${contactId}?organization_id=${orgId}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    // console.log(response.contact)
    return response.contact
  }
  /*
    API to update contact in zoho inventory
    Parameters: 
    - contactPersonId (String, contact person id in zoho inventory)
    - data (Object, fields for updating zoho inventoryy contact person in zoho inventory API document) 
    
    return: zoho response (Object, response data from zoho inventory, check zoho inventory API document) 
    scope required:ZohoInventory.contacts.UPDATE 
  */
  async function updateContactPerson(contactPersonId,data,orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/contacts/contactpersons/${contactPersonId}?organization_id=${orgId}`, {
      method: "PUT",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
      body: JSON.stringify(data)
    });
    var response = await res.json();
    // for(const name in response){
    //   console.log(name)
    // }
    // console.log(response)
    return response
  }
  
  /*
    API to create invoice in zoho inventory (draft invoice)
    Parameters: 
    - data (Object, fields for creating zoho inventoryy invoice in zoho inventory API document) 
    
    return: zoho response (Object, response data from zoho inventory, check zoho inventory API document) 
    scope required:ZohoInventory.invoices.CREATE 
  */
  async function createInvoice(data,orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/invoices?organization_id=${orgId}`, {
      method: "POST",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
        'Content-Type':'application/json;charset=UTF-8'
      },
      body: JSON.stringify(data)
    });
    // console.log(JSON.stringify(data))
    var response = await res.json();
    console.log(response)
    return response
  }
  
  /*
    API to mark invoice as sent in zoho inventory (without sending eamil to customer)
    Parameters: 
    - invoiceId (String, invoice ID in zoho inventory) 
    
    return: zoho response (Object, response data from zoho inventory, check zoho inventory API document) 
    
    scope required:ZohoInventory.invoices.CREATE
  */
  async function markInvoiceSent(invoiceId,orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/invoices/${invoiceId}/status/sent?organization_id=${orgId}`, {
      method: "POST",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    // console.log(response)
    return response
  }
  /*
    API to send notification email to cusotmer from zoho inventory when order placed in woocommerce websites
    Parameters: 
    - contactId (String, contact ID in zoho inventory) 
    - emailArray (Array, email address array)
    - orderID (String, Order ID in woocommerce websites)
    
    return: zoho response (Object, response data from zoho inventory, check zoho inventory API document) 
    scope required:ZohoInventory.contacts.CREATE 
  */
  async function sendNotificationEmailToContact(contactId, emailArray, orderID, orgId = zohoConfigs.organizationId){
    const content = {
      to_mail_ids:emailArray,
      subject: "Raysolar | Order Received",
      body: `Dear Customer,     <br/><br/>Your order(${orderID}) has been received. You will receive an invoice once your order is confirmed..    <br/>Thank you for your purchase!<br/><br/>Regards<br/>Raysolar`
    }
    var res = await fetch(`https://inventory.zoho.com/api/v1/contacts/${contactId}/email?organization_id=${orgId}`, {
      method: "POST",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
      body: JSON.stringify(content)
    });
    var response = await res.json();
    // console.log(response)
    return response
  }
  
  /*
    Test zoho token (whic is in database) is still valid or not
    Parameter: token (Object, all fields in PIM database tokens table)
      - id: unique id for record in tokens(auto increament) 
      - access_token: access token string
      - refresh_token: refresh token string
      - user: user case (name indicate where to use this token)
    
    return: token (Object) 
  */
  async function zohoDBTokenTest(token){
    const res = await getOrganization()
    // code 0 means success
    if(res.code !== 0){
      token.access_token = await getAccessToken()
    }
    setToken(token)
    return token;
  }
  /*
    Test last zoho access token (without database) is still valid or not
    if the token is expired, require a new token and set for config zoho token
  */
  async function zohoTokenTest(){
    const res = await getOrganization()
    // code 0 means success
    if(res.code !== 0){
      await getAccessToken()
    }
  }
  /*
    Get specific tax information from zoho inventory based on the tax percentage
    Parameter: 
      - percentage (Number, tax percentage)
    
    return: tax (Object) / null (null, if tax is not in zoho inventory, it will treat as international invoice which based on Raysolar should be no tax included)
  */
  async function getTax(percentage){
    const taxList = await getTaxList()
    for(const tax of taxList){
      if(percentage === tax.tax_percentage && (tax.tax_name.includes("HST")||tax.tax_name.includes("GST")||tax.tax_name.includes("Manitoba"))){
        return tax
      }
    }
    return null
  }
  /*
    Get specific customer from zoho inventory based on the customer object information
    Parameter: 
      - customerInfo {
        - contact_name (String, contact_name of customer)
        - company_name (String, company_name of customer)
      }(Object, customer breif infromation)
    
    return: {contact information} (Object, contact information) / null (null, if customer is not found in zoho inventory)
  */
  async function findCustomer(customerInfo){
    for(let i = 1; ;i ++){
      const contactList = await getContacts(i)
      if(contactList.length === 0){
        return null;
      }
      for(const contact of contactList){
        if(contact.contact_name === customerInfo.contact_name && contact.company_name === customerInfo.company_name){
          // console.log(contact)
          return contact
        }
      }
    }
  }
  /*
  scope required:ZohoInventory.settings.READ
  */
  async function getAllPriceBook(orgId=zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/pricebooks?organization_id=${orgId}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    // console.log(response.pricebook.pricebook_items[0])
    return response.pricebooks;
  }
  async function getAllPrice(priceBookId,orgId=zohoConfigs.organizationId){
    //283036000011817003
    var res = await fetch(`https://inventory.zoho.com/api/v1/pricebooks/${priceBookId}?organization_id=${orgId}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    return response.pricebook.pricebook_items;
  }
  async function updatePriceBook(pricebooksId,priceBookData,orgId=zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/pricebooks/${pricebooksId}?organization_id=${orgId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
      body:priceBookData
    });
    var response = await res.json();
    console.log(response)
  }
  async function getAllItemsObject(orgId=zohoConfigs.organizationId){
    let count = 0;
    let current = 0;
    let all_items = {};
    for(let i = 1; current != -1 ; i++){
      const items = await getItems(i,orgId);
      current = items.length;
      count += current;
      if(current === 0){
        current = -1;
      }
      for(const item of items){
        if(item.sku !== "" && item.status == 'active'){
          all_items[item.sku]=item;
        }
      }
      // console.log(count)
    }
    console.log('item get success')
    return all_items;
  }
  /*
  scope required:ZohoInventory.invoices.READ
  */
  async function getInvoiceByRefNum(referenceNum,orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/invoices?organization_id=${orgId}&reference_number=${referenceNum}`, {
      method: "GET",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
      },
    });
    var response = await res.json();
    return response.invoices?.[0]??null
  }
  /*
  scope required:ZohoInventory.invoices.UPDATE 
  */
  async function updateInvoice(invoiceId,data,orgId = zohoConfigs.organizationId){
    var res = await fetch(`https://inventory.zoho.com/api/v1/invoices/${invoiceId}?organization_id=${orgId}`, {
      method: "PUT",
      headers: {
        Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
        'Content-Type':'application/json;charset=UTF-8'
      },
      body: JSON.stringify(data)
    });
    // console.log(JSON.stringify(data))
    var response = await res.json();
    // console.log(response)
    return response
  }
  /*
  scope required:ZohoInventory.items.READ 
  */
  async function getImageFromZohoForURL(itemId,orgId=zohoConfigs.organizationId){
    return new Promise(async (res,rej)=>{
        const response = await fetch(`https://inventory.zoho.com/api/v1/items/${itemId}/image?organization_id=${orgId}`, {
          method: "GET",
          headers: {
            Authorization: "Zoho-oauthtoken " + zohoToken.access_token,
          },
        });
        const data = await response.blob();
        const bufferdata = await data.arrayBuffer();
        let buffer = Buffer.from(bufferdata)
        // console.log(data)
        // console.log(buffer)
        res(buffer);
    })
   
  }
  module.exports={
      getAccessToken,
      getOrganization,
      getAllItems,
      getCompositeItems,
      retrievingCompositeItems,
      retrievePriceList,
      getImageFromZoho,
      getImageFromZohoForURL,
      getItemStock,
      getInvoiceItems,
      zohoDBTokenTest,
      zohoTokenTest,
      setToken,
      getTax,
      findCustomer,
      createContact,
      updateContact,
      getContactByID,
      updateContactPerson,
      createInvoice,
      markInvoiceSent,
      sendNotificationEmailToContact,
      getAllPriceBook,
      getAllItemsObject,
      getInvoiceByRefNum,
      updateInvoice,
      getAllPrice,
      updatePriceBook
  }

//getToken()
//getAccessToken();
//getOrganization()