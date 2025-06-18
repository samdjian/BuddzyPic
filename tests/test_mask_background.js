import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Simple test to verify mask and background application
async function testMaskBackground() {
  try {
    // Load the avatar image
    const inputPath = path.resolve(process.cwd(), 'assets/avatar.png');
    console.log(`Reading image from: ${inputPath}`);
    
    // Get image dimensions
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) / 2; // Half of the smallest dimension
    
    console.log(`Image dimensions: ${width}x${height}`);
    
    // Create a circular mask
    const maskSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="white" />
      </svg>
    `;
    
    // Create a background with the same mask shape
    const bgSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="#000000" />
      </svg>
    `;
    
    // Create a border
    const borderSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="none" stroke="#3498db" stroke-width="5" />
      </svg>
    `;
    
    // Convert SVGs to buffers
    const maskBuffer = Buffer.from(maskSvg);
    const bgBuffer = Buffer.from(bgSvg);
    const borderBuffer = Buffer.from(borderSvg);
    
    // 1. Apply the mask to the image
    const maskedImage = await sharp(inputPath)
      .composite([
        {
          input: maskBuffer,
          blend: 'dest-in'
        }
      ])
      .toBuffer();
    
    // Save the masked image for inspection
    await sharp(maskedImage).toFile('./outputs/test_masked.png');
    console.log('Masked image saved as: ./outputs/test_masked.png');
    
    // 2. Create a background image with the background color
    await sharp(bgBuffer).toFile('./outputs/test_bg.png');
    console.log('Background image saved as: ./outputs/test_bg.png');
    
    // 3. Composite the background and masked image
    await sharp('./outputs/test_bg.png')
      .composite([
        {
          input: maskedImage,
          blend: 'over'
        }
      ])
      .toFile('./outputs/test_bg_masked.png');
    
    console.log('Background with masked image saved as: ./outputs/test_bg_masked.png');
    
    // 4. Add the border
    await sharp('./outputs/test_bg_masked.png')
      .composite([
        {
          input: borderBuffer,
          blend: 'over'
        }
      ])
      .toFile('./outputs/test_final.png');
    
    console.log('Final image saved as: ./outputs/test_final.png');
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testMaskBackground();
