import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.1/mod.ts';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateEnvelopeRequest {
  rentalId: string;
}

interface CreateEnvelopeResponse {
  ok: boolean;
  envelopeId?: string;
  embeddedSigningUrl?: string;
  error?: string;
  detail?: string;
}

// Generate rental agreement document content
function generateRentalAgreementPDF(rental: any, customer: any, vehicle: any): string {
  const startDate = new Date(rental.start_date).toLocaleDateString('en-GB');
  const endDate = new Date(rental.end_date).toLocaleDateString('en-GB');

  // Dynamic values from database with proper fallbacks
  const monthlyPayment = Number(rental.monthly_payment) || 0;
  const initialPayment = Number(rental.initial_payment) || 0;
  const durationMonths = Number(rental.duration_months) || 12;

  // Hardcoded values (not in database)
  const deposit = 0;
  const deliveryCharge = 0;

  // Format monthly amount for display
  const monthlyAmount = monthlyPayment.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Calculate total charge
  const totalCharge = (monthlyPayment * durationMonths) + deposit + initialPayment + deliveryCharge;

  const agreementHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      margin: 40px;
      color: #000;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
      text-decoration: underline;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    table, th, td {
      border: 1px solid #000;
    }
    th, td {
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .signature-section {
      margin-top: 40px;
      margin-bottom: 60px;
    }
    .signature-line {
      margin-top: 60px;
      border-top: 1px solid #000;
      width: 300px;
      display: inline-block;
    }
    .terms-section {
      margin-top: 30px;
      page-break-before: always;
    }
    .terms-section h3 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 15px;
    }
    .terms-section p, .terms-section li {
      font-size: 10pt;
      line-height: 1.5;
    }
    .checkbox {
      display: inline-block;
      width: 15px;
      height: 15px;
      border: 1px solid #000;
      margin-right: 5px;
      vertical-align: middle;
    }
  </style>
</head>
<body>

<h1>RTech Group Car Hire Agreement</h1>

<h2>PARTIES TO AGREEMENT</h2>
<p><strong>Company:</strong> RTech Group</p>
<p><strong>Customer:</strong> ${customer.name}</p>

<h2>KEY FINANCIAL INFORMATION</h2>
<table>
  <tr>
    <th>Make</th>
    <th>Model</th>
    <th>Variant</th>
    <th>Reg</th>
    <th>Start Date</th>
    <th>End Date</th>
  </tr>
  <tr>
    <td>${vehicle.make}</td>
    <td>${vehicle.model}</td>
    <td>${vehicle.colour || '-'}</td>
    <td>${vehicle.reg}</td>
    <td>${startDate}</td>
    <td>${endDate}</td>
  </tr>
</table>

<table>
  <tr>
    <th>Deposit</th>
    <th>Initial Payment</th>
    <th>Monthly Hire</th>
    <th>Delivery Charge</th>
    <th>Total Charge</th>
  </tr>
  <tr>
    <td>£${deposit.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td>£${initialPayment.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td>£${monthlyAmount}</td>
    <td>£${deliveryCharge.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td>£${totalCharge.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
  </tr>
</table>

<p><strong>Maintenance:</strong> <span class="checkbox"></span> Included <span class="checkbox"></span> Not Included</p>

<h2>KEY INFORMATION</h2>
<p><strong>Overdue rentals:</strong> If a rental goes overdue past the 14 day grace period, the vehicle becomes the property of RTech Group and we will pursue repossession.</p>
<p><strong>Excess mileage:</strong> If vehicle goes over 1500 miles a month, you will be charged 25p per additional mile.</p>

<h2>VEHICLE MILEAGE</h2>
<p><strong>Max Monthly Mileage:</strong> 1500 miles</p>
<p><strong>Total Mileage Allowed:</strong> 18000 miles</p>

<h2>BANK DETAILS</h2>
<table>
  <tr>
    <th>Account Name</th>
    <td>RTech Group</td>
  </tr>
  <tr>
    <th>Bank Name</th>
    <td>LLOYDS BANK</td>
  </tr>
  <tr>
    <th>Sort Code</th>
    <td>30-99-50</td>
  </tr>
  <tr>
    <th>Account Number</th>
    <td>54738663</td>
  </tr>
</table>

<h2>COMPANY INFORMATION</h2>
<table>
  <tr>
    <th>Company Name</th>
    <td>RTech Group</td>
  </tr>
  <tr>
    <th>Trading As</th>
    <td>RTech Group UK Vehicle Hire</td>
  </tr>
  <tr>
    <th>Company Number</th>
    <td>15704893</td>
  </tr>
  <tr>
    <th>Address</th>
    <td>68 DAISY BANK ROAD, MANCHESTER, M14 5QP</td>
  </tr>
  <tr>
    <th>Contact Person</th>
    <td>SERVAK SINGH</td>
  </tr>
  <tr>
    <th>Contact Phone</th>
    <td>07487568568</td>
  </tr>
  <tr>
    <th>Contact Email</th>
    <td>info@rtechgroup.co.uk</td>
  </tr>
</table>

<h2>VEHICLE DAMAGE</h2>
<p><strong>Comments:</strong> NONE</p>

<div class="signature-section">
  <h2>SIGNATURES</h2>
  <p>By signing below, both parties acknowledge and agree to all terms of this agreement.</p>

  <div style="margin-top: 40px;">
    <p><strong>Hirer Signature:</strong></p>
    <div class="signature-line"></div>
    <p style="margin-top: 5px;">Date: ______________</p>
  </div>

  <div style="margin-top: 60px;">
    <p><strong>Lessor Signature (RTech Group):</strong></p>
    <div class="signature-line"></div>
    <p style="margin-top: 5px;">Date: ______________</p>
  </div>
</div>

<div class="terms-section">
  <h1>TERMS AND CONDITIONS</h1>

  <h3>1. DEFINITIONS</h3>
  <p>In this Agreement the following terms shall have the following meanings:</p>
  <ul>
    <li><strong>"Vehicle"</strong> means the motor vehicle described in the Key Financial Information section of this Agreement;</li>
    <li><strong>"Hirer"</strong> means the person(s) named as the Customer in this Agreement;</li>
    <li><strong>"Lessor"</strong> means RTech Group;</li>
    <li><strong>"Monthly Hire"</strong> means the monthly rental payment specified in this Agreement;</li>
    <li><strong>"Deposit"</strong> means the security deposit paid by the Hirer;</li>
  </ul>

  <h3>2. TERM OF AGREEMENT</h3>
  <p>This Agreement shall commence on the Start Date and continue until the End Date as specified in the Key Financial Information section, unless terminated earlier in accordance with the provisions of this Agreement.</p>

  <h3>3. PAYMENT TERMS</h3>
  <p>3.1 The Hirer agrees to pay the Monthly Hire amount on or before the first day of each month.</p>
  <p>3.2 Payment shall be made by bank transfer to the account details specified in this Agreement.</p>
  <p>3.3 Late payments may incur additional charges and interest at a rate of 8% per annum above the Bank of England base rate.</p>
  <p>3.4 If payment is not received within 14 days of the due date, the Lessor reserves the right to repossess the Vehicle.</p>

  <h3>4. USE OF VEHICLE</h3>
  <p>4.1 The Vehicle shall be used solely for private purposes unless otherwise agreed in writing.</p>
  <p>4.2 The Hirer shall not use the Vehicle for any illegal purpose or in any manner that breaches any applicable laws or regulations.</p>
  <p>4.3 The Hirer shall not sub-let or allow any unauthorized person to use the Vehicle.</p>
  <p>4.4 The Vehicle must not be driven outside of the United Kingdom without prior written consent from the Lessor.</p>

  <h3>5. MILEAGE</h3>
  <p>5.1 The maximum monthly mileage allowance is 1,500 miles.</p>
  <p>5.2 Excess mileage will be charged at 25 pence per mile.</p>
  <p>5.3 The Hirer must provide accurate mileage readings when requested by the Lessor.</p>

  <h3>6. MAINTENANCE AND REPAIRS</h3>
  <p>6.1 If maintenance is included, the Lessor will be responsible for all routine servicing and maintenance.</p>
  <p>6.2 The Hirer must report any faults or damage to the Vehicle immediately to the Lessor.</p>
  <p>6.3 The Hirer must not carry out any repairs or modifications to the Vehicle without prior written consent.</p>
  <p>6.4 The Hirer is responsible for daily checks including oil, water, and tire pressures.</p>

  <h3>7. INSURANCE</h3>
  <p>7.1 The Lessor will maintain comprehensive insurance on the Vehicle.</p>
  <p>7.2 The Hirer must notify the Lessor immediately of any accident or damage.</p>
  <p>7.3 The Hirer may be liable for any insurance excess in the event of a claim.</p>

  <h3>8. TERMINATION</h3>
  <p>8.1 Either party may terminate this Agreement by giving 30 days' written notice.</p>
  <p>8.2 The Lessor may terminate this Agreement immediately if the Hirer breaches any terms.</p>
  <p>8.3 Upon termination, the Hirer must return the Vehicle in good condition, fair wear and tear excepted.</p>
  <p>8.4 If rental payments become 14 days overdue, the Vehicle becomes the property of RTech Group and repossession will be pursued.</p>

  <h3>9. GENERAL</h3>
  <p>9.1 This Agreement constitutes the entire agreement between the parties.</p>
  <p>9.2 Any amendments must be made in writing and signed by both parties.</p>
  <p>9.3 This Agreement shall be governed by the laws of England and Wales.</p>
  <p>9.4 The Hirer confirms they have read, understood, and agree to all terms and conditions set out in this Agreement.</p>
</div>

<p style="text-align: center; margin-top: 40px; font-size: 9pt; color: #666;">
  RTech Group Car Hire Agreement | Generated: ${new Date().toLocaleDateString('en-GB')}
</p>

</body>
</html>
`;

  return btoa(unescape(encodeURIComponent(agreementHtml)));
}

// Helper function to convert PKCS#1 to PKCS#8 format
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  // PKCS#8 structure for RSA private key
  const version = new Uint8Array([0x02, 0x01, 0x00]); // Version 0

  // AlgorithmIdentifier for RSA
  const algorithmOid = new Uint8Array([
    0x06, 0x09, // OID tag and length
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01 // RSA OID
  ]);
  const algorithmNull = new Uint8Array([0x05, 0x00]); // NULL parameter
  const algorithmSequence = new Uint8Array([
    0x30, algorithmOid.length + algorithmNull.length, // SEQUENCE tag and length
    ...algorithmOid,
    ...algorithmNull
  ]);

  // PrivateKey as OCTET STRING
  const privateKeyOctetString = new Uint8Array([
    0x04, // OCTET STRING tag
    ...encodeLengthBytes(pkcs1.length),
    ...pkcs1
  ]);

  // Combine into PrivateKeyInfo SEQUENCE
  const inner = new Uint8Array([
    ...version,
    ...algorithmSequence,
    ...privateKeyOctetString
  ]);

  return new Uint8Array([
    0x30, // SEQUENCE tag
    ...encodeLengthBytes(inner.length),
    ...inner
  ]);
}

function encodeLengthBytes(length: number): Uint8Array {
  if (length < 128) {
    return new Uint8Array([length]);
  }
  const bytes: number[] = [];
  let temp = length;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

// Helper function to import RSA private key for JWT signing
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM headers/footers and newlines
  const pemContents = pemKey
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  // Base64 decode
  const pkcs1 = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // Convert PKCS#1 to PKCS#8
  const pkcs8 = pkcs1ToPkcs8(pkcs1);

  // Import as CryptoKey
  return await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['sign']
  );
}

// Get DocuSign JWT access token
async function getDocuSignAccessToken(
  integrationKey: string,
  userId: string,
  privateKey: string,
  baseUrl: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    console.log('Generating JWT for DocuSign authentication...');
    console.log('Integration Key:', integrationKey);
    console.log('User ID:', userId);
    console.log('Base URL:', baseUrl);

    // Prepare the private key
    const cleanKey = privateKey.replace(/\\n/g, '\n');
    console.log('Private key starts with:', cleanKey.substring(0, 50));

    // Import the private key as CryptoKey
    console.log('Importing private key...');
    const cryptoKey = await importPrivateKey(cleanKey);
    console.log('Private key imported successfully');

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: baseUrl.includes('demo') ? 'account-d.docusign.com' : 'account.docusign.com',
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation'
    };

    console.log('JWT payload:', JSON.stringify(payload, null, 2));

    // Sign the JWT using djwt with the CryptoKey
    console.log('Signing JWT...');
    const jwt = await create(
      { alg: 'RS256', typ: 'JWT' },
      payload,
      cryptoKey
    );

    console.log('JWT generated successfully, length:', jwt.length);

    // Exchange JWT for access token
    const authUrl = baseUrl.includes('demo')
      ? 'https://account-d.docusign.com/oauth/token'
      : 'https://account.docusign.com/oauth/token';

    console.log('Exchanging JWT for access token at:', authUrl);

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const responseText = await response.text();
    console.log('Auth response status:', response.status);
    console.log('Auth response body:', responseText);

    if (!response.ok) {
      console.error('DocuSign auth failed:', response.status, responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    console.log('Access token obtained successfully');

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in
    };

  } catch (error) {
    console.error('Error getting DocuSign access token:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

// Create and send DocuSign envelope
async function createAndSendEnvelope(
  accessToken: string,
  accountId: string,
  baseUrl: string,
  documentBase64: string,
  customer: any,
  rental: any,
  vehicle: any
): Promise<{ envelopeId: string } | null> {
  try {
    console.log('Creating DocuSign envelope...');

    const envelopeDefinition = {
      emailSubject: `RTech Group Car Hire Agreement - ${vehicle.reg} - Please Sign`,
      documents: [
        {
          documentBase64: documentBase64,
          name: `RTech_Group_Car_Hire_Agreement_${vehicle.reg}_${rental.id.substring(0, 8)}.html`,
          fileExtension: 'html',
          documentId: '1'
        }
      ],
      recipients: {
        signers: [
          {
            email: customer.email,
            name: customer.name,
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  anchorString: 'Hirer Signature:',
                  anchorUnits: 'pixels',
                  anchorXOffset: '0',
                  anchorYOffset: '25'
                }
              ],
              dateSignedTabs: [
                {
                  anchorString: 'Hirer Signature:',
                  anchorUnits: 'pixels',
                  anchorXOffset: '0',
                  anchorYOffset: '80',
                  anchorIgnoreIfNotPresent: false
                }
              ]
            }
          }
        ]
      },
      status: 'sent'
    };

    const apiUrl = `${baseUrl}/v2.1/accounts/${accountId}/envelopes`;
    console.log('Sending envelope to DocuSign API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(envelopeDefinition)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DocuSign envelope creation error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Envelope created successfully:', data.envelopeId);

    return { envelopeId: data.envelopeId };

  } catch (error) {
    console.error('Error creating DocuSign envelope:', error);
    return null;
  }
}

async function createDocuSignEnvelope(supabase: any, rentalId: string): Promise<CreateEnvelopeResponse> {
  try {
    console.log('Creating DocuSign envelope for rental:', rentalId);

    // Get rental details with customer and vehicle info
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select(`
        *,
        customers:customer_id (id, name, email, phone, customer_type, type),
        vehicles:vehicle_id (id, reg, make, model, colour)
      `)
      .eq('id', rentalId)
      .single();

    if (rentalError || !rental) {
      return {
        ok: false,
        error: 'Rental not found',
        detail: rentalError?.message || 'Rental does not exist'
      };
    }

    const customer = rental.customers;
    const vehicle = rental.vehicles;

    if (!customer.email) {
      return {
        ok: false,
        error: 'Customer email required',
        detail: 'Customer must have an email address to receive DocuSign envelope'
      };
    }

    // Get DocuSign credentials from environment
    const DOCUSIGN_INTEGRATION_KEY = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const DOCUSIGN_USER_ID = Deno.env.get('DOCUSIGN_USER_ID');
    const DOCUSIGN_ACCOUNT_ID = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const DOCUSIGN_PRIVATE_KEY = Deno.env.get('DOCUSIGN_PRIVATE_KEY');
    const DOCUSIGN_BASE_URL = Deno.env.get('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net/restapi';

    console.log('Environment variables check:');
    console.log('DOCUSIGN_INTEGRATION_KEY:', DOCUSIGN_INTEGRATION_KEY ? 'SET ✓' : 'MISSING ✗', DOCUSIGN_INTEGRATION_KEY || 'EMPTY');
    console.log('DOCUSIGN_USER_ID:', DOCUSIGN_USER_ID ? 'SET ✓' : 'MISSING ✗', DOCUSIGN_USER_ID || 'EMPTY');
    console.log('DOCUSIGN_ACCOUNT_ID:', DOCUSIGN_ACCOUNT_ID ? 'SET ✓' : 'MISSING ✗', DOCUSIGN_ACCOUNT_ID || 'EMPTY');
    console.log('DOCUSIGN_PRIVATE_KEY:', DOCUSIGN_PRIVATE_KEY ? `SET ✓ (length: ${DOCUSIGN_PRIVATE_KEY.length})` : 'MISSING ✗');
    if (DOCUSIGN_PRIVATE_KEY) {
      console.log('DOCUSIGN_PRIVATE_KEY first 100 chars:', DOCUSIGN_PRIVATE_KEY.substring(0, 100));
    } else {
      console.log('DOCUSIGN_PRIVATE_KEY is:', typeof DOCUSIGN_PRIVATE_KEY, DOCUSIGN_PRIVATE_KEY);
    }
    console.log('DOCUSIGN_BASE_URL:', DOCUSIGN_BASE_URL);

    console.log('All Deno env keys:', Object.keys(Deno.env.toObject()).filter(k => k.startsWith('DOCUSIGN')));

    if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_USER_ID || !DOCUSIGN_ACCOUNT_ID || !DOCUSIGN_PRIVATE_KEY) {
      const missingVars = [];
      if (!DOCUSIGN_INTEGRATION_KEY) missingVars.push('DOCUSIGN_INTEGRATION_KEY');
      if (!DOCUSIGN_USER_ID) missingVars.push('DOCUSIGN_USER_ID');
      if (!DOCUSIGN_ACCOUNT_ID) missingVars.push('DOCUSIGN_ACCOUNT_ID');
      if (!DOCUSIGN_PRIVATE_KEY) missingVars.push('DOCUSIGN_PRIVATE_KEY');

      return {
        ok: false,
        error: 'DocuSign configuration missing',
        detail: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    // Generate the rental agreement document
    const documentBase64 = generateRentalAgreementPDF(rental, customer, vehicle);

    // Get JWT access token
    const authResult = await getDocuSignAccessToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      DOCUSIGN_PRIVATE_KEY,
      DOCUSIGN_BASE_URL
    );

    if (!authResult) {
      return {
        ok: false,
        error: 'Authentication failed',
        detail: 'Failed to obtain DocuSign access token. Please check credentials and ensure JWT consent is granted.'
      };
    }

    // Create and send envelope
    const envelopeResult = await createAndSendEnvelope(
      authResult.accessToken,
      DOCUSIGN_ACCOUNT_ID,
      DOCUSIGN_BASE_URL,
      documentBase64,
      customer,
      rental,
      vehicle
    );

    if (!envelopeResult) {
      return {
        ok: false,
        error: 'Envelope creation failed',
        detail: 'Failed to create DocuSign envelope. Check logs for details.'
      };
    }

    // Update rental record with envelope info
    const { error: updateError } = await supabase
      .from('rentals')
      .update({
        docusign_envelope_id: envelopeResult.envelopeId,
        document_status: 'sent',
        envelope_created_at: new Date().toISOString(),
        envelope_sent_at: new Date().toISOString()
      })
      .eq('id', rentalId);

    if (updateError) {
      console.error('Error updating rental with envelope ID:', updateError);
      return {
        ok: false,
        error: 'Failed to update rental',
        detail: updateError.message
      };
    }

    console.log('Envelope created and sent successfully:', envelopeResult.envelopeId);

    return {
      ok: true,
      envelopeId: envelopeResult.envelopeId
    };

  } catch (error) {
    console.error('Error creating DocuSign envelope:', error);
    return {
      ok: false,
      error: 'Envelope creation failed',
      detail: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { rentalId } = await req.json() as CreateEnvelopeRequest;

    if (!rentalId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'rentalId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await createDocuSignEnvelope(supabaseClient, rentalId);

    return new Response(
      JSON.stringify(result),
      {
        status: result.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
