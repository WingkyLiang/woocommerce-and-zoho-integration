const wordpressAPI = require("../API/wordpressAPI.js")
const woocommerceAPI = require("../API/woocommerceAPI.js")
const zohoAPI = require("../API/zohoInventoryAPI.js")

/*  
  Test zoho access token stored in PIM database is valid or not
  if it is expired, get a new access token from zoho inventory and update it in PIM databse
*/ 
async function testZohoToken(user,connection){
    const token = await database.getTokenFromDatabase(user,connection)
    zohoAPI.setToken(token[0])
    const update_token = await zohoAPI.zohoDBTokenTest(token[0])
    database.updateToken(update_token,connection)
}
  async function getStcok(items){
    const items_stock = {}
    for(const item of items){
      const item_stock = await zohoAPI.getItemStock(item.item_id)
      items_stock[item.item_id] = item_stock
    }
    console.log(Object.keys(items_stock).length)
    return items_stock
  }
  /*
    synchronize data between zoho inventory and PIM database (for activate items)
  */
  async function syncDataFromZohoToDatabase(connection){
    await testZohoToken("zoho_inventory_daily_update",connection)
    const items = await zohoAPI.getAllItems();
    const sites = await database.getSites(connection)
    const all_items_id = await database.getAllItemsID(connection)
    /*
      items_check: for checking the items in PIM database is still in zoho inventory activate items
      - false: items no longer in zoho inventory activate items
      - true: items still in zoho inventory activate items
      - initial: all false
    */ 
    const items_check = {}
    let items_stock = {}
    for(const item_id of all_items_id){
      items_check[item_id.id] = false
    }
    items_stock = await getStcok(items)
    console.log(Object.keys(items_stock).length)
    /* the loop is for insert new item into PIM database */
    for(const item of items){
      items_check[item.item_id] = true
      /* insert zoho intenvory items into PIM databse, if the items is in PIM, database will throw error information due to primary key (zoho item id) duplicate */
      const result = await database.insertItem(item,items_stock[item.item_id],sites,connection)
      if(result === 1){
        const image = await zohoAPI.getImageFromZoho(item.item_id)
        const data = {id:item.item_id,image:image,image_document_id:item.image_document_id}
        await database.insertImage(data,connection)
      }else if(result === 2){
        const image = await zohoAPI.getImageFromZoho(item.item_id)
        const data = {id:item.item_id,image:image,image_document_id:item.image_document_id}
        await database.updateImage(data,connection)
      }
    }
    /* the loop is for update items infromation in PIM database */
    for(const item of items){
      /* items table fields in PIM database*/
      const data = {
        name: item.item_name ? item.item_name : item.name,
        sku: item.sku,
        b2c_price: item.rate,
        stock: items_stock[item.item_id].stock, //item.available_stock; item.stock_on_hand;
        description: item.description,
        brand: item.brand ? item.brand : "",
        weight: item.cf_weight ? item.cf_weight : "",
        type: item.cf_type ? item.cf_type: null, //item_type;
        box_length: item.cf_box_length_inches ? item.cf_box_length_inches : "",
        box_height: item.cf_box_height_inches ? item.cf_box_height_inches : "",
        box_width: item.cf_box_width_inches ? item.cf_box_width_inches : "",
        allow_back_order: item.cf_allow_back_order_unformatted ? item.cf_allow_back_order_unformatted : false,
        show_in_woocommerce: item.cf_show_in_woocommerce_unformatted ? item.cf_show_in_woocommerce_unformatted: false,
        ship_quote_req: item.cf_shipping_quote_required_unformatted ? item.cf_shipping_quote_required_unformatted : false,
        item_specs: item.cf_item_spec_sheet_unformatted ? item.cf_item_spec_sheet_unformatted : null,
        image_document_id: item.image_document_id ? item.image_document_id:null,
        category_in_woocommerce: item.cf_category_in_woocommerce ? item.cf_category_in_woocommerce : null
      }
      const product_description = database.generlinkFilter(data.description)
      const changedRow = await database.updateItem(item.item_id,data,connection);
      /* if there is a row changed, then set is_updated as true */
      if(changedRow !== 0 && changedRow !== -1){
        await database.updateItem(item.item_id,{is_updated:true},connection);
        for(const site of sites){
          if(site.name == "raysolar_generlink" && (data.category_in_woocommerce == 'GenerLink'||data.category_in_woocommerce == "Generators")){
            if(product_description.existsFilter){
              /* raysolar_generlink table fields in PIM database*/
              const gennerlink_data = {
                is_show:true,
                portable_generator_wattage:product_description.portable_generator_wattage,
                surge_protection: product_description.surge_protection,
                plug_options: product_description.plug_options,
                bluetooth: product_description.bluetooth,
                cord_wire_options: product_description.cord_wire_options
              }
              await database.updateRecordsForWebsites(site.name,item.item_id,gennerlink_data,connection)
            }else{
              await  database.updateRecordsForWebsites(site.name,item.item_id,{is_show:true},connection)
            }
          }else if(site.name == "raysolar_woo_b2c"){
            if(data.category_in_woocommerce != "GenerLink"){
              await database.updateRecordsForWebsites(site.name,item.item_id,{is_show: true},connection)
            }
          }else{
            await database.updateRecordsForWebsites(site.name,item.item_id,{is_show: true},connection)
          }
        }
      }
    }
    /* check items_checck, if it is false, then set show_in_woocommerce as false (no longer show in woocommerce) */
    for(const item_id in items_check){
      if(!items_check[item_id]){
        await database.updateItem(item_id,{show_in_woocommerce:false},connection);
        for(const site of sites){
          await database.updateRecordsForWebsites(site.name,item_id,{is_show: false},connection)
        }
      }else{
        await database.updateItem(item_id,{show_in_woocommerce:true},connection);
        for(const site of sites){
          await database.updateRecordsForWebsites(site.name,item_id,{is_show: true},connection)
        }
      }
    }
  }
  
  /*
    synchronize composite items between zoho inventory and woocommerce
  */
  async function updateCompositItems(connection){
    await testZohoToken("zoho_inventory_daily_update",connection)
    let composite_items = []
    /* to get all composite items in one array */
    for(let i = 1; ;i++){
      const items = await zohoAPI.getCompositeItems(i);
      console.log(items.length)
      if(items.length === 0){
        break;
      }
      composite_items = composite_items.concat(items);
    }
    const sites = await database.getSites(connection)
    /* to insert and update compositie time information into composite_items table, insert items in composite items into items table */
    for(const composite_item of composite_items){
      const item = await database.getItemFromDatabase(composite_item.composite_item_id,connection);
      /* set is_composite_item flag in items table to mark composite items */
      if(item.length > 0 && !item[0].is_composite_item){
        database.updateItem(composite_item.composite_item_id,{is_composite_item:true},connection)
        const mapped_items = await zohoAPI.retrievingCompositeItems(composite_item.composite_item_id)
        for(const mapped_item of mapped_items){
          const data = {
            id: `${composite_item.composite_item_id}-${mapped_item.item_id}`, ///???? item_id or mapped_item_id
            main_sku: composite_item.sku,
            sub_sku: mapped_item.sku,
            quantity: mapped_item.quantity
          }
          const mapped_item_in_database = await database.getItemFromDatabase(mapped_item.item_id,connection);
          if(mapped_item_in_database.length > 0){
            database.insertCompositeItem(data,connection);
          }else{
            await database.insertItem(mapped_item,sites,connection);
            database.insertCompositeItem(data,connection);
  
          }
          
        }
      }
      /* update composite item */
      if(item.length > 0 && item[0].is_updated){
        await database.deleteMappedItem(composite_item,connection);
        database.updateItem(composite_item.composite_item_id,{is_composite_item:true},connection)
        const mapped_items = await zohoAPI.retrievingCompositeItems(composite_item.composite_item_id)
        /* insert and update mapped items into PIM database (composite_items table and items table) */
        for(const mapped_item of mapped_items){
          const data = {
            id: `${composite_item.composite_item_id}-${mapped_item.item_id}`, ///???? item_id or mapped_item_id
            main_sku: composite_item.sku,
            sub_sku: mapped_item.sku,
            quantity: mapped_item.quantity
          }
          const mapped_item_in_database = await database.getItemFromDatabase(mapped_item.item_id,connection);
          if(mapped_item_in_database.length > 0){
            database.insertCompositeItem(data,connection);
          }else{
            const result = await database.insertItem(mapped_item,sites,connection);
            if(result === 1){
              const image = await zohoAPI.getImageFromZoho(mapped_item.item_id)
              const image_data = {id:mapped_item.item_id,image:image}
              await database.insertImage(image_data,connection)
            }else if(result === 2){
              const image = await zohoAPI.getImageFromZoho(mapped_item.item_id)
              const image_data = {id:mapped_item.item_id,image:image,image_document_id:mapped_item.image_document_id}
              await database.updateImage(image_data,connection)
            }
            database.insertCompositeItem(data,connection);
  
          }
          
        }
      }
    }
  }
  
 
  
  /* synchronized stock among zoho inventory, PIM database and woocommerce based on the created invoice in zoho */
  async function updateInvoiceItems(invoiceID,connection){
    await testZohoToken("zoho_inventory_invoice_update",connection)
    const invoiceItems = await zohoAPI.getInvoiceItems(invoiceID)
    const sites = await database.getSites(connection)
    for(const invoiceItem of invoiceItems){
      const item = await zohoAPI.getItemStock(invoiceItem.item_id)
      /* update stocks in PIM database */
      const changedRow = await database.updateItem(item.id,item,connection);
      if(changedRow !== 0 && changedRow !== -1){
        /* update stocks in all woocommerce websites */
        for(const site of sites){
          const site_item = await database.getRecordsForWebsites(site.name,item.id,connection)
          if(site_item.length>0 && site_item[0].item_id_in_site){
            woocommerceAPI.setConfig(site)
            woocommerceAPI.wooUpdateProduct(site_item[0].item_id_in_site,{stock_quantity:item.stock})
          }
        }
      }
    }
  }
  
  /* auto create or update customer, auto create invoice in zoho inventory when order placed on woocommerce*/
  async function placeOrder(salesOrder,connection){
    await testZohoToken("zoho_inventory_full_access",connection)
    const sites = await database.getSites(connection)
    let payment_terms = 0
    console.log(salesOrder)
    /* figure out which woocommerce websites placed the sales order*/
    let target_site = null
    for(const site of sites){
      if(site.name === salesOrder.siteName){
        target_site = site
        break;
      }
    }
    if(target_site){
      woocommerceAPI.setConfig(target_site)
    }
    let contact_result = null
    /* get sales order details */
    const sales_info_woo = await woocommerceAPI.wooGetOrder(salesOrder.orderID)
    const siteOrder = {
      siteName:salesOrder.siteName,
      line_items: sales_info_woo.line_items
    } 
    /* get line items' zoho inventory item id from PIM database based on item id in woocommerce site */
    const items_in_zoho = await getSalesItemInfo(siteOrder,connection)
    const line_items_in_zoho = []
    /* get tax information from zoho inventory */
    const tax = await zohoAPI.getTax(sales_info_woo.tax_lines[0].rate_percent)
    /* to generate line_items details for creating zoho invoice */
    for(const item of items_in_zoho){
      const product_description = database.generlinkFilter(item.description)
      // const unit = await getItemUnit(item.id)
      // console.log("unit is :", unit)
      const line_item = {
        item_id:item.id,
        name: item.name,
        description: product_description.description,
        rate: siteOrder.siteName.includes("b2b") ? (item.b2b_price?item.b2b_price:item.b2c_price) : item.b2c_price,
        quantity: item.quantity,
        // unit: unit,
        item_total: item.item_total
      }
      /* set tax for items */
      if(tax){
        line_item['tax_id'] = tax.tax_id
        line_item['tax_name'] = tax.tax_name
        line_item['tax_type'] = tax.tax_type
        line_item['tax_percentage'] = tax.tax_percentage
      }
      line_items_in_zoho.push(line_item)
    }
    /* set shipping fee for invoice */
    const shipping_item = {
      item_id:"283036000000422219",
      name:"SHIPPING",
      description: sales_info_woo.shipping_lines[0].method_title,
      rate:sales_info_woo.shipping_lines[0].total,
      quantity:1,
      item_total: sales_info_woo.shipping_lines[0].total
    }
    if(tax){
      shipping_item['tax_id'] = tax.tax_id
      shipping_item['tax_name'] = tax.tax_name
      shipping_item['tax_type'] = tax.tax_type
      shipping_item['tax_percentage'] = tax.tax_percentage
    }
    line_items_in_zoho.push(shipping_item)
    // const sales_order_data = {
    //   date: sales_info_woo.date_created.split("T")[0],
    //   reference_number: sales_info_woo.id,
    //   line_items: line_items_in_zoho
    // }
  
  
    /* custoer_brief use to find out whether the customer is already in zoho inventory */
    const customer_brief = {
      contact_name: sales_info_woo.billing.first_name + " " +sales_info_woo.billing.last_name,
      company_name:sales_info_woo.billing.company === "" ? sales_info_woo.billing.first_name + sales_info_woo.billing.last_name : sales_info_woo.billing.company,
      email:sales_info_woo.billing.email
    }
    /* full customer data and fields need to insert/update into zoho inventory*/
    const customer_data = {
      contact_name: sales_info_woo.billing.first_name + " " + sales_info_woo.billing.last_name,
      company_name: sales_info_woo.billing.company === "" ? sales_info_woo.billing.first_name + sales_info_woo.billing.last_name : sales_info_woo.billing.company,
      currency_id: "283036000000000101",
      payment_terms: 0,
      contact_type: "customer",
      customer_sub_type: 'business',
      billing_address:{
        address: sales_info_woo.billing.address_1,
        street2: sales_info_woo.billing.address_2,
        city: sales_info_woo.billing.city,
        state: sales_info_woo.billing.state,
        zip: sales_info_woo.billing.postcode,
        country: sales_info_woo.billing.country
      },
      shipping_address:{
        address: sales_info_woo.shipping.address_1,
        street2: sales_info_woo.shipping.address_2,
        city: sales_info_woo.shipping.city,
        state: sales_info_woo.shipping.state,
        zip: sales_info_woo.shipping.postcode,
        country: sales_info_woo.shipping.country
      },
    }
    /* check whether the customer information is in zoho inventory */
    let customer_in_zoho = await zohoAPI.findCustomer(customer_brief)
    if(!customer_in_zoho){
      /* contact_person information in customer for zoho customer/contact */
      const contact_persons_data =[
        {
        first_name: sales_info_woo.billing.first_name,
        last_name: sales_info_woo.billing.last_name,
        email: sales_info_woo.billing.email,
        phone: sales_info_woo.billing.phone,
        mobile: sales_info_woo.shipping.phone,
        is_primary_contact: true
        }
      ]
      customer_data['contact_persons'] = contact_persons_data
      contact_result = await zohoAPI.createContact(customer_data)
    }else{
      const primary_contact_person_data = {
        first_name: sales_info_woo.billing.first_name,
        last_name: sales_info_woo.billing.last_name,
        email: sales_info_woo.billing.email,
        phone: sales_info_woo.billing.phone,
        mobile: sales_info_woo.shipping.phone,
        }
      customer_data.payment_terms = customer_in_zoho.payment_terms ? customer_in_zoho.payment_terms : 0
      payment_terms = customer_data.payment_terms
      contact_result = await zohoAPI.updateContact(customer_in_zoho.contact_id,customer_data)
      const customer_full_info = await zohoAPI.getContactByID(contact_result.contact.contact_id)
      for(const contact_person of customer_full_info.contact_persons){
        if(contact_person.is_primary_contact){
          await zohoAPI.updateContactPerson(contact_person.contact_person_id,primary_contact_person_data)
          break;
        }
      }
    }
    /* code 0 means success */
    if(contact_result.code === 0){
      /* sales order deatails for creating sales order in zoho inventory */
      // sales_order_data['customer_id'] = contact_result.contact.contact_id
      // sales_order_data['billing_address_id'] = contact_result.contact.billing_address.address_id
      // sales_order_data['shipping_address_id'] = contact_result.contact.shipping_address.address_id
      // const sales_order_result = await createSalesOrder(sales_order_data)
      
      /* invoice fields filled for creating zoho inventory*/
      const invoice_data = {
        customer_id:contact_result.contact.contact_id,
        contact_persons:[contact_result.contact.contact_persons[0].contact_person_id],
        reference_number:siteOrder.siteName + "_" + sales_info_woo.id,
        date:sales_info_woo.date_created.split("T")[0],
        payment_terms:payment_terms,
        is_inclusive_tax: false,
        salesperson_name: "Eccommerce",
      }
      invoice_data['line_items'] = line_items_in_zoho
      // console.log("invoice_data",invoice_data)
      const invoice_result = await zohoAPI.createInvoice(invoice_data)
      if(invoice_result.code === 0){
        // console.log(invoice_result.invoice)
        await zohoAPI.sendNotificationEmailToContact(contact_result.contact.contact_id,[sales_info_woo.billing.email],salesOrder.orderID)
        /* mark invoice as sent (if not, the invoice is draft and the stock will not update) */
        await zohoAPI.markInvoiceSent(invoice_result.invoice.invoice_id)
      }
    }
  
  }
  

  async function updateB2BPrice(){
    await testZohoToken("zoho_inventory_daily_update",connection)
    const prices = await zohoAPI.retrievePriceList()
    await database.updateAllB2BPrice(prices,connection)
  }
  module.exports = {
    placeOrder,
    syncDataFromZohoToDatabase,
    updateCompositItems,
    updateB2BPrice,
    updateInvoiceItems,
  }