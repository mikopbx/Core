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

/* global PasswordsAPI */

/**
 * The PasswordScore object provides password scoring functionality
 * Now integrated with async password validation API for better accuracy
 *
 * @module PasswordScore
 */
const PasswordScore = {
    
    /**
     * Cache for validation results to avoid redundant API calls
     */
    validationCache: {},
    
    /**
     * Timers for debouncing validation
     */
    validationTimers: {},

    /**
     * Calculates the score for a given password locally (fallback method)
     * This is used when API is not available or for immediate feedback
     * 
     * @param {string} pass - The password to score.
     * @returns {number} The password score (0-100).
     */
    scorePasswordLocal(pass) {
        let score = 0;
        if (!pass || pass.length === 0) {
            return score;
        }
        
        const length = pass.length;
        
        // Length scoring (up to 30 points)
        if (length >= 16) {
            score += 30;
        } else if (length >= 12) {
            score += 20;
        } else if (length >= 8) {
            score += 10;
        } else if (length >= 6) {
            score += 5;
        }
        
        // Character diversity (up to 40 points)
        if (/[a-z]/.test(pass)) {
            score += 10; // Lowercase
        }
        if (/[A-Z]/.test(pass)) {
            score += 10; // Uppercase
        }
        if (/\d/.test(pass)) {
            score += 10; // Digits
        }
        if (/\W/.test(pass)) {
            score += 10; // Special characters
        }
        
        // Pattern complexity (up to 30 points)
        const uniqueChars = new Set(pass).size;
        const uniqueRatio = uniqueChars / length;
        
        if (uniqueRatio > 0.7) {
            score += 20;
        } else if (uniqueRatio > 0.5) {
            score += 15;
        } else if (uniqueRatio > 0.3) {
            score += 10;
        } else {
            score += 5;
        }
        
        // Penalties for common patterns
        if (/(.)\1{2,}/.test(pass)) {
            score -= 10; // Repeating characters
        }
        if (/(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/i.test(pass)) {
            score -= 10; // Sequential patterns
        }
        
        return Math.max(0, Math.min(100, score));
    },
    
    /**
     * Legacy method for backward compatibility
     * @param {string} pass - The password to score.
     * @returns {number} The password score.
     */
    scorePassword(pass) {
        return this.scorePasswordLocal(pass);
    },

    /**
     * Checks the strength of a password and updates the progress bar
     * Uses async API when available, falls back to local calculation
     * 
     * @param {object} param - The parameters for checking password strength.
     * @param {string} param.pass - The password to check.
     * @param {jQuery} param.bar - The progress bar element.
     * @param {jQuery} param.section - The section element.
     * @param {string} param.field - Optional field name for validation context
     * @param {function} param.callback - Optional callback for async result
     * @returns {string} An empty string for backward compatibility.
     */
    checkPassStrength(param) {
        const { pass, bar, section, field, callback } = param;
        
        // Show section immediately
        if (section) {
            section.show();
        }
        
        // If password is empty or hidden placeholder, hide the progress
        if (!pass || pass === '********') {
            if (bar) {
                bar.progress({
                    percent: 0,
                    showActivity: false,
                });
            }
            if (section) {
                section.hide();
            }
            return '';
        }
        
        // Check if PasswordsAPI is available
        if (typeof PasswordsAPI !== 'undefined') {
            // Use cache key
            const cacheKey = `${field || 'default'}:${pass}`;
            
            // Check cache first
            if (this.validationCache[cacheKey]) {
                const cachedResult = this.validationCache[cacheKey];
                this.updateProgressBar(bar, cachedResult.score);
                if (callback) {
                    callback(cachedResult);
                }
                return '';
            }
            
            // Clear existing timer for this field
            const timerKey = field || 'default';
            if (this.validationTimers[timerKey]) {
                clearTimeout(this.validationTimers[timerKey]);
            }
            
            // Show immediate local feedback
            const localScore = this.scorePasswordLocal(pass);
            this.updateProgressBar(bar, localScore);
            
            // Debounce API call
            this.validationTimers[timerKey] = setTimeout(() => {
                // Make async API call with skipDictionary for performance
                PasswordsAPI.validatePassword(pass, field, (result) => {
                    if (result) {
                        // Cache the result
                        this.validationCache[cacheKey] = result;
                        
                        // Update progress bar with API result
                        this.updateProgressBar(bar, result.score);
                        
                        // Call callback if provided
                        if (callback) {
                            callback(result);
                        }
                    }
                });
            }, 300); // 300ms debounce
            
        } else {
            // Fallback to local scoring
            const score = this.scorePasswordLocal(pass);
            this.updateProgressBar(bar, score);
            
            if (callback) {
                callback({
                    score: score,
                    isValid: score >= 60,
                    strength: this.getStrengthLabel(score)
                });
            }
        }
        
        return '';
    },
    
    /**
     * Update progress bar with score and color
     * 
     * @param {jQuery} bar - The progress bar element
     * @param {number} score - The password score (0-100)
     */
    updateProgressBar(bar, score) {
        if (!bar || bar.length === 0) {
            return;
        }
        
        // Update progress percent
        bar.progress({
            percent: Math.min(score, 100),
            showActivity: false,
        });
        
        // Remove all color classes
        bar.removeClass('red orange yellow olive green');
        
        // Add appropriate color class based on score
        if (score < 20) {
            bar.addClass('red');
        } else if (score < 40) {
            bar.addClass('orange');
        } else if (score < 60) {
            bar.addClass('yellow');
        } else if (score < 80) {
            bar.addClass('olive');
        } else {
            bar.addClass('green');
        }
    },
    
    /**
     * Get strength label for a score
     * 
     * @param {number} score - The password score
     * @returns {string} The strength label
     */
    getStrengthLabel(score) {
        if (score < 20) {
            return 'very_weak';
        } else if (score < 40) {
            return 'weak';
        } else if (score < 60) {
            return 'fair';
        } else if (score < 80) {
            return 'good';
        } else {
            return 'strong';
        }
    },
    
    /**
     * Clear validation cache
     */
    clearCache() {
        this.validationCache = {};
    },
    
    /**
     * Generate a secure password using the API
     * 
     * @param {number} length - Desired password length
     * @param {function} callback - Callback function to receive the generated password
     */
    generatePassword(length = 16, callback) {
        if (typeof PasswordsAPI !== 'undefined') {
            PasswordsAPI.generatePassword(length, callback);
        } else if (callback) {
            // Simple fallback generator
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < length; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            callback({
                password: password,
                length: length,
                score: this.scorePasswordLocal(password)
            });
        }
    }
};

// export default PasswordScore;
