const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'mailsearchbiz@gmail.com',
    pass: 'ygrvhhqihdhibxwt',
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("Verify Error:", error);
  } else {
    console.log("Server is ready to take our messages");
  }
});
