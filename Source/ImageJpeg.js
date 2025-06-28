
class ImageJpeg
{
	constructor(name, frames)
	{
		this.name = name;
		this.frames = frames;
	}

	// static methods

	static fromBytes(bytes)
	{
		var fileStream = new BitStream(bytes);

		var app0Segment = null;
		var quantizationTables = [];
		var frames = [];
		var frameCurrent;

		while (fileStream.hasMoreBits() == true)
		{
			var segmentMarker = fileStream.readByte();
			if (segmentMarker != 0xFF)
			{
				var errorMessage =
					"Expected a segment marker (255), but read: "
					+ segmentMarker + ", at byteOffset "
					+ fileStream.byteIndexCurrent + ".";
				throw new Error(errorMessage);
			}

			var segmentType = fileStream.readByte();

			if (segmentType == 0xC0) // 192
			{
				// Start of Frame ("SOF") - baseline DCT.
				throw new Error("Not yet implemented.");
				// this.fromBitStream_Segment_StartOfFrame();
			}
			else if (segmentType == 0xC2) // 194
			{
				// Start of Frame ("SOF") - progressive DCT.
				var payloadAsStream =
					this.payloadAsStreamFromFileStream(fileStream);
				var bitsPerPixelPerColorComponent =
					payloadAsStream.readByte();
				// Height, then width?
				var imageHeight = payloadAsStream.readInteger16();
				var imageWidth = payloadAsStream.readInteger16();
				var imageSize = new Coords(imageWidth, imageHeight);
				var colorComponentCount = payloadAsStream.readByte();
				var colorComponentDatas = [];
				for (var cc = 0; cc < colorComponentCount; cc++)
				{
					var componentId =
						payloadAsStream.readByte(); // Y=1, Cb=2, Cr=3
					var samplingFactor =
						payloadAsStream.readByte();
					var quantizationTableIndex =
						payloadAsStream.readByte();
					var colorComponentData = new ColorComponentData
					(
						componentId,
						samplingFactor,
						quantizationTableIndex
					);
					colorComponentDatas.push(colorComponentData);
				}

				var startOfFrame = new StartOfFrameProgressiveDct
				(
					imageSize,
					colorComponentDatas
				);

				if (frameCurrent != null)
				{
					frames.push(frameCurrent);
				}

				frameCurrent = new Frame(startOfFrame);
			}
			else if (segmentType == 0xC4) // 196
			{
				// Define Huffman Tables ("DHT").
				var payloadAsStream =
					this.payloadAsStreamFromFileStream(fileStream);

				var threeZeroBits = payloadAsStream.readBitsAsInteger(3);
				if (threeZeroBits != 0)
				{
					var errorMessage =
						"Expected: 0, but was: " + threeZeroBits + ".";
					throw new Error(errorMessage);
				}

				var huffmanTableTypeIsAcNotDc =
					payloadAsStream.readBitAsBoolean();

				var huffmanTableIndex =
					payloadAsStream.readBitsAsInteger(4);
				if (huffmanTableIndex < 0 && huffmanTableIndex > 3)
				{
					var errorMessage =
						"Invalid Huffman table index: "
						+ huffmanTableIndex + ".";
					throw new Error(errorMessage);
				}

				/*
				var huffmanTableIndexExpected =
					frameCurrent.huffmanTables.length;
				if (huffmanTableIndex != huffmanTableIndexExpected)
				{
					var errorMessage =
						"Unexpected Huffman table index: "
						+ huffmanTableIndex + "."
					throw new Error(errorMessage);
				}
				*/

				var symbolCountsForCodesOfLength1To16 =
					payloadAsStream.readBytes(16);
				var codeCountTotal = 0;
				symbolCountsForCodesOfLength1To16
					.forEach(x => codeCountTotal += x);
				var symbolsByIncreasingLength =
					payloadAsStream.readBytes(codeCountTotal);
				var huffmanTable = new HuffmanTable
				(
					huffmanTableIndex,
					huffmanTableTypeIsAcNotDc,
					symbolCountsForCodesOfLength1To16,
					symbolsByIncreasingLength
				);
				// hack
				frameCurrent.huffmanTables[huffmanTableIndex] = huffmanTable;
			}
			else if (segmentType >= 0xD0 && segmentType <= 0xD7) // 208-215
			{
				// restart
				// no payload
			}
			else if (segmentType == 0xD8) // 216
			{
				// Start of Image ("SOI").
				// No payload.
			}
			else if (segmentType == 0xD9) // 217
			{
				// End of Image ("EOI").
				// No payload.
				break;
			}
			else if (segmentType == 0xDA) // 218
			{
				// Start of Scan ("SOS").
				var payloadAsStream =
					this.payloadAsStreamFromFileStream(fileStream);

				var numberOfComponentsInScan =
					payloadAsStream.readByte();

				if (numberOfComponentsInScan < 1 || numberOfComponentsInScan > 4)
				{
					var errorMessage =
						"Unexpected number of components in scan: "
						+ numberOfComponentsInScan + ".";
					throw new Error(errorMessage);
				}

				var scanComponentDatas = [];
				for (var cis = 0; cis < numberOfComponentsInScan; cis++)
				{
					var componentId =
						payloadAsStream.readByte(); // Y=1, Cb=2, Cr=3, I=4, Q=5.
					var huffmanTableToUseForDcIndex =
						payloadAsStream.readBitsAsInteger(4);
					var huffmanTableToUseForAcIndex =
						payloadAsStream.readBitsAsInteger(4);
					var scanComponentData = new ScanComponentData
					(
						componentId,
						huffmanTableToUseForDcIndex,
						huffmanTableToUseForAcIndex
					);
					scanComponentDatas.push(scanComponentData);
				}

				var unusedMaybe = payloadAsStream.readBytes(3);

				frameCurrent.startOfScanSegment = new StartOfScanSegment
				(
					scanComponentDatas
				);

				// Per https://mykb.cipindanci.com/archive/SuperKB/1294/JPEG%20File%20Layout%20and%20Format.htm
				// "The image data (scans) is immediately following the SOS segment."

				// Per https://www.ccoderun.ca/programming/2017-01-31_jpeg/,
				// "To find the next segment after the SOS, you must keep reading
				// until you find a 0xFF bytes which is not immediately followed 
				// by 0x00 (see "byte stuffing"). Normally, this will be
				// the EOI segment that comes at the end of the file.

				while (fileStream.hasMoreBits() ) // For safety.
				{
					var byteRead = fileStream.readByte();

					if (byteRead == 0xFF)
					{
						var byteNext = fileStream.byteCurrentPeek();
						if (byteNext == 0)
						{
							// Keep going.
							frameCurrent.compressedScanBytes.push(byteRead);
						}
						else
						{
							// Back it up to read the EOI.
							fileStream.byteIndexCurrent--;
							break;
						}
					}
					else
					{
						frameCurrent.compressedScanBytes.push(byteRead);
					}
				}

				frames.push(frameCurrent);
				frameCurrent = new Frame(frameCurrent.startOfFrame);
			}
			else if (segmentType == 0xDB) // 219
			{
				// Define Quantization Table ("DQT").
				var payloadAsStream =
					this.payloadAsStreamFromFileStream(fileStream);
				var quantizationTableIndexRead =
					payloadAsStream.readByte();
				var quantizationTableIndexExpected =
					quantizationTables.length;
				if (quantizationTableIndexRead != quantizationTableIndexExpected)
				{
					var message =
						"Expected quantization table number "
						+ quantizationTableIndexExpected
						+ ", but was: "
						+ quantizationTableIndexRead;
					throw new Error(message);
				}

				var quantizationTableCellsAsBytes =
					payloadAsStream.readBytes(payloadLengthInBytes - 1);
				var quantizationTable =
					new QuantizationTable
					(
						quantizationTableIndexRead,
						quantizationTableCellsAsBytes
					);
				quantizationTables.push(quantizationTable);
			}
			else if (segmentType == 0xDD) // 221
			{
				// define restart interval
				var payloadAsStream =
					this.payloadAsStreamFromFileStream(fileStream);
				var payloadLengthInBytes = payloadAsStream.bytesRemainingCount();
				if (payloadLengthInBytes != 4)
				{
					throw "Invalid length for define restart interval segment."
				}
			}
			else if (segmentType == 0xE0) // 224
			{
				// An "APP0" segment.
				// This assumes JFIF, but there's also EXIF.
				// Apparently, the JPEG file format proper
				// is widely considered, in some ways, incomplete,
				// and these APP0 segments help fill in the blanks.
				var payloadAsStream =
					this.payloadAsStreamFromFileStream(fileStream);
				var markerJfifMaybe = payloadAsStream.readString(4);
				if (markerJfifMaybe == "JFIF")
				{
					var markerJfifNullTerminator = payloadAsStream.readByte();
					// JFIF: See: https://en.wikipedia.org/wiki/Jfif.
					var jfifVersionMajor = payloadAsStream.readByte();
					var jfifVersionMinor = payloadAsStream.readByte();
					var densityUnitCode = payloadAsStream.readByte();
					// 00 : No units; width:height pixel aspect ratio = Ydensity:Xdensity
					// 01 : Pixels per inch (2.54 cm)
					// 02 : Pixels per centimeter
					var densityInUnits = new Coords
					(
						payloadAsStream.readInteger16(),
						payloadAsStream.readInteger16()
					);
					var thumbnailSizeInPixels = new Coords
					(
						payloadAsStream.readByte(),
						payloadAsStream.readByte()
					);
					var thumbnailPixelCount =
						thumbnailSizeInPixels.x
						* thumbnailSizeInPixels.y;
					var bytesPerPixel = 3;
					var thumbnailPixelByteCount = 
						thumbnailPixelCount * bytesPerPixel;
					var thumbnailPixelsAsComponentsRgb =
						payloadAsStream.readBytes(thumbnailPixelByteCount);
					app0Segment = new App0SegmentJfif
					(
						jfifVersionMajor,
						jfifVersionMinor,
						densityUnitCode,
						densityInUnits,
						thumbnailSizeInPixels,
						thumbnailPixelsAsComponentsRgb
					);

					// If JFIF version >= 1.02,
					// a JFIF extension APP0 marker segment comes next,
					// which "allows to embed a thumbnail image in 3 different formats."
					// But this decoder is built against version 1.01.
				}
			}
			else if(segmentType >= 0xE1 && segmentType <= 0xEF) // 225-239
			{
				// application-specific
				var payloadAsStream =
					this.payloadAsStreamFromFileStream(fileStream);
				var payloadAsString =
					payloadAsStream.readString(payloadLengthInBytes);
				segments.push(payloadAsString);
			}
			else if (segmentType == 0xFE) // 254
			{
				// text comment
				var payloadAsStream =
					this.payloadAsStreamFromFileStream(fileStream);
				var payloadAsString =
					payloadAsStream.readString(payloadLengthInBytes);
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

	static payloadAsStreamFromFileStream(fileStream)
	{
		var payloadLengthInBytes = fileStream.readBytesAsInteger(2) - 2;
		var payloadAsBytes =
			fileStream.readBytes(payloadLengthInBytes);
		var payloadAsStream = new BitStream(payloadAsBytes);
		return payloadAsStream
	}

	/*
	static fromBitStream_Segment_HuffmanTree(payloadAsStream, huffmanTrees)
	{
		while (payloadAsStream.hasMoreBits() )
		{
			var tableIndex = payloadAsStream.readByte();

			var huffmanTree = new HuffmanTreeNode("", null);
			var numbersOfHuffmanEntriesForCodeBitLengths =
				payloadAsStream.readBytes(16);

			for (var i = 0; i < numbersOfHuffmanEntriesForCodeBitLengths.length; i++)
			{
				var numberOfEntriesForCodeBitLength =
					numbersOfHuffmanEntriesForCodeBitLengths[i];

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

		return huffmanTrees;
	}
	*/

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
		bytes,
		huffmanTables,
		quantizationTables,
		frame
	)
	{
		var stream = new BitStream(bytes);
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
		var huffmanTableIndex = 0;
		var huffmanTable = huffmanTables[huffmanTableIndex];

		// There are 3 planes:
		// luma, chromaBlue, and chromaRed.

		var blocks = [];
		var planes = [];
		var planeDCAndACs = [];

		while (scanBytesAsBitStream.hasMoreBits() == true)
		{
			var bit = scanBytesAsBitStream.readBit();
			huffmanCodeInProgress += bit;
			var encodedValue = huffmanTable.valueForCode
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
							huffmanTableIndex = 1;
						}

						huffmanTable = huffmanTrees[huffmanTreeIndex];
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
		var frame0 = this.frames[0];
		var frame0Header = frame0.startOfFrame;
		var frameSizeInPixels =
			frame0Header.imageSize; // hack - The units may not be pixels!

		var canvas = document.createElement("canvas");
		canvas.width = frameSizeInPixels.x; 
		canvas.height = frameSizeInPixels.y;
		canvas.style.border = "1px solid";

		// hack - Placeholder color until decompressing is figured out.
		var pixelColor = "rgb(255, 0, 255)"; 

		var graphics = canvas.getContext("2d");

		for (var y = 0; y < frameSizeInPixels.y; y++)
		{
			for (var x = 0; x < frameSizeInPixels.x; x++)
			{
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

class App0SegmentExif
{
	constructor
	(
		todo
	)
	{
		this.todo = todo;
	}
}

class App0SegmentJfif
{
	constructor
	(
		jfifVersionMajor,
		jfifVersionMinor,
		densityUnitCode,
		densityInUnits,
		thumbnailSizeInPixels,
		thumbnailPixelsAsComponentsRgb
	)
	{
		this.jfifVersionMajor = jfifVersionMajor;
		this.jfifVersionMinor = jfifVersionMinor;
		this.densityUnitCode = densityUnitCode;
		this.densityInUnits = densityInUnits;
		this.thumbnailSizeInPixels = thumbnailSizeInPixels;
		this.thumbnailPixelsAsComponentsRgb = thumbnailPixelsAsComponentsRgb;
	}
}

class ColorComponentData
{
	constructor
	(
		componentId,
		samplingFactor,
		quantizationTableIndex
	)
	{
		this.componentId = componentId;
		this.samplingFactor = samplingFactor;
		this.quantizationTableIndex = quantizationTableIndex;
	}
}

class Frame
{
	constructor(startOfFrame)
	{
		this.startOfFrame = startOfFrame;

		this.huffmanTables = [];
		this.startOfScanSegment = null;
		this.compressedScanBytes = [];
	}
}

class HuffmanTable
{
	constructor
	(
		huffmanTableIndex,
		huffmanTableTypeIsAcNotDc,
		symbolCountsForCodesOfLength1To16,
		symbolsByIncreasingLength
	)
	{
		this.huffmanTableIndex = huffmanTableIndex;
		this.huffmanTableTypeIsAcNotDc =
			huffmanTableTypeIsAcNotDc;
		this.symbolCountsForCodesOfLength1To16 =
			symbolCountsForCodesOfLength1To16;
		this.symbolsByIncreasingLength =
			symbolsByIncreasingLength;
	}
}

class QuantizationTable
{
	constructor(tableIndex, cellsAsBytes)
	{
		this.tableIndex = tableIndex;
		this.cellsAsBytes = cellsAsBytes;
	}
}

class ScanComponentData
{
	constructor
	(
		componentId,
		huffmanTableToUseForDcIndex,
		huffmanTableToUseForAcIndex
	)
	{
		this.componentId = componentId;
		this.huffmanTableToUseForDcIndex =
			huffmanTableToUseForDcIndex;
		this.huffmanTableToUseForAcIndex =
			huffmanTableToUseForAcIndex;
	}
}

class StartOfFrameProgressiveDct
{
	constructor(imageSize, colorComponentDatas)
	{
		this.imageSize = imageSize;
		this.colorComponentDatas = colorComponentDatas;
	}
}

class StartOfScanSegment
{
	constructor(scanComponentDatas)
	{
		this.scanComponentDatas = scanComponentDatas;
	}
}