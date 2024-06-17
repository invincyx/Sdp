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
        const data = await fetch(`https://10.10.11.162:9480/APIGateway/api/public/SMACT/${request}`, requestOptions,{ timeout: 5000 })
        const response = await data.json()
        const date = new Date().toISOString();
        await appendFile('sdplogs.txt', [`Date: ${isoDate} Request: ${JSON.stringify(raw)}\n`]);
        await appendFile('sdplogs.txt', [`Date: ${isoDate} Response: ${JSON.stringify(response)}\n`]);
        return response;
    } catch (error) {
        console.error('Error:', error);
        await appendFile('sdplogs.txt', [`Date: ${isoDate} Error: ${JSON.stringify(error)}\n`]);
        return { error: 'Request timed out' };
    }

}