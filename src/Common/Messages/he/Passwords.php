<?php

return [
    /*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

    // Password validation messages
    'psw_GeneratePassword' => 'צור סיסמה',
    'psw_UseGenerateButton' => 'השתמש בכפתור היצירה כדי ליצור סיסמה חזקה.',
    'psw_PasswordGenerated' => 'סיסמה חזקה נוצרה בהצלחה',
    'psw_DefaultPasswordWarning' => 'התגלתה סיסמת ברירת מחדל',
    'psw_ChangeDefaultPassword' => 'אתה משתמש בסיסמת ברירת מחדל. אנא שנה אותה למען האבטחה.',
    'psw_WeakPassword' => 'סיסמה חלשה',
    'psw_PasswordTooCommon' => 'הסיסמה הזאת נפוצה מדי וקלה לניחוש.',
    'psw_PasswordTooShort' => 'הסיסמה קצרה מדי (מינימום %min% תווים)',
    'psw_PasswordTooLong' => 'הסיסמה ארוכה מדי (מקסימום %max% תווים)',
    'psw_PasswordMinLength' => 'הסיסמה חייבת להכיל לפחות 8 תווים.',
    'psw_PasswordRequirements' => 'דרישות סיסמה',
    'psw_PasswordSuggestions' => 'המלצות לשיפור חוזק הסיסמה',
    
    // Password strength indicators
    'psw_VeryWeak' => 'חלשה מאוד',
    'psw_Weak' => 'חלשה',
    'psw_Fair' => 'בינונית',
    'psw_Good' => 'טובה',
    'psw_Strong' => 'חזקה',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'הסיסמה לא יכולה להיות ריקה',
    'psw_EmptyPassword' => 'הסיסמה לא יכולה להיות ריקה',
    'psw_PasswordInDictionary' => 'הסיסמה נמצאה במילון סיסמאות נפוצות',
    'psw_PasswordAcceptable' => 'הסיסמה מקובלת',
    'psw_PasswordGenerateFailed' => 'נכשלתי ביצירת הסיסמה',
    'psw_PasswordsArrayRequired' => 'נדרש מערך סיסמאות',
    'psw_InvalidPasswordsFormat' => 'פורמט נתוני סיסמאות שגוי',
    
    // Additional suggestions
    'psw_AddUppercase' => 'הוסף אותיות גדולות',
    'psw_AddLowercase' => 'הוסף אותיות קטנות',
    'psw_AddNumbers' => 'הוסף מספרים',
    'psw_AddSpecialChars' => 'הוסף תווים מיוחדים',
    'psw_IncreaseLength' => 'הגדל את אורך הסיסמה',
    'psw_AvoidRepeating' => 'הימנע מתווים חוזרים',
    'psw_AvoidSequential' => 'הימנע מתווים רצופים',
    'psw_AvoidCommonWords' => 'הימנע ממילים נפוצות',
    
    // Password validation errors
    'psw_PasswordSimple' => 'הסיסמה הנקבעת פשוטה מדי.',
    'psw_SetPassword' => 'קבע סיסמה חדשה',
    'psw_SetPasswordError' => 'הסיסמה - %password% לא ניתנת לשימוש, היא קיימת במילון סיסמאות פשוטות.',
    'psw_SetPasswordInfo' => 'הסיסמה שצוינה לא ניתנת לשימוש, היא קיימת במילון סיסמאות פשוטות.',
    'psw_PasswordNoNumbers' => 'הסיסמה חייבת להכיל מספרים',
    'psw_PasswordNoLowSimvol' => 'הסיסמה חייבת להכיל אותיות קטנות',
    'psw_PasswordNoUpperSimvol' => 'הסיסמה חייבת להכיל אותיות גדולות',
    'psw_PasswordIsDefault' => 'נעשה שימוש בסיסמת ברירת מחדל',
    'psw_PasswordNoSpecialChars' => 'הוסף תווים מיוחדים (!@#$%)',
    'psw_PasswordMixCharTypes' => 'השתמש בשילוב של אותיות, מספרים וסימנים',
    'psw_PasswordAvoidCommon' => 'הימנע ממילים וביטויים נפוצים',
    'psw_PasswordUsePassphrase' => 'שקול שימוש בביטוי סיסמה',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'חלשה',
    'psw_PasswordStrengthFair' => 'מספקת',
    'psw_PasswordStrengthGood' => 'טובה',
    'psw_PasswordStrengthStrong' => 'חזקה',
    'psw_PasswordStrengthVeryStrong' => 'חזקה מאוד',
    'psw_PasswordSecurityRequiresFair' => 'להבטחת אבטחה הסיסמה חייבת להיות לפחות בחוזק בינוני',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'סיסמה',
    'psw_WebAdminPasswordRepeat' => 'חזור על הזנת הסיסמה',
    'psw_Passwords' => 'סיסמת ממשק WEB',
    'psw_ValidateEmptyWebPassword' => 'סיסמת המנהל לא יכולה להיות ריקה',
    'psw_ValidateWeakWebPassword' => 'סיסמת WEB חייבת להיות ארוכה מ-4 תווים',
    'psw_ValidateWebPasswordsFieldDifferent' => 'סיסמת ממשק הweb הוזנה לא נכון',
    
    // SSH password specific
    'psw_SSHPassword' => 'סיסמת SSH',
    'psw_SSHPasswordRepeat' => 'חזור על הזנת הסיסמה',
    'psw_SSHDisablePasswordLogins' => 'השבת אימות בסיסמה',
    'psw_ValidateEmptySSHPassword' => 'סיסמת SSH לא יכולה להיות ריקה',
    'psw_ValidateWeakSSHPassword' => 'סיסמת SSH חייבת להיות ארוכה מ-4 תווים',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'סיסמת SSH הוזנה לא נכון. חזור על הזנת הסיסמה.',
];