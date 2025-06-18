import { handler } from './index.mjs';
import fs from 'fs';

const outName = `users/1/shared/1/examples.png`;
const event = {
    "shouldReturnAsBase64": true,
    "generator": "generic",
    "region": "eu-west-3",
    "outName": outName,
    "params": {
        "imageWidth": 1200,
        "imageHeight": 1200,
        "background": null,
        "defaultBackground": { "r": 240, "g": 240, "b": 240, "alpha": 1 },
        "elements": [
            {
                "id": "title",
                "type": "text",
                "text": "Feature Examples",
                "fontFamily": "sans-serif",
                "fontSize": "60px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "center",
                "x": 0,
                "y": -500,
                "shadow": {
                    "color": "rgba(0,0,0,0.3)",
                    "offsetX": 3,
                    "offsetY": 3,
                    "blur": 5
                }
            },
            
            // Image Mask Examples Section
            {
                "id": "masks-title",
                "type": "text",
                "text": "Image Mask Examples",
                "fontFamily": "sans-serif",
                "fontSize": "40px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "center",
                "x": 0,
                "y": -400
            },
            {
                "id": "circle-mask",
                "type": "image",
                "src": "assets/avatar.webp",
                "width": 150,
                "height": null,
                "origin": "center",
                "x": -400,
                "y": -300,
                "mask": {
                    "shape": "circle",
                    "border": {
                        "color": "#3498db",
                        "size": 8
                    }
                },
                "background": "#ffffff"
            },
            {
                "id": "circle-label",
                "type": "text",
                "text": "Circle",
                "fontFamily": "sans-serif",
                "fontSize": "20px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "circle-mask",
                "x": 0,
                "y": 100
            },
            {
                "id": "star-mask",
                "type": "image",
                "src": "assets/avatar.webp",
                "width": 150,
                "height": null,
                "origin": "center",
                "x": -150,
                "y": -300,
                "mask": {
                    "shape": "star",
                    "border": {
                        "color": "#e74c3c",
                        "size": 8
                    }
                },
                "background": "#ffffff"
            },
            {
                "id": "star-label",
                "type": "text",
                "text": "Star",
                "fontFamily": "sans-serif",
                "fontSize": "20px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "star-mask",
                "x": 0,
                "y": 100
            },
            {
                "id": "heart-mask",
                "type": "image",
                "src": "assets/avatar.webp",
                "width": 150,
                "height": null,
                "origin": "center",
                "x": 150,
                "y": -300,
                "mask": {
                    "shape": "heart",
                    "border": {
                        "color": "#e84393",
                        "size": 8
                    }
                },
                "background": "#ffffff"
            },
            {
                "id": "heart-label",
                "type": "text",
                "text": "Heart",
                "fontFamily": "sans-serif",
                "fontSize": "20px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "heart-mask",
                "x": 0,
                "y": 100
            },
            {
                "id": "hexagon-mask",
                "type": "image",
                "src": "assets/avatar.webp",
                "width": 150,
                "height": null,
                "origin": "center",
                "x": 400,
                "y": -300,
                "mask": {
                    "shape": "hexagon",
                    "border": {
                        "color": "#2ecc71",
                        "size": 8
                    }
                },
                "background": "#ffffff"
            },
            {
                "id": "hexagon-label",
                "type": "text",
                "text": "Hexagon",
                "fontFamily": "sans-serif",
                "fontSize": "20px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "hexagon-mask",
                "x": 0,
                "y": 100
            },
            
            // Text Shadow Examples Section
            {
                "id": "shadows-title",
                "type": "text",
                "text": "Text Shadow Examples",
                "fontFamily": "sans-serif",
                "fontSize": "40px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "center",
                "x": 0,
                "y": -100
            },
            {
                "id": "shadow-example1",
                "type": "text",
                "text": "Black Shadow",
                "fontFamily": "sans-serif",
                "fontSize": "30px",
                "fontWeight": "bold",
                "color": "#3498db",
                "origin": "center",
                "x": -300,
                "y": 0,
                "shadow": {
                    "color": "#000000",
                    "offsetX": 4,
                    "offsetY": 4,
                    "blur": 5
                }
            },
            {
                "id": "shadow-example2",
                "type": "text",
                "text": "Red Shadow",
                "fontFamily": "sans-serif",
                "fontSize": "30px",
                "fontWeight": "bold",
                "color": "#2ecc71",
                "origin": "center",
                "x": 0,
                "y": 0,
                "shadow": {
                    "color": "#e74c3c",
                    "offsetX": 4,
                    "offsetY": 4,
                    "blur": 5
                }
            },
            {
                "id": "shadow-example3",
                "type": "text",
                "text": "Blurred Shadow",
                "fontFamily": "sans-serif",
                "fontSize": "30px",
                "fontWeight": "bold",
                "color": "#9b59b6",
                "origin": "center",
                "x": 300,
                "y": 0,
                "shadow": {
                    "color": "rgba(0,0,0,0.5)",
                    "offsetX": 2,
                    "offsetY": 2,
                    "blur": 10
                }
            },
            
            // Curved Text Examples Section
            {
                "id": "curves-title",
                "type": "text",
                "text": "Curved Text Examples",
                "fontFamily": "sans-serif",
                "fontSize": "40px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "center",
                "x": 0,
                "y": 100
            },
            {
                "id": "curve-example1",
                "type": "text",
                "text": "CURVED TEXT EXAMPLE 1",
                "fontFamily": "sans-serif",
                "fontSize": "30px",
                "fontWeight": "bold",
                "color": "#e74c3c",
                "origin": "center",
                "x": -300,
                "y": 200,
                "curve": {
                    "radius": 200,
                    "startAngle": -30,
                    "endAngle": 30
                }
            },
            {
                "id": "curve-example2",
                "type": "text",
                "text": "CURVED TEXT EXAMPLE 2",
                "fontFamily": "sans-serif",
                "fontSize": "30px",
                "fontWeight": "bold",
                "color": "#3498db",
                "origin": "center",
                "x": 300,
                "y": 200,
                "curve": {
                    "radius": 200,
                    "startAngle": -60,
                    "endAngle": 60
                }
            },
            {
                "id": "curve-shadow-example",
                "type": "text",
                "text": "CURVED TEXT WITH SHADOW",
                "fontFamily": "sans-serif",
                "fontSize": "30px",
                "fontWeight": "bold",
                "color": "#2ecc71",
                "origin": "center",
                "x": 0,
                "y": 300,
                "shadow": {
                    "color": "rgba(0,0,0,0.5)",
                    "offsetX": 3,
                    "offsetY": 3,
                    "blur": 5
                },
                "curve": {
                    "radius": 250,
                    "startAngle": -40,
                    "endAngle": 40
                }
            },
            
            // HTML in Text Example Section
            {
                "id": "html-title",
                "type": "text",
                "text": "HTML in Text Example",
                "fontFamily": "sans-serif",
                "fontSize": "40px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "center",
                "x": 0,
                "y": 400
            },
            {
                "id": "html-example",
                "type": "text",
                "text": "Sam is my <br> best friend",
                "fontFamily": "sans-serif",
                "fontSize": "40px",
                "fontWeight": "bold",
                "color": "#e74c3c",
                "origin": "center",
                "x": 0,
                "y": 500,
                "shadow": {
                    "color": "rgba(0,0,0,0.5)",
                    "offsetX": 2,
                    "offsetY": 2,
                    "blur": 3
                }
            },
            {
                "id": "bg-text-example",
                "type": "text",
                "text": "Background<br>Text",
                "fontFamily": "sans-serif",
                "fontSize": "40px",
                "fontWeight": "bold",
                "color": "#333333",
                "origin": "center",
                "x": 0,
                "y": 650,
                "background-color": "#ffff99",
                "backgroundCornerRadius": 20
            }
        ]
    }
};

// --- Invocation Logic ---
(async () => {
  try {
    console.log("Invoking handler with event:", JSON.stringify(event, null, 2));
    const result = await handler(event);
    console.log('Handler result status:', result.statusCode);

    if (result.statusCode === 200 && result.isBase64Encoded) {
      const outputPath = './outputs/feature-examples.png';
      fs.writeFileSync(outputPath, Buffer.from(result.body, 'base64'));
      console.log(`Image saved as ${outputPath}`);
    } else {
       console.error('Handler failed or did not return base64 image. Body:', result.body);
    }

  } catch (error) {
    console.error('Error calling handler:', error);
  }
})();
