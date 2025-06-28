
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
		var fileAsBytes =
			fileAsBinaryString
				.split("")
				.map(x => x.charCodeAt(0) );

		var imageJpeg = ImageJpeg.fromBytes(fileAsBytes);

		var imageJpegAsDomElement = imageJpeg.toDomElement();

		var d = document;
		var divOutput = d.getElementById("divOutput");
		divOutput.innerHTML = "";
		divOutput.appendChild(imageJpegAsDomElement);
	}
}
