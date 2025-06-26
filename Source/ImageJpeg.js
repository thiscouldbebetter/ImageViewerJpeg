
class ImageJpeg
{
	constructor(name, frames)
	{
		this.name = name;
		this.frames = frames;
	}

	// static methods

	static fromBitStream(stream)
	{
		// todo

		var sizeInPixels = new Coords(8, 8); // todo

		var pixels = [];

		for (var y = 0; y < sizeInPixels.y; y++)
		for (var x = 0; x < sizeInPixels.x; x++)
		{
			var pixelIndex = y * sizeInPixels.x + x;
			var pixel = 0; // todo
			pixels[pixelIndex] = pixel;
		}

		var frames = [];
		var huffmanTrees = [];
		var quantizationTables = [];

		var frameCurrent = null;

		var jpegIdentifier = stream.readBytesAsInteger(2);

		if (jpegIdentifier != 0xFFD8)
		{
			throw "Not a JPEG file.";
		}

		var segments = []; // Informational only.

		while (stream.hasMoreBits() == true)
		{
			var segmentMarker = stream.readByte();
			if (segmentMarker != 0xFF)
			{
				throw "Expected a segment marker (0xFF), but read: " + segmentMarker;
			}

			var segmentType = stream.readByte();

			if (segmentType == 0xC0) // 192
			{
				// start of frame - baseline DCT
				var payloadLengthInBytes = stream.readBytesAsInteger(2) - 2;
				var payloadAsBytes = stream.readBytes(payloadLengthInBytes);
				var frameHeaderAsStream = new BitStream(payloadAsBytes);
				ImageJpeg.fromBitStream_Segment_StartOfFrame
				(
					frameHeaderAsStream, frames
				);
				frameCurrent = frames[frames.length - 1];
			}
			else if (segmentType == 0xC2) // 194
			{
				// start of frame - progressive DCT
				var payloadLengthInBytes = stream.readBytesAsInteger(2) - 2;
				var payloadAsBytes = stream.readBytes(payloadLengthInBytes);
			}
			else if (segmentType == 0xC4) // 196
			{
				// define Huffman tables
				var payloadLengthInBytes = stream.readBytesAsInteger(2) - 2;
				var payloadAsBytes = stream.readBytes(payloadLengthInBytes);
				var payloadAsStream = new BitStream(payloadAsBytes);
				ImageJpeg.fromBitStream_Segment_HuffmanTree
				(
					payloadAsStream, huffmanTrees
				);
			}
			else if (segmentType >= 0xD0 && segmentType <= 0xD7) // 208-215
			{
				// restart
				// no payload
			}
			else if (segmentType == 0xD8) // 216
			{
				// start of image
				// no payload
			}
			else if (segmentType == 0xD9) // 217
			{
				// end of image
				// no payload
				break;
			}
			else if (segmentType == 0xDA) // 218
			{
				// start of scan
				var payloadLengthInBytes = stream.readBytesAsInteger(2) - 2;
				var payloadAsBytes = stream.readBytes(payloadLengthInBytes);

				var payloadAsStream = new BitStream(payloadAsBytes);
				// Not sure what these do...
				var mysteryBytes = payloadAsStream.readBytes(payloadLengthInBytes);

				var returnValues1 = ImageJpeg.fromBitStream_Segment_Scan
				(
					stream,
					huffmanTrees,
					quantizationTables,
					frameCurrent
				);
			}
			else if (segmentType == 0xDB) // 219
			{
				// define quantization tables
				var payloadLengthInBytes = stream.readBytesAsInteger(2) - 2;
				var payloadAsBytes = stream.readBytes(payloadLengthInBytes);
				var payloadAsStream = new BitStream(payloadAsBytes);
				quantizationTables = ImageJpeg.fromBitStream_Segment_QuantizationTable
				(
					payloadAsStream, quantizationTables
				);
			}
			else if (segmentType == 0xDD) // 221
			{
				// define restart interval
				var payloadLengthInBytes = stream.readBytesAsInteger(2) - 2;
				if (payloadLengthInBytes != 4)
				{
					throw "Invalid length for define restart interval segment."
				}
				var payloadAsBytes = stream.readBytes(payloadLengthInBytes);
			}
			else if (segmentType >= 0xE0 && segmentType <= 0xEF) // 224-239
			{
				// application-specific
				var payloadLengthInBytes = stream.readBytesAsInteger(2) - 2;
				var payloadAsString = stream.readString(payloadLengthInBytes);
				segments.push(payloadAsString);
			}
			else if (segmentType == 0xFE) // 254
			{
				// text comment
				var payloadLengthInBytes = stream.readBytesAsInteger(2) - 2;
				var payloadAsString = stream.readString(payloadLengthInBytes);
				segments.push(payloadAsString);
			}
			else
			{
				throw "Unrecognized segment type: " + segmentType;
			}
		}

		var returnValue = new ImageJpeg
		(
			"todo",
			frames
		);

		return returnValue;
	}

	static fromBitStream_Segment_HuffmanTree(payloadAsStream, huffmanTrees)
	{
		while (payloadAsStream.hasMoreBits() )
		{
			var tableIndex = payloadAsStream.readByte();

			var huffmanTree = new HuffmanTreeNode("", null);
			var numbersOfHuffmanEntriesForCodeBitLengths = payloadAsStream.readBytes(16);

			for (var i = 0; i < numbersOfHuffmanEntriesForCodeBitLengths.length; i++)
			{
				var numberOfEntriesForCodeBitLength = numbersOfHuffmanEntriesForCodeBitLengths[i];

				for (var j = 0; j < numberOfEntriesForCodeBitLength; j++)
				{
					var encodedValue = payloadAsStream.readByte();
					huffmanTree.nodeNextCreate(encodedValue);
				}

				huffmanTree.nodesEmptyPopulateForCodeLength(i + 1);
			}

			//huffmanTrees[tableIndex] = huffmanTree;
			// hack - Not sure what to do here.
			huffmanTrees.push(huffmanTree);
		}
	}

	static fromBitStream_Segment_QuantizationTable
	(
		payloadAsStream, quantizationTables
	)
	{
		while (payloadAsStream.hasMoreBits() )
		{
			var header = payloadAsStream.readByte();
			var quantizationIndex = (header & 0xF);
			var quantizationTable = [];
			for (var i = 0; i < 64; i++)
			{
				var quant = payloadAsStream.readByte();
				quantizationTable[i] = quant;
			}
			quantizationTables.push(quantizationTable);
		}
		return quantizationTables;
	}

	static fromBitStream_Segment_Scan
	(
		stream,
		huffmanTrees,
		quantizationTables,
		frame
	)
	{
		var scanBytes = [];
		while (true)
		{
			var scanByte = stream.readByte();
			if (scanByte == 0xFF)
			{
				var scanByteNext = stream.readByte();
				if (scanByteNext == 0)
				{
					// Ignore the 0, as it simply indicates
					// the preceding 0xFF is scan data, 
					// rather than a new segment marker.
				}
				else
				{
					// Next segment: back up the stream.
					stream.byteIndexCurrent -= 2;
					break;
				}
			}

			scanBytes.push(scanByte);
		}

		var scanBytesAsBitStream = new BitStream(scanBytes);

		var huffmanCodeInProgress = "";
		var decodedValues = [];
		var huffmanTreeIndex = 0;
		var huffmanTree = huffmanTrees[huffmanTreeIndex];

		// There are 3 planes:
		// luma, chromaBlue, and chromaRed.

		var blocks = []; 
		var planes = [];
		var planeDCAndACs = [];

		while (scanBytesAsBitStream.hasMoreBits() == true)
		{
			var bit = scanBytesAsBitStream.readBit();
			huffmanCodeInProgress += bit;
			var encodedValue = huffmanTree.valueForCode
			(
				huffmanCodeInProgress
			);
			if (encodedValue != null)
			{
				if (planeDCAndACs.length == 0) 
				{
					var planeDC;

					if (encodedValue == 0)
					{
						planeDC = 0;
					}
					else
					{
						var bitLength = encodedValue;
						planeDC = scanBytesAsBitStream.readBitsAsIntegerSigned
						(
							bitLength
						);
					}

					planeDCAndACs.push(planeDC);
					huffmanTreeIndex += 2;
					huffmanTree = huffmanTrees[huffmanTreeIndex];
				}
				else 
				{
					// ACs
					if (encodedValue == 0)
					{
						// end of block
						// Any remaining AC components are 0.

						var numberOfCoefficientsRemaining =
							64 - planeDCAndACs.length;
						for (var a = 0; a < numberOfCoefficientsRemaining; a++)
						{
							planeDCAndACs.push(0);
						}

						planes.push(planeDCAndACs);
						planeDCAndACs = [];

						if (planes.length == 3)
						{
							blocks.push(planes);
							planes = [];
							huffmanTreeIndex = 0;
						}
						else
						{
							huffmanTreeIndex = 1;
						}

						huffmanTree = huffmanTrees[huffmanTreeIndex];
					}
					else
					{
						planeDCAndACs.push(encodedValue);
					}
				}

				huffmanCodeInProgress = "";
			}
		}

		var blockPrev = [ [0], [0], [0] ];
		var cells = [];
		var cellOffsets = 
		[
			new Coords(1, -1),
			new Coords(1, 0),
			new Coords(-1, 1),
			new Coords(0, 1),
		];
		var cellOffsetIndex = 0;
		var cellOffset = cellOffsets[cellOffsetIndex];
		var blockSizeInCells = new Coords(8, 8);
		var blockSizeInCellsMinusOnes = blockSizeInCells.clone().subtract
		(
			new Coords(1, 1)
		);
		var cellsPerBlock = blockSizeInCells.x * blockSizeInCells.y;
		var frameSizeInPixels = frame.header.sizeInPixels;
		var frameSizeInBlocks = frameSizeInPixels.clone().divide(blockSizeInCells);
		var pixels = [];

		var matrixHelper = DiscreteCosineTransformHelper;

		for (var b = 0; b < blocks.length; b++)
		{
			var block = blocks[b];
			var blockPlanes = block;

			var blockPos = new Coords
			(
				Math.floor(b / frameSizeInBlocks.x),
				b % frameSizeInBlocks.x
			);

			var blockPosInCells = blockPos.clone().multiply(blockSizeInCells);
			var cellPos = new Coords(0, 0);
			var cellPosNext = new Coords(0, 0);

			for (var p = 0; p < blockPlanes.length; p++)
			{
				var plane = blockPlanes[p];
				var planeFromBlockPrev = blockPrev[p];

				var dcDelta = plane[0];
				var dcPrev = planeFromBlockPrev[0];
				var dcAbsolute = dcPrev + dcDelta;
				plane[0] = dcAbsolute;

				var quantizationTableIndex = (p == 0 ? 0 : 1);
				var quantizationTable = quantizationTables[quantizationTableIndex];

				var planeDequantized = matrixHelper.sampleArraysMultiply
				(
					plane, 
					quantizationTable
				);

				var planeInSpatialDomain = matrixHelper.samples2DFrequencyToSpatialDomain
				(
					planeDequantized,
					blockSizeInCells
				);

				planeInSpatialDomain = matrixHelper.samplesAddValue
				(
					planeInSpatialDomain, 128 // hack
				); 

				planeInSpatialDomain = matrixHelper.samplesRound
				(
					planeInSpatialDomain
				); 
	
				for (var i = 0; i < cellsPerBlock; i++)
				{
					cellPosNext.overwriteWith
					(
						cellPos
					).add
					(
						cellOffset
					);

					if (cellPosNext.isInRange(blockSizeInCells) == false)
					{
						cellOffsetIndex++;
						cellOffset = cellOffsets[cellOffsetIndex];
						cellPosNext.overwriteWith
						(
							cellPos
						).add
						(
							cellOffset
						);	
						cellOffsetIndex++;
						cellOffsetIndex %= cellOffsets.length;
						cellOffset = cellOffsets[cellOffsetIndex];
					}

					cellPos.overwriteWith(cellPosNext);
				
					cellPos.add
					(
						blockPosInCells
					);

					if (p == 0) // hack - luma only for now
					{
						var pixelLuma = Math.floor(planeInSpatialDomain[i] * 100 / 255);
						var pixelIndex = cellPos.y * frameSizeInPixels.x + cellPos.x;
						var pixelColor = "hsl(0,0%," + pixelLuma + "%)";
						pixels[pixelIndex] = pixelColor;
					}
				}
			}

			blockPrev = block;
		}

		frame.pixels = pixels;
	}

