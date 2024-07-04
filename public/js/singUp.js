import axios from 'axios';
import { showAlert } from './alerts';

export const singUp = async (data) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/auth/singup',
      data,
    });

    if (res.data.status === 'success') {
      window.setTimeout(() => {
        location.assign('/confirmEmail');
      }, 1000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
