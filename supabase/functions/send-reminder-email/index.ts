import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Reminder {
  id: string;
  rule_code: string;
  object_type: 'Vehicle' | 'Rental' | 'Customer' | 'Fine' | 'Document';
  object_id: string;
  title: string;
  message: string;
  due_on: string;
  remind_on: string;
  severity: 'info' | 'warning' | 'critical';
  status: string;
  context: {
    customer_id?: string;
    customer_name?: string;
    vehicle_id?: string;
    reg?: string;
    make?: string;
    model?: string;
    due_date?: string;
    days_until?: number;
    overdue_total?: number;
    amount?: number;
    reference?: string;
    policy_no?: string;
    provider?: string;
  };
}

interface EmailDetails {
  to: string;
  toName: string;
  subject: string;
  isInternal: boolean;
  reminder: Reminder;
}

// Default admin email - can be configured via reminder_config table
const DEFAULT_ADMIN_EMAIL = 'admin@rtechgroupuk-cortek.com';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
}

function getSeverityColor(severity: string): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'critical':
      return { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
    case 'warning':
      return { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    default:
      return { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'Urgent Action Required';
    case 'warning':
      return 'Action Needed Soon';
    default:
      return 'For Your Information';
  }
}

function generateCustomerReminderEmail(details: EmailDetails): string {
  const { reminder, toName } = details;
  const severityColors = getSeverityColor(reminder.severity);
  const severityLabel = getSeverityLabel(reminder.severity);

  // Get relevant details from context
  const vehicleInfo = reminder.context?.reg
    ? `${reminder.context.reg}${reminder.context.make ? ` - ${reminder.context.make}` : ''}${reminder.context.model ? ` ${reminder.context.model}` : ''}`
    : '';

  const amountInfo = reminder.context?.overdue_total
    ? formatCurrency(reminder.context.overdue_total)
    : reminder.context?.amount
      ? formatCurrency(reminder.context.amount)
      : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reminder.title}</title>
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
                      <span style="font-size: 28px;">${reminder.severity === 'critical' ? '!' : reminder.severity === 'warning' ? '⚠' : 'ℹ'}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #12121a; padding: 40px; border-left: 1px solid #1e1e2e; border-right: 1px solid #1e1e2e;">

              <!-- Status Badge -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <div style="background: ${severityColors.bg}; border: 1px solid ${severityColors.border}; border-radius: 12px; padding: 20px;">
                      <p style="margin: 0; color: ${severityColors.text}; font-size: 18px; font-weight: 600;">${severityLabel}</p>
                      <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 14px;">${reminder.title}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Dear <strong>${toName}</strong>,
              </p>
              <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                ${reminder.message}
              </p>

              <!-- Reminder Details Card -->
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border: 1px solid #2a2a3e; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 20px 0; color: #ec4899; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Details</h2>

                    ${vehicleInfo ? `
                    <!-- Vehicle Info -->
                    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                      <tr>
                        <td style="color: #71717a; font-size: 13px; padding-bottom: 4px;">Vehicle</td>
                      </tr>
                      <tr>
                        <td>
                          <span style="color: #ec4899; font-size: 16px; font-weight: 600;">${reminder.context?.reg || ''}</span>
                          ${reminder.context?.make ? `<span style="color: #ffffff; font-size: 15px;"> - ${reminder.context.make}${reminder.context.model ? ` ${reminder.context.model}` : ''}</span>` : ''}
                        </td>
                      </tr>
                    </table>

                    <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 16px 0;">
                    ` : ''}

                    <!-- Due Date -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                          <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Due Date</p>
                          <p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${formatDate(reminder.due_on)}</p>
                        </td>
                        ${amountInfo ? `
                        <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                          <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Amount</p>
                          <p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${amountInfo}</p>
                        </td>
                        ` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0;">
                      Please take the necessary action as soon as possible. If you have any questions or need assistance, don't hesitate to contact us.
                    </p>
                  </td>
                </tr>
              </table>

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
                      This is an automated reminder. Please do not reply directly to this email.
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

function generateInternalReminderEmail(details: EmailDetails): string {
  const { reminder } = details;
  const severityColors = getSeverityColor(reminder.severity);
  const severityLabel = getSeverityLabel(reminder.severity);

  // Get relevant details from context
  const vehicleInfo = reminder.context?.reg
    ? `${reminder.context.reg}${reminder.context.make ? ` - ${reminder.context.make}` : ''}${reminder.context.model ? ` ${reminder.context.model}` : ''}`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reminder.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px 40px; border-radius: 16px 16px 0 0;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">RTECHGROUP UK</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Internal Fleet Reminder</p>
                  </td>
                  <td align="right">
                    <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 60px; height: 60px; display: inline-block; text-align: center; line-height: 60px;">
                      <span style="font-size: 28px;">${reminder.severity === 'critical' ? '!' : reminder.severity === 'warning' ? '⚠' : 'ℹ'}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #12121a; padding: 40px; border-left: 1px solid #1e1e2e; border-right: 1px solid #1e1e2e;">

              <!-- Status Badge -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <div style="background: ${severityColors.bg}; border: 1px solid ${severityColors.border}; border-radius: 12px; padding: 20px;">
                      <p style="margin: 0; color: ${severityColors.text}; font-size: 18px; font-weight: 600;">${severityLabel}</p>
                      <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 14px;">${reminder.object_type} Reminder</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <h2 style="color: #ffffff; font-size: 20px; line-height: 1.4; margin: 0 0 16px 0; font-weight: 600;">
                ${reminder.title}
              </h2>
              <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                ${reminder.message}
              </p>

              <!-- Reminder Details Card -->
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border: 1px solid #2a2a3e; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 20px 0; color: #8b5cf6; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Details</h2>

                    ${vehicleInfo ? `
                    <!-- Vehicle Info -->
                    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                      <tr>
                        <td style="color: #71717a; font-size: 13px; padding-bottom: 4px;">Vehicle</td>
                      </tr>
                      <tr>
                        <td>
                          <span style="color: #8b5cf6; font-size: 16px; font-weight: 600;">${reminder.context?.reg || ''}</span>
                          ${reminder.context?.make ? `<span style="color: #ffffff; font-size: 15px;"> - ${reminder.context.make}${reminder.context.model ? ` ${reminder.context.model}` : ''}</span>` : ''}
                        </td>
                      </tr>
                    </table>

                    <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 16px 0;">
                    ` : ''}

                    <!-- Object Type and Due Date -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                          <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Type</p>
                          <p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${reminder.object_type}</p>
                        </td>
                        <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                          <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Due Date</p>
                          <p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${formatDate(reminder.due_on)}</p>
                        </td>
                      </tr>
                    </table>

                    ${reminder.context?.days_until !== undefined ? `
                    <hr style="border: none; border-top: 1px solid #2a2a3e; margin: 16px 0;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td>
                          <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Days Remaining</p>
                          <p style="color: ${reminder.context.days_until <= 0 ? '#ef4444' : reminder.context.days_until <= 7 ? '#f59e0b' : '#22c55e'}; font-size: 20px; margin: 0; font-weight: 700;">
                            ${reminder.context.days_until <= 0 ? 'OVERDUE' : `${reminder.context.days_until} days`}
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Rule Code Badge -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <span style="background: #2a2a3e; color: #a1a1aa; font-size: 12px; padding: 4px 10px; border-radius: 4px; font-family: monospace;">
                      ${reminder.rule_code}
                    </span>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d0d14; padding: 30px 40px; border-radius: 0 0 16px 16px; border: 1px solid #1e1e2e; border-top: none;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <p style="color: #8b5cf6; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">RTECHGROUP UK</p>
                    <p style="color: #52525b; font-size: 13px; margin: 0 0 16px 0;">Internal Fleet Management Alert</p>
                    <p style="color: #3f3f46; font-size: 12px; margin: 0;">
                      This is an automated internal reminder from your Fleet Management System.
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

    const { reminderId } = await req.json();

    if (!reminderId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Reminder ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
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

    // Fetch the reminder
    const { data: reminder, error: reminderError } = await supabaseClient
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .single();

    if (reminderError || !reminder) {
      console.error('Reminder not found:', reminderError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Reminder not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if this is an internal reminder or customer-facing
    const isInternal = ['Vehicle', 'Document'].includes(reminder.object_type);

    let toEmail: string;
    let toName: string;

    if (isInternal) {
      // Internal reminder - send to admin
      // Try to get admin email from config
      const { data: adminConfig } = await supabaseClient
        .from('reminder_config')
        .select('config_value')
        .eq('config_key', 'reminders.email_digest.recipients')
        .single();

      toEmail = adminConfig?.config_value || DEFAULT_ADMIN_EMAIL;
      toName = 'Fleet Manager';
    } else {
      // Customer-facing reminder - get customer email
      const customerId = reminder.context?.customer_id;

      if (!customerId) {
        // Try to get customer from rental or fine
        if (reminder.object_type === 'Rental') {
          const { data: rental } = await supabaseClient
            .from('rentals')
            .select('customers(id, name, email)')
            .eq('id', reminder.object_id)
            .single();

          if (rental?.customers?.email) {
            toEmail = rental.customers.email;
            toName = rental.customers.name || 'Valued Customer';
          } else {
            return new Response(
              JSON.stringify({ ok: false, error: 'Customer email not found for this rental' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else if (reminder.object_type === 'Fine') {
          const { data: fine } = await supabaseClient
            .from('fines')
            .select('customers(id, name, email)')
            .eq('id', reminder.object_id)
            .single();

          if (fine?.customers?.email) {
            toEmail = fine.customers.email;
            toName = fine.customers.name || 'Valued Customer';
          } else {
            return new Response(
              JSON.stringify({ ok: false, error: 'Customer email not found for this fine' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ ok: false, error: 'Customer ID not found in reminder context' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Get customer email from context customer_id
        const { data: customer } = await supabaseClient
          .from('customers')
          .select('name, email')
          .eq('id', customerId)
          .single();

        if (!customer?.email) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Customer email not found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        toEmail = customer.email;
        toName = customer.name || reminder.context?.customer_name || 'Valued Customer';
      }
    }

    const emailDetails: EmailDetails = {
      to: toEmail,
      toName,
      subject: `${isInternal ? '[Internal] ' : ''}${reminder.title} | RTECHGROUP UK`,
      isInternal,
      reminder: reminder as Reminder
    };

    const emailHtml = isInternal
      ? generateInternalReminderEmail(emailDetails)
      : generateCustomerReminderEmail(emailDetails);

    console.log(`Sending ${isInternal ? 'internal' : 'customer'} reminder email to:`, toEmail);

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: isInternal
          ? 'RTECHGROUP UK Fleet <alerts@rtechgroupuk-cortek.com>'
          : 'RTECHGROUP UK <bookings@rtechgroupuk-cortek.com>',
        to: [toEmail],
        subject: emailDetails.subject,
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

    console.log('Reminder email sent successfully:', resendResult.id);

    // Log the email action
    await supabaseClient
      .from('reminder_actions')
      .insert({
        reminder_id: reminderId,
        action: 'email_sent',
        note: `Email sent to ${toEmail}`
      });

    // Update reminder's last_sent_at
    await supabaseClient
      .from('reminders')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', reminderId);

    return new Response(
      JSON.stringify({
        ok: true,
        emailId: resendResult.id,
        sentTo: toEmail,
        isInternal
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending reminder email:', error);
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
