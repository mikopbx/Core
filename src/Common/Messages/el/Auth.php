<?php
return [
    'rest_param_auth_clientIp' => 'Διεύθυνση IP πελάτη για παρακολούθηση συσκευής',
    'auth_TokenUpdateFailed' => 'Σφάλμα ανανέωσης διακριτικού',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Εξουσιοδότηση χρήστη',
    'rest_auth_LoginDesc' => 'Έλεγχος ταυτότητας χρήστη και έκδοση διακριτικών JWT. Υποστηρίζει δύο μεθόδους: κωδικό πρόσβασης (login+password) και κλειδί πρόσβασης (sessionToken από το WebAuthn). Επιστρέφει ένα διακριτικό πρόσβασης (JWT, 15 λεπτά) και ορίζει ένα refreshToken στο cookie httpOnly (30 ημέρες).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Ανανέωση διακριτικού πρόσβασης',
    'rest_auth_RefreshDesc' => 'Ανανεώνει το διακριτικό πρόσβασης JWT χρησιμοποιώντας το διακριτικό ανανέωσης από το cookie. Προαιρετικά, εναλλάσσει το διακριτικό ανανέωσης για αυξημένη ασφάλεια.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Αποσύνδεση',
    'rest_auth_LogoutDesc' => 'Διαγράψτε το διακριτικό ανανέωσης από τη βάση δεδομένων και διαγράψτε το cookie. Το διακριτικό πρόσβασης JWT θα λήξει φυσικά μετά από 15 λεπτά.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Σύνδεση χρήστη για εξουσιοδότηση',
    'rest_param_auth_password' => 'Κωδικός Χρήστη',
    'rest_param_auth_sessionToken' => 'Διακριτικό περιόδου σύνδεσης μίας χρήσης από έλεγχο ταυτότητας με κωδικό πρόσβασης (64 δεκαεξαδικοί χαρακτήρες)',
    'rest_param_auth_rememberMe' => 'Να με θυμάσαι (παράταση διακριτικού ανανέωσης)',
    'rest_param_auth_refreshToken' => 'Ανανέωση διακριτικού από το cookie httpOnly για ανανέωση του διακριτικού πρόσβασης',
    'rest_param_auth_userAgent' => 'Εφαρμογή παρακολούθησης προγράμματος περιήγησης/συσκευής με user-agent',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Διακριτικό πρόσβασης JWT για την έγκριση αιτημάτων (ισχύει για 15 λεπτά)',
    'rest_schema_auth_tokenType' => 'Τύπος διακριτικού για την κεφαλίδα Εξουσιοδότησης (πάντα "Κάτοχος")',
    'rest_schema_auth_expiresIn' => 'Χρόνος μέχρι τη λήξη του διακριτικού πρόσβασης σε δευτερόλεπτα',
    'rest_schema_auth_login' => 'Σύνδεση του εξουσιοδοτημένου χρήστη',
    'rest_schema_auth_message' => 'Μήνυμα σχετικά με το αποτέλεσμα της λειτουργίας',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Επιτυχής εξουσιοδότηση. Επιστράφηκε ένα διακριτικό πρόσβασης και ορίστηκε ένα cookie διακριτικού ανανέωσης.',
    'rest_response_200_auth_refresh' => 'Το διακριτικό πρόσβασης ενημερώθηκε με επιτυχία. Το διακριτικό ανανέωσης ενδέχεται να έχει περιστραφεί.',
    'rest_response_200_auth_logout' => 'Επιτυχής έξοδος. Το διακριτικό ανανέωσης έχει αφαιρεθεί από τη βάση δεδομένων και το cookie έχει διαγραφεί.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Πάρα πολλές προσπάθειες σύνδεσης. Δοκιμάστε ξανά σε {interval} δευτερόλεπτα.',
    'auth_LoginPasswordRequired' => 'Πρέπει να καθορίσετε σύνδεση+κωδικό πρόσβασης ή διακριτικό συνεδρίας',
    'auth_WrongLoginPassword' => 'Λανθασμένο όνομα χρήστη ή κωδικός πρόσβασης',
    'auth_TokenSaveFailed' => 'Σφάλμα κατά την αποθήκευση του διακριτικού στη βάση δεδομένων',
    'auth_RefreshTokenMissing' => 'Λείπει το διακριτικό ανανέωσης από το cookie',
    'auth_RefreshTokenInvalid' => 'Μη έγκυρο διακριτικό ανανέωσης',
    'auth_RefreshTokenExpired' => 'Το διακριτικό ανανέωσης έχει λήξει ή δεν βρέθηκε',
    'auth_InvalidSessionData' => 'Μη έγκυρα δεδομένα συνεδρίας',
    'rest_response_401_invalid_credentials' => 'Λανθασμένα διαπιστευτήρια',
    'rest_response_401_invalid_token' => 'Μη έγκυρο διακριτικό',
    'rest_response_403_token_expired' => 'Το διακριτικό έχει λήξει',
    'rest_response_429_too_many_requests' => 'Πάρα πολλά αιτήματα',
];
