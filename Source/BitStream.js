
class BitStream
{
	constructor(bytes)
	{
		this.bytes = bytes;
		this.byteIndexCurrent = 0;
		this.bitOffsetWithinByte = 0;
	}

	// Constants.

	static BitsPerByte = 8;

	// Static.

	static fromBinaryString(binaryString)
	{
		var binaryStringAsBytes = [];

		for (var i = 0; i < binaryString.length; i++)
		{
			var charAsByte = binaryString.charCodeAt(i);
			binaryStringAsBytes.push(charAsByte);
		}

		var returnValue = new BitStream(binaryStringAsBytes);

		return returnValue;
	}

	// instance methods

	bitsPeek(numberOfBitsToRead)
	{
		var returnValues = []; 

		var byteIndexToRestore = this.byteIndexCurrent;
		var bitOffsetToRestore = this.bitOffsetWithinByte;

		for (var i = 0; i < numberOfBitsToRead; i++)
		{
			var bit = this.readBit();
			returnValues.push(bit);
		}

		this.byteIndexCurrent = byteIndexToRestore;
		this.bitOffsetWithinByte = bitOffsetToRestore; 

		return returnValues;
	}

	bitsToInteger(bitsToConvert)
	{
		var returnValue = 0;

		var numberOfBits = bitsToConvert.length;

		for (var i = 0; i < numberOfBits; i++)
		{
			var iReversed = numberOfBits - i - 1;
			var bit = bitsToConvert[i];
			var bitValueInPlace = (bit << iReversed);
			returnValue += bitValueInPlace;
		}

		return returnValue;
	}

	bitsToString(bitsToConvert)
	{
		var returnValue = "";

		var numberOfBits = bitsToConvert.length;

		for (var i = 0; i < numberOfBits; i++)
		{
			var bit = bitsToConvert[i];
			returnValue += bit;
		}

		return returnValue;
	}

	byteCurrentPeek()
	{
		return this.bytes[this.byteIndexCurrent];
	}

	bytesToInteger(bytesToConvert)
	{
		var returnValue = 0;

		var numberOfBytes = bytesToConvert.length;

		for (var i = 0; i < numberOfBytes; i++)
		{
			var iReversed = numberOfBytes - i - 1;
			var byteToConvert = bytesToConvert[i];
			var byteValueInPlace = (byteToConvert << (iReversed * BitStream.BitsPerByte));
			returnValue += byteValueInPlace;
		}

		return returnValue;
	}

	bytesRemaining()
	{
		return this.bytes.slice(this.byteIndexCurrent);
	}

	bytesRemainingCount()
	{
		return this.bytes.length - this.byteIndexCurrent;
	}

	bytesToIntegerLittleEndian(bytesToConvert)
	{
		var returnValue = 0;

		var numberOfBytes = bytesToConvert.length;

		for (var i = 0; i < numberOfBytes; i++)
		{
			var byteToConvert = bytesToConvert[i];
			var byteValueInPlace = (byteToConvert << (i * BitStream.BitsPerByte));
			returnValue += byteValueInPlace;
		}

		return returnValue;
	}

	hasMoreBits()
	{
		return (this.byteIndexCurrent < this.bytes.length);
	}

	readBit()
	{
		var byteCurrent = this.bytes[this.byteIndexCurrent];
		var bitOffsetReversed = BitStream.BitsPerByte - this.bitOffsetWithinByte - 1;
		var returnValue = (byteCurrent >> bitOffsetReversed) & 1;

		this.bitOffsetWithinByte++;
		if (this.bitOffsetWithinByte >= BitStream.BitsPerByte)
		{
			this.byteIndexCurrent++;
			this.bitOffsetWithinByte = 0;
		}

		return returnValue;
	}

	readBitAsBoolean()
	{
		return (this.readBit() == 1);
	}

	readBits(numberOfBitsToRead)
	{
		var returnValues = []; 

		for (var i = 0; i < numberOfBitsToRead; i++)
		{
			var bit = this.readBit();
			returnValues.push(bit);
		}

		return returnValues;
	}

	readBitsAsInteger(numberOfBitsToRead)
	{
		return this.bitsToInteger(this.readBits(numberOfBitsToRead));
	}

	readBitsAsIntegerSigned(numberOfBitsToRead)
	{
		var returnValue = this.readBitsAsInteger(numberOfBitsToRead);
		var max = Math.pow(2, numberOfBitsToRead) - 1;
		var halfMax = max / 2;
		if (returnValue < halfMax)
		{
			returnValue -= max;
		}

		return returnValue;
	}

	readBitsAsString(numberOfBitsToRead)
	{
		return this.bitsToString(this.readBits(numberOfBitsToRead));
	}

	readByte()
	{
		var returnValue = this.bytes[this.byteIndexCurrent];
		if (returnValue == null)
		{
			throw new Error("No more bytes to read!");
		}
		this.byteIndexCurrent++;
		return returnValue;
	}

	readBytes(numberOfBytesToRead)
	{
		var returnValues = [];

		for (var i = 0; i < numberOfBytesToRead; i++)
		{
			var byteRead = this.readByte();
			returnValues.push(byteRead);
		}

		return returnValues;
	}

	readBytesAsInteger(numberOfBytesToRead)
	{
		return this.bytesToInteger(this.readBytes(numberOfBytesToRead));
	}


	readBytesAsIntegerLittleEndian(numberOfBytesToRead)
	{
		return this.bytesToIntegerLittleEndian(this.readBytes(numberOfBytesToRead));
	}

	readInteger16()
	{
		return this.readBytesAsInteger(2);
	}

	readInteger24()
	{
		return this.readBytesAsInteger(3);
	}

	readInteger32()
	{
		return this.readBytesAsInteger(4);
	}

	readInteger32LittleEndian()
	{
		return this.readBytesAsIntegerLittleEndian(4);
	}

	readString(numberOfCharactersToRead)
	{
		var returnValue = "";

		for (var i = 0; i < numberOfCharactersToRead; i++)
		{
			var charAsByte = this.readByte();
			var char = String.fromCharCode(charAsByte);
			returnValue += char;
		}

		return returnValue;
	}
}
