import { handler } from '../index.mjs';
import fs from 'fs';

const event = {
  shouldReturnAsBase64: true,
  generator: 'generic',
  region: 'eu-west-3',
  outName: 'tests/text-bg.png',
  params: {
    imageWidth: 400,
    imageHeight: 200,
    background: null,
    defaultBackground: { r: 255, g: 255, b: 255, alpha: 1 },
    elements: [
      {
        id: 'text-bg',
        type: 'text',
        text: 'Hello World',
        fontFamily: 'sans-serif',
        fontSize: '40px',
        fontWeight: 'bold',
        color: '#333333',
        origin: 'center',
        x: 0,
        y: 0,
        'background-color': '#ffff99',
        backgroundCornerRadius: 20,
        backgroundPadding: 8
      }
    ]
  }
};

(async () => {
  try {
    const result = await handler(event);
    if (result.statusCode === 200 && result.isBase64Encoded) {
      fs.writeFileSync('./outputs/test_text_background.png', Buffer.from(result.body, 'base64'));
      console.log('Text background test image saved as ./outputs/test_text_background.png');
    } else {
      console.error('Text background test failed:', result);
    }
  } catch (err) {
    console.error('Error running text background test:', err);
  }
})();
