import fs from 'fs';
import { promisify } from 'util';
import fetch from 'node-fetch';
import https from 'https';

const appendFile = promisify(fs.appendFile);

export async function hitSDP({token, request, requestId, msisdn, planId} ) {

    const myHeaders = {
        "X-Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    console.log({token})
    
    const date = new Date();
    const formattedDate = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');

    const raw = JSON.stringify({
      "requestId": requestId,
      "requestTimeStamp": formattedDate,
      "channel": "2",
      "sourceNode": "SourceNode",
      "sourceAddress": "SourceAddress",
      "featureId": request,
      "username": "UserName",
      "password": "Password",
      "externalServiceId": msisdn,
      "requestParam": {
        "planId": planId,
        "cpId": "135"
      }
    });
    console.log({ raw});
    
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
      agent: new https.Agent({ 
        rejectUnauthorized: false 
      })
    };
    
    const isoDate = date.toISOString();
    try {
      const urlParam = request === "ACTIVATION" ? "SMACT" : "SMDACT";
      const sdpUrl = `https://10.10.11.162:9480/APIGateway/api/public/${urlParam}/${request}`;
      const data = await fetch(sdpUrl, requestOptions)
     

      // console.log("✨Sdp Url", {sdpUrl, request})

     

      // const data = await fetch(`https://sdp.api.econet.co.zw:9480/APIGateway/api/public/${urlParam}/${request}`, requestOptions)


      let response;
      if (data && data.ok) {
        const text = await data.text();
        // Now you can use `text` multiple times
console.log(text);
// response= JSON.parse(text);
        // console.log("🥵Json Text",   await data.text())
        // response = await data.json();
      } else {
        console.error('Empty response or error occurred');
        response = {}; // set response as an empty object to avoid undefined
      }
      await appendFile('sdplogs.txt', `Date: ${isoDate} Request: ${JSON.stringify(raw)}\n`, () => {});
      await appendFile('sdplogs.txt', `Date: ${isoDate} Response: ${JSON.stringify(response)}\n`, () => {});
      // return response;
  } catch (error) {
      console.error('Error:', error);
      await appendFile('sdplogs.txt', `Date: ${isoDate} Error: ${JSON.stringify(error)}\n`, () => {});
      return { error: 'Request timed out' };
  }

  

}

hitSDP({token:"eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJTaGFua2x5MTM1IiwiYXVkIjoiQSIsInNjb3BlcyI6IkFETUlOIiwiZW50aXR5SWQiOiIiLCJpc3MiOiJodHRwOi8vc2l4ZGVlLmNvbSIsImlhdCI6MTcxODY4OTQ1NCwiZXhwIjoxNzE4Njk1NDU0fQ.EvWNiTioZbhMRbeYV2M4hBygQCj-QkFOGhGS7tGMnO6c5NXnX8NjVPyd4VhTa8DviNyggSXg_Qz9znxnKXUcGg", request: "Activation", requestId: "123", msisdn: "263774599141", planId: "9913510095"}).then(console.log).catch(console.error);

