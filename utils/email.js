const nodemailer = require('nodemailer');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Resume Mailer <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Sendgrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html: template
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      `<h1>Welcome to Resume Mailer!</h1>
       <p>Thank you for joining us. Start sending your resumes to multiple companies with ease.</p>`,
      'Welcome to Resume Mailer!'
    );
  }

  async sendPasswordReset() {
    await this.send(
      `<h1>Password Reset Request</h1>
       <p>Click the link below to reset your password:</p>
       <a href="${this.url}">Reset Password</a>
       <p>This link will expire in 10 minutes.</p>`,
      'Your password reset token (valid for 10 min)'
    );
  }
}

module.exports = Email;