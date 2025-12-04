import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default admin email for internal reminders
const DEFAULT_ADMIN_EMAIL = 'admin@rtechgroupuk-cortek.com';

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
  context: any;
}

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

function generateCustomerEmail(reminder: Reminder, toName: string): string {
  const severityColors = getSeverityColor(reminder.severity);
  const severityLabel = getSeverityLabel(reminder.severity);
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
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); padding: 30px 40px; border-radius: 16px 16px 0 0;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">RTECHGROUP UK</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Fleet Management</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #12121a; padding: 40px; border-left: 1px solid #1e1e2e; border-right: 1px solid #1e1e2e;">
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
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Dear <strong>${toName}</strong>,</p>
              <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">${reminder.message}</p>
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border: 1px solid #2a2a3e; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 20px 0; color: #ec4899; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Details</h2>
                    ${vehicleInfo ? `<p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Vehicle</p><p style="color: #ec4899; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">${vehicleInfo}</p>` : ''}
                    <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Due Date</p>
                    <p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${formatDate(reminder.due_on)}</p>
                    ${amountInfo ? `<p style="color: #71717a; font-size: 13px; margin: 16px 0 4px 0;">Amount</p><p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${amountInfo}</p>` : ''}
                  </td>
                </tr>
              </table>
              <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">Please take the necessary action as soon as possible.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0d0d14; padding: 30px 40px; border-radius: 0 0 16px 16px; border: 1px solid #1e1e2e; border-top: none;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <p style="color: #ec4899; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">RTECHGROUP UK</p>
                    <p style="color: #3f3f46; font-size: 12px; margin: 0;">This is an automated reminder. Please do not reply directly to this email.</p>
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
</html>`;
}

function generateInternalEmail(reminder: Reminder): string {
  const severityColors = getSeverityColor(reminder.severity);
  const severityLabel = getSeverityLabel(reminder.severity);
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
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px 40px; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">RTECHGROUP UK</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Internal Fleet Reminder</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #12121a; padding: 40px; border-left: 1px solid #1e1e2e; border-right: 1px solid #1e1e2e;">
              <div style="background: ${severityColors.bg}; border: 1px solid ${severityColors.border}; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                <p style="margin: 0; color: ${severityColors.text}; font-size: 18px; font-weight: 600;">${severityLabel}</p>
                <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 14px;">${reminder.object_type} Reminder</p>
              </div>
              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">${reminder.title}</h2>
              <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">${reminder.message}</p>
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border: 1px solid #2a2a3e; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px;">
                    ${vehicleInfo ? `<p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Vehicle</p><p style="color: #8b5cf6; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">${vehicleInfo}</p>` : ''}
                    <p style="color: #71717a; font-size: 13px; margin: 0 0 4px 0;">Due Date</p>
                    <p style="color: #ffffff; font-size: 14px; margin: 0; font-weight: 500;">${formatDate(reminder.due_on)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0d0d14; padding: 30px 40px; border-radius: 0 0 16px 16px; border: 1px solid #1e1e2e; border-top: none; text-align: center;">
              <p style="color: #8b5cf6; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">RTECHGROUP UK</p>
              <p style="color: #3f3f46; font-size: 12px; margin: 0;">Internal Fleet Management Alert</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const today = new Date().toISOString().split('T')[0];
    console.log(`Processing scheduled reminder emails for: ${today}`);

    // Get reminders where remind_on is today or earlier and status is pending
    const { data: reminders, error: remindersError } = await supabaseClient
      .from('reminders')
      .select('*')
      .lte('remind_on', today)
      .eq('status', 'pending')
      .is('last_sent_at', null); // Only send if not already sent

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} reminders to process`);

    // Get admin email from config
    const { data: adminConfig } = await supabaseClient
      .from('reminder_config')
      .select('config_value')
      .eq('config_key', 'reminders.email_digest.recipients')
      .single();

    const adminEmail = adminConfig?.config_value || DEFAULT_ADMIN_EMAIL;

    let emailsSent = 0;
    let errors: string[] = [];

    for (const reminder of reminders || []) {
      try {
        const isInternal = ['Vehicle', 'Document'].includes(reminder.object_type);
        let toEmail: string;
        let toName: string;

        if (isInternal) {
          toEmail = adminEmail;
          toName = 'Fleet Manager';
        } else {
          // Get customer email
          const customerId = reminder.context?.customer_id;

          if (customerId) {
            const { data: customer } = await supabaseClient
              .from('customers')
              .select('name, email')
              .eq('id', customerId)
              .single();

            if (!customer?.email) {
              console.log(`No email for customer ${customerId}, skipping reminder ${reminder.id}`);
              continue;
            }

            toEmail = customer.email;
            toName = customer.name || reminder.context?.customer_name || 'Valued Customer';
          } else if (reminder.object_type === 'Rental') {
            const { data: rental } = await supabaseClient
              .from('rentals')
              .select('customers(id, name, email)')
              .eq('id', reminder.object_id)
              .single();

            if (!rental?.customers?.email) {
              console.log(`No email for rental ${reminder.object_id}, skipping`);
              continue;
            }

            toEmail = rental.customers.email;
            toName = rental.customers.name || 'Valued Customer';
          } else {
            console.log(`Cannot determine recipient for reminder ${reminder.id}, skipping`);
            continue;
          }
        }

        const emailHtml = isInternal
          ? generateInternalEmail(reminder as Reminder)
          : generateCustomerEmail(reminder as Reminder, toName);

        const subject = `${isInternal ? '[Internal] ' : ''}${reminder.title} | RTECHGROUP UK`;

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
            subject: subject,
            html: emailHtml
          })
        });

        const resendResult = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error(`Failed to send email to ${toEmail}:`, resendResult);
          errors.push(`Failed: ${reminder.id} - ${resendResult.message || 'Unknown error'}`);
          continue;
        }

        // Update reminder status
        await supabaseClient
          .from('reminders')
          .update({
            last_sent_at: new Date().toISOString(),
            status: 'sent'
          })
          .eq('id', reminder.id);

        // Log the action
        await supabaseClient
          .from('reminder_actions')
          .insert({
            reminder_id: reminder.id,
            action: 'email_sent',
            note: `Scheduled email sent to ${toEmail}`
          });

        emailsSent++;
        console.log(`Email sent to ${toEmail} for reminder ${reminder.id}`);

      } catch (err) {
        console.error(`Error processing reminder ${reminder.id}:`, err);
        errors.push(`Error: ${reminder.id} - ${err.message}`);
      }
    }

    console.log(`Completed. Sent ${emailsSent} emails, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: reminders?.length || 0,
        sent: emailsSent,
        errors: errors.length,
        errorDetails: errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scheduled reminder emails:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
