const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({ 
  cloud_name: 'dixvtzmjd', // ← replace this
  api_key: '391359849486111', // ← replace this
  api_secret: '9EA8CYCLMQzZfobhN6JcWyp13hU' // ← replace this
});

async function run() {
  try {
    // 2. Upload an image
    console.log("Uploading image...");
    const uploadResult = await cloudinary.uploader.upload("https://res.cloudinary.com/demo/image/upload/sample.jpg", {
      public_id: "sample_upload"
    });
    console.log("Secure URL:", uploadResult.secure_url);
    console.log("Public ID:", uploadResult.public_id);

    // 3. Get image details
    console.log("\nImage Details:");
    console.log("Width:", uploadResult.width);
    console.log("Height:", uploadResult.height);
    console.log("Format:", uploadResult.format);
    console.log("File size (bytes):", uploadResult.bytes);

    // 4. Transform the image
    // Generate a URL with f_auto (automatically chooses the best format like webp/avif) 
    // and q_auto (automatically adjusts quality to reduce file size without visible degradation)
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto'
    });
    
    console.log("\nDone! Click link below to see optimized version of the image. Check the size and the format.");
    console.log(transformedUrl);
  } catch (error) {
    console.error("Error during execution:", error);
  }
}

run();
