import axios from 'axios';
import { showAlert } from './alerts';

export const sendCode = async (code) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/auth/verify-phone',
      data: {
        code,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', res.data.message);
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
