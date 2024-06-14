import fs from 'fs';
import { promisify } from 'util';

const appendFile = promisify(fs.appendFile);

export async function hitSDP({token, request, requestId, msisdn, planId} ) {

    const myHeaders = new Headers();
    myHeaders.append("X-Authorization", `Bearer ${token}`);
    myHeaders.append("Content-Type", "application/json");

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
      redirect: "follow"
    };
    
    const isoDate = date.toISOString();
    try {
        const data = await fetch(`https://sdp.api.econet.co.zw:9480/APIGateway/api/public/SMACT/${request}`, requestOptions,{ timeout: 5000 })
        const response = await data.json()
        const date = new Date().toISOString();
        await appendFile('sdplogs.txt', `Date: ${isoDate} Request: ${JSON.stringify(raw)}\n`);
        await appendFile('sdplogs.txt', `Date: ${isoDate} Response: ${JSON.stringify(response)}\n`);
        return response;
    } catch (error) {
        console.error('Error:', error);
        await appendFile('sdplogs.txt', `Date: ${isoDate} Error: ${JSON.stringify(error)}\n`);
        return { error: 'Request timed out' };
    }

}


