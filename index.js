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
    console.log(`${new Date().toISOString()} ~ Server started on ${port}`);
});



// ✨✨✨ Test connection to the database
app.get("/test-connection", async (req, res) => {

    try {
      await database.query("SELECT 1");
      res.json({ message: "Connection successful" });
    } catch (error) {
      res.json({ message: "Connection failed", error: error.message });
    }
  });


  // ✨✨✨Poll the database for new requests with status 88

  async function pollDatabase() {
    const now = new Date().toISOString()

    const token = await getToken();
    // console.log("Poll Database running...");
    try {

      
      // const [rows] = await database.query("SELECT * FROM sdp_request WHERE status = ? LIMIT 100", [88]);
      const [rows] = await database.query("select * from SDP_Request");


      // select * from SDP_Request;
      // console.log("Row length: ", rows.length); 
      // console.log(`${now} ~ `,rows);
      if (rows.length > 0) {
        for (const row of rows) {
          // console.log(row.message); 
  
  
          const featureId = row.message === "ACTIVATE" ? "Activation" : "Deactivation"; 
  
          try {
            console.log("\n\n ✨✨✨", new Date().toISOString())
            console.log(`${now} ~ Hitting SDP...🍀`);
            const hitSdp = await hitSDP({token: token.access_token, request: featureId, requestId: row.trans_id, msisdn: row.sender, planId: row.P_Code })
            console.log(`${now} ~ `,await hitSdp);
  
            // Log the billing hit
            // await fs.appendFile('billingHits.txt', `Date: ${new Date().toISOString()} Billing Hit: ${JSON.stringify(hitSdp)}\n`);
  
            // Update status based on the result code
            const resultCode = await hitSdp.resultCode === "0" ? 11 : hitSdp.resultCode;

            console.log(`${now} ~ 🌍  Result code: ,`, await resultCode);
  
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
            console.log("\n\n ✨✨✨", new Date().toISOString())
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
      console.log("\n\n ✨✨✨", new Date().toISOString())
      const date = new Date();
      console.log("🍀 Error Catch Block: ", error);
      await appendFile('dblogs.txt', `Date: ${date.toISOString()} Error: ${JSON.stringify(error)}\n`);
    }
  }

  setInterval(pollDatabase, 60000);


app.post("/billing-notification", async (req, res) => {
  const {
    requestId,
    requestTimeStamp,
    channel,
    externalServiceId,
    requestParam: {
      data, // This is the array of data objects
      planId,
      command
    },
    featureId
  } = req.body;

  const now = new Date().toISOString()
  // Extract necessary fields from the data array
  const offerCode = data.find(item => item.name === "OfferCode")?.value;
  const subscriptionStatus = data.find(item => item.name === "SubscriptionStatus")?.value;
  const subscriberLifeCycle = data.find(item => item.name === "SubscriberLifeCycle")?.value;
  const nextBillDate = data.find(item => item.name === "NextBillingDate")?.value;
  const chargeAmount = data.find(item => item.name === "ChargeAmount")?.value;
  const reason = data.find(item => item.name === "Reason")?.value;

  // Log the billing notification
  const notificationLog = `Billing Notification: ${JSON.stringify(req.body)}\n`;
  // await appendFile('billingNotificationLogs.txt', notificationLog);
  await appendFile('billingNotificationLogs.txt', `\n\n\n ✨✨✨ Date: ${new Date().toISOString()} ~ ${notificationLog}`);

  console.log(`${now} ~ Billing Notification: ${JSON.stringify(req.body)}`);
  console.log(`${now} ~ Route Parameters: ${JSON.stringify(req.params)}`);
  console.log(`${now} ~ Query Parameters: ${JSON.stringify(req.query)}`);

  try {
    await database.query("SET @errorCode = 0, @errorText = ''");
    // Ensure nextBillDate is set to null if it's undefined before logging and database call

    console.log(`${now} ~ Calling log_billing_notification with parameters: 
      user_msisdn=${externalServiceId}, 
      user_product_code=${planId}, 
      in_life_cycle=${subscriptionStatus}, 
      in_chargin_type=${subscriberLifeCycle}, 
      in_next_renew_date=${nextBillDate}, 
      in_fee=${chargeAmount}, 
      in_reason=${reason}, 
      in_channel_id=${channel}, 
      in_time_stamp=${requestTimeStamp}`);

    await database.query("CALL log_billing_notification_new(?, ?, ?, ?, ?, ?, ?, ?, ?, @errorCode, @errorText)", [
      externalServiceId,
      planId,
      subscriptionStatus,
      subscriberLifeCycle,
      nextBillDate,
      chargeAmount,
      reason,
      channel,
      requestTimeStamp
    ]);
    const rows = await database.query("SELECT @errorCode as errorCode, @errorText as errorText");

    const errorCode = rows[0][0].errorCode;
    const errorText = rows[0][0].errorText;

    console.log(`${now} ~ Procedure output: errorCode = ${errorCode}, errorText = ${errorText}`);

    const responsePacket = {
      requestId,
      responseId: requestId,
      requestTimeStamp,
      responseTimeStamp: new Date().toISOString(),
      channel,
      featureId,
      resultCode: errorCode === 7 ? "0" : "1", // Assuming errorCode 7 means success in this context
      resultParam: {
        resultCode: errorCode.toString(),
        resultDescription: errorText
      }
    };

    res.json(responsePacket);
  } catch (error) {
    console.error(`\n\n\n ✨✨✨ ------- \n\n\n Date: ${new Date().toISOString()} ~ Error: ${JSON.stringify(error)}\n`);
    await appendFile('errorLogs.txt', `Date: ${new Date().toISOString()} Error: ${JSON.stringify(error)}\n`);
    res.json({ message: `${new Date().toISOString()} ~ Failed to process billing notification`, error: error.message });
  }
});


