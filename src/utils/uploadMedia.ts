export const uploadMedia = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'wbqanc91'); // Unsigned preset

  // Using 'auto' resource type allows Cloudinary to handle images, videos, and raw files (like pdfs)
  const res = await fetch(`https://api.cloudinary.com/v1_1/dixvtzmjd/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || 'Failed to upload media');
  }

  const data = await res.json();
  return data.secure_url;
};
