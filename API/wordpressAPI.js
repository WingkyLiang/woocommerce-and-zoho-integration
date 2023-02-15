
// password: Skulks75Render69Solved76Usurp53
const fetch = require("node-fetch")
const config = {
  wordpresstoken:'',
  url:'https://ea7fe40c31.nxcli.io/'
}
/*
  Set wordpress configurations
  parameter:
  - data{
    url (String, base wordpress url)
  }
*/
async function setConfig(data){
  config.url = data.url
}
/*
  upload image into wordpress media
  parameter:
  - item{
    sku (String, item sku)
    ...
  }
  - image (blobb, binary data of image file)
  return Wordpress response object
*/
async function uploadImageToWordpress(item,image){
    return await new Promise((res,rej)=>{
      fetch(`${config.url}wp-json/wp/v2/media`,{
        method:"POST",
        headers:{
          'Content-Type': ['image/jpeg','image/png'],
          'content-disposition': `attachment; filename=${item.sku}.jpeg`,
          'authorization': `Bearer ${config.wordpresstoken}`
        },
        body:Buffer.from(image)
      }).then(respond=> respond.json()).then(json=>{
        // console.log(json)
        res(json)
      }).catch(err=>console.log(`upload image error ${item.sku}:  ${err}`));
    })
}

/*
  delete image from wordpress media based on media id
  parameter:
  - id (String, image media id in wordpresss)
  return Wordpress response object
*/
function deleteImageFromWordpress(id){
  fetch(`${config.url}wp-json/wp/v2/media/${id}/?force=1`,{
    method:"DELETE",
    headers:{
      'authorization': `Bearer ${config.wordpresstoken}`
    },
  }).then(res=> res.json()).then(json=>console.log(json));
}
/*
get image from wordpress media based on media id
parameter:
- id (String, image media id in wordpresss)
return Wordpress response object
*/


async function getImageFromWordpress(){
  return await new Promise((res,rej)=>{
      fetch(`${config.url}wp-json/wp/v2/media`,{
          method:"GET",
          headers:{
              'authorization': `Bearer ${config.wordpresstoken}`
          },
          }).then(respond=> respond.json())
          .then(json=> res(json));
  })
}


/*
  get access token for operating wordpress 
  parameter:
  - data{
    wordpress_username (String, wordpress username)
    wordpress_password (String, wordpress password)
    url (String, wordpress base url)
  } 

  return Wordpress response object
*/

const data={
  wordpress_username:"aaa98ef7_admin",
  wordpress_password:"4gR511TAWPd48wk7Ra9",
  url:"https://ea7fe40c31.nxcli.io/"
}

async function getWordpressToken(data){
  const params = new URLSearchParams();
    params.append("username", `${data.wordpress_username}`);
    params.append("password", `${data.wordpress_password}`);
  const res = await fetch(`${data.url}wp-json/jwt-auth/v1/token`, {
    method: "post",
    body:params
  });
  const response = await res.json();
  config.wordpresstoken = response.token;
  console.log(response)
  return response;
}

module.exports={
  getImageFromWordpress,
  deleteImageFromWordpress,
  uploadImageToWordpress,
  getWordpressToken,
  setConfig
}

//token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2VhN2ZlNDBjMzEubnhjbGkuaW8iLCJpYXQiOjE2Njk4NDMwNTEsIm5iZiI6MTY2OTg0MzA1MSwiZXhwIjoxNjcwNDQ3ODUxLCJkYXRhIjp7InVzZXIiOnsiaWQiOiIxIn19fQ.lUREvDxWLwgazxidW1XK_lYPADk9AWwTI3ApJSmf494'

//consumer key: ck_120dd155390b999a3349cdd7a634a9f6d129fdec

//consumer secret: cs_12667020fb4d728505f7eb38020e7705cd0b7e4b