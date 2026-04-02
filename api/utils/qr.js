const { QRCodeStyling } = require("qr-code-styling/lib/qr-code-styling.common.js");

const nodeCanvas = require("canvas");

const { JSDOM } = require("jsdom");

const fs = require("fs");

const path = require("path");

const generateQRCode = async (data) => {

const dom = new JSDOM();

global.window = dom.window;

global.document = dom.window.document;



const logoPath = path.join(__dirname, "../../public/assets/icons/logo.svg");

const logoBuffer = fs.readFileSync(logoPath);

const logoDataUri = `data:image/svg+xml;base64,${logoBuffer.toString("base64")}`;



const qrCode = new QRCodeStyling({

    jsdom: JSDOM,

    nodeCanvas,

    width: 256,

    height: 256,

    data: data,

    image: logoDataUri,

    dotsOptions: {

        color: "#000000",

        type: "rounded"

    },

    imageOptions: {

        hideBackgroundDots: true,

        imageSize: 0.3,

        margin: 5,

        crossOrigin: "anonymous"

    },

    backgroundOptions: {

        color: "#ffffff",

    }

});



const buffer = await qrCode.getRawData("png");

return `data:image/png;base64,${buffer.toString("base64")}`;

}

module.exports = { generateQRCode };
