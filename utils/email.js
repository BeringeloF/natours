import nodemailer from 'nodemailer';
import pug from 'pug';
import { htmlToText } from 'html-to-text';

export class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Jonas Schmedtmann <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.NODE_ENV === 'production') {
      //sendgrid
      return 1;
    }
    console.log(this.to, this.from);
    return nodemailer.createTransport({
      host: process.env.SEND_HOST,
      port: process.env.SEND_PORT,
      auth: {
        user: process.env.SEND_USERNAME,
        pass: process.env.SEND_PASSWORD,
      },
    });
  }

  //send the actual email
  async send(template, subject) {
    //render html based on the pug template

    const html = pug.renderFile(
      `${process.env.PWD}/views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    );
    //define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      text: htmlToText(html),
      html,
    };

    //create a transport and send the email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'welcome to the natours family!');
  }

  async sendConfirmEmail() {
    await this.send('confirmEmail', 'confirm your email');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your passaword reset token (valid for only 10 minutes)'
    );
  }
}
