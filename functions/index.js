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
            Authorization: `Bearer ${token}`,
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

/**
 * Securely creates an order by re-calculating all prices on the server.
 * This prevents malicious users from tampering with total prices on the frontend.
 */
exports.createSecureOrder = functions.https.onCall(async (data, context) => {
  const { items, shippingAddress, shippingMethod, paymentMethod, couponCode, notes } = data || {};

  let userId;
  if (context.auth && context.auth.uid) {
    userId = context.auth.uid;
  } else {
    userId = 'guest';
    const addr = shippingAddress;
    const isNameValid = Boolean(
      addr && typeof addr.name === 'string' && addr.name.trim().length > 0
    );
    const phoneDigits =
      addr && (typeof addr.phone === 'string' || typeof addr.phone === 'number')
        ? String(addr.phone).replace(/\D/g, '')
        : '';
    const isPhoneValid = phoneDigits.length >= 10;
    const postalStr =
      addr && (typeof addr.postalCode === 'string' || typeof addr.postalCode === 'number')
        ? String(addr.postalCode).trim()
        : '';
    const isPostalValid = /^\d{6}$/.test(postalStr);
    const isAddressValid = Boolean(
      addr && typeof addr.address === 'string' && addr.address.trim().length > 0
    );

    if (!isNameValid || !isPhoneValid || !isPostalValid || !isAddressValid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required shipping address details for guest checkout.'
      );
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Cart is empty.');
  }

  const db = admin.firestore();
  let subtotal = 0;
  const processedItems = [];

  // Securely fetch real prices for all items
  for (const item of items) {
    const { productId, variantId, quantity } = item;
    if (!productId || !quantity || quantity <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid item format.');
    }

    const doc = await db.collection('products').doc(productId).get();
    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', `Product ${productId} not found.`);
    }

    const product = doc.data();
    let price = product.price || 0;

    if (variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant && typeof variant.price === 'number') {
        price = variant.price;
      }
    }

    subtotal += price * quantity;
    processedItems.push({
      productId,
      variantId: variantId || '',
      name: product.name,
      price: price,
      quantity: quantity,
      imageUrl: item.imageUrl || ''
    });
  }

  // Handle shipping
  let shippingFee = 50;
  if (shippingMethod === 'local_delivery' || shippingMethod === 'local') {
    shippingFee = 0;
  } else if (shippingMethod === 'standard') {
    shippingFee = 50;
  } else if (shippingMethod === 'express') {
    shippingFee = 100;
  } else {
    shippingFee = 50;
  }

  // Handle coupon
  let discount = 0;
  if (couponCode) {
    const couponDocs = await db.collection('coupons').where('code', '==', couponCode).get();
    if (!couponDocs.empty) {
      const coupon = couponDocs.docs[0].data();
      const discountType = coupon.discountType || coupon.type;
      const discountVal = Number(coupon.discountValue !== undefined ? coupon.discountValue : coupon.amount) || 0;
      if (discountType === 'fixed') {
        discount = discountVal;
      } else if (discountType === 'percentage') {
        discount = (subtotal * discountVal) / 100;
      }
    }
  }

  const total = Math.max(0, subtotal + shippingFee - discount);

  const orderData = {
    userId,
    items: processedItems,
    subtotal,
    shippingFee,
    taxAmount: 0,
    discount,
    total,
    couponCode: couponCode || null,
    shippingAddress: shippingAddress || null,
    shippingMethod: shippingMethod || 'standard',
    paymentMethod: paymentMethod || 'upi',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    notes: notes || ''
  };

  const orderRef = await db.collection('orders').add(orderData);
  return { success: true, id: orderRef.id };
});
