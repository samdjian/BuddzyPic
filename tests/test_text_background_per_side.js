import { handler } from '../index.mjs';
import fs from 'fs';

const event = {
  shouldReturnAsBase64: true,
  generator: 'generic',
  region: 'eu-west-3',
  outName: 'tests/text-bg-per-side.png',
  params: {
    imageWidth: 400,
    imageHeight: 200,
    background: null,
    defaultBackground: { r: 255, g: 255, b: 255, alpha: 1 },
    elements: [
      {
        id: 'text-bg',
        type: 'text',
        text: 'Corners',
        fontFamily: 'sans-serif',
        fontSize: '40px',
        fontWeight: 'bold',
        color: '#333333',
        origin: 'center',
        x: 0,
        y: 0,
        background: '#ccffcc',
        backgroundCornerRadius: '10 20 30 40',
        backgroundPadding: { top: 10, right: 20, bottom: 5, left: 15 }
      }
    ]
  }
};

(async () => {
  try {
    const result = await handler(event);
    if (result.statusCode === 200 && result.isBase64Encoded) {
      fs.writeFileSync('./outputs/test_text_background_per_side.png', Buffer.from(result.body, 'base64'));
      console.log('Advanced text background test saved as ./outputs/test_text_background_per_side.png');
    } else {
      console.error('Advanced text background test failed:', result);
    }
  } catch (err) {
    console.error('Error running advanced text background test:', err);
  }
})();
