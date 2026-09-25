const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);

export interface EmailRenderResult {
  subject: string;
  plainText: string;
  html: string;
}

interface LuxuryLayoutOptions {
  subject: string;
  preheader?: string;
  heading: string;
  description: string;
  buttonText?: string;
  buttonUrl?: string;
  detailsHtml?: string;
  note?: string;
}

function renderLuxuryHtml(options: LuxuryLayoutOptions): string {
  const currentYear = new Date().getFullYear();
  const preheaderHtml = options.preheader
    ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(options.preheader)}</div>`
    : '';

  const buttonSection = options.buttonText && options.buttonUrl
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 28px 0;">
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="border-radius: 6px; background-color: #09090b;">
                  <a href="${escapeHtml(options.buttonUrl)}" target="_blank" style="font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 6px; display: inline-block; letter-spacing: 0.12em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border: 1px solid #09090b;">
                    ${escapeHtml(options.buttonText)}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Fallback Direct URL Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 24px;">
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              If the button does not work, copy and paste this secure link directly into your browser:
            </p>
            <p style="margin: 0; font-size: 12px; line-height: 1.5; word-break: break-all; font-family: monospace;">
              <a href="${escapeHtml(options.buttonUrl)}" target="_blank" style="color: #0f172a; text-decoration: underline; font-weight: 500;">
                ${escapeHtml(options.buttonUrl)}
              </a>
            </p>
          </td>
        </tr>
      </table>
    `
    : '';

  const noteSection = options.note
    ? `
      <p style="margin: 28px 0 0 0; font-size: 13px; line-height: 1.5; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${escapeHtml(options.note)}
      </p>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #18181b;">
  ${preheaderHtml}
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="background-color: #09090b; padding: 32px 24px 28px 24px; text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://theburujan.shop" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://theburujan.shop/logo-white.png" alt="THE BURUJAN" height="38" style="height: 38px; width: auto; max-width: 190px; display: block; border: 0; outline: none; margin: 0 auto;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #a1a1aa; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Curated Luxury &amp; Designer Atelier
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 36px 36px 36px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #09090b; letter-spacing: -0.02em; line-height: 1.35;">
                ${escapeHtml(options.heading)}
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.65; color: #52525b; white-space: pre-line;">
                ${escapeHtml(options.description)}
              </p>

              ${options.detailsHtml ? `<div style="margin: 24px 0;">${options.detailsHtml}</div>` : ''}

              ${buttonSection}

              ${noteSection}
            </td>
          </tr>

          <!-- Card Footer -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #f4f4f5; padding: 28px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #52525b;">
                The Burujan
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #a1a1aa;">
                Crafted for excellence &bull; Inspired by timeless design
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #a1a1aa;">
                <a href="https://theburujan.shop" style="color: #52525b; text-decoration: underline; margin: 0 8px;">theburujan.shop</a> &bull;
                <a href="mailto:contact@theburujan.shop" style="color: #52525b; text-decoration: underline; margin: 0 8px;">contact@theburujan.shop</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${currentYear} The Burujan. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailTemplate(
  template: string,
  values: Record<string, string>
): EmailRenderResult {
  switch (template) {
    case 'verify': {
      const subject = 'Verify your Burujan account';
      const plainText = `Welcome to The Burujan.\n\nPlease verify your email address using this secure link:\n${values.url}\n\nThis verification link expires in 24 hours.`;
      const html = renderLuxuryHtml({
        subject,
        preheader: 'Please verify your email to activate your account on The Burujan.',
        heading: 'Verify Your Email Address',
        description: 'Thank you for creating an account with The Burujan. Please confirm your email address to activate your account, track orders seamlessly, and access our curated private releases.',
        buttonText: 'Verify Email Address',
        buttonUrl: values.url,
        note: 'This verification link is valid for 24 hours. If you did not create an account with The Burujan, you can safely disregard this email.',
      });
      return { subject, plainText, html };
    }

    case 'verify-email-change': {
      const subject = 'Confirm your new email address';
      const plainText = `Confirm this email address using the secure link within one hour:\n${values.url}\n\nIf you did not request this change, please contact us immediately.`;
      const html = renderLuxuryHtml({
        subject,
        preheader: 'Please confirm your new email address for The Burujan.',
        heading: 'Confirm Your New Email Address',
        description: 'We received a request to update the email address linked to your Burujan account. Please click the button below within one hour to confirm this update.',
        buttonText: 'Confirm New Email',
        buttonUrl: values.url,
        note: 'This link is valid for 1 hour. If you did not request this change, please sign in to secure your account or contact our concierge immediately.',
      });
      return { subject, plainText, html };
    }

    case 'reset': {
      const subject = 'Reset your Burujan password';
      const plainText = `A password reset was requested for your Burujan account.\n\nUse this secure link within one hour to reset your password:\n${values.url}\n\nIf you did not request it, you can ignore this message.`;
      const html = renderLuxuryHtml({
        subject,
        preheader: 'Follow the secure link inside to reset your password.',
        heading: 'Reset Your Password',
        description: 'A password reset was requested for your Burujan account. Click the button below to choose a new password. For security, this link is valid for one hour.',
        buttonText: 'Reset Password',
        buttonUrl: values.url,
        note: 'If you did not request a password reset, no further action is required. Your account remains secure.',
      });
      return { subject, plainText, html };
    }

    case 'newsletter': {
      const subject = 'Confirm your Burujan newsletter subscription';
      const plainText = `Confirm your newsletter subscription using this link:\n${values.url}`;
      const html = renderLuxuryHtml({
        subject,
        preheader: 'Confirm your subscription to The Burujan Gazette.',
        heading: 'Welcome to The Burujan Gazette',
        description: 'Thank you for subscribing. Please confirm your email address to receive our seasonal editorial, private collection drops, and style curations.',
        buttonText: 'Confirm Subscription',
        buttonUrl: values.url,
        note: 'You can update your email preferences or unsubscribe at any time.',
      });
      return { subject, plainText, html };
    }

    case 'order':
    case 'order-confirmed': {
      const subject = `Order ${values.orderNumber} confirmed`;
      const plainText = `Thank you for your order ${values.orderNumber}. Our team has confirmed your order and is preparing it for fulfillment. Track it from your Burujan account.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'Order Confirmed',
        description: `Thank you for choosing The Burujan. Order #${values.orderNumber} has been successfully confirmed and is being carefully prepared by our team.`,
        buttonText: 'View Your Orders',
        buttonUrl: 'https://theburujan.shop/account/orders',
        note: 'We will notify you as soon as your parcel departs our facility.',
      });
      return { subject, plainText, html };
    }

    case 'order-processing': {
      const subject = `Order ${values.orderNumber} is processing`;
      const plainText = `Your order ${values.orderNumber} is now being prepared.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'Order In Preparation',
        description: `Order #${values.orderNumber} has entered preparation. Our logistics team is inspecting and packaging your items to luxury standards.`,
        buttonText: 'View Order Status',
        buttonUrl: 'https://theburujan.shop/account/orders',
      });
      return { subject, plainText, html };
    }

    case 'order-shipped': {
      const subject = `Order ${values.orderNumber} shipped`;
      const plainText = `Your order ${values.orderNumber} is on its way. Tracking: ${values.trackingNumber || 'available in your account'}.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'Your Order Has Shipped',
        description: `Great news! Order #${values.orderNumber} has been dispatched. Track your parcel using the reference below.`,
        detailsHtml: values.trackingNumber
          ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 18px;font-size:14px;color:#0f172a;"><strong>Tracking Number:</strong> ${escapeHtml(values.trackingNumber)}</div>`
          : undefined,
        buttonText: 'Track Your Parcel',
        buttonUrl: 'https://theburujan.shop/account/orders',
      });
      return { subject, plainText, html };
    }

    case 'order-delivered': {
      const subject = `Order ${values.orderNumber} delivered`;
      const plainText = `Your order ${values.orderNumber} has been delivered. We hope you enjoy it.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'Order Delivered',
        description: `Your order #${values.orderNumber} has arrived. We hope you are delighted with your new piece from The Burujan.`,
        buttonText: 'View Account',
        buttonUrl: 'https://theburujan.shop/account/orders',
        note: 'If you have any feedback or require assistance, our concierge is here to help.',
      });
      return { subject, plainText, html };
    }

    case 'order-cancelled': {
      const subject = `Order ${values.orderNumber} cancelled`;
      const plainText = `Your order ${values.orderNumber} was cancelled. Any eligible payment reversal will be processed separately.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'Order Cancellation',
        description: `Order #${values.orderNumber} has been cancelled. Any eligible refund will be credited back to your original payment method.`,
        buttonText: 'Contact Support',
        buttonUrl: 'https://theburujan.shop/contact',
      });
      return { subject, plainText, html };
    }

    case 'refund': {
      const subject = `Refund issued for order ${values.orderNumber}`;
      const plainText = `A refund of ${values.amount} was issued for order ${values.orderNumber}.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'Refund Processed',
        description: `A refund of ${values.amount} has been issued for order #${values.orderNumber}. Depending on your bank or payment provider, it may take 3-5 business days to appear on your statement.`,
        buttonText: 'View Orders',
        buttonUrl: 'https://theburujan.shop/account/orders',
      });
      return { subject, plainText, html };
    }

    case 'return': {
      const subject = `Return update for order ${values.orderNumber}`;
      const plainText = `Your return request for order ${values.orderNumber} is now ${values.status}.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'Return Status Update',
        description: `Your return request for order #${values.orderNumber} has been updated to: ${values.status}.`,
        buttonText: 'Check Return Status',
        buttonUrl: 'https://theburujan.shop/account/orders',
      });
      return { subject, plainText, html };
    }

    case 'contact': {
      const subject = `Contact form: ${values.subject}`;
      const plainText = `Contact form submission from ${values.name} (${values.email}):\n\n${values.message}`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'New Customer Inquiry',
        description: `From: ${values.name} (${values.email})\nSubject: ${values.subject}\n\n${values.message}`,
      });
      return { subject, plainText, html };
    }

    case 'contact-received': {
      const subject = 'We received your message';
      const plainText = `Thanks for contacting The Burujan. We received your message regarding "${values.subject}" and our concierge will attend to your inquiry shortly.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'We Have Received Your Inquiry',
        description: `Thank you for contacting The Burujan. We have received your message regarding "${values.subject}" and our customer service concierge will attend to your request as swiftly as possible.`,
        buttonText: 'Return to Store',
        buttonUrl: 'https://theburujan.shop',
      });
      return { subject, plainText, html };
    }

    default: {
      const subject = `Notification from The Burujan`;
      const plainText = `You have received a new notification from The Burujan.`;
      const html = renderLuxuryHtml({
        subject,
        heading: 'Notification from The Burujan',
        description: plainText,
      });
      return { subject, plainText, html };
    }
  }
}
