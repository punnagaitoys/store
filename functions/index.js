const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

/**
 * Triggered when a new order is created in Firestore.
 * Sends an automated order receipt via WhatsApp Business API.
 * 
 * Requires the following environment variables to be set in Firebase Functions:
 * - WHATSAPP_API_TOKEN (Your permanent System User token from Meta)
 * - WHATSAPP_PHONE_ID (The ID of your registered WhatsApp Business number)
 */
exports.sendWhatsAppReceipt = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const orderId = context.params.orderId;

    // We only want to send if there is a customer phone number available.
    const phone = orderData.shippingAddress && orderData.shippingAddress.phone;
    if (!orderData || !phone) {
      console.log(`Order ${orderId} does not have a phone number. Skipping WhatsApp receipt.`);
      return null;
    }

    // Clean up the phone number for WhatsApp API (digits only, include country code)
    // WhatsApp requires numbers to start with country code but without '+' or '00'
    let phoneStr = String(phone).replace(/\D/g, '');
    
    // If it's a 10 digit Indian number, prefix with 91 automatically.
    // Adjust this logic if you serve multiple countries without strict validation.
    if (phoneStr.length === 10) {
      phoneStr = '91' + phoneStr;
    }

    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      console.error('Missing WHATSAPP_API_TOKEN or WHATSAPP_PHONE_ID in environment variables.');
      return null;
    }

    const customerName = orderData.shippingAddress.name || 'Customer';

    // Construct the message payload
    // Replace "order_confirmation_receipt" with the exact name of your approved Meta template.
    // Replace the parameters array with the dynamic variables your template uses.
    const payload = {
      messaging_product: 'whatsapp',
      to: phoneStr,
      type: 'template',
      template: {
        name: 'order_confirmation_receipt', // MUST match the template name in Meta exactly
        language: {
          code: 'en' // MUST match the language code of the template exactly
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: customerName // {{1}}
              },
              {
                type: 'text',
                text: orderId.slice(-6).toUpperCase() || orderId // {{2}} Short Order ID
              },
              {
                type: 'text',
                text: `${orderData.total || 0}` // {{3}} Total Price
              }
            ]
          }
        ]
      }
    };

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${phoneId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`WhatsApp receipt sent successfully for order ${orderId}:`, response.data);
      return response.data;

    } catch (error) {
      console.error(`Error sending WhatsApp receipt for order ${orderId}:`);
      if (error.response) {
        console.error(error.response.data);
      } else {
        console.error(error.message);
      }
      return null;
    }
  });
