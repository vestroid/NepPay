const sgMail = require('@sendgrid/mail');
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") })

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendEmail = async ({to, subject, text, html}) => {
    const msg = {
        to,
        from: {
            name: process.env.MAIL_FROM_NAME || "NepPay",
            email: process.env.MAIL_FROM_ADDRESS || "noreply@neppay.idiothub.xyz"
        },
        subject,
        text,
        html
    }

    try {
        await sgMail.send(msg)
    } catch (err) {
        console.error(err)
    }
}

module.exports = {
    sendEmail
}