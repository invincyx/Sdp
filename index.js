import express from "express";
import database from "./database.js";
import { getToken } from "./manageToken.js";
import { hitSDP } from "./hitSdp.js";

import fs from 'fs';
import { promisify } from 'util';

const appendFile = promisify(fs.appendFile);

const app = express();
const port = 3000;

app.use(express.json());


app.listen(port, () => {
    console.log(`Server started on ${port}`);
});


// ✨✨✨ Test connection to the database
app.get("/test-connection", async (req, res) => {
    // const token = await getToken();
    // console.log(token);

    try {
      await database.query("SELECT 1");
      res.json({ message: "Connection successful" });
    } catch (error) {
      res.json({ message: "Connection failed", error: error.message });
    }
  });


  // ✨✨✨Poll the database for new requests with status 88

  async function pollDatabase() {
    const token = await getToken();
    console.log("Poll Database running...");
    try {
      const [rows] = await database.query("SELECT * FROM sdp_request WHERE status = ? LIMIT 100", [88]);
      console.log("Row length: ", rows.length); 
      console.log(rows);
      if (rows.length > 0) {
        for (const row of rows) {
          console.log(row.message); 
  
  
          const featureId = row.message === "ACTIVATE" ? "Activation" : "Deactivation"; 
  
          try {
            console.log("Trying to hit SDP...🍀");
            const hitSdp = await hitSDP({token: token.access_token, request: featureId, requestId: row.trans_id, msisdn: row.sender, planId: row.P_Code })
            console.log(await hitSdp);
  
            // Log the billing hit
            // await fs.appendFile('billingHits.txt', `Date: ${new Date().toISOString()} Billing Hit: ${JSON.stringify(hitSdp)}\n`);
  
            // Update status based on the result code
            const resultCode = await hitSdp.resultCode === "0" ? 11 : hitSdp.resultCode;

            console.log("🌍  Result code: ", await resultCode);
  
            // Declare the output variable
            await database.query("SET @output = ''");

            const sql = "CALL SDP_Response(?, ?, ?, @output)";
            console.log(`Running SQL query: ${sql} with parameters: ${[row.trans_id, row.sender, resultCode]}`);
  
            // Pass the output variable to the procedure
            const callPocedure = await database.query("CALL SDP_Response(?, ?, ?, @output)", [`${row.trans_id}`, `${row.sender}`, `${resultCode}`]);

            console.log("🍀 Call Procedure: ", callPocedure);
  
            // Get the output value
            const result = await database.query("SELECT @output as output");
            console.log(result);
          } catch (error) {
            console.log("🍀 Error: ", error);
            console.error(error);

            
  
            // Log the error
            await fs.appendFile('errorLogs.txt', `Date: ${new Date().toISOString()} Error: ${JSON.stringify(error)}\n`);
  
            // Update status to failure value (2)
  
            // Declare the output variable
            await database.query("SET @output = ''");
  
            // Pass the output variable to the procedure
            await database.query("CALL SDP_Response(?, ?, ?, @output)", [row.trans_id_in, row.receiver, '2']);
  
            // Get the output value
            const result = await database.query("SELECT @output as output");
            console.log(result[0].output);
          }
        }
      }
    } catch (error) { 
      const date = new Date();
      console.log("🍀 Error Catch Block: ", error);
      await appendFile('dblogs.txt', `Date: ${date.toISOString()} Error: ${JSON.stringify(error)}\n`);
    }
  }

  setInterval(pollDatabase, 60000);


//✨✨✨ Url for Billing Notification
// app.get("/billing-notification", async (req, res) => {
//   const {
//     user_msisdn,
//     user_product_code,
//     in_life_cycle,
//     in_chargin_type,
//     in_next_renew_date,
//     in_fee,
//     in_reason,
//     in_channel_id,
//     in_time_stamp
//   } = req.query;

//   // Log the billing notification
//   const notificationLog = `Billing Notification: ${JSON.stringify(req.body)}\n`;
//   await appendFile('billingNotificationLogs.txt', notificationLog);

//   try {
//     // Define variables to hold the output parameters
//     let errorCode, errorText;

//     // Call the log_billing_notification procedure
//     await database.query("SET @p10 = 0, @p11 = ''");
//     await database.query("CALL log_billing_notification(?, ?, ?, ?, ?, ?, ?, ?, ?, @p10, @p11)", [
//       user_msisdn,
//       user_product_code,
//       in_life_cycle,
//       in_chargin_type,
//       in_next_renew_date,
//       in_fee,
//       in_reason,
//       in_channel_id,
//       in_time_stamp
//     ]);
//     const rows = await database.query("SELECT @p10 as errorCode, @p11 as errorText");

//     // Get the output parameters
//     errorCode = rows[0][0].errorCode;
//     errorText = rows[0][0].errorText;

//     console.log(`Procedure output: errorCode = ${errorCode}, errorText = ${errorText}`);

//     res.json({ message: "Billing notification processed successfully", errorCode, errorText });
//   } catch (error) {
//     console.error(error);

//     // Log the error
//     await appendFile('errorLogs.txt', `Date: ${new Date().toISOString()} Error: ${JSON.stringify(error)}\n`);

//     res.json({ message: "Failed to process billing notification", error: error.message });
//   }
// });


app.post("/billing-notification", async (req, res) => {
  const {
    requestId,
    requestTimeStamp,
    channel,
    sourceNode,
    sourceAddress,
    featureId,
    username,
    password,
    externalServiceId,
    requestParam
  } = req.body;

  // Log the billing notification
  const notificationLog = `Billing Notification: ${JSON.stringify(req.body)}\n`;
  await appendFile('billingNotificationLogs.txt', notificationLog);

  try {
    // Define variables to hold the output parameters
    let errorCode, errorText;

    // Call the log_billing_notification procedure
    await database.query("SET @p10 = 0, @p11 = ''");
    await database.query("CALL log_billing_notification(?, ?, ?, ?, ?, ?, ?, ?, ?, @p10, @p11)", [
      requestId,
      requestTimeStamp,
      channel,
      sourceNode,
      sourceAddress,
      featureId,
      username,
      password,
      externalServiceId,
      requestParam
    ]);
    const rows = await database.query("SELECT @p10 as errorCode, @p11 as errorText");

    // Get the output parameters
    errorCode = rows[0][0].errorCode;
    errorText = rows[0][0].errorText;

    console.log(`Procedure output: errorCode = ${errorCode}, errorText = ${errorText}`);

    // Create the response packet
    const responsePacket = {
      requestId,
      responseId: requestId, // Assuming the responseId is the same as the requestId
      requestTimeStamp,
      responseTimeStamp: new Date().toISOString(), // Current timestamp
      channel,
      featureId,
      resultCode: errorCode === 0 ? "0" : "1", // Assuming errorCode 0 means success
      resultParam: {
        resultCode: errorCode.toString(),
        resultDescription: errorText
      }
    };

    res.json(responsePacket);
  } catch (error) {
    console.error(error);

    // Log the error
    await appendFile('errorLogs.txt', `Date: ${new Date().toISOString()} Error: ${JSON.stringify(error)}\n`);

    res.json({ message: "Failed to process billing notification", error: error.message });
  }
});




