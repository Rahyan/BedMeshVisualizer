// Event listener for changes in the source input field
source.addEventListener("input", () => {
  modified = true;
});

// Cleans and processes raw string data from a source input.
function clean() {
  // Extract and clean the raw input data
  let raw = source.value
    .replace(/\w+:\s*/g, "") // Remove 'Recv: ' or similar prefixes
    .replace(/\|/g, "") // Remove '|'
    .replace(/^[ \t]*\r?\n/gm, "") // Remove blank lines
    .trim()
    .split("\n"); // Split into lines

  // Remove trailing and leading column numbers
  if (raw[raw.length - 1].trim().match(/^0\s+[\s\d]+\d$/)) {
    raw.pop();
  }
  if (raw[0].trim().match(/^0\s+[\s\d]+\d$/)) {
    raw.shift();
  }

  // Process each line
  raw = raw.map((line, index) => {
    let processedLine = line
      .trim()
      .replace(/< \d+:\d+:\d+(\s+(AM|PM))?:/g, "") // Remove timestamps
      .replace(/[\[\]]/g, " ") // Replace brackets with spaces
      .replace(/\s+/g, "\t") // Normalize whitespace to tabs
      .split("\t"); // Split by tabs

    // Remove row numbers if they match a pattern
    if (
      +processedLine[0] === raw.length - index - 1 ||
      processedLine[0] === String(index)
    ) {
      processedLine.shift();
    }

    return processedLine;
  });

  // Optionally invert the output
  const invertOutput = document.getElementById("invertOutput");
  if (invertOutput.checked) {
    raw = raw.map((item) => item.reverse()).reverse();
  }

  return raw;
}

// Updates minimum and maximum values in the DOM based on the rawFlat array
function minMax(rawFlat) {
  // Find minimum and maximum values in the array
  let min = Math.min(...rawFlat);
  let max = Math.max(...rawFlat);

  // Prefix with '+' if the values are non-negative
  min = (min >= 0 ? "+" : "") + min;
  max = (max >= 0 ? "+" : "") + max;

  // Update the DOM elements with the calculated min and max values
  document.querySelector("#stats .min").textContent = min;
  document.querySelector("#stats .max").textContent = max;
}

// Updates the maximum difference in the DOM and triggers fireworks if the condition is met
function maxDiff(rawFlat) {
  // Calculate the difference between the maximum and minimum values
  const diff = Math.max(...rawFlat) - Math.min(...rawFlat);

  // Update the DOM element with the calculated difference
  document.querySelector("#stats .max_diff").textContent = diff.toFixed(3);

  // Trigger fireworks if the difference is below or equal to the threshold (0.02)
  if (diff <= 0.02) {
    fireworks();
  }
}

// Updates the average deviation in the DOM based on the rawFlat array
function avgDev(rawFlat) {
  // Calculate the average value
  let avg = rawFlat.reduce((a, b) => a + b, 0) / rawFlat.length;

  // Prefix with '+' if the average is non-negative and format to 3 decimal places
  avg = (avg >= 0 ? "+" : "") + avg.toFixed(3);

  // Update the DOM element with the calculated average deviation
  document.querySelector("#stats .avg_dev").textContent = avg;
}

// Calculates the position relative to the center and formats it for display.
function relative(position) {
  const pos = position.toFixed(2);
  if (pos === "0.00") {
    return '±0.00 mm <span class="mdi mdi-check text-success"></span>';
  }
  return `${
    pos >= 0 ? "+" : ""
  }${pos} mm <span class="mdi mdi-close text-danger"></span>`;
}

// Converts a position to degrees relative to the screw pitch and formats it for display.
function degrees(position) {
  let deg = Math.round((position / screwPitch) * 360);
  if (deg === 0) {
    return '0° <span class="mdi mdi-check text-success"></span>';
  }
  return `${Math.abs(deg)}° ${deg > 0 ? cw : ccw}`;
}

// Calculates the fractional representation of a position relative to the center.
function fractions(position) {
  // Function to calculate the greatest common divisor
  const gcd = (a, b) => {
    if (b < 0.0000001) return a; // Limiting value due to precision limitations
    return gcd(b, Math.floor(a % b)); // Using recursion for gcd calculation
  };

  // Calculate the absolute value of the position divided by the screw pitch and fix to 1 decimal place
  const abs = Math.abs(position / screwPitch).toFixed(1);

  // Calculate the length of the decimal part
  const len = abs.toString().length - 2;

  // Determine the denominator as a power of 10 based on the length of the decimal part
  let denominator = Math.pow(10, len);
  let numerator = abs * denominator;

  // Simplify the fraction by dividing both numerator and denominator by their gcd
  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  denominator /= divisor;

  // Construct the fraction string
  let fraction = Math.floor(numerator) + "/" + Math.floor(denominator);

  // If the fraction is '0/1', treat it as 0 and append a checkmark icon
  if (fraction === "0/1") {
    return '0 <span class="mdi mdi-check text-success"></span>';
  } else {
    // Append clockwise or counterclockwise symbol based on position
    fraction += " " + (position > 0 ? cw : ccw);
    return fraction;
  }
}
