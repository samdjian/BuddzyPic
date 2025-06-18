import sharp from 'sharp';
import path from 'path';
import { Buffer } from 'buffer';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Helper function to convert stream to buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

class BaseGenerator {
  imageWidth = 800;
  imageHeight = 1422;
  background = null;
  defaultBackground = { r: 255, g: 255, b: 255, alpha: 1 };
  elements = [];
  s3Client = null; // Lazy initialized S3 Client

  constructor(params) {
    this.imageWidth = params.imageWidth ?? this.imageWidth;
    this.imageHeight = params.imageHeight ?? this.imageHeight;
    this.background = params.background ?? this.background;
    this.defaultBackground = params.defaultBackground ?? this.defaultBackground;
    this.elements = params.elements ?? this.elements;
  }

  async initAndSetBackground() {
    if (this.background) {
      console.log(`Using background: ${this.background}`);
      
      // Check if background is a color (starts with #)
      if (typeof this.background === 'string' && this.background.startsWith('#')) {
        console.log('Creating background with color:', this.background);
        return sharp({
          create: {
            width: this.imageWidth,
            height: this.imageHeight,
            channels: 4, // RGBA
            background: { r: parseInt(this.background.slice(1, 3), 16),
                         g: parseInt(this.background.slice(3, 5), 16),
                         b: parseInt(this.background.slice(5, 7), 16),
                         alpha: 1 }
          }
        });
      } else {
        // Background is an image path
        const backgroundBuffer = await this.getImageBuffer(this.background);
        // Start processing but don't await yet if not needed immediately
        return sharp(backgroundBuffer)
          .resize(this.imageWidth, this.imageHeight, { fit: 'cover', position: 'center' });
      }
    } else {
      console.log('Creating blank background');
      return sharp({
        create: {
          width: this.imageWidth,
          height: this.imageHeight,
          channels: 4, // RGBA
          background: this.defaultBackground
        }
      });
    }
  }

  // Initialize S3 client if needed
  getS3Client() {
    if (!this.s3Client) {
      console.log('Initializing S3 Client...');
      // Lambda execution environment automatically provides credentials and region via env variables
      // No need to specify region/credentials here if Lambda execution role is configured correctly
      this.s3Client = new S3Client({});
    }
    return this.s3Client;
  }

