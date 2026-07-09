const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mailsearchbiz@gmail.com',
    pass: 'feqnhfpshuhnkjhh',
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("Verify Error:", error);
  } else {
    console.log("Server is ready to take our messages");
  }
});
