/**
 * Security utilities for field masking, input validation, and session management
 */

// ============================================
// FIELD MASKING
// ============================================

/** Mask bank account number: show only last 4 digits */
export function maskBankAccount(value: string | null | undefined): string {
  if (!value || value.length < 4) return '••••';
  return '••••' + value.slice(-4);
}

/** Mask national ID: show only last 4 digits */
export function maskNationalId(value: string | null | undefined): string {
  if (!value || value.length < 4) return '••••';
  return '••••••••••' + value.slice(-4);
}

/** Mask phone number: show country code + last 4 */
export function maskPhone(value: string | null | undefined): string {
  if (!value || value.length < 4) return '••••';
  if (value.length <= 6) return '••' + value.slice(-4);
  return value.slice(0, 3) + '••••' + value.slice(-4);
}

/** Mask email: show first 2 chars + domain */
export function maskEmail(value: string | null | undefined): string {
  if (!value) return '••••';
  const [local, domain] = value.split('@');
  if (!domain) return '••••';
  const visible = local.slice(0, 2);
  return `${visible}••••@${domain}`;
}

/** Mask salary: show rounded range */
export function maskSalary(value: number | null | undefined): string {
  if (!value) return '••••';
  return '••••';
}

/** Generic mask: show only last N characters */
export function maskField(value: string | null | undefined, visibleChars = 4): string {
  if (!value || value.length <= visibleChars) return '••••';
  return '•'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

// ============================================
// ROLE-BASED FIELD VISIBILITY
// ============================================

export type SensitiveFieldAccess = 'full' | 'masked' | 'hidden';

interface FieldAccessConfig {
  bank_account_number: SensitiveFieldAccess;
  national_id: SensitiveFieldAccess;
  basic_salary: SensitiveFieldAccess;
  phone: SensitiveFieldAccess;
  email: SensitiveFieldAccess;
  bank_name: SensitiveFieldAccess;
  bank_id_number: SensitiveFieldAccess;
  social_insurance_no: SensitiveFieldAccess;
}

const roleFieldAccess: Record<string, FieldAccessConfig> = {
  admin: {
    bank_account_number: 'full',
    national_id: 'full',
    basic_salary: 'full',
    phone: 'full',
    email: 'full',
    bank_name: 'full',
    bank_id_number: 'full',
    social_insurance_no: 'full',
  },
  hr: {
    bank_account_number: 'masked',
    national_id: 'masked',
    basic_salary: 'hidden',
    phone: 'full',
    email: 'full',
    bank_name: 'full',
    bank_id_number: 'masked',
    social_insurance_no: 'masked',
  },
  employee: {
    bank_account_number: 'masked',
    national_id: 'masked',
    basic_salary: 'full', // own salary
    phone: 'full',
    email: 'full',
    bank_name: 'full',
    bank_id_number: 'masked',
    social_insurance_no: 'masked',
  },
  station_manager: {
    bank_account_number: 'hidden',
    national_id: 'hidden',
    basic_salary: 'hidden',
    phone: 'masked',
    email: 'full',
    bank_name: 'hidden',
    bank_id_number: 'hidden',
    social_insurance_no: 'hidden',
  },
  training_manager: {
    bank_account_number: 'hidden',
    national_id: 'hidden',
    basic_salary: 'hidden',
    phone: 'masked',
    email: 'full',
    bank_name: 'hidden',
    bank_id_number: 'hidden',
    social_insurance_no: 'hidden',
  },
};

export function getFieldAccess(role: string, field: keyof FieldAccessConfig): SensitiveFieldAccess {
  return roleFieldAccess[role]?.[field] ?? 'hidden';
}

export function displaySensitiveField(
  value: string | number | null | undefined,
  role: string,
  field: keyof FieldAccessConfig
): string {
  const access = getFieldAccess(role, field);
  
  if (access === 'hidden') return '••••••';
  if (access === 'full') return String(value ?? '');
  
  // Masked
  switch (field) {
    case 'bank_account_number': return maskBankAccount(String(value));
    case 'national_id': return maskNationalId(String(value));
    case 'basic_salary': return maskSalary(Number(value));
    case 'phone': return maskPhone(String(value));
    case 'email': return maskEmail(String(value));
    case 'bank_id_number': return maskField(String(value));
    case 'social_insurance_no': return maskField(String(value));
    default: return maskField(String(value));
  }
}

// ============================================
// INPUT VALIDATION
// ============================================

/** Validate password strength */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 10) errors.push('يجب أن تكون كلمة المرور 10 أحرف على الأقل');
  if (!/[A-Z]/.test(password)) errors.push('يجب أن تحتوي على حرف كبير');
  if (!/[a-z]/.test(password)) errors.push('يجب أن تحتوي على حرف صغير');
  if (!/[0-9]/.test(password)) errors.push('يجب أن تحتوي على رقم');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('يجب أن تحتوي على رمز خاص');
  
  return { valid: errors.length === 0, errors };
}

/** Sanitize text input */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivity = Date.now();

export function resetSessionTimer(onExpire: () => void) {
  lastActivity = Date.now();
  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    onExpire();
  }, SESSION_TIMEOUT_MS);
}

export function initSessionMonitor(onExpire: () => void) {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  const handler = () => resetSessionTimer(onExpire);
  
  events.forEach(e => window.addEventListener(e, handler, { passive: true }));
  resetSessionTimer(onExpire);
  
  return () => {
    events.forEach(e => window.removeEventListener(e, handler));
    if (sessionTimer) clearTimeout(sessionTimer);
  };
}

// ============================================
// RATE LIMITING (Client-side)
// ============================================

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { allowed: boolean; remainingMs?: number } {
  const record = loginAttempts.get(identifier);
  
  if (!record) return { allowed: true };
  
  const elapsed = Date.now() - record.lastAttempt;
  if (elapsed > LOCKOUT_MS) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingMs: LOCKOUT_MS - elapsed };
  }
  
  return { allowed: true };
}

export function recordLoginAttempt(identifier: string, success: boolean) {
  if (success) {
    loginAttempts.delete(identifier);
    return;
  }
  
  const record = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  record.count += 1;
  record.lastAttempt = Date.now();
  loginAttempts.set(identifier, record);
}
