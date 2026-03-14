const { MongoClient, ServerApiVersion } = require('mongodb')
require('dotenv').config({ path: '../.env' })
// Create a MongoClient with a MongoClientOptions object to set the Stable API version

async function main(){
  const uri = process.env.ATLAS_URI
  console.log("DEBUG: Connection URI is:", uri)
  const client = new MongoClient(uri)

  try{
    await client.connect()
    const collections = await client.db("AgenticDetective").collections()
    collections.forEach((collection)=> console.log(collection.s.namespace.collection)) 
  }
  catch(e){
    console.log(e)
  }
  finally{
    await client.close()
  }
  
}

main()


