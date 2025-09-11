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
    'psw_GeneratePassword' => 'Δημιουργία κωδικού πρόσβασης',
    'psw_UseGenerateButton' => 'Χρησιμοποιήστε το κουμπί δημιουργίας για να δημιουργήσετε έναν ασφαλή κωδικό πρόσβασης.',
    'psw_PasswordGenerated' => 'Ο ασφαλής κωδικός πρόσβασης δημιουργήθηκε επιτυχώς',
    'psw_DefaultPasswordWarning' => 'Εντοπίστηκε προεπιλεγμένος κωδικός πρόσβασης',
    'psw_ChangeDefaultPassword' => 'Χρησιμοποιείτε τον προεπιλεγμένο κωδικό πρόσβασης. Παρακαλώ αλλάξτε τον για λόγους ασφαλείας.',
    'psw_WeakPassword' => 'Αδύναμος κωδικός πρόσβασης',
    'psw_PasswordTooCommon' => 'Αυτός ο κωδικός πρόσβασης είναι πολύ κοινός και εύκολα προβλέψιμος.',
    'psw_PasswordTooShort' => 'Ο κωδικός πρόσβασης είναι πολύ σύντομος (ελάχιστα %min% χαρακτήρες)',
    'psw_PasswordTooLong' => 'Ο κωδικός πρόσβασης είναι πολύ μεγάλος (μέγιστο %max% χαρακτήρες)',
    'psw_PasswordMinLength' => 'Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον 8 χαρακτήρες.',
    'psw_PasswordRequirements' => 'Απαιτήσεις κωδικού πρόσβασης',
    'psw_PasswordSuggestions' => 'Συστάσεις για βελτίωση της ασφάλειας του κωδικού πρόσβασης',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Πολύ αδύναμος',
    'psw_Weak' => 'Αδύναμος',
    'psw_Fair' => 'Μέτριος',
    'psw_Good' => 'Καλός',
    'psw_Strong' => 'Ισχυρός',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Ο κωδικός πρόσβασης δεν μπορεί να είναι κενός',
    'psw_EmptyPassword' => 'Ο κωδικός πρόσβασης δεν μπορεί να είναι κενός',
    'psw_PasswordInDictionary' => 'Ο κωδικός πρόσβασης βρέθηκε στο λεξικό κοινών κωδικών πρόσβασης',
    'psw_PasswordAcceptable' => 'Ο κωδικός πρόσβασης είναι αποδεκτός',
    'psw_PasswordGenerateFailed' => 'Αδύνατη η δημιουργία κωδικού πρόσβασης',
    'psw_PasswordsArrayRequired' => 'Απαιτείται συστοιχία κωδικών πρόσβασης',
    'psw_InvalidPasswordsFormat' => 'Μη έγκυρη μορφή δεδομένων κωδικού πρόσβασης',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Προσθέστε κεφαλαία γράμματα',
    'psw_AddLowercase' => 'Προσθέστε πεζά γράμματα',
    'psw_AddNumbers' => 'Προσθέστε αριθμούς',
    'psw_AddSpecialChars' => 'Προσθέστε ειδικούς χαρακτήρες',
    'psw_IncreaseLength' => 'Αυξήστε το μήκος του κωδικού πρόσβασης',
    'psw_AvoidRepeating' => 'Αποφύγετε τους επαναλαμβανόμενους χαρακτήρες',
    'psw_AvoidSequential' => 'Αποφύγετε τους διαδοχικούς χαρακτήρες',
    'psw_AvoidCommonWords' => 'Αποφύγετε τις κοινές λέξεις',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Ο κωδικός πρόσβασης που θα οριστεί είναι πολύ απλός.',
    'psw_SetPassword' => 'Ορίστε νέο κωδικό πρόσβασης',
    'psw_SetPasswordError' => 'Ο κωδικός πρόσβασης - %password% δεν μπορεί να χρησιμοποιηθεί, υπάρχει στο λεξικό απλών κωδικών πρόσβασης.',
    'psw_SetPasswordInfo' => 'Ο καθορισμένος κωδικός πρόσβασης δεν μπορεί να χρησιμοποιηθεί, υπάρχει στο λεξικό απλών κωδικών πρόσβασης.',
    'psw_PasswordNoNumbers' => 'Ο κωδικός πρόσβασης πρέπει να περιέχει αριθμούς',
    'psw_PasswordNoLowSimvol' => 'Ο κωδικός πρόσβασης πρέπει να περιέχει πεζούς χαρακτήρες',
    'psw_PasswordNoUpperSimvol' => 'Ο κωδικός πρόσβασης πρέπει να περιέχει κεφαλαίους χαρακτήρες',
    'psw_PasswordIsDefault' => 'Χρησιμοποιείται προεπιλεγμένος κωδικός πρόσβασης',
    'psw_PasswordNoSpecialChars' => 'Προσθέστε ειδικούς χαρακτήρες (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Χρησιμοποιήστε συνδυασμό γραμμάτων, αριθμών και συμβόλων',
    'psw_PasswordAvoidCommon' => 'Αποφύγετε κοινές λέξεις και φράσεις',
    'psw_PasswordUsePassphrase' => 'Σκεφτείτε να χρησιμοποιήσετε μια φράση κωδικού πρόσβασης',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Αδύναμος',
    'psw_PasswordStrengthFair' => 'Ικανοποιητικός',
    'psw_PasswordStrengthGood' => 'Καλός',
    'psw_PasswordStrengthStrong' => 'Ισχυρός',
    'psw_PasswordStrengthVeryStrong' => 'Πολύ ισχυρός',
    'psw_PasswordSecurityRequiresFair' => 'Για εξασφάλιση ασφαλείας ο κωδικός πρόσβασης πρέπει να έχει τουλάχιστον μέτρια αξιοπιστία',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Κωδικός πρόσβασης',
    'psw_WebAdminPasswordRepeat' => 'Επαναλάβετε την εισαγωγή κωδικού πρόσβασης',
    'psw_Passwords' => 'Κωδικός πρόσβασης WEB διεπαφής',
    'psw_ValidateEmptyWebPassword' => 'Ο κωδικός πρόσβασης πίνακα διαχείρισης δεν μπορεί να είναι κενός',
    'psw_ValidateWeakWebPassword' => 'Ο κωδικός πρόσβασης WEB πρέπει να είναι μεγαλύτερος από 4 χαρακτήρες',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Ο κωδικός πρόσβασης web διεπαφής εισήχθη λανθασμένα',
    
    // SSH password specific
    'psw_SSHPassword' => 'Κωδικός πρόσβασης SSH',
    'psw_SSHPasswordRepeat' => 'Επαναλάβετε την εισαγωγή κωδικού πρόσβασης',
    'psw_SSHDisablePasswordLogins' => 'Απενεργοποίηση εξουσιοδότησης κωδικού πρόσβασης',
    'psw_ValidateEmptySSHPassword' => 'Ο κωδικός πρόσβασης SSH δεν μπορεί να είναι κενός',
    'psw_ValidateWeakSSHPassword' => 'Ο κωδικός πρόσβασης SSH πρέπει να είναι μεγαλύτερος από 4 χαρακτήρες',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Ο κωδικός πρόσβασης SSH εισήχθη λανθασμένα. Επαναλάβετε την εισαγωγή κωδικού πρόσβασης.',
];