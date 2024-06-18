import database from "./database.js";

async function processBillingNotification(billingData) {
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
    } = billingData;
  
    // Log the billing notification
    const notificationLog = `Billing Notification: ${JSON.stringify(billingData)}\n`;
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
  
      return { message: "Billing notification processed successfully" };
    } catch (error) {
      console.error(error);
  
      // Log the error
      await appendFile('errorLogs.txt', `Date: ${new Date().toISOString()} Error: ${JSON.stringify(error)}\n`);
  
      return { message: "Failed to process billing notification", error: error.message };
    }
  }


  const billingData = {
    user_msisdn: '1234567890',
    user_product_code: 'product1',
    in_life_cycle: 'cycle1',
    in_chargin_type: 'type1',
    in_next_renew_date: '2022-01-01',
    in_fee: '100',
    in_reason: 'reason1',
    in_channel_id: 'channel1',
    in_time_stamp: '2022-01-01T00:00:00Z'
  };
  
  processBillingNotification(billingData).then(result => console.log(result));