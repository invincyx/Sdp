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

console.log("Server started: First log here ");

// Test connection
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






  async function pollDatabase() {
    // const token = await getToken();
    console.log("Poll Database running...");
    try {
      const [rows] = await database.query("SELECT * FROM sdp_request WHERE status = ? LIMIT 100", [11]);
      console.log("Row length: ", rows.length); 
      console.log(rows);
      if (rows.length > 0) {
        for (const row of rows) {
          console.log(row.message); 
          console.log(Math.floor(row.sender));
  
          const featureId = row.message === "ACTIVATE" ? "ACTIVATION" : "DEACTIVATION"; 
  
          try {
            const hitSdp = await hitSDP({token: "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJTaGFua2x5MTM1IiwiYXVkIjoiQSIsInNjb3BlcyI6IkFETUlOIiwiZW50aXR5SWQiOiIiLCJpc3MiOiJodHRwOi8vc2l4ZGVlLmNvbSIsImlhdCI6MTcxODM3MjUwNywiZXhwIjoxNzE4Mzc4NTA3fQ.FUqtvsYsLnsdDxCMlmWjIhvaYUDwii6RHMA_OgJ-kIaznmdT7-IBdRyuSN67H_Qe6rhm1kXZszgU6c3hLUohNA", request: featureId, requestId: Math.floor(row.trans_id), msisdn: Math.floor(row.receiver), planId: row.P_Code })
            console.log(hitSdp);
  
            // Log the billing hit
            // await fs.appendFile('billingHits.txt', `Date: ${new Date().toISOString()} Billing Hit: ${JSON.stringify(hitSdp)}\n`);
  
            // Update status based on the result code
            const resultCode = hitSdp.resultCode === "0" ? '11' : hitSdp.resultCode;
  
            // Declare the output variable
            await database.query("SET @output = ''");
  
            // Pass the output variable to the procedure
            await database.query("CALL SDP_Response(?, ?, ?, @output)", [row.trans_id_in, row.receiver, resultCode]);
  
            // Get the output value
            const result = await database.query("SELECT @output as output");
            console.log(result[0].output);
          } catch (error) {
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
      await appendFile('dblogs.txt', `Date: ${date.toISOString()} Error: ${JSON.stringify(error)}\n`);
    }
  }

setInterval(pollDatabase, 10000);


app.post("/billing-notification", async (req, res) => {
  const {
    user_msisdn,
    user_product_code,
    in_life_cycle,
    in_chargin_type,
    in_next_renew_date,
    in_fee,
    in_reason,
    in_channel_id,
    in_time_stamp
  } = req.body;

  // Log the billing notification
  const notificationLog = `Billing Notification: ${JSON.stringify(req.body)}\n`;
  await appendFile('billingNotificationLogs.txt', notificationLog);

  try {
    // Call the log_billing_notification procedure
    const [rows] = await database.query("CALL log_billing_notification(?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      user_msisdn,
      user_product_code,
      in_life_cycle,
      in_chargin_type,
      in_next_renew_date,
      in_fee,
      in_reason,
      in_channel_id,
      in_time_stamp
    ]);

    // Handle the output parameters
    const { errorCode, errorText } = rows[0];
    console.log(`Procedure output: errorCode = ${errorCode}, errorText = ${errorText}`);

    res.json({ message: "Billing notification processed successfully" });
  } catch (error) {
    console.error(error);

    // Log the error
    await appendFile('errorLogs.txt', `Date: ${new Date().toISOString()} Error: ${JSON.stringify(error)}\n`);

    res.json({ message: "Failed to process billing notification", error: error.message });
  }
});