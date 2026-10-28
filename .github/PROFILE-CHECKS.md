# Profile link and image checks

Run with Node.js 24, without installing packages:

```sh
node --test scripts/check-profile.test.mjs
node scripts/check-profile.mjs
```

CI checks Markdown documents recursively for inline Markdown destinations and HTML `href`, `src` and every `srcset` destination. Local targets must stay inside the repository and name existing files; referenced image files must be nonempty. Tests include a missing responsive image, traversal, invalid URL encoding and an empty image.

External HTTP/HTTPS and email links are not fetched, and fragment anchors are not resolved. The checker does not decode image contents, perform visual layout validation or parse every possible Markdown extension (such as reference-style links). A successful run establishes the stated local reference checks only.
