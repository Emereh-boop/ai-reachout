import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

export interface WhatsAppMessage {
  to: string;
  message: string;
  type: 'text' | 'template' | 'media';
  templateName?: string;
  templateParams?: string[];
  mediaUrl?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private apiVersion: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.apiVersion = 'v18.0'; // Update to latest version
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp credentials not configured'
        };
      }

      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      let payload: any = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(message.to),
        type: message.type
      };

      if (message.type === 'text') {
        payload.text = { body: message.message };
      } else if (message.type === 'template') {
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
      } else if (message.type === 'media' && message.mediaUrl) {
        payload.media = {
          id: message.mediaUrl,
          caption: message.message
        };
      }

      const response = await axios.post(url, payload, {
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
      } else {
        return {
          success: false,
          error: 'No message ID returned'
        };
      }
    } catch (error: any) {
      console.error('WhatsApp API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkMessages(messages: WhatsAppMessage[]): Promise<WhatsAppResponse[]> {
    const results: WhatsAppResponse[] = [];
    
    for (const message of messages) {
      try {
        // Add delay to avoid rate limiting
        if (results.length > 0) {
          await this.delay(1000);
        }
        
        const result = await this.sendMessage(message);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: `Failed to send message: ${error}`
        });
      }
    }
    
    return results;
  }

  /**
   * Send outreach template message
   */
  async sendOutreachMessage(
    phoneNumber: string, 
    businessName: string, 
    customMessage?: string
  ): Promise<WhatsAppResponse> {
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
  }

  /**
   * Send follow-up message
   */
  async sendFollowUpMessage(
    phoneNumber: string,
    businessName: string,
    daysSinceFirstContact: number
  ): Promise<WhatsAppResponse> {
    let message = '';
    
    if (daysSinceFirstContact === 3) {
      message = `Hi again! 👋

Just following up on my previous message about ${businessName}. I wanted to make sure you received it and see if you'd be interested in connecting.

No pressure at all - just thought I'd check in!

Best regards,
[Your Name]`;
    } else if (daysSinceFirstContact === 7) {
      message = `Hi there! 👋

I hope this message finds you well. I reached out last week about ${businessName} and potential collaboration opportunities.

If you're still interested, I'd love to schedule a quick call. If not, no worries at all!

Best regards,
[Your Name]`;
    } else {
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
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<WhatsAppResponse> {
    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${messageId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        success: true,
        status: response.data.status,
        messageId
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Format phone number for WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (default to Nigeria +234)
    if (!cleaned.startsWith('234') && !cleaned.startsWith('1') && !cleaned.startsWith('44')) {
      if (cleaned.startsWith('0')) {
        cleaned = '234' + cleaned.substring(1);
      } else {
        cleaned = '234' + cleaned;
      }
    }
    
    return cleaned;
  }

  /**
   * Validate phone number
   */
  validatePhoneNumber(phone: string): boolean {
    const cleaned = this.formatPhoneNumber(phone);
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if WhatsApp service is configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  /**
   * Get WhatsApp Business account info
   */
  async getAccountInfo(): Promise<any> {
    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  /**
   * Create message template (requires approval from Meta)
   */
  async createMessageTemplate(
    name: string,
    category: string,
    components: any[]
  ): Promise<any> {
    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.businessAccountId}/message_templates`;
      
      const payload = {
        name,
        category,
        components
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Error creating template:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService(); 