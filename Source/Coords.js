
class Coords
{
	constructor(x, y)
	{
		this.x = x;
		this.y = y;
	}

	add(other)
	{
		this.x += other.x;
		this.y += other.y;
		return this;
	}

	ceiling()
	{
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
		return this;
	}

	clone()
	{
		return new Coords(this.x, this.y);
	}

	divide(other)
	{
		this.x /= other.x;
		this.y /= other.y;
		return this;
	}

	fractional()
	{
		this.x -= Math.floor(this.x);
		this.y -= Math.floor(this.y);
		return this;
	}

	isInRange(max)
	{
		var returnValue = 
		(
			this.x >= 0
			&& this.x <= max.x
			&& this.y >= 0
			&& this.y <= max.y
		);

		return returnValue;
	}

	multiply(other)
	{
		this.x *= other.x;
		this.y *= other.y;
		return this;
	}

	multiplyScalar(scalar)
	{
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}

	overwriteWith(other)
	{
		this.x = other.x;
		this.y = other.y;
		return this;
	}

	subtract(other)
	{
		this.x -= other.x;
		this.y -= other.y;
		return this;
	}

	toString()
	{
		return "(" + this.x + "," + this.y + ")";
	}
}
