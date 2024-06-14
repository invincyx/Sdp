import express from "express";
import database from "./database.js";
// import { getToken } from "./manageToken.js";
// import { hitSDP } from "./hitSdp.js";

import fs from 'fs';
import { promisify } from 'util';

const appendFile = promisify(fs.appendFile);

const app = express();
const port = 3000;

app.use(express.json());


app.listen(port, () => {
    console.log(`Server started on ${port}`);
});


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


async function pollDatabase() {
  // const token = await getToken();
  try {
    const [rows] = await database.query("SELECT * FROM sdp_request WHERE status = ? LIMIT 2", [88]);
    if (rows.length > 0) {
      for (const row of rows) {
        console.log(row.message); 
        console.log(Math.floor(row.sender));

        const featureId = row.message === "ACTIVATE" ? "ACTIVATION" : "DEACTIVATION"; 

        // try {
        //   const hitSdp = await hitSDP({token: token.access_token, request: featureId, requestId: Math.floor(row.trans_id_in), msisdn: Math.floor(row.receiver), planId: row.P_Code })
        //   console.log(hitSdp);

        //   // Log the billing hit
        //   await fs.appendFile('billingHits.txt', `Date: ${new Date().toISOString()} Billing Hit: ${JSON.stringify(hitSdp)}\n`);

        //   // Update status based on the result code
        //   const resultCode = hitSdp.resultCode === "0" ? '11' : hitSdp.resultCode;
        //   await database.query("CALL SDP_Response(?, ?, ?)", [row.trans_id_in, row.receiver, resultCode]);
        // } catch (error) {
        //   console.error(error);

        //   // Log the error
        //   await fs.appendFile('errorLogs.txt', `Date: ${new Date().toISOString()} Error: ${JSON.stringify(error)}\n`);

        //   // Update status to failure value (2)
        //   await database.query("CALL SDP_Response(?, ?, ?)", [row.trans_id_in, row.receiver, '2']);
        // }
      }
    }
  } catch (error) { 
    const date = new Date();
    await appendFile('dblogs.txt', `Date: ${date.toISOString()} Error: ${JSON.stringify(error)}\n`);
  }
}

setInterval(pollDatabase, 10000);


// async function testProcedure() {
//   try {
//     // Call the UpdateTransactionStatus procedure with test data
//     const [rows] = await database.query("CALL UpdateTransactionStatus(?, ?, ?, @errorText)", ['test_trans_id', 'test_receiver', '2']);

//     // Get the value of the output parameter
//     const [result] = await database.query("SELECT @errorText AS errorText");

//     // Log the result
//     console.log(result[0].errorText);
//   } catch (error) {
//     console.error(`Failed to call UpdateTransactionStatus: ${error.message}`);
//   }
// }

// // Call the test function
// testProcedure();