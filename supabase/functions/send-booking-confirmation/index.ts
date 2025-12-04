import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingDetails {
  rentalId: string;
  customerName: string;
  customerEmail: string;
  vehicleReg: string;
  vehicleMake: string;
  vehicleModel: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  rentalNumber: string;
}

function generateBookingConfirmationEmail(details: BookingDetails): string {
  const formattedStartDate = new Date(details.startDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedEndDate = new Date(details.endDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); padding: 30px 40px; border-radius: 16px 16px 0 0;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">RTECHGROUP UK</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Fleet Management</p>
                  </td>
                  <td align="right">
                    <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 60px; height: 60px; display: inline-block; text-align: center; line-height: 60px;">
                      <span style="font-size: 28px;">&#10003;</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #12121a; padding: 40px; border-left: 1px solid #1e1e2e; border-right: 1px solid #1e1e2e;">

              <!-- Success Message -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px;">
                      <p style="margin: 0; color: #22c55e; font-size: 18px; font-weight: 600;">Booking Confirmed!</p>
                      <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 14px;">Your rental agreement has been signed successfully</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Dear <strong>${details.customerName}</strong>,
              </p>
              <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                Thank you for signing your rental agreement. Your vehicle booking is now confirmed and ready for collection.
              </p>

              <!-- Booking Details Card -->
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border: 1px solid #2a2a3e; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 20px 0; color: #ec4899; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Booking Details</h2>

                    <!-- Reference Number -->
                    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                      <tr>
                        <td style="color: #71717a; font-size: 13px; padding-bottom: 4px;">Reference Number</td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace;">${details.rentalNumber}</td>
                      </tr>
                    </table>

                    <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 16px 0;">

                    <!-- Vehicle Info -->
                    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                      <tr>
                        <td style="color: #71717a; font-size: 13px; padding-bottom: 4px;">Vehicle</td>
                      </tr>
                      <tr>
                        <td>
                          <span style="color: #ec4899; font-size: 16px; font-weight: 600;">${details.vehicleReg}</span>
                          <span style="color: #ffffff; font-size: 15px;"> - ${details.vehicleMake} ${details.vehicleModel}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Dates -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                          <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Start Date</p>
                          <p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${formattedStartDate}</p>
                        </td>
                        <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                          <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">End Date</p>
                          <p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${formattedEndDate}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Payment Info -->
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%); border: 1px solid rgba(236, 72, 153, 0.2); border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td>
                          <p style="color: #71717a; font-size: 13px; margin: 0;">Monthly Amount</p>
                          <p style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 4px 0 0 0;">&pound;${details.monthlyAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                        </td>
                        <td align="right" style="vertical-align: bottom;">
                          <span style="background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: #ffffff; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; text-transform: uppercase;">Confirmed</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0; font-weight: 600;">What's Next?</h3>
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <div style="background: rgba(236, 72, 153, 0.2); border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; color: #ec4899; font-size: 12px; font-weight: 600;">1</div>
                              </td>
                              <td style="color: #a1a1aa; font-size: 14px; padding-left: 12px;">Bring your driving licence and proof of address for vehicle collection</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <div style="background: rgba(236, 72, 153, 0.2); border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; color: #ec4899; font-size: 12px; font-weight: 600;">2</div>
                              </td>
                              <td style="color: #a1a1aa; font-size: 14px; padding-left: 12px;">Complete vehicle inspection with our team member</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <div style="background: rgba(236, 72, 153, 0.2); border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; color: #ec4899; font-size: 12px; font-weight: 600;">3</div>
                              </td>
                              <td style="color: #a1a1aa; font-size: 14px; padding-left: 12px;">Collect your keys and drive away!</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Contact -->
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions, please don't hesitate to contact us.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d0d14; padding: 30px 40px; border-radius: 0 0 16px 16px; border: 1px solid #1e1e2e; border-top: none;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <p style="color: #ec4899; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">RTECHGROUP UK</p>
                    <p style="color: #52525b; font-size: 13px; margin: 0 0 16px 0;">Fleet Management Solutions</p>
                    <p style="color: #3f3f46; font-size: 12px; margin: 0;">
                      This is an automated message. Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ ok: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { rentalId } = await req.json();

    if (!rentalId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Rental ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get rental details from Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { data: rental, error: rentalError } = await supabaseClient
      .from('rentals')
      .select(`
        id,
        rental_number,
        start_date,
        end_date,
        monthly_amount,
        customers:customer_id (id, name, email),
        vehicles:vehicle_id (id, reg, make, model)
      `)
      .eq('id', rentalId)
      .single();

    if (rentalError || !rental) {
      console.error('Rental not found:', rentalError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Rental not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rental.customers?.email) {
      console.error('Customer email not found for rental:', rentalId);
      return new Response(
        JSON.stringify({ ok: false, error: 'Customer email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bookingDetails: BookingDetails = {
      rentalId: rental.id,
      customerName: rental.customers.name,
      customerEmail: rental.customers.email,
      vehicleReg: rental.vehicles.reg,
      vehicleMake: rental.vehicles.make,
      vehicleModel: rental.vehicles.model,
      startDate: rental.start_date,
      endDate: rental.end_date,
      monthlyAmount: rental.monthly_amount,
      rentalNumber: rental.rental_number || `R-${rental.id.slice(0, 6).toUpperCase()}`
    };

    const emailHtml = generateBookingConfirmationEmail(bookingDetails);

    console.log('Sending booking confirmation email to:', bookingDetails.customerEmail);

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RTECHGROUP UK <bookings@rtechgroupuk-cortek.com>',
        to: [bookingDetails.customerEmail],
        subject: `Booking Confirmed - ${bookingDetails.vehicleReg} | RTECHGROUP UK`,
        html: emailHtml
      })
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to send email', details: resendResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Booking confirmation email sent successfully:', resendResult.id);

    // Update rental to mark confirmation email as sent
    await supabaseClient
      .from('rentals')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', rentalId);

    return new Response(
      JSON.stringify({ ok: true, emailId: resendResult.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending booking confirmation:', error);
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
