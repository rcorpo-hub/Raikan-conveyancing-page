import nodemailer from 'nodemailer';
import { resolve } from 'node:path';
import { DeliveryError } from './sinch.mjs';
export function createMailer(config, transport) {
  const smtp = transport || nodemailer.createTransport({host:config.smtpHost,port:config.smtpPort,secure:config.smtpSecure,requireTLS:!config.smtpSecure,auth:{user:config.smtpUser,pass:config.smtpPassword},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
  return {
    async send(payload, jobId) {
      try {
        const result = await smtp.sendMail({from:config.emailFrom,to:payload.to,replyTo:payload.replyTo || 'conveyancer@rcorpo.com',subject:payload.subject,text:payload.text,html:payload.html,messageId:`<${jobId}@${new URL(config.origin).hostname}>`,attachments:payload.attachments?.map(item=>({...item,path:resolve(item.path)}))});
        if (!result.accepted?.length || result.rejected?.length) throw new DeliveryError('email_not_accepted');
        return {providerId:result.messageId,status:'accepted'};
      } catch(error) {
        if (error instanceof DeliveryError) throw error;
        // Only known authentication/envelope rejections are certain failures.
        throw new DeliveryError(['EAUTH','EENVELOPE'].includes(error.code) ? 'email_rejected' : 'email_submission_uncertain', ['EAUTH','EENVELOPE'].includes(error.code) ? 'failed' : 'unknown');
      }
    },
    close() { smtp.close(); },
  };
}
