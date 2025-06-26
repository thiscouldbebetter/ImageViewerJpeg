
class UiEventHandler
{
	static inputFileToLoad_Changed(inputFileToLoad)
	{
		var file = inputFileToLoad.files[0];

		var fileReader = new FileReader();
		fileReader.onload = this.inputFileToLoad_Changed_Loaded;
		fileReader.readAsBinaryString(file);
	}

	static inputFileToLoad_Changed_Loaded(event)
	{
		var fileReader = event.target;
		var fileAsBinaryString = fileReader.result;
		var fileAsBitStream = BitStream.fromBinaryString(fileAsBinaryString);
		var imageJpeg = ImageJpeg.fromBitStream(fileAsBitStream);
		var imageJpegAsDomElement = imageJpeg.toDOMElement();
		var d = document;
		var divOutput = d.getElementById("divOutput");
		divOutput.innerHTML = "";
		divOutput.appendChild(imageJpegAsDOMElement);
	}
}
