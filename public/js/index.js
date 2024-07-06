import { login, logout } from './login.js';
import { singUp } from './singUp.js';
import { displayMap } from './mapbox.js';
import { updateSettings } from './updateSettings.js';
import { bookTour } from './stripe.js';
import { sendCode, sendPhone } from './verifyPhoneNumber.js';
import { showAlert } from './alerts.js';

console.log('hello from parcel');

//Dom elements
const mapEl = document.getElementById('map');
const formEl = document.querySelector('.logar');
const logoutBtn = document.querySelector('.nav__el--logout');
const formElUser = document.querySelector('.form-user-data');
const formPassword = document.querySelector('.form-user-password');
const singUpForm = document.querySelector('.singup-form');
const bookBtn = document.getElementById('book-tour');
const sendPhoneForm = document.querySelector('.form--confirm-phone');

//values

//delagation
if (mapEl) {
  const locations = JSON.parse(mapEl.dataset.locations);
  console.log(locations[0]);

  displayMap(locations);
}

if (singUpForm) {
  singUpForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    const passwordConfirm = document.querySelector('#password-confirm').value;
    const name = document.querySelector('#name').value;
    const phone = document.querySelector('#phone').value;

    await singUp({
      email,
      password,
      passwordConfirm,
      name,
      phone,
    });
  });
}

if (formEl) {
  formEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    console.log(email);
    await login(email, password);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

if (formElUser)
  formElUser.addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = new FormData();
    form.append('name', document.querySelector('#name').value);
    form.append('email', document.querySelector('#email').value);
    form.append('photo', document.querySelector('#photo').files[0]);
    console.log(form);
    await updateSettings(form, 'data');
  });

if (formPassword)
  formPassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordCurrent = document.querySelector('#password-current').value;
    const password = document.querySelector('#password').value;
    const passwordConfirm = document.querySelector('#password-confirm').value;
    console.log('SENHA DEVERIA ESTAR AQUI EM BAIXO');
    console.log(passwordCurrent, password, passwordConfirm);
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );
    document.querySelector('#password-current').value = '';
    document.querySelector('#password').value = '';
    document.querySelector('#password-confirm').value = '';
  });

if (bookBtn) {
  bookBtn.addEventListener('click', async (e) => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    await bookTour(tourId);
  });
}

if (sendPhoneForm) {
  sendPhoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.querySelector('#code').value;
    await sendCode(code);
  });
}

const alertMessage = document.querySelector('body').dataset.alert;

if (alertMessage) {
  showAlert('success', alertMessage, 20);
}