  async getImageBuffer(src) {
    if (src.startsWith('s3://')) {
        const client = this.getS3Client();
        const uri = new URL(src);
        const bucket = uri.hostname;
        const key = uri.pathname.substring(1); // Remove leading '/'

        console.log(`Fetching S3 object: Bucket=${bucket}, Key=${key}`);

        try {
            const command = new GetObjectCommand({ Bucket: bucket, Key: key });
            const response = await client.send(command);
            // response.Body is a ReadableStream or Node.js Readable
            const buffer = await streamToBuffer(response.Body);
            console.log(`Successfully fetched S3 object ${src}. Size: ${buffer.length} bytes`);
            return buffer;
        } catch (error) {
            console.error(`Error fetching S3 object ${src}:`, error);
            throw new Error(`Could not fetch S3 object: ${src}. ${error.message}`);
        }
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      console.log(`Fetching remote image: ${src}`);
      // Use native fetch
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${src}: ${response.statusText} (${response.status})`);
      }
      // Read the response body as an ArrayBuffer, then convert to Buffer
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      // Handle local path (relative to assets or absolute)
      let localPath;
      if (path.isAbsolute(src)) {
        localPath = src;
      } else {
        // Resolve relative paths relative to the project root (assuming invoke is run from root)
        // Or adjust based on where assets are relative to the CWD when script is run
        localPath = path.resolve(process.cwd(), src); // Use current working directory
      }
      console.log(`Reading local image: ${localPath}`);
      // Use sharp to read local file to ensure format compatibility and handle potential errors
      try {
        // Sharp needs file paths, not buffers directly for local files unless read manually first
        return await sharp(localPath).toBuffer();
      } catch (error) {
        console.error(`Error reading local image file ${localPath}:`, error);
        throw new Error(`Could not read local image file: ${localPath}`);
      }
    }
  }

  calculateElementPosition(element, generator, elementsData, bufferInfo) {
    let baseX = 0, baseY = 0;
    if (element.origin === 'center') {
      baseX = generator.imageWidth / 2;
      baseY = generator.imageHeight / 2;
    } else if (element.origin && elementsData[element.origin]) { // Check if origin exists and is already processed
      console.log(`-> Image element ${element.id}: Origin element ${element.origin} found.`);
      console.log(`-> Image element ${element.id}: Origin element data:`, elementsData[element.origin]);
      const originElement = elementsData[element.origin];
      // Position relative to the top-left corner of the origin element
      baseX = originElement.left;
      baseY = originElement.top;
      // Add adjustments if needed (e.g., position relative to the center of the origin element)
      // baseX += originElement.width / 2;
      // baseY += originElement.height / 2;
    } // Default origin is top-left (0, 0)

    // Calculate offset relative to the base origin
    // If x/y is null for origin: 'center', it means center the element relative to the base origin's center
    const offsetX = (element.x === null && element.origin === 'center') ? -bufferInfo.info.width / 2 : (element.x || 0);
    const offsetY = (element.y === null && element.origin === 'center') ? -bufferInfo.info.height / 2 : (element.y || 0);

    let finalLeft = baseX + offsetX;
    let finalTop = baseY + offsetY;

    return { finalLeft, finalTop };
  }

  async processImageElement(element, generator, elementsData, sharpInstance = null) {
    if (!element.src || (element.width == null && element.height == null)) {
      throw new Error(`-> Image element ${element.id}: Missing 'src' or both 'width'/'height'.`);
    }
    console.log(`Processing image element: ${element.id} (${element.src})`);
  
    try {
      const imageBuffer = await this.getImageBuffer(element.src);
      let image = sharpInstance ?? sharp(imageBuffer);
      image = await this.resizeImage(image, element);
  
      if (element.rotation) {
        image = image.rotate(element.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
      }
      
      // Apply mask if requested
      if (element.mask) {
        console.log(`Applying ${element.mask.shape} mask to element: ${element.id}`);
        
        try {
          // Get image dimensions
          const metadata = await image.toBuffer({ resolveWithObject: true });
          const width = metadata.info.width;
          const height = metadata.info.height;
          const centerX = width / 2;
          const centerY = height / 2;
          const size = Math.min(width, height) / 2; // Half of the smallest dimension
          
          // Border properties
          const hasBorder = element.mask.border && element.mask.border.size > 0;
          const borderColor = hasBorder ? (element.mask.border.color || '#000000') : '';
          const borderSize = hasBorder ? (element.mask.border.size || 5) : 0;
          
          // Create a mask buffer based on the shape
          let maskSvg = '';
          const shape = element.mask.shape?.toLowerCase() || 'circle';
          
          switch (shape) {
            case 'circle':
              maskSvg = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="white" />
                </svg>
              `;
              break;
              
            case 'star':
              // Create a 5-pointed star
              const outerRadius = size;
              const innerRadius = size * 0.4; // Inner radius is 40% of outer
              
              let points = '';
              for (let i = 0; i < 10; i++) {
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = Math.PI * i / 5;
                const x = centerX + r * Math.sin(angle);
                const y = centerY - r * Math.cos(angle);
                points += `${x},${y} `;
              }
              
              maskSvg = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="${points}" fill="white" />
                </svg>
              `;
              break;
              
            case 'heart':
              // Create a heart shape
              const heartSize = size * 0.8;
              
              maskSvg = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                  <path d="
                    M ${centerX} ${centerY + heartSize * 0.7}
                    C ${centerX} ${centerY + heartSize * 0.5} ${centerX - heartSize} ${centerY - heartSize * 0.5} ${centerX - heartSize} ${centerY - heartSize * 0.5}
                    C ${centerX - heartSize} ${centerY - heartSize} ${centerX} ${centerY - heartSize} ${centerX} ${centerY - heartSize * 0.5}
                    C ${centerX} ${centerY - heartSize} ${centerX + heartSize} ${centerY - heartSize} ${centerX + heartSize} ${centerY - heartSize * 0.5}
                    C ${centerX + heartSize} ${centerY - heartSize * 0.5} ${centerX} ${centerY + heartSize * 0.5} ${centerX} ${centerY + heartSize * 0.7}
                    Z" fill="white" />
                </svg>
              `;
              break;
              
            case 'hexagon':
              let hexPoints = '';
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const x = centerX + size * Math.cos(angle);
                const y = centerY + size * Math.sin(angle);
                hexPoints += `${x},${y} `;
              }
              
              maskSvg = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="${hexPoints}" fill="white" />
                </svg>
              `;
              break;
              
            default:
              // Default to circle if shape is not recognized
              maskSvg = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="white" />
                </svg>
              `;
          }
          
