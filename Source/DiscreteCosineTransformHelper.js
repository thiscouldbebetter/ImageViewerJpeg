
class DiscreteCosineTransformHelper
{
	static samplesAddValue(samples, valueToAdd)
	{
		var returnValues = [];

		for (var i = 0; i < samples.length; i++)
		{
			var sample = samples[i];
			var sum = sample + valueToAdd;
			returnValues[i] = sum;
		}

		return returnValues;
	}

	static sampleArraysMultiply
	(
		samples0, samples1
	)
	{
		var returnValues = [];

		for (var i = 0; i < samples0.length; i++)
		{
			var sample0 = samples0[i];
			var sample1 = samples1[i];
			var productOfSamples = sample0 * sample1;
			returnValues[i] = productOfSamples;
		}

		return returnValues;
	}

	static samplesRound(samplesToRound)
	{
		var returnValues = [];

		for (var i = 0; i < samplesToRound.length; i++)
		{
			var sample = samplesToRound[i];
			returnValues[i] = Math.round(sample);
		}

		return returnValues;
	}

	static samples2DFrequencyToSpatialDomain
	(
		samplesToConvert,
		sizeInSamples
	)
	{
		var samplesConverted = [];

		for (var y = 0; y < sizeInSamples.y; y++)
		{
			for (var x = 0; x < sizeInSamples.x; x++)
			{
				var sampleConverted = 0;
				var sampleIndex = 0;

				for (var yy = 0; yy < sizeInSamples.y; yy++)
				{
					var alphaY = (yy == 0 ? 1 / Math.sqrt(2) : 1);

					for (var xx = 0; xx < sizeInSamples.x; xx++)
					{
						var alphaX = (xx == 0 ? 1 / Math.sqrt(2) : 1);
						var alphaXY = alphaX * alphaY;

						var quantity = 
							alphaXY
							* samplesToConvert[sampleIndex]
							* Math.cos
							(
								(2 * x + 1)
								* xx 
								* Math.PI
								/ 16
							)
							* Math.cos
							(
								(2 * y + 1)
								* yy 
								* Math.PI
								/ 16
							);

						sampleConverted += quantity;
						sampleIndex++;
					}
				}

				sampleConverted /= 4;

				samplesConverted.push(sampleConverted);
			}
		}

		return samplesConverted;
	}
}
