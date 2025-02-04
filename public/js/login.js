import axios from 'axios';
import { showAlert } from './alerts.js';

export const login = async (email, password) => {
  console.log(email);
  console.log(password);
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/auth/login',
      data: {
        email,
        password,
      },
    });
    console.log(res);
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/auth/logout',
    });
    if (res.data.status === 'success') {
      location.reload(true);
    }
  } catch (err) {
    console.log(err);
    showAlert('error', 'Error loging out, try again later!');
  }
};
