# Arcade artwork

## Delivered assets

- `public/arcade/jia-poses.webp` — 751,076 bytes, 1536×1024 RGBA.
- `public/arcade/ryan-poses.webp` — 633,022 bytes, 1536×1024 RGBA.

Prepared with the built-in image-generation tool from the user's supplied pose sheets and female T-pose. The female hurt pose was added because it was absent from the references. These are generated adaptations, not pixel-identical cutouts. Each has T-pose, guard, punch, jump, hurt and fall. The final atlases contain genuine alpha; hidden RGB in transparent pixels is not a grey/colored backdrop. WebP conversion is lossless, without resizing or alpha removal. Only these two final assets ship; reference sheets and intermediate PNGs are not copied to public.

Frame rectangles, pivots and two outline clips that exclude neighboring sprites are in `lib/fighter-sprites.ts`. Right/left directions reuse the same frames through a canvas transform. No run-time image generation or AI services are used.

## Final prompt set (built-in tool mode)

### Ryan

Use the FIRST of the three most recently displayed reference images (male six-pose sheet). Ignore the female references. Use case: background-extraction. Asset type: production 2D boxing-game sprite atlas. Edit target: supplied male six-pose sheet. Remove the grey background, all floor shadows and motion streaks, leaving genuinely transparent alpha. Preserve the exact young adult man's face, hairstyle, black hoodie and joggers, red gloves, white sneakers and illustrated shading. Repack his same six poses into a clean equal 3-column by 2-row grid: top row front T-pose, facing-right guard/ready, facing-right straight punch; bottom row facing-right tucked jump, facing-right hunched hurt clutching abdomen, fallen backward on floor. Keep each complete figure entirely inside its own cell with generous transparent padding and no overlapping cells, no cropped gloves or shoes. Same anatomy, consistent character scale across poses (jump/fall naturally shorter than standing), no text, no labels, no borders, no background, no cast shadows. Wide landscape high resolution atlas.

### Jia

Use the SECOND and THIRD of the three most recently displayed references (female action sheet and female T-pose). Ignore the male reference. Use case: identity-preserve. Asset type: production 2D boxing-game sprite atlas. Input 1 is the exact young adult female fighter action-pose artwork to preserve; input 2 supplies her exact front T-pose. Create a genuine transparent-alpha sprite sheet in an equal 3-column by 2-row grid. Top row: front T-pose from input2, right-facing guard/ready from input1, right-facing straight punch from input1. Bottom row: right-facing tucked jump from input1, NEW right-facing hurt reaction hunched forward clutching abdomen with red gloves and bent knees (brief non-graphic sports reaction), fallen backward on floor from input1. Preserve the same adult woman's face, long light-brown hair, white short-sleeve buttoned crop shirt, grey pleated skirt, red gloves with white cuffs, white socks and sneakers, and the original anime illustration shading. Each complete figure must sit entirely inside its own cell with generous transparent padding, no cropped gloves or shoes, no overlap. Same consistent anatomy/character scale (jump and fall naturally shorter than standing). Remove all grey background, floor shadows and motion lines. No text, labels, borders, background or extra objects. Wide landscape high-resolution atlas.

