import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51PUTQJRuPziSA3wgKKCf4mGMTlvNoEGCd6aQwHXUbg6ObfgTuCYlBD3SRT5tFg7J8PCSNxVKKAUNPV8BLc1sWZno00EWkw0JTu'
);

export const bookTour = async (tourId) => {
  try {
    //get check out session form api
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    console.log(session);
    //create check out form + charge credit card

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err.data.response.message);
    console.log(err);
  }
};
