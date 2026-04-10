import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends an email using Gmail hSMTP wit App Password
 */
const sendEmail = async ({ to, subject, html, text, replyTo, fromName, fromEmail, attachments, emailConfig }) => {
    if (!emailConfig || !emailConfig.email || !emailConfig.appPassword) {
        throw new Error('Email configuration (Email and App Password) is required.');
    }

    try {
        const targetEmail = emailConfig.email;
        
        // SMTP Transporter with Custom Configuration and Timeouts
        const transporter = nodemailer.createTransport({
            host: emailConfig.host || 'smtp.gmail.com',
            port: emailConfig.port || 465,
            secure: emailConfig.secure !== undefined ? emailConfig.secure : (emailConfig.port === 465),
            auth: {
                user: targetEmail,
                pass: emailConfig.appPassword
            },
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 10000, // 10s timeout for connection
            greetingTimeout: 10000,   // 10s for greeting
            socketTimeout: 45000      // 45s for data transfer
        });

        // --- IDENTITY MASKING (Hostinger-Ready) ---
        // To get the 'via' tag and avoid 554 errors, we use the Gmail address in the MIME 'From'
        // but provide the REAL Hostinger account in the 'Sender' and 'X-Sender' headers.
        const safeFromHeader = (fromEmail && fromEmail !== targetEmail)
            ? (fromName ? `"${fromName}" <${fromEmail}>` : fromEmail)
            : `"${senderName}" <${targetEmail}>`;

        // Extract just the email address for the envelope (removing name if present)
        const cleanToEmail = to.includes('<') ? to.match(/<([^>]+)>/)?.[1] : to;

        // --- Deliverability "Elite Suite" ---
        const domain = emailConfig.host.split('.').slice(-2).join('.');
        const randomHex = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase();
        const messageId = `<${randomHex}.${Date.now()}@mail.${domain}>`;
        
        const plainText = text || html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000);

        const mailOptions = {
            from: safeFromHeader,
            sender: targetEmail, 
            to: to,
            replyTo: replyTo || fromEmail || targetEmail,
            subject: subject,
            html: html,
            text: plainText,
            attachments: attachments,
            messageId: messageId,
            date: new Date(),
            headers: {
                'X-Mailer': 'Microsoft Outlook 16.0',
                'X-Priority': '3', 
                'Priority': 'normal',
                'Importance': 'Normal',
                'Precedence': 'bulk',
                'List-Unsubscribe': `<mailto:${targetEmail}?subject=unsubscribe>`,
                'X-Auto-Response-Suppress': 'All', 
                'Auto-Submitted': 'auto-generated',
                'X-Report-Abuse': `Please report abuse to abuse@${domain}`,
                'X-Sender': targetEmail,
                'MIME-Version': '1.0'
            },
            envelope: {
                from: targetEmail, 
                to: cleanToEmail
            }
        };

        const result = await transporter.sendMail(mailOptions);
        return result;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`Email could not be sent: ${error.message}`);
    }
};

export default sendEmail;
