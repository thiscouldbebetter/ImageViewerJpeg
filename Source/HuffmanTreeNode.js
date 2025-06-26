
class HuffmanTreeNode
{
	constructor(code, encodedValue, children)
	{
		this.code = code;
		this.encodedValue = encodedValue;
		this.children = children;
	}

	codeValuePairAdd(codeToAdd, encodedValueToAdd)
	{
		var nodeToAdd = new HuffmanTreeNode(codeToAdd, encodedValueToAdd);

		var lengthOfCodeToAdd = codeToAdd.length;

		var nodeCurrent = this;
		var lengthOfNodeCurrentCode = nodeCurrent.code.length;

		while (lengthOfCodeToAdd > lengthOfNodeCurrentCode)
		{
			var childIndex = codeToAdd.substr(lengthOfNodeCurrentCode).charAt(0);

			if (nodeCurrent.children == null)
			{
				nodeCurrent.children = [];
			}

			var child = nodeCurrent.children[childIndex];
			if (child == null)
			{
				child = new HuffmanTreeNode
				(
					nodeCurrent.code + childIndex,
					null
				);
				nodeCurrent.children[childIndex] = child;
			}

			nodeCurrent = child;

			lengthOfNodeCurrentCode = nodeCurrent.code.length;
		}

		nodeCurrent.encodedValue = encodedValueToAdd;
	}

	nodesEmptyPopulateForCodeLength(codeLengthMax)
	{
		if (this.code.length < codeLengthMax)
		{
			if (this.children == null)
			{
				this.children = [];
			}

			for (var i = 0; i < 2; i++)
			{
				var child = this.children[i];
				if (child == null)
				{
					child = new HuffmanTreeNode
					(
						this.code + i,
						null
					);
					this.children[i] = child;
				}
				child.nodesEmptyPopulateForCodeLength(codeLengthMax);
			}
		}
	}

	nodeNextCreate(encodedValueToSet)
	{
		var returnValue = false;

		if (this.encodedValue == null)
		{
			if (this.children == null)
			{
				this.codeValuePairAdd
				(
					this.code + "0",
					encodedValueToSet
				);
				returnValue = true;
			}
			else
			{
				for (var i = 0; i < 2; i++)
				{
					var child = this.children[i];
					if (child == null)
					{
						this.codeValuePairAdd
						(
							this.code + i,
							encodedValueToSet
						);
						returnValue = true;
						break;
					}
					else
					{
						returnValue = child.nodeNextCreate
						(
							encodedValueToSet
						);
						if (returnValue == true)
						{
							break;
						}
					}
				}
			}
		}

		return returnValue;
	}

	valueForCode(codeToGet)
	{
		var returnValue;

		if (this.code == codeToGet)
		{
			returnValue = this.encodedValue;
		}
		else
		{
			var childIndex = codeToGet.substr(this.code.length).charAt(0);
			var child = this.children[childIndex];
			returnValue = child.valueForCode(codeToGet);
		}

		return returnValue;
	}
}
