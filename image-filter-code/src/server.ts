import express from 'express';
import bodyParser from 'body-parser';
import {filterImageFromURL, deleteLocalFiles, sleep} from './util/util';
import { IncomingMessage } from 'http';

(async () => {

  // Init the Express application
  const app = express();

  // Set the network port
  const port = process.env.PORT || 8082;
  
  // Use the body parser middleware for post requests
  app.use(bodyParser.json());

  // @TODO1 IMPLEMENT A RESTFUL ENDPOINT
  // GET /filteredimage?image_url={{URL}}
  // endpoint to filter an image from a public url.
  // IT SHOULD
  //    1
  //    1. validate the image_url query
  //    2. call filterImageFromURL(image_url) to filter the image
  //    3. send the resulting file in the response
  //    4. deletes any files on the server on finish of the response
  // QUERY PARAMATERS
  //    image_url: URL of a publicly accessible image
  // RETURNS
  //   the filtered image file [!!TIP res.sendFile(filteredpath); might be useful]

  /**************************************************************************** */

  app.get( "/filteredimage/", async ( req, res ) => {
    
    let { image_url } = req.query;
    var http = require('http');
    var https = require('https');
    var client = http;

    res.status(0);    //set initial status ...

    // -------------------------------
    // 1. validate the image_url query
    // -------------------------------

    //  1.1. Check image_url param exists ...  
    if ( !image_url ) {                                            
      return res.status(400).send(`image_url is required`);
    }

    //  1.2. Check image_url param is a "valid" URL ...  
    try{
      const url = new URL(image_url);                                 
      if (url.protocol !== "https:" && url.protocol !== "http:"){
        return res.status(404).send(`image_url parameter is invalid`);
      }
      client = (url.protocol == "https:") ? https : client;
    }
    catch(error){
      return res.status(404).send(`image_url parameter is invalid`);
    }

    //  use http or https "get" to check image_url ...
    const image_req = client.get(image_url,(image_res:IncomingMessage) => {

      const image_statusCode = image_res.statusCode;
      const image_contentType = image_res.headers['content-type'];

      //  1.3 Check image_url param points to something ...
      if (image_statusCode === 404) {                                       
        return res.status(404).send(`image_url parameter is invalid`);
      }
      
      //  1.4 Check image_url param points to a jpeg image ...
      if (image_contentType !== 'image/jpeg') {
        return res.status(415).send(`image_url paramter should point to jpeg image`);
      }
      
      //TIMEOUT: abort request after 60 secs. 
      image_req.setTimeout(60*1000, () => { 
        console.log("request aborted!");
        image_req.abort();
        return res.status(400);
      });
      
      return res.status(200);

    });

    while (res.statusCode == 0){
      await sleep(100);
    }
    if (res.statusCode>200){
      return res;
    }

    // ---------------------------------------------------------
    // 2. call filterImageFromURL(image_url) to filter the image
    // ---------------------------------------------------------
    const path = await filterImageFromURL(image_url);
    if ( !path ) {
      return res.status(500).send(`error filtering image`);
    }
    
    // ------------------------------------------
    // 3. send the resulting file in the response
    // ------------------------------------------
    res.sendFile(path);
    res.on('finish', () => {
    
    // ------------------------------------------------------------
    // 4. deletes any files on the server on finish of the response
    // ------------------------------------------------------------  
      try {
        var tmp_file:string[]= [path]; 
        deleteLocalFiles(tmp_file);
      } catch(e) {
        console.log("error deleting ", path); 
      }

    });

    res.on('error', () => {
      console.log("error sending file ", path); 
    });

  });

  //! END @TODO1
  
  // Root Endpoint
  // Displays a simple message to the user
  app.get( "/", async ( req, res ) => {
    res.send("try GET /filteredimage?image_url={{}}")
  } );
  

  // Start the Server
  app.listen( port, () => {
      console.log( `server running http://localhost:${ port }` );
      console.log( `press CTRL+C to stop server` );
  } );
})();