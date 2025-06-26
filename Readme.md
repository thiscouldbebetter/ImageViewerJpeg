ImageViewerJpeg
===============

An incomplete JPEG image decoder implemented in JavaScript.


JPEG Encoding Explained
-----------------------

At a high level, the JPEG encoding algorithm works as follows:

1. The color of each pixel in an image is translated into the YCbCr color space,
in which the "Y" component represents the brightness, or "luma" of a pixel,
while the "Cb" and "Cr" components encode the hue, or "chroma" of the pixel.

2. In some images, groups of neighboring chroma pixels (usually in 2 x 2 blocks)
are averaged together, and only the average chroma of each group is stored.
This reduces the number of chroma pixels that need to be encoded,
at the expense of lowering the color resolution somewhat.
This exploits the fact that human vision is much more sensitive
to changes in brightness than to changes in color, so most observers won't notice.

3. For each of the three color components (Y, Cb, and Cr),
the image is split into 8 x 8 blocks of pixels.

4. Within each block, each pixel is converted from the spatial domain
to the frequency domain using the discrete cosine transform,
a variant of the Fourier transform. After this transformation,
the data will still be in a 8 x 8 block of numbers,
but each entry in this block will represent not a pixel color component
but a particular frequency component of the block as a whole.
The number in the upper-left corner of the block represents a frequency of 0.
Numbers further to the right represent successively higher frequencies
along the x-axis, while numbers further toward the bottom
represent successively higher frequencies along the y-axis.
(Yes, it's a strange concept to grasp, and better explanations may be possible.)

5. Each "pixel" in the frequency-domain representation of the blocks is "quantized".
Quantization is basically just rounding. Since human vision is more sensitive
to certain visual frequencies than others, however, certain frequency components
of the image can be rounded to greater or lesser precision than others
without an unacceptable loss of image quality. The precision to which
different frequency components in an 8 x 8 block are rounded
is stored in an 8 x 8 quantization table, which is in turn stored
in the JPEG file's headers. Since information is irreversably lost
in this rounding, quantization is the "lossy" part of the compression algorithm.

6. The "pixels" in each block are concatenated into a sequence of bits,
starting with the upper-left and proceeding in a diagonal "zigzag" order
to the lower-right corner. The zigzag order is used instead of the more
intuitive row-by-row order in order to enable better compression
by storing neighboring, and presumably similar, pixels nearer to one another.
The resulting sequence of bits is then encoded using a Huffman compression,
in which the most frequent patterns of bits are replaced with the shortest
"codes" of bits, with the length of the codes increasing as the frequency
of the encoded pattern decreases. This results in a significant reduction
in the number of bits that need to be stored. These Huffman code tables 
functionally, a tree structure) are stored as part of the JPEG file's headers.

Decoding is the opposite of encoding, except that there's no way to reverse
the rounding that was done during the quantization phase, so that step is skipped.

This decoder doesn't actually work as of this writing, even with very simple images.
It is being published now as a foundation for possible further work in the future.
