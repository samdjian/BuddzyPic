# remove BG:

```bash
node --env-file=.env .\removebg.js
```

this will generate an `outputs/no_bg.png` file with a transparent background.

## Preparing an avatar:

```bash
node .\invoke_avatar.mjs
```

This will generate an `outputs/output-avatar.png` file with a transparent background, 1024x1024px, nicely positioned.

## Running the lambda function:

```bash
node .\invoke.mjs
```

This will invoke the lambda function locally and generate an `outputs/output-generic.png` file.

## Feature Examples:

```bash
node .\invoke_examples.mjs
```

This will generate an `outputs/feature-examples.png` file showcasing all the available features:
- Image masks (circle, star, heart, hexagon) with customizable borders and backgrounds
- Text shadows with customizable color, offset, and blur
- Curved text with customizable radius and angles
- HTML tag support for text elements (specifically `<br>` for line breaks)



## Generators functionnalities

*   Generators should be able to be called with a single function call.
*   If no background is provided, the generator should use a white background.
*   Generators receive a JSON object as parameter, with the following properties:
    *   `imageWidth`: The width of the image to generate. (optional, default is 800)
    *   `imageHeight`: The height of the image to generate. (optional, default is 1422)
    *   `background`: The path to the background image. (optional, default is null)
    *   `elements`: An array of elements to include in the image. They can be images or text.
        *   `id`: The id of the element. Unique string.
        *   `x`: The x position of the element. Can be a number or null, meaning the element will be centered horizontally relative to the origin.
        *   `y`: The y position of the element. Can be a number or null, meaning the element will be centered vertically relative to the origin.
        *   `origin`: The origin of the element. Can be `center` or another element id. If null, the element will be positioned relative to the top left corner of the image.
        *   `width`: The width of the element. Can be a number or null, meaning the element will keep its aspect ratio relative to the height. One of width or height must be provided.
        *   `height`: The height of the element. Can be a number or null, meaning the element will keep its aspect ratio relative to the width. One of width or height must be provided.
        *   `rotation`: The rotation of the element. Can be a number or null, meaning the element will not be rotated.
        *   `type`: The type of element. Can be `image` or `text`.
            If type is `image`, the element will be an image and have the following properties:
            *   `src`: The path to the image file. Can be a relative path to the assets folder, an absolute path or a URL. Required.
            *   `mask`: Object containing mask properties for the image. Optional.
                *   `shape`: The shape of the mask. Can be `circle`, `star`, `heart`, or `hexagon`. Optional, default is `circle`.
                *   `border`: Object containing border properties for the mask. Optional.
                    *   `color`: The color of the border. Optional, default is '#000000'.
                    *   `size`: The size of the border in pixels. Optional, default is 5.
                *   `background`, `backgroundColor`, or `background-color`: Background color to place behind the masked image. Optional.
            *   `background`: Background color can also be specified at the element level. Optional.
            
            If type is `text`, the element will be a text and have the following properties:
            *   `text`: The text to display. Can include HTML tags like `<br>` for line breaks.
            *   `fontFamily`: The font family of the text.
            *   `fontStyle`: The style of the font.
            *   `fontWeight`: The weight of the font.
            *   `fontSize`: The size of the font.
            *   `color`: The color of the text.
            *   `rotation`: The rotation of the text.
            *   `background`, `backgroundColor`, or `background-color`: Background color behind the text. Optional.
            *   `backgroundCornerRadius` or `background-corner-radius`: Corner radius for the background. Optional.
            *   `backgroundPadding` or `background-padding`: Internal padding around the text when a background is used. Optional, default is 6 pixels.
            *   Backgrounds include a small internal margin and span all text lines, including those created with `<br>`.
            *   `shadow`: Object containing shadow properties. Optional.
                *   `color`: The color of the shadow. Optional, default is 'black'.
                *   `offsetX`: The horizontal offset of the shadow in pixels. Optional, default is 2.
                *   `offsetY`: The vertical offset of the shadow in pixels. Optional, default is 2.
                *   `blur`: The blur radius of the shadow in pixels. Optional, default is 5.
            *   `curve`: Object containing curve properties for curved text. Optional.
                *   `radius`: The radius of the curve in pixels. Optional, default is 200.
                *   `startAngle`: The start angle of the curve in degrees. Optional, default is -30.
                *   `endAngle`: The end angle of the curve in degrees. Optional, default is 30.
                *   Note: HTML tags are not supported in curved text.