	static fromBitStream_Segment_StartOfFrame(frameHeaderAsStream, frames)
	{
		var samplePrecision = frameHeaderAsStream.readByte();

		// X and Y seem to be reversed--why?
		var sizeInPixels = new Coords
		(
			frameHeaderAsStream.readInteger16(),
			frameHeaderAsStream.readInteger16()
		);

		var numberOfImageComponents = frameHeaderAsStream.readByte();
		var componentIdentifier = frameHeaderAsStream.readByte();
		var samplingFactors = new Coords
		(
			frameHeaderAsStream.readBits(4),
			frameHeaderAsStream.readBits(4)
		);
		var quantizationTableDestinationSelector = frameHeaderAsStream.readByte();

		var frameHeader = new ImageJpeg_Frame_Header
		(
			samplePrecision,
			sizeInPixels,
			numberOfImageComponents,
			componentIdentifier,
			samplingFactors,
			quantizationTableDestinationSelector
		);

		var frame = new ImageJpeg_Frame(frameHeader);

		frames.push(frame);
	}

	// instance methods

	toDomElement()
	{
		var frame0Header = this.frames[0].header;

		var canvas = document.createElement("canvas");
		canvas.width = frame0Header.sizeInPixels.x;
		canvas.height = frame0Header.sizeInPixels.y;
		canvas.style.border = "1px solid";

		var graphics = canvas.getContext("2d");

		var frame0 = this.frames[0];
		var frameSizeInPixels = frame0.header.sizeInPixels;
		var frame0Pixels = frame0.pixels;

		for (var y = 0; y < frameSizeInPixels.y; y++)
		{
			for (var x = 0; x < frameSizeInPixels.x; x++)
			{
				var pixelIndex = y * frameSizeInPixels.x + x;
				var pixelColor = frame0Pixels[pixelIndex];
				graphics.fillStyle = pixelColor;
				graphics.fillRect(x, y, 1, 1);
			}
		}

		return canvas;
	}
}

class ImageJpeg_Frame
{
	constructor(header, pixels)
	{
		this.header = header;
		this.pixels = pixels;
	}
}

class ImageJpeg_Frame_Header
{
	constructor
	(
		samplePrecision,
		sizeInPixels,
		numberOfImageComponents,
		componentIdentifier,
		samplingFactors,
		quantizationTableDestinationSelector
	)
	{
		this.samplePrecision = samplePrecision;
		this.sizeInPixels = sizeInPixels;
		this.numberOfImageComponents = numberOfImageComponents;
		this.componentIdentifier = componentIdentifier;
		this.samplingFactors = samplingFactors;
		this.quantizationTableDestinationSelector =
			quantizationTableDestinationSelector;
	}
}
