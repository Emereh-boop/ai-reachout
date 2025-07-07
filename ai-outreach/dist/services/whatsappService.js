"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = exports.WhatsAppService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class WhatsAppService {
    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
        this.apiVersion = 'v18.0'; // Update to latest version
    }
    /**
     * Send WhatsApp message
     */
    sendMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                if (!this.accessToken || !this.phoneNumberId) {
                    return {
                        success: false,
                        error: 'WhatsApp credentials not configured'
                    };
                }
                const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
                let payload = {
                    messaging_product: 'whatsapp',
                    to: this.formatPhoneNumber(message.to),
                    type: message.type
                };
                if (message.type === 'text') {
                    payload.text = { body: message.message };
                }
                else if (message.type === 'template') {
                    payload.template = {
                        name: message.templateName || 'hello_world',
                        language: { code: 'en' }
                    };
                    if (message.templateParams) {
                        payload.template.components = [{
                                type: 'body',
                                parameters: message.templateParams.map(param => ({
                                    type: 'text',
                                    text: param
                                }))
                            }];
                    }
                }
                else if (message.type === 'media' && message.mediaUrl) {
                    payload.media = {
                        id: message.mediaUrl,
                        caption: message.message
                    };
                }
                const response = yield axios_1.default.post(url, payload, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.data.messages && response.data.messages[0]) {
                    return {
                        success: true,
                        messageId: response.data.messages[0].id,
                        status: 'sent'
                    };
                }
                else {
                    return {
                        success: false,
                        error: 'No message ID returned'
                    };
                }
            }
            catch (error) {
                console.error('WhatsApp API error:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                return {
                    success: false,
                    error: ((_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || error.message
                };
            }
        });
    }
    /**
     * Send bulk WhatsApp messages
     */
    sendBulkMessages(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const message of messages) {
                try {
                    // Add delay to avoid rate limiting
                    if (results.length > 0) {
                        yield this.delay(1000);
                    }
                    const result = yield this.sendMessage(message);
                    results.push(result);
                }
                catch (error) {
                    results.push({
                        success: false,
                        error: `Failed to send message: ${error}`
                    });
                }
            }
            return results;
        });
    }
    /**
     * Send outreach template message
     */
    sendOutreachMessage(phoneNumber, businessName, customMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultMessage = `Hi there! 👋

I came across ${businessName} and was impressed by your work. I'd love to explore potential collaboration opportunities.

Would you be interested in a quick chat about how we might work together?

Best regards,
[Your Name]`;
            const message = customMessage || defaultMessage;
            return this.sendMessage({
                to: phoneNumber,
                message,
                type: 'text'
            });
        });
    }
    /**
     * Send follow-up message
     */
    sendFollowUpMessage(phoneNumber, businessName, daysSinceFirstContact) {
        return __awaiter(this, void 0, void 0, function* () {
            let message = '';
            if (daysSinceFirstContact === 3) {
                message = `Hi again! 👋

Just following up on my previous message about ${businessName}. I wanted to make sure you received it and see if you'd be interested in connecting.

No pressure at all - just thought I'd check in!

Best regards,
[Your Name]`;
            }
            else if (daysSinceFirstContact === 7) {
                message = `Hi there! 👋

I hope this message finds you well. I reached out last week about ${businessName} and potential collaboration opportunities.

If you're still interested, I'd love to schedule a quick call. If not, no worries at all!

Best regards,
[Your Name]`;
            }
            else {
                message = `Hi! 👋

Just a friendly follow-up about ${businessName}. I'm still very interested in exploring how we might work together.

Would love to hear from you when you have a moment!

Best regards,
[Your Name]`;
            }
            return this.sendMessage({
                to: phoneNumber,
                message,
                type: 'text'
            });
        });
    }
    /**
     * Get message status
     */
    getMessageStatus(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const url = `https://graph.facebook.com/${this.apiVersion}/${messageId}`;
                const response = yield axios_1.default.get(url, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
                return {
                    success: true,
                    status: response.data.status,
                    messageId
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: ((_c = (_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) || error.message
                };
            }
        });
    }
    /**
     * Format phone number for WhatsApp
     */
    formatPhoneNumber(phone) {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        // Add country code if not present (default to Nigeria +234)
        if (!cleaned.startsWith('234') && !cleaned.startsWith('1') && !cleaned.startsWith('44')) {
            if (cleaned.startsWith('0')) {
                cleaned = '234' + cleaned.substring(1);
            }
            else {
                cleaned = '234' + cleaned;
            }
        }
        return cleaned;
    }
    /**
     * Validate phone number
     */
    validatePhoneNumber(phone) {
        const cleaned = this.formatPhoneNumber(phone);
        return cleaned.length >= 10 && cleaned.length <= 15;
    }
    /**
     * Delay function for rate limiting
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Check if WhatsApp service is configured
     */
    isConfigured() {
        return !!(this.accessToken && this.phoneNumberId);
    }
    /**
     * Get WhatsApp Business account info
     */
    getAccountInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
                const response = yield axios_1.default.get(url, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error('Error getting account info:', error);
                return null;
            }
        });
    }
    /**
     * Create message template (requires approval from Meta)
     */
    createMessageTemplate(name, category, components) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const url = `https://graph.facebook.com/${this.apiVersion}/${this.businessAccountId}/message_templates`;
                const payload = {
                    name,
                    category,
                    components
                };
                const response = yield axios_1.default.post(url, payload, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error('Error creating template:', error);
                throw error;
            }
        });
    }
}
exports.WhatsAppService = WhatsAppService;
// Export singleton instance
exports.whatsappService = new WhatsAppService();
