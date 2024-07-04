import { Vonage } from '@vonage/server-sdk';
import User from '../models/userModel.js';

const vonage = new Vonage({
  apiKey: 'f790e6b6',
  apiSecret: 'KZ10HsAmvmBDJrSX',
});

const from = 'Natours Web Site';
const to = '5514981284530';
const text = 'your verification code: 89341\n only valid for 30min.';

export async function sendSMS(user) {
  const code = user.createVericationCode();
  const text = `your verification code:${code} \n only valid for 60min.`;

  await user.save({ validateBeforeSave: false });
  await vonage.sms
    .send({ to, from, text })
    .then((resp) => {
      console.log('Message sent successfully');
      console.log(resp);
    })
    .catch((err) => {
      console.log('There was an error sending the messages.');
      console.error(err);
    });
}