          // Create mask buffer
          const maskBuffer = Buffer.from(maskSvg);
          
          // Apply the mask to the image
          const maskedImageBuffer = await sharp(metadata.data)
            .composite([
              {
                input: maskBuffer,
                blend: 'dest-in'
              }
            ])
            .toBuffer();
          
          // Create a new sharp instance with the masked image
          image = sharp(maskedImageBuffer);
          
          // If background is specified, create a background with the same mask shape
          if (element.background) {
            const bgColor = element.background;
            
            // Create a background with the same mask shape
            let bgSvg = '';
            const shape = element.mask.shape?.toLowerCase() || 'circle';
            
            switch (shape) {
              case 'circle':
                bgSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="${bgColor}" />
                  </svg>
                `;
                break;
                
              case 'star':
                // Create a 5-pointed star
                let starPoints = '';
                for (let i = 0; i < 10; i++) {
                  const r = i % 2 === 0 ? outerRadius : innerRadius;
                  const angle = Math.PI * i / 5;
                  const x = centerX + r * Math.sin(angle);
                  const y = centerY - r * Math.cos(angle);
                  starPoints += `${x},${y} `;
                }
                
                bgSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="${starPoints}" fill="${bgColor}" />
                  </svg>
                `;
                break;
                
              case 'heart':
                bgSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <path d="
                      M ${centerX} ${centerY + heartSize * 0.7}
                      C ${centerX} ${centerY + heartSize * 0.5} ${centerX - heartSize} ${centerY - heartSize * 0.5} ${centerX - heartSize} ${centerY - heartSize * 0.5}
                      C ${centerX - heartSize} ${centerY - heartSize} ${centerX} ${centerY - heartSize} ${centerX} ${centerY - heartSize * 0.5}
                      C ${centerX} ${centerY - heartSize} ${centerX + heartSize} ${centerY - heartSize} ${centerX + heartSize} ${centerY - heartSize * 0.5}
                      C ${centerX + heartSize} ${centerY - heartSize * 0.5} ${centerX} ${centerY + heartSize * 0.5} ${centerX} ${centerY + heartSize * 0.7}
                      Z" fill="${bgColor}" />
                  </svg>
                `;
                break;
                
              case 'hexagon':
                let hexPoints = '';
                for (let i = 0; i < 6; i++) {
                  const angle = (Math.PI / 3) * i;
                  const x = centerX + size * Math.cos(angle);
                  const y = centerY + size * Math.sin(angle);
                  hexPoints += `${x},${y} `;
                }
                
                bgSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="${hexPoints}" fill="${bgColor}" />
                  </svg>
                `;
                break;
                
              default:
                // Default to circle if shape is not recognized
                bgSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="${bgColor}" />
                  </svg>
                `;
            }
            
            // Create a background image with the background color
            const bgBuffer = Buffer.from(bgSvg);
            const bgImage = await sharp(bgBuffer).toBuffer();
            
            // Get the current image buffer
            const currentImageBuffer = await image.toBuffer();
            
            // Create a new transparent image
            const transparentImage = await sharp({
              create: {
                width: width,
                height: height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
              }
            }).toBuffer();
            
            // Composite the background first, then the masked image on top
            const compositeBuffer = await sharp(transparentImage)
              .composite([
                {
                  input: bgImage,
                  blend: 'over'
                },
                {
                  input: currentImageBuffer,
                  blend: 'over'
                }
              ])
              .toBuffer();
              
            // Create a new sharp instance with the composited image
            image = sharp(compositeBuffer);
          }
          
          // If border is specified, add it
          if (hasBorder) {
            let borderSvg = '';
            
            switch (shape) {
              case 'circle':
                borderSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="none" stroke="${borderColor}" stroke-width="${borderSize}" />
                  </svg>
                `;
                break;
                
              case 'star':
                let starPoints = '';
                for (let i = 0; i < 10; i++) {
                  const r = i % 2 === 0 ? outerRadius : innerRadius;
                  const angle = Math.PI * i / 5;
                  const x = centerX + r * Math.sin(angle);
                  const y = centerY - r * Math.cos(angle);
                  starPoints += `${x},${y} `;
                }
                
                borderSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="${starPoints}" fill="none" stroke="${borderColor}" stroke-width="${borderSize}" />
                  </svg>
                `;
                break;
                
              case 'heart':
                borderSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <path d="
                      M ${centerX} ${centerY + heartSize * 0.7}
                      C ${centerX} ${centerY + heartSize * 0.5} ${centerX - heartSize} ${centerY - heartSize * 0.5} ${centerX - heartSize} ${centerY - heartSize * 0.5}
                      C ${centerX - heartSize} ${centerY - heartSize} ${centerX} ${centerY - heartSize} ${centerX} ${centerY - heartSize * 0.5}
                      C ${centerX} ${centerY - heartSize} ${centerX + heartSize} ${centerY - heartSize} ${centerX + heartSize} ${centerY - heartSize * 0.5}
                      C ${centerX + heartSize} ${centerY - heartSize * 0.5} ${centerX} ${centerY + heartSize * 0.5} ${centerX} ${centerY + heartSize * 0.7}
                      Z" fill="none" stroke="${borderColor}" stroke-width="${borderSize}" />
                  </svg>
                `;
                break;
                
              case 'hexagon':
                let hexBorderPoints = '';
                for (let i = 0; i < 6; i++) {
                  const angle = (Math.PI / 3) * i;
                  const x = centerX + size * Math.cos(angle);
                  const y = centerY + size * Math.sin(angle);
                  hexBorderPoints += `${x},${y} `;
                }
                
                borderSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="${hexBorderPoints}" fill="none" stroke="${borderColor}" stroke-width="${borderSize}" />
                  </svg>
                `;
                break;
                
              default:
                // Default to circle if shape is not recognized
                borderSvg = `
                  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="${centerX}" cy="${centerY}" r="${size}" fill="none" stroke="${borderColor}" stroke-width="${borderSize}" />
                  </svg>
                `;
            }
            
            const borderBuffer = Buffer.from(borderSvg);
            
            // Get the current image buffer
            const currentImageBuffer = await image.toBuffer();
            
            // Add the border on top of the masked image
            const borderedBuffer = await sharp(currentImageBuffer)
              .composite([
                {
                  input: borderBuffer,
                  blend: 'over'
                }
              ])
              .toBuffer();
              
            // Create a new sharp instance with the bordered image
            image = sharp(borderedBuffer);
          }
          
          
        } catch (error) {
          console.error(`Error applying mask to element ${element.id}:`, error);
          // Continue with the original image if masking fails
        }
      }
  
      const bufferInfo = await image.toBuffer({ resolveWithObject: true });
  
      // Calculate position
      const { finalLeft, finalTop } = this.calculateElementPosition(element, generator, elementsData, bufferInfo);
  
      const calculatedData = {
        left: Math.round(finalLeft),
        top: Math.round(finalTop),
        width: bufferInfo.info.width,
        height: bufferInfo.info.height
      };
  
      return {
        type: 'composite',
        data: {
          input: bufferInfo.data,
          top: calculatedData.top,
          left: calculatedData.left
        },
        elementsData: calculatedData
      };
  
    } catch (imgError) {
      console.error(`Error processing image element ${element.id} (${element.src}):`, imgError);
      return null;
    }
  }
  
  async processTextElement(element, generator, elementsData) {
    if (!element.text) {
      console.warn(`Skipping text element ${element.id}: Missing 'text'.`);
      return null;
    }
    console.log(`Processing text element: ${element.id}`);
  
    const fontFamily = element.fontFamily || 'Arial';
    const fontSize = element.fontSize || '30px';
    const fontWeight = element.fontWeight || 'normal';
    const fontStyle = element.fontStyle || 'normal';
    const fill = element.color || '#000000';
    const rotation = element.rotation || 0;
  
    // --- Text Position Calculation ---
    let baseX = 0, baseY = 0;
    let textAnchor = 'start'; // Default SVG text-anchor
    let alignmentBaseline = 'auto'; // Default SVG alignment-baseline. 'hanging' might be better for origin: null
  
      if (element.origin === 'center') {
      baseX = generator.imageWidth / 2;
      baseY = generator.imageHeight / 2;
      textAnchor = 'middle'; // Center horizontally for center origin
      if (element.y === null) alignmentBaseline = 'middle'; // Center vertically if y is null (approximate)
    } else if (element.origin && elementsData[element.origin]) { // Check if origin exists and is processed
      const originElement = elementsData[element.origin];
      baseX = originElement.left; // Relative to origin element's top-left
      baseY = originElement.top;
      // Add logic for centering relative to origin element if needed
    } else {
      // Origin is null or invalid, use top-left of image as base
      // Use 'hanging' baseline for more predictable positioning from top
      alignmentBaseline = 'hanging';
    }
  
    // x and y are offsets from the calculated base origin
    // For origin: null, x/y are direct coordinates from top-left
    const xPos = baseX + (element.x || 0);
    const yPos = baseY + (element.y || 0);
  
    const transform = rotation ? `rotate(${rotation}, ${xPos}, ${yPos})` : '';
  
    // Store calculated position (approximated for text)
    // Note: actual width/height of rendered text isn't easily known here without complex text measurement
    const calculatedData = { left: xPos, top: yPos, width: 0, height: 0 }; // Mark as processed
    
    // Shadow effect
    let shadowFilter = '';
    let filterId = '';
    if (element.shadow) {
      filterId = `shadow-${element.id}`;
      const shadowColor = element.shadow.color || 'black';
      const shadowOffsetX = element.shadow.offsetX || 2;
      const shadowOffsetY = element.shadow.offsetY || 2;
      const shadowBlur = element.shadow.blur || 5;
      
      shadowFilter = `
        <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="${shadowOffsetX}" dy="${shadowOffsetY}" stdDeviation="${shadowBlur}" flood-color="${shadowColor}" flood-opacity="0.5"/>
        </filter>
      `;
    }
    
    // Process text content - handle HTML tags
    let textContent = element.text;
    let hasHtmlTags = /<[^>]+>/.test(textContent);
    let textElement = '';
    
    // Curved text
    if (element.curve) {
      // Create a curved path for the text to follow
      const radius = element.curve.radius || 200;
      const startAngle = element.curve.startAngle || -30;
      const endAngle = element.curve.endAngle || 30;
      
      // Calculate the path for the text to follow
      const pathId = `textPath-${element.id}`;
      const centerX = xPos;
      const centerY = yPos - radius; // Position the center of the arc above the text position
      
      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calculate start and end points
      const startX = centerX + radius * Math.cos(startRad);
      const startY = centerY + radius * Math.sin(startRad);
      const endX = centerX + radius * Math.cos(endRad);
      const endY = centerY + radius * Math.sin(endRad);
      
      // Create the path
      const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
      const pathData = `M ${startX},${startY} A ${radius},${radius} 0 ${largeArcFlag},1 ${endX},${endY}`;
      
      // For curved text, we can't easily support HTML tags, so escape them
      const escapedText = hasHtmlTags ? textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') : textContent;
      
      // Create the text element with textPath
      textElement = `
        <defs>
          ${shadowFilter}
          <path id="${pathId}" d="${pathData}" />
        </defs>
        <text font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${fill}" ${element.shadow ? `filter="url(#${filterId})"` : ''}>
          <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escapedText}</textPath>
        </text>
      `;
    } else {
      // Regular text - handle HTML tags like <br>
      if (hasHtmlTags) {
        // Handle <br> tags for line breaks
        const lines = textContent.split(/<br\s*\/?>/i);
        const lineHeight = parseInt(fontSize) * 1.2; // Approximate line height
        
        textElement = `
          ${shadowFilter ? `<defs>${shadowFilter}</defs>` : ''}
          <text x="${xPos}" y="${yPos}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${fill}" text-anchor="${textAnchor}" alignment-baseline="${alignmentBaseline}" transform="${transform}" ${element.shadow ? `filter="url(#${filterId})"` : ''}>
        `;
        
        lines.forEach((line, index) => {
          // Escape any remaining HTML tags in each line
          const escapedLine = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const dy = index === 0 ? '0' : `${lineHeight}`;
          textElement += `<tspan x="${xPos}" dy="${dy}" text-anchor="${textAnchor}">${escapedLine}</tspan>`;
        });
        
        textElement += `</text>`;
      } else {
        // No HTML tags, just regular text
        textElement = `
          ${shadowFilter ? `<defs>${shadowFilter}</defs>` : ''}
          <text x="${xPos}" y="${yPos}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${fill}" text-anchor="${textAnchor}" alignment-baseline="${alignmentBaseline}" transform="${transform}" ${element.shadow ? `filter="url(#${filterId})"` : ''}>${textContent}</text>
        `;
      }
    }
  
    return {
      type: 'svg',
      data: textElement,
      elementsData: calculatedData
    };
  }
  
  async processElement(element, generator, elementsData) {
    if (element.type === 'image') {
      return await this.processImageElement(element, generator, elementsData);
    } else if (element.type === 'text') {
      return await this.processTextElement(element, generator, elementsData);
    }
    return null;
  }

  resizeImage = async (image, element) => {
    const metadata = await image.metadata();
  
      // Calculate resize dimensions
      let targetWidth = element.width;
      let targetHeight = element.height;
      if (targetWidth === null && targetHeight !== null) {
        targetWidth = Math.round(metadata.width * (targetHeight / metadata.height));
      } else if (targetHeight === null && targetWidth !== null) {
        targetHeight = Math.round(metadata.height * (targetWidth / metadata.width));
      } else if (targetHeight === null && targetWidth === null) {
        // Should not happen based on earlier check, but safety first
        targetWidth = metadata.width;
        targetHeight = metadata.height;
      }
  
      return image.resize(targetWidth, targetHeight, { fit: 'inside' });
  }

  async trimImage(inputBuffer) {
    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata(); // Optional: to see original dimensions
  
      console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);
  
      // Trim transparent edges
      // You can adjust the threshold if needed.
      // A threshold of 0 typically means fully transparent.
      // The default behavior often works well for transparency.
      const trimmedImageBuffer = await image
        .trim() // Or .trim({ threshold: 10 }) for example
        .toBuffer();
  
      const trimmedMetadata = await sharp(trimmedImageBuffer).metadata();
      console.log(`Trimmed dimensions: ${trimmedMetadata.width}x${trimmedMetadata.height}`);
  
      // Now you can save or use trimmedImageBuffer
      // await sharp(trimmedImageBuffer).toFile('trimmed_image.png');
  
      return trimmedImageBuffer;
    } catch (error) {
      console.error('Error trimming image:', error);
    }
  }
}

export default BaseGenerator;
