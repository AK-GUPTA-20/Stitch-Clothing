const ImageKit = require("imagekit");

// Initialize ImageKit with environment variables
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Uploads a file buffer to ImageKit.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} filename - The original file name.
 * @param {string} folder - The destination folder in ImageKit (e.g., '/stitch/products').
 * @returns {Promise<Object>} - The upload response containing url, fileId, etc.
 */
const uploadToImageKit = async (buffer, filename, folder) => {
  return new Promise((resolve, reject) => {
    imagekit.upload(
      {
        file: buffer, // file as buffer
        fileName: filename, // original filename
        folder: folder, // folder in imagekit
      },
      (error, result) => {
        if (error) {
          console.error("ImageKit upload error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

module.exports = {
  imagekit,
  uploadToImageKit,
};
