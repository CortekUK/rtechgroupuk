-- Add Payment Reminder Rules
-- These rules generate reminders for upcoming and overdue payments

-- Payment Due reminders (before due date)
INSERT INTO reminder_rules (rule_code, rule_type, category, lead_days, severity, is_enabled, description, is_recurring, interval_type)
SELECT 'PAY_DUE_7D', 'Payment', 'Financial', 7, 'warning', true, 'Payment due in 7 days', false, 'once'
WHERE NOT EXISTS (SELECT 1 FROM reminder_rules WHERE rule_code = 'PAY_DUE_7D');

INSERT INTO reminder_rules (rule_code, rule_type, category, lead_days, severity, is_enabled, description, is_recurring, interval_type)
SELECT 'PAY_DUE_3D', 'Payment', 'Financial', 3, 'warning', true, 'Payment due in 3 days', false, 'once'
WHERE NOT EXISTS (SELECT 1 FROM reminder_rules WHERE rule_code = 'PAY_DUE_3D');

INSERT INTO reminder_rules (rule_code, rule_type, category, lead_days, severity, is_enabled, description, is_recurring, interval_type)
SELECT 'PAY_DUE_1D', 'Payment', 'Financial', 1, 'critical', true, 'Payment due tomorrow', false, 'once'
WHERE NOT EXISTS (SELECT 1 FROM reminder_rules WHERE rule_code = 'PAY_DUE_1D');

INSERT INTO reminder_rules (rule_code, rule_type, category, lead_days, severity, is_enabled, description, is_recurring, interval_type)
SELECT 'PAY_DUE_0D', 'Payment', 'Financial', 0, 'critical', true, 'Payment due today', false, 'once'
WHERE NOT EXISTS (SELECT 1 FROM reminder_rules WHERE rule_code = 'PAY_DUE_0D');

-- Payment Overdue reminders (after due date)
INSERT INTO reminder_rules (rule_code, rule_type, category, lead_days, severity, is_enabled, description, is_recurring, interval_type)
SELECT 'PAY_OVERDUE_1D', 'Overdue', 'Financial', 1, 'critical', true, 'Payment 1 day overdue', false, 'once'
WHERE NOT EXISTS (SELECT 1 FROM reminder_rules WHERE rule_code = 'PAY_OVERDUE_1D');

INSERT INTO reminder_rules (rule_code, rule_type, category, lead_days, severity, is_enabled, description, is_recurring, interval_type)
SELECT 'PAY_OVERDUE_7D', 'Overdue', 'Financial', 7, 'critical', true, 'Payment 7 days overdue', false, 'once'
WHERE NOT EXISTS (SELECT 1 FROM reminder_rules WHERE rule_code = 'PAY_OVERDUE_7D');

INSERT INTO reminder_rules (rule_code, rule_type, category, lead_days, severity, is_enabled, description, is_recurring, interval_type)
SELECT 'PAY_OVERDUE_14D', 'Overdue', 'Financial', 14, 'critical', true, 'Payment 14+ days overdue', false, 'once'
WHERE NOT EXISTS (SELECT 1 FROM reminder_rules WHERE rule_code = 'PAY_OVERDUE_14D');
