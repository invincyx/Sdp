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


// Test connection
app.get("/test-connection", async (req, res) => {
    const token = await getToken();
    // console.log(token);
    const hitSdp = await hitSDP({token: token.access_token, request: "ACTIVATION", requestId: "tryb47484", msisdn: "774599141" } )

    console.log(hitSdp)


    try {
      await database.query("SELECT 1");
      res.json({ message: "Connection successful" });
    } catch (error) {
      res.json({ message: "Connection failed", error: error.message });
    }
  });

//   Poll for status 88

// app.get("/poll-88", async (req, res) => {
//     const token = await getToken();
//     try {
//       const [rows] = await database.query("SELECT * FROM transactions WHERE status = ?", [11]);
//       if (rows.length > 0) {
//         rows.forEach(async (row) => { // Make the arrow function async
//           console.log(row.message); 
//           console.log(Math.floor(row.sender));

//           const featureId = row.message === "ACTIVATE" ? "ACTIVATION" : "DEACTIVATION";         
//           const hitSdp = await hitSDP({token: token.access_token, request: featureId, requestId: row.id, msisdn: Math.floor(row.sender) })

//           console.log(hitSdp);
//         });
//         res.json({ message: "Connection successful, status 88 found", data: rows });
//       } else {
//         res.json({ message: "Connection successful, status 88 not found" });
//       }
//     } catch (error) { 
//       const date = new Date();
//       await appendFile('dblogs.txt', `Date: ${date.toISOString()} Error: ${JSON.stringify(error)}\n`);
//       res.json({ message: "Connection failed", error: error.message });
//     }
// });


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

    // Send the response
    res.json({ errorCode: 7, errorText: "PRAYER_7#PRY" });
  } catch (error) {
    console.error(error);

    // Log the error
    const errorLog = `Error: ${error.message}\n`;
    await appendFile('errorLogs.txt', errorLog);

    res.status(500).json({ message: "Failed to call DB procedure", error: error.message });
  }
});


async function pollDatabase() {
  const token = await getToken();
  try {
    const [rows] = await database.query("SELECT * FROM transactions WHERE status = ? LIMIT 2", [88]);
    if (rows.length > 0) {
      for (const row of rows) {
        console.log(row.message); 
        console.log(Math.floor(row.sender));

        const featureId = row.message === "ACTIVATE" ? "ACTIVATION" : "DEACTIVATION";         

        try {
          const hitSdp = await hitSDP({token: token.access_token, request: featureId, requestId: Math.floor(row.trans_id), msisdn: Math.floor(row.sender) })
          console.log(hitSdp);

          // Update status to success value (11)
          await database.query("UPDATE transactions SET status = ? WHERE id = ?", [11, row.id]);
        } catch (error) {
          console.error(error);

          // Update status to failure value (2)
          await database.query("UPDATE transactions SET status = ? WHERE id = ?", [2, row.id]);
        }
      }
      return { message: "Connection successful, status 88 found", data: rows };
    } else {
      return { message: "Connection successful, status 88 not found" };
    }
  } catch (error) { 
    const date = new Date();
    await appendFile('dblogs.txt', `Date: ${date.toISOString()} Error: ${JSON.stringify(error)}\n`);
    return { message: "Connection failed", error: error.message };
  }
}

setInterval(pollDatabase, 10000);