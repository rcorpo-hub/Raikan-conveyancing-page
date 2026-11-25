import { feeVersion, professionalFee, getBreakdown, getOptionalCharges, governmentCalculator, dutyCalculator, services } from './config.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const clean = (value = '') => String(value).replace(/[\r\n]+/g, ' ').trim();

export const buyerAttachments = [
  { filename: 'Quote Purchaser - 660.pdf', path: 'public/documents/quote-purchaser-660.pdf', contentType: 'application/pdf' },
  { filename: 'Conveyancing Process Buyer.pdf', path: 'public/documents/conveyancing-process-buyer.pdf', contentType: 'application/pdf' },
];

export const vendorAttachments = [
  { filename: 'Quote Vendor - 660.pdf', path: 'public/documents/quote-vendor-660.pdf', contentType: 'application/pdf' },
  { filename: 'Conveyancing Process Vendor.pdf', path: 'public/documents/conveyancing-process-vendor.pdf', contentType: 'application/pdf' },
];

function buildHeaderHtml(title) {
  return `
    <div style="background:#0f766e;padding:24px 32px">
      <p style="margin:0;color:#99f6e4;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Raikan Conveyancing</p>
      <h1 style="margin:6px 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.25">${escapeHtml(title)}</h1>
    </div>
  `;
}

function buildFooterHtml() {
  return `
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 32px;font-size:13px;color:#64748b;line-height:1.6">
      <p style="margin:0 0 4px;color:#0f172a;font-weight:700;font-size:15px">Bhavesh Chaudhari</p>
      <p style="margin:0 0 2px">Registered Conveyancer</p>
      <p style="margin:0 0 6px;color:#0f766e;font-weight:600">Raikan Corporation Pty Ltd</p>
      <p style="margin:0 0 4px">Shop 3, 160 Hampstead Road, Broadview SA 5083</p>
      <p style="margin:0"><a href="tel:+61870769899" style="color:#0f766e;text-decoration:none;font-weight:600">08 7076 9899</a> | <a href="mailto:conveyancer@rcorpo.com" style="color:#0f766e;text-decoration:none;font-weight:600">conveyancer@rcorpo.com</a></p>
    </div>
  `;
}

function wrapEmailHtml(title, bodyContent) {
  return `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.04)">
    ${buildHeaderHtml(title)}
    <div style="padding:32px">
      ${bodyContent}
    </div>
    ${buildFooterHtml()}
  </div>
</body>
</html>`;
}

function buildBuyerEmail(name, callbackNote) {
  const subject = 'Your Raikan conveyancing quote';
  const text = `Hi ${name}
Thank you for your inquiry today. Please find attached the following documents for your review:
Quote (PDF)
Conveyancing Process for Buyer (PDF)
Click Here to Engage Us: https://rcorpo.com/nc

Costs:
Conveyancing Cost: $660.00 (plus GST)

Government Charges:
Stamp Duty: As per actual
Lodgement Fees: As per actual
Mortgage Registration: $204.00
Priority Notice: $38.00 (OPTIONAL, unless required by your lending bank or if you wish to voluntarily register)
Copy of New Title: $38.00 (OPTIONAL, only if you wish to order a copy after settlement)

Other Fees & Charges:
File Fees: $88.00
PEXA Fees: $146.30
VOI (Verification of Identity): $50.00 per buyer at Australia Post / Virtual ID check
AML / CTF Checks: $25.00 per buyer

Settlement Adjustments:
These charges are adjusted on a pro-rata basis, depending on the settlement date:
· Council Rates
· Water & Sewer Rates
· Emergency Service Levy
· Land Tax (if applicable)
· Strata Fees (if purchasing community title)

Property Insurance:
It is your responsibility to insure the property immediately after the cooling-off period expires.
If you have not already done so, please arrange cover as a matter of urgency. If purchasing a Strata Title or Community Lot, insurance may already be in place.

Stamp Duty:
To calculate your stamp duty and lodgement fees, please click the following link:
Click Here to Know Stamp Duty: https://www.sa.gov.au/topics/planning-and-property/buying-and-selling/property-transfer-fee-calculator
Please be aware that additional stamp duty may apply if you are not a permanent resident or Australian citizen.

Stamp Duty Relief:
You may be eligible for stamp duty relief under the following conditions:
· You are an Australian citizen or permanent resident, or a New Zealand citizen permanently residing in Australia.
· You are at least 18 years of age at the time of making the application for stamp duty relief.
· You have not previously received stamp duty relief for first home buyers (or an equivalent program) in any state or territory of Australia.

Additionally, you or your spouse/domestic partner must not have:
· Lived in an Australian residence owned by either of you before.
· Lived in a property under a lease-to-buy (or equivalent) scheme.
If you have lived with a spouse/domestic partner who previously owned a home (even if you were not the owner), you may be ineligible.
Please note that you must occupy the property as your principal place of residence for at least 6 continuous months, commencing within 12 months of settlement.
${callbackNote ? `\n${callbackNote}\n` : ''}
Bhavesh Chaudhari
Registered Conveyancer
Raikan Corporation Pty Ltd
Shop 3, 160 Hampstead Road, Broadview SA 5083
08 7076 9899 | conveyancer@rcorpo.com`;

  const html = wrapEmailHtml(subject, `
    <p style="font-size:16px;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px">Thank you for your inquiry today. Please find attached the following documents for your review:</p>
    
    <div style="background:#f0fdfa;border-left:4px solid #0f766e;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 24px">
      <p style="margin:0 0 6px;font-weight:700;color:#0f766e">Attached Documents:</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>Quote (PDF)</li>
        <li>Conveyancing Process for Buyer (PDF)</li>
      </ul>
      <p style="margin:12px 0 0">
        <a href="https://rcorpo.com/nc" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:6px;font-size:14px">Click Here to Engage Us</a>
      </p>
    </div>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Costs</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Conveyancing Cost</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f766e">$660.00 (plus GST)</td></tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Government Charges</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Stamp Duty</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">As per actual</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Lodgement Fees</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">As per actual</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Mortgage Registration</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$204.00</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Priority Notice (OPTIONAL)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$38.00</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Copy of New Title (OPTIONAL)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$38.00</td></tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Other Fees & Charges</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">File Fees</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$88.00</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">PEXA Fees</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$146.30</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">VOI (Verification of Identity)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$50.00 per buyer</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">AML / CTF Checks</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$25.00 per buyer</td></tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Settlement Adjustments</h2>
    <p style="margin:0 0 8px;font-size:13.5px;color:#475569">These charges are adjusted on a pro-rata basis, depending on the settlement date:</p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:13.5px;color:#334155">
      <li>Council Rates</li>
      <li>Water & Sewer Rates</li>
      <li>Emergency Service Levy</li>
      <li>Land Tax (if applicable)</li>
      <li>Strata Fees (if purchasing community title)</li>
    </ul>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Property Insurance</h2>
    <p style="margin:0 0 16px;font-size:13.5px;color:#334155;line-height:1.55">It is your responsibility to insure the property immediately after the cooling-off period expires. If you have not already done so, please arrange cover as a matter of urgency. If purchasing a Strata Title or Community Lot, insurance may already be in place.</p>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Stamp Duty</h2>
    <p style="margin:0 0 8px;font-size:13.5px;color:#334155">To calculate your stamp duty and lodgement fees, please click the following link:<br>
      <a href="https://www.sa.gov.au/topics/planning-and-property/buying-and-selling/property-transfer-fee-calculator" style="color:#0f766e;font-weight:700">Click Here to Know Stamp Duty</a>
    </p>
    <p style="margin:0 0 16px;font-size:12.5px;color:#64748b">Please be aware that additional stamp duty may apply if you are not a permanent resident or Australian citizen.</p>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Stamp Duty Relief</h2>
    <p style="margin:0 0 8px;font-size:13.5px;color:#334155">You may be eligible for stamp duty relief under the following conditions:</p>
    <ul style="margin:0 0 12px;padding-left:20px;font-size:13.5px;color:#334155">
      <li>You are an Australian citizen or permanent resident, or a New Zealand citizen permanently residing in Australia.</li>
      <li>You are at least 18 years of age at the time of making the application for stamp duty relief.</li>
      <li>You have not previously received stamp duty relief for first home buyers (or an equivalent program) in any state or territory of Australia.</li>
    </ul>
    <p style="margin:0 0 8px;font-size:13.5px;color:#334155">Additionally, you or your spouse/domestic partner must not have:</p>
    <ul style="margin:0 0 12px;padding-left:20px;font-size:13.5px;color:#334155">
      <li>Lived in an Australian residence owned by either of you before.</li>
      <li>Lived in a property under a lease-to-buy (or equivalent) scheme.</li>
    </ul>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b">If you have lived with a spouse/domestic partner who previously owned a home (even if you were not the owner), you may be ineligible.<br>Please note that you must occupy the property as your principal place of residence for at least 6 continuous months, commencing within 12 months of settlement.</p>
    
    ${callbackNote ? `<div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin:20px 0;font-size:13.5px;color:#334155">${escapeHtml(callbackNote)}</div>` : ''}
  `);

  return { subject, text, html };
}

function buildVendorEmail(name, callbackNote) {
  const subject = 'Your Raikan conveyancing quote';
  const text = `Hi ${name}
Thank you for your inquiry today. Please find attached the following documents for your review:
Quote (PDF)
Conveyancing Process for Vendor (PDF)
Click Here to Engage Us: https://rcorpo.com/nc

Costs:
Conveyancing Cost: $660.00 (plus GST)
Preparation of Contract of Sale: $990 (plus GST)

Government Charges:
Discharge of Mortgage: $204.00 (Applicable if you have an existing loan on the property)

Other Fees & Charges:
File Fees: $88.00
PEXA Fees: $146.30
VOI (Verification of Identity): $50.00 per vendor
AML / CTF Checks: $25.00 per vendor

Form1 & Searches:
The preparation of Form1 and associated searches will incur an additional charge as per below estimation
You can view the pricing details here: https://form1.net.au/pricing/
Your agent may already have arranged the form1&Searches, you may confirm with them to avoid paying again.

Settlement Adjustments:
Settlement adjustments are made based on actual pro-rata costs at the time of settlement. As the vendor, you will be responsible for paying all applicable dues, such as Council Rates, Emergency Service Levy, and Strata Fees etc, until the end of the financial year (i.e. 30th June).
Water and Sewer Rates are paid until the end of the quarter in which settlement is expected.
The purchaser will reimburse you for any charges paid in advance from the settlement date onward.

Additional Information:

Discharge Authority:
You will need to submit a Discharge Authority to notify your lender that the property has been sold, and to enable the preparation of discharge documents in a timely manner.
Please ensure that the discharge authority is submitted as soon as possible after signing the contract.

Capital Gain Withholding Certificate :
Effective from 1st January 2025, vendors are required to provide a Capital Gain Withholding Certificate for all property transactions, irrespective of the sale price.
This certificate is a legal requirement to be provided to the purchaser.
Please note that each vendor involved in the sale must lodge a separate application and obtain an individual Capital Gain Withholding Certificate.
The ATO may take up to four weeks to issue this certificate, so we recommend you apply for it as a matter of priority and urgency to avoid any delays with the settlement.
You can either get assistance from your tax agent or apply for it directly via this link:
ATO Capital Gain Withholding Certificate Application: https://www.ato.gov.au/single-page-applications/frwt-certificate
If the Capital Gain Withholding Certificate is not provided, the purchaser is legally required to withhold 15% of the purchase price from the settlement funds and remit it directly to the ATO.
${callbackNote ? `\n${callbackNote}\n` : ''}
Bhavesh Chaudhari
Registered Conveyancer
Raikan Corporation Pty Ltd
Shop 3, 160 Hampstead Road, Broadview SA 5083
08 7076 9899 | conveyancer@rcorpo.com`;

  const html = wrapEmailHtml(subject, `
    <p style="font-size:16px;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px">Thank you for your inquiry today. Please find attached the following documents for your review:</p>
    
    <div style="background:#f0fdfa;border-left:4px solid #0f766e;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 24px">
      <p style="margin:0 0 6px;font-weight:700;color:#0f766e">Attached Documents:</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>Quote (PDF)</li>
        <li>Conveyancing Process for Vendor (PDF)</li>
      </ul>
      <p style="margin:12px 0 0">
        <a href="https://rcorpo.com/nc" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:6px;font-size:14px">Click Here to Engage Us</a>
      </p>
    </div>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Costs</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Conveyancing Cost</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f766e">$660.00 (plus GST)</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Preparation of Contract of Sale</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f766e">$990 (plus GST)</td></tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Government Charges</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Discharge of Mortgage (if existing loan)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$204.00</td></tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Other Fees & Charges</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">File Fees</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$88.00</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">PEXA Fees</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$146.30</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">VOI (Verification of Identity)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$50.00 per vendor</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">AML / CTF Checks</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$25.00 per vendor</td></tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Form1 & Searches</h2>
    <p style="margin:0 0 8px;font-size:13.5px;color:#334155">The preparation of Form1 and associated searches will incur an additional charge as per below estimation.<br>
      You can view the pricing details <a href="https://form1.net.au/pricing/" style="color:#0f766e;font-weight:700">here</a>.
    </p>
    <p style="margin:0 0 16px;font-size:12.5px;color:#64748b">Your agent may already have arranged the Form 1 & Searches; you may confirm with them to avoid paying again.</p>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Settlement Adjustments</h2>
    <p style="margin:0 0 8px;font-size:13.5px;color:#334155;line-height:1.55">Settlement adjustments are made based on actual pro-rata costs at the time of settlement. As the vendor, you will be responsible for paying all applicable dues, such as Council Rates, Emergency Service Levy, and Strata Fees etc, until the end of the financial year (i.e. 30th June). Water and Sewer Rates are paid until the end of the quarter in which settlement is expected. The purchaser will reimburse you for any charges paid in advance from the settlement date onward.</p>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Additional Information</h2>
    
    <h3 style="font-size:15px;color:#0f766e;margin:16px 0 6px">Discharge Authority</h3>
    <p style="margin:0 0 16px;font-size:13.5px;color:#334155;line-height:1.55">You will need to submit a Discharge Authority to notify your lender that the property has been sold, and to enable the preparation of discharge documents in a timely manner. Please ensure that the discharge authority is submitted as soon as possible after signing the contract.</p>

    <h3 style="font-size:15px;color:#0f766e;margin:16px 0 6px">Capital Gain Withholding Certificate</h3>
    <p style="margin:0 0 10px;font-size:13.5px;color:#334155;line-height:1.55">Effective from 1st January 2025, vendors are required to provide a Capital Gain Withholding Certificate for all property transactions, irrespective of the sale price. This certificate is a legal requirement to be provided to the purchaser.</p>
    <p style="margin:0 0 10px;font-size:13.5px;color:#334155;line-height:1.55">Please note that each vendor involved in the sale must lodge a separate application and obtain an individual Capital Gain Withholding Certificate. The ATO may take up to four weeks to issue this certificate, so we recommend you apply for it as a matter of priority and urgency to avoid any delays with the settlement.</p>
    <p style="margin:0 0 10px;font-size:13.5px;color:#334155">You can either get assistance from your tax agent or apply for it directly via this link:<br>
      <a href="https://www.ato.gov.au/single-page-applications/frwt-certificate" style="color:#0f766e;font-weight:700">ATO Capital Gain Withholding Certificate Application</a>
    </p>
    <p style="margin:0 0 16px;font-size:12.5px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;padding:10px 14px;border-radius:6px">If the Capital Gain Withholding Certificate is not provided, the purchaser is legally required to withhold 15% of the purchase price from the settlement funds and remit it directly to the ATO.</p>

    ${callbackNote ? `<div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin:20px 0;font-size:13.5px;color:#334155">${escapeHtml(callbackNote)}</div>` : ''}
  `);

  return { subject, text, html };
}

function buildSpouseTransferEmail(name, callbackNote) {
  const subject = 'Your Raikan conveyancing quote';
  const text = `Hi ${name}

Thank you for your inquiry today.

________________________________________
Costs:
•	Conveyancing Cost: $990.00 (Incl. GST)
•	Copy Of New Title : $35.00 (OPTIONAL only if you wish us to order a copy of title after settlement)

________________________________________
Other Fees & Charges:
•	File Fees: $88.00
•	PEXA Fees:  $146.30 (for Existing Person on title)
•	PEXA Fees: $146.30 (for Incoming person on title)
•	Lodgement Fees (LTO Fees): $204.00
•	VOI (Verification of Identity): $50.00 per person
•	AML / CTF Checks: $25.00 per person 

________________________________________
Please note following:
•	Above information is applicable if you are spouse, living together and it is for your Principal place of residence.
•	There shall be NO CONSIDERATION in place for this transfer.
•	Please ensure you have consent from your lender regarding this transfer taking place (in case if you have mortgage on title)

________________________________________
What’s Next?
If you wish to proceed with engaging us, 
1.	Documents Required:
•	Latest copy of council rates
•	Marriage Certificate
•	Copy of Title (If you have)

2.	Information Required :

Existing Proprietor:
•	First Name
•	Middle Name:
•	Last Name:
•	Email:
•	Phone:
•	Postal Address:
•	Date of Birth 

New Proprietor :
•	First Name:                         
•	Middle Name:
•	Last Name:                         
•	Email:                                    
•	Phone:                                 
•	Postal Address:
•	Date of Birth 

We will send you relevant documents for your signature upon providing above information.
${callbackNote ? `\n${callbackNote}\n` : ''}
Bhavesh Chaudhari
Registered Conveyancer
Raikan Corporation Pty Ltd
Shop 3, 160 Hampstead Road, Broadview SA 5083
08 7076 9899 | conveyancer@rcorpo.com`;

  const html = wrapEmailHtml(subject, `
    <p style="font-size:16px;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px">Thank you for your inquiry today.</p>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Costs</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Conveyancing Cost</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f766e">$990.00 (Incl. GST)</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Copy Of New Title (OPTIONAL)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$35.00</td></tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Other Fees & Charges</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">File Fees</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$88.00</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">PEXA Fees (for Existing Person on title)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$146.30</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">PEXA Fees (for Incoming person on title)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$146.30</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Lodgement Fees (LTO Fees)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$204.00</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">VOI (Verification of Identity)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$50.00 per person</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">AML / CTF Checks</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$25.00 per person</td></tr>
    </table>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:24px 0">
      <p style="margin:0 0 8px;font-weight:700;color:#0f172a">Please note following:</p>
      <ul style="margin:0;padding-left:20px;font-size:13.5px;color:#334155;line-height:1.55">
        <li>Above information is applicable if you are spouse, living together and it is for your Principal place of residence.</li>
        <li>There shall be <strong>NO CONSIDERATION</strong> in place for this transfer.</li>
        <li>Please ensure you have consent from your lender regarding this transfer taking place (in case if you have mortgage on title)</li>
      </ul>
    </div>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">What’s Next?</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#334155">If you wish to proceed with engaging us,</p>

    <h3 style="font-size:15px;color:#0f766e;margin:16px 0 6px">1. Documents Required:</h3>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:13.5px;color:#334155">
      <li>Latest copy of council rates</li>
      <li>Marriage Certificate</li>
      <li>Copy of Title (If you have)</li>
    </ul>

    <h3 style="font-size:15px;color:#0f766e;margin:16px 0 6px">2. Information Required:</h3>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0 16px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
        <p style="margin:0 0 8px;font-weight:700;color:#0f172a;font-size:14px">Existing Proprietor:</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.5">
          <li>First Name</li>
          <li>Middle Name:</li>
          <li>Last Name:</li>
          <li>Email:</li>
          <li>Phone:</li>
          <li>Postal Address:</li>
          <li>Date of Birth</li>
        </ul>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
        <p style="margin:0 0 8px;font-weight:700;color:#0f172a;font-size:14px">New Proprietor :</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.5">
          <li>First Name:</li>
          <li>Middle Name:</li>
          <li>Last Name:</li>
          <li>Email:</li>
          <li>Phone:</li>
          <li>Postal Address:</li>
          <li>Date of Birth</li>
        </ul>
      </div>
    </div>

    <p style="margin:16px 0 0;font-size:13.5px;color:#334155">We will send you relevant documents for your signature upon providing above information.</p>
    ${callbackNote ? `<div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin:20px 0;font-size:13.5px;color:#334155">${escapeHtml(callbackNote)}</div>` : ''}
  `);

  return { subject, text, html };
}

function buildFormerSpouseTransferEmail(name, callbackNote) {
  const subject = 'Your Raikan conveyancing quote';
  const text = `Hi ${name}

Thank you for your inquiry today.

________________________________________
Costs:
•	Conveyancing Cost: $990.00 (Incl. GST)
•	Copy Of New Title : $35.00 (OPTIONAL only if you wish us to order a copy of title after settlement)

________________________________________
Other Fees & Charges:
•	File Fees: $88.00
•	PEXA Fees:  $146.30 (for Existing Person on title)
•	PEXA Fees: $146.30 (for Incoming person on title)
•	Lodgement Fees (LTO Fees): $204.00
•	VOI (Verification of Identity): $50.00 per person
•	AML / CTF Checks: $25.00 per person 

________________________________________
Please note following:
•	Above information is applicable if you are spouse, living together and it is for your Principal place of residence.
•	There shall be NO CONSIDERATION in place for this transfer.
•	Please ensure you have consent from your lender regarding this transfer taking place (in case if you have mortgage on title)

________________________________________
What’s Next?
If you wish to proceed with engaging us, 
1.	Documents Required:
•	Latest copy of council rates
•	Marriage Certificate
•	Copy of Title (If you have)

2.	Information Required :

Existing Proprietor Number 1:
•	First Name
•	Middle Name:
•	Last Name:
•	Email:
•	Phone:
•	Postal Address:
•	Date of Birth 

Existing Proprietor Number 2:
•	First Name:                         
•	Middle Name:
•	Last Name:                         
•	Email:                                    
•	Phone:                                 
•	Postal Address:
•	Date of Birth 

We will send you relevant documents for your signature upon providing above information.
${callbackNote ? `\n${callbackNote}\n` : ''}
Bhavesh Chaudhari
Registered Conveyancer
Raikan Corporation Pty Ltd
Shop 3, 160 Hampstead Road, Broadview SA 5083
08 7076 9899 | conveyancer@rcorpo.com`;

  const html = wrapEmailHtml(subject, `
    <p style="font-size:16px;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px">Thank you for your inquiry today.</p>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Costs</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Conveyancing Cost</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f766e">$990.00 (Incl. GST)</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Copy Of New Title (OPTIONAL)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$35.00</td></tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Other Fees & Charges</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">File Fees</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$88.00</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">PEXA Fees (for Existing Person on title)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$146.30</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">PEXA Fees (for Incoming person on title)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$146.30</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Lodgement Fees (LTO Fees)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$204.00</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">VOI (Verification of Identity)</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$50.00 per person</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">AML / CTF Checks</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">$25.00 per person</td></tr>
    </table>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:24px 0">
      <p style="margin:0 0 8px;font-weight:700;color:#0f172a">Please note following:</p>
      <ul style="margin:0;padding-left:20px;font-size:13.5px;color:#334155;line-height:1.55">
        <li>Above information is applicable if you are spouse, living together and it is for your Principal place of residence.</li>
        <li>There shall be <strong>NO CONSIDERATION</strong> in place for this transfer.</li>
        <li>Please ensure you have consent from your lender regarding this transfer taking place (in case if you have mortgage on title)</li>
      </ul>
    </div>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">What’s Next?</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#334155">If you wish to proceed with engaging us,</p>

    <h3 style="font-size:15px;color:#0f766e;margin:16px 0 6px">1. Documents Required:</h3>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:13.5px;color:#334155">
      <li>Latest copy of council rates</li>
      <li>Marriage Certificate</li>
      <li>Copy of Title (If you have)</li>
    </ul>

    <h3 style="font-size:15px;color:#0f766e;margin:16px 0 6px">2. Information Required:</h3>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0 16px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
        <p style="margin:0 0 8px;font-weight:700;color:#0f172a;font-size:14px">Existing Proprietor Number 1:</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.5">
          <li>First Name</li>
          <li>Middle Name:</li>
          <li>Last Name:</li>
          <li>Email:</li>
          <li>Phone:</li>
          <li>Postal Address:</li>
          <li>Date of Birth</li>
        </ul>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
        <p style="margin:0 0 8px;font-weight:700;color:#0f172a;font-size:14px">Existing Proprietor Number 2:</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.5">
          <li>First Name:</li>
          <li>Middle Name:</li>
          <li>Last Name:</li>
          <li>Email:</li>
          <li>Phone:</li>
          <li>Postal Address:</li>
          <li>Date of Birth</li>
        </ul>
      </div>
    </div>

    <p style="margin:16px 0 0;font-size:13.5px;color:#334155">We will send you relevant documents for your signature upon providing above information.</p>
    ${callbackNote ? `<div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin:20px 0;font-size:13.5px;color:#334155">${escapeHtml(callbackNote)}</div>` : ''}
  `);

  return { subject, text, html };
}

function buildFamilyTransferEmail(name, callbackNote) {
  const subject = 'Your Raikan conveyancing quote';
  const text = `Hi ${name}

Thank you for your inquiry today.

________________________________________
Costs:
•\tConveyancing Cost: $990.00 (Incl. GST)
•\tDisbursements : as per actual from LTO (Land Title Office) depends on the numbers of titles 
•\tPremium Services:  LTO provides premium service for the issuance of title once the deposit of plan is submitted for quick turn around within a week. This costs approximately addition $500 plus however please note that this is OPTIONAL Service if you wish fast application process.
Process:
•\tOur process will only start once we receive SCAP Approved plan from your town planner/surveyor.
•\tPlease ensure that your lender will be willing to provide consent for the issuance of new title if you have mortgage on title.
${callbackNote ? `\n${callbackNote}\n` : ''}
Bhavesh Chaudhari
Registered Conveyancer
Raikan Corporation Pty Ltd
Shop 3, 160 Hampstead Road, Broadview SA 5083
08 7076 9899 | conveyancer@rcorpo.com`;

  const html = wrapEmailHtml(subject, `
    <p style="font-size:16px;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px">Thank you for your inquiry today.</p>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Costs</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#334155">Conveyancing Cost</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0f766e">$990.00 (Incl. GST)</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;line-height:1.55" colspan="2">
          <strong style="color:#0f172a">Disbursements:</strong> as per actual from LTO (Land Title Office) depends on the numbers of titles
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;line-height:1.55" colspan="2">
          <strong style="color:#0f172a">Premium Services:</strong> LTO provides premium service for the issuance of title once the deposit of plan is submitted for quick turn around within a week. This costs approximately addition $500 plus however please note that this is <strong style="color:#0f766e">OPTIONAL Service</strong> if you wish fast application process.
        </td>
      </tr>
    </table>

    <h2 style="font-size:17px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px">Process</h2>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:13.5px;color:#334155;line-height:1.6">
      <li style="margin-bottom:10px">Our process will only start once we receive SCAP Approved plan from your town planner/surveyor.</li>
      <li>Please ensure that your lender will be willing to provide consent for the issuance of new title if you have mortgage on title.</li>
    </ul>

    ${callbackNote ? `<div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin:20px 0;font-size:13.5px;color:#334155">${escapeHtml(callbackNote)}</div>` : ''}
  `);

  return { subject, text, html };
}

export function buildTeamEmail(lead) {
  const service = services[lead.service];
  const label = service?.label || 'Conveyancing';

  let choiceLabel = 'Not specified';
  if (lead.service === 'transfer') {
    if (lead.choice === 'spouse') choiceLabel = 'Transfer with current spouse';
    else if (lead.choice === 'former' || lead.choice === 'former_spouse') choiceLabel = 'Transfer with former spouse';
    else if (lead.choice === 'family') choiceLabel = 'Transfer between family members other than spouse';
    else {
      const found = service?.choices?.find(([k]) => k === lead.choice);
      choiceLabel = found ? found[1] : (lead.choice || 'Something else / not sure');
    }
  } else {
    const found = service?.choices?.find(([k]) => k === lead.choice);
    choiceLabel = found ? found[1] : (lead.choice || 'Not specified');
  }

  const name = clean(lead.contact?.name) || 'Not provided';
  const email = clean(lead.contact?.email) || '';
  const phone = clean(lead.contact?.phone) || '';
  const notes = clean(lead.contact?.notes);
  const isCallback = Boolean(lead.callback);

  let feeContext = '';
  if (lead.service === 'buy') {
    feeContext = 'Our Fee: $660.00 (plus GST) | File fee: $88 | PEXA: $146.30 | Identity check: $50 | AML/CTF: $25';
  } else if (lead.service === 'sell') {
    feeContext = 'Our Fee: $660.00 (plus GST) | Contract preparation: $990 (plus GST) | File fee: $88 | PEXA: $146.30 | Identity check: $50 | AML/CTF: $25';
  } else if (lead.service === 'transfer' && (lead.choice === 'spouse' || lead.choice === 'former' || lead.choice === 'former_spouse')) {
    feeContext = 'Our Fee: $990.00 (Incl. GST) | File fee: $88 | PEXA (x2): $292.60 | Lodgement: $204 | Identity check: $50/ea | AML/CTF: $25/ea';
  } else if (lead.service === 'transfer' && lead.choice === 'family') {
    feeContext = 'Our Fee: $990.00 (Incl. GST) | Disbursements as per actual from LTO | Optional premium service: ~$500+';
  } else {
    feeContext = 'Personal quote required';
  }

  const subject = `New ${label.toLowerCase()} enquiry`;

  const text = `New Enquiry Details:
Service: ${label}
Choice: ${choiceLabel}
Name: ${name}
Email: ${email}
Phone: ${phone}
Callback requested: ${isCallback ? 'Yes' : 'No'}
Questions / Notes: ${notes || 'None'}
Fee context: ${feeContext}
Fee version: ${feeVersion}`;

  const html = `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.04)">
    <div style="background:#0f766e;padding:24px 32px">
      <p style="margin:0;color:#99f6e4;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Raikan Conveyancing</p>
      <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3">New Client Enquiry</h1>
    </div>
    <div style="padding:32px">
      ${isCallback ? `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:6px;margin:0 0 24px">
        <strong style="color:#b45309;font-size:14px;display:block">Callback Requested</strong>
        <p style="margin:4px 0 0;font-size:13px;color:#92400e">The client requested a phone call. Please follow up during business hours.</p>
      </div>` : ''}

      <div style="margin-bottom:24px">
        ${phone ? `<a href="tel:${escapeHtml(phone)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:6px;font-size:13px;margin-right:8px">Call ${escapeHtml(phone)}</a>` : ''}
        ${email ? `<a href="mailto:${escapeHtml(email)}" style="display:inline-block;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:6px;font-size:13px">Email Client</a>` : ''}
      </div>

      <h2 style="font-size:16px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px">Client Contact Details</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:35%">Full Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Email Address</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">
            <a href="mailto:${escapeHtml(email)}" style="color:#0f766e;text-decoration:none">${escapeHtml(email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Phone Number</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">
            <a href="tel:${escapeHtml(phone)}" style="color:#0f766e;text-decoration:none">${escapeHtml(phone)}</a>
          </td>
        </tr>
      </table>

      <h2 style="font-size:16px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px">Transaction Enquiry</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:35%">Service</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">${escapeHtml(label)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Transaction Choice</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">${escapeHtml(choiceLabel)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Callback Requested</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">
            ${isCallback ? '<span style="display:inline-block;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">Yes</span>' : 'No'}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Questions / Notes</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:500">${notes ? escapeHtml(notes) : '<em style="color:#94a3b8">None</em>'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Fee Context</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f766e;font-weight:600;font-size:13px">${escapeHtml(feeContext)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Fee Version</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:12px">${escapeHtml(feeVersion)}</td>
        </tr>
      </table>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;font-size:12px;color:#64748b;line-height:1.5">
      <p style="margin:0 0 4px;font-weight:600;color:#0f172a">Raikan Conveyancing Internal Notification</p>
      <p style="margin:0">Submitted via the online instant quote form on the Raikan website.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

export function buildCallbackTeamEmail({ name = '', phone = '', time = 'Any time' }) {
  const cleanName = clean(name) || 'Not provided';
  const cleanPhone = clean(phone) || '';
  const cleanTime = clean(time) || 'Any time';
  const subject = 'Callback requested';
  const text = `Callback Requested:
Name: ${cleanName}
Phone: ${cleanPhone}
Preferred time: ${cleanTime}`;

  const html = `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.04)">
    <div style="background:#0f766e;padding:24px 32px">
      <p style="margin:0;color:#99f6e4;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Raikan Conveyancing</p>
      <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3">Callback Requested</h1>
    </div>
    <div style="padding:32px">
      <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:6px;margin:0 0 24px">
        <strong style="color:#b45309;font-size:14px;display:block">Urgent: Client Requested Phone Call</strong>
        <p style="margin:4px 0 0;font-size:13px;color:#92400e">Preferred call time: <strong>${escapeHtml(cleanTime)}</strong></p>
      </div>

      <div style="margin-bottom:24px">
        ${cleanPhone ? `<a href="tel:${escapeHtml(cleanPhone)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;padding:9px 16px;border-radius:6px;font-size:13px">Call ${escapeHtml(cleanPhone)}</a>` : ''}
      </div>

      <h2 style="font-size:16px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px">Client Details</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:35%">Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">${escapeHtml(cleanName)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Phone Number</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">
            <a href="tel:${escapeHtml(cleanPhone)}" style="color:#0f766e;text-decoration:none">${escapeHtml(cleanPhone)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b">Preferred Time</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600">${escapeHtml(cleanTime)}</td>
        </tr>
      </table>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;font-size:12px;color:#64748b;line-height:1.5">
      <p style="margin:0 0 4px;font-weight:600;color:#0f172a">Raikan Conveyancing Internal Notification</p>
      <p style="margin:0">Submitted via the online callback request on the Raikan website.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

// Pure templates: safe to import into a future Node.js delivery worker. This module sends nothing.
export function createClientMessages(lead) {
  if (!services[lead.service] || !lead.reference || !lead.contact?.email || !lead.contact?.phone) {
    throw new Error('A valid quote reference, service and contact details are required.');
  }

  const label = services[lead.service].label;
  const name = clean(lead.contact.name) || 'there';
  const firstName = name.split(/\s+/)[0] || 'there';
  const callbackNote = lead.callback ? 'You asked for a call. Our team will contact you during office hours.' : '';

  const smsMessages = [
    `Hi! 👋 ${firstName},\n\nGood news-your conveyancing quote has just landed in your email. 📧\n\nIf it's playing hide and seek, check your Spam/Junk folder... sometimes our emails like to go on little adventures. 😄\n\nAny questions? Just email on admin1@rcorpo.com or call us on (08) 7076 9899.\n\nReady to get started?\n\nClick below :\n\nhttps://rcorpo.com/nc/\n\nCheers,\nRaikan Corporation`,
    `Please provide following details to your real estate agent/ mortgage broker.\n\nCompany Name:\nRaikan Corporation\n\nContact Name:\nBhavesh Chaudhari\n\nContact No:\n08-70769899\n\nEmail:\nconveyancer@rcorpo.com`,
  ];

  let emailPayload;

  if (lead.service === 'buy') {
    const buyerEmail = buildBuyerEmail(name, callbackNote);
    emailPayload = {
      to: lead.contact.email,
      replyTo: 'conveyancer@rcorpo.com',
      subject: buyerEmail.subject,
      text: buyerEmail.text,
      html: buyerEmail.html,
      attachments: buyerAttachments.map(a => ({ ...a })),
    };
  } else if (lead.service === 'sell') {
    const vendorEmail = buildVendorEmail(name, callbackNote);
    emailPayload = {
      to: lead.contact.email,
      replyTo: 'conveyancer@rcorpo.com',
      subject: vendorEmail.subject,
      text: vendorEmail.text,
      html: vendorEmail.html,
      attachments: vendorAttachments.map(a => ({ ...a })),
    };
  } else if (lead.service === 'transfer' && lead.choice === 'spouse') {
    const spouseEmail = buildSpouseTransferEmail(name, callbackNote);
    emailPayload = {
      to: lead.contact.email,
      replyTo: 'conveyancer@rcorpo.com',
      subject: spouseEmail.subject,
      text: spouseEmail.text,
      html: spouseEmail.html,
      attachments: [],
    };
  } else if (lead.service === 'transfer' && (lead.choice === 'former' || lead.choice === 'former_spouse')) {
    const formerEmail = buildFormerSpouseTransferEmail(name, callbackNote);
    emailPayload = {
      to: lead.contact.email,
      replyTo: 'conveyancer@rcorpo.com',
      subject: formerEmail.subject,
      text: formerEmail.text,
      html: formerEmail.html,
      attachments: [],
    };
  } else if (lead.service === 'transfer' && lead.choice === 'family') {
    const familyEmail = buildFamilyTransferEmail(name, callbackNote);
    emailPayload = {
      to: lead.contact.email,
      replyTo: 'conveyancer@rcorpo.com',
      subject: familyEmail.subject,
      text: familyEmail.text,
      html: familyEmail.html,
      attachments: [],
    };
  } else {
    // Default fallback (e.g. generic transfer) - no reference number in customer email
    const subject = 'Your Raikan conveyancing quote';
    const rows = [...getBreakdown(lead.service), ...getOptionalCharges(lead.service)];
    const text = `Hi ${name},\n\nThank you for contacting Raikan about ${label.toLowerCase()}.\n\nWe will prepare a personal quote for your transaction.\n\nYOUR COST GUIDE\n${rows.map(([k,v]) => `${k}: ${v}`).join('\n')}\n\nThis is a cost guide, not your total settlement cost. Government charges and adjustments depend on your property. Third-party fees can change. We will confirm the charges and their tax treatment before you proceed.\n\nWHAT HAPPENS NEXT\n1. Review your quote and our team will be in touch.\n2. Reply with any questions or let us know you would like to proceed.\n3. We will confirm your details and explain the next steps.\n\n${callbackNote || 'Reply to this email or call 08 7076 9899 if you would like to talk.'}\n\nGovernment fee calculator: ${governmentCalculator}\nRevenueSA stamp duty calculator: ${dutyCalculator}\n\nBhavesh Chaudhari\nRegistered Conveyancer\nRaikan Corporation Pty Ltd\nShop 3, 160 Hampstead Road, Broadview SA 5083\n08 7076 9899 | conveyancer@rcorpo.com`;
    
    const table = rows.map(([k,v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #dce6ec">${escapeHtml(k)}</td><td style="padding:10px 0 10px 16px;border-bottom:1px solid #dce6ec;text-align:right;font-weight:bold">${escapeHtml(v)}</td></tr>`).join('');
    const html = wrapEmailHtml(subject, `
      <p style="font-size:16px;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 20px">Thank you for contacting Raikan about ${escapeHtml(label.toLowerCase())}. We will prepare a personal quote for your transaction.</p>
      <h2 style="font-size:18px;color:#0f172a;margin:20px 0 10px">Your cost guide</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">${table}</table>
      <p style="font-size:13px;color:#64748b;margin:16px 0">This is a cost guide, not your total settlement cost. Government charges and adjustments depend on your property. Third-party fees can change.</p>
      ${callbackNote ? `<div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin:20px 0;font-size:13.5px;color:#334155">${escapeHtml(callbackNote)}</div>` : ''}
    `);

    emailPayload = {
      to: lead.contact.email,
      replyTo: 'conveyancer@rcorpo.com',
      subject,
      text,
      html,
      attachments: [],
    };
  }

  return {
    feeVersion,
    sms: { to: lead.contact.phone, text: smsMessages[0], texts: smsMessages },
    email: emailPayload,
    teamEmail: buildTeamEmail(lead),
  };
}
