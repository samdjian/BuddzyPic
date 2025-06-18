import { handler } from './index.mjs';
import fs from 'fs';

const outName = `users/1/shared/1/20250430120000.png`;
const event = {
    "shouldReturnAsBase64": true,
    "generator": "generic",
    "region": "eu-west-3",
    "outName": outName,
    "params": {
        "imageWidth": 1080,
        "imageHeight": 1980,
        "background": 'assets/BGBestFriend.webp', // Using null for white background
        "defaultBackground": { "r": 255, "g": 255, "b": 255, "alpha": 1 },
        "elements": [
            {
                "id": "avatar",
                "type": "image",
                "src": "assets/avatar.webp",
                "width": 500,
                "height": null,
                "origin": "center",
                "x": 0,
                "y": -200,
                "mask": {
                    "shape": "circle",
                    "border": {
                        "color": "#3498db",
                        "size": 5
                    },
                    "background-color": "#000"
                }
            },
            {
                "id": "name",
                "type": "text",
                "text": "Sam<br> Djian",
                "fontFamily": "sans-serif",
                "fontSize": "48px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "center",
                "x": 0,
                "y": 300,
                "shadow": {
                    "color": "rgba(0,0,0,0.3)",
                    "offsetX": 2,
                    "offsetY": 2,
                    "blur": 4
                },
                "background-color": "#ffff99",
                "backgroundCornerRadius": 15
            }
        ]
    }
};


// --- Invocation Logic --- Slightly modified to save with specific name
(async () => {
  try {
    console.log("Invoking handler with event:", JSON.stringify(event, null, 2)); // Log the event clearly
    const result = await handler(event);
    console.log('Handler result status:', result.statusCode);

    if (result.statusCode === 200 && result.isBase64Encoded) {
      const outputPath = './outputs/output.png'; // Save with specific name
      fs.writeFileSync(outputPath, Buffer.from(result.body, 'base64'));
      console.log(`Image saved as ${outputPath}`);
    } else {
       console.error('Handler failed or did not return base64 image. Body:', result.body);
    }

  } catch (error) {
    console.error('Error calling handler:', error);
  }
})();
