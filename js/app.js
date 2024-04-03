import 'https://cdn.plot.ly/plotly-2.18.2.min.js';

const debug = true; // 'debug' in document.documentElement.mesh;

const store = isStorageAvailable(window.localStorage)
	? window.localStorage
	: null;

debug && console.log('isStorageAvailable:', !!store);

/**
 * @param {HTMLElement} element
 * @param {boolean}     busy
 */
function applyBusyState(element, busy = true) {
	element.setAttribute('aria-busy', (element.ariaBusy = busy));
}

/**
 * @param {HTMLElement} element
 * @param {boolean}     disabled
 */
function applyDisabledState(element, disabled = true) {
	element.setAttribute('aria-disabled', (element.ariaDisabled = disabled));
}

function fireworks() {
	const duration = 5000; // Duration of the fireworks in milliseconds (5 seconds)
	const animationEnd = Date.now() + duration; // Timestamp for when the animation should end
	const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }; // Default confetti properties
  
	// Returns a random number within a given range
	function randomInRange(min, max) {
	  return Math.random() * (max - min) + min;
	}
  
	// Launches confetti at intervals
	const interval = setInterval(() => {
	  const timeLeft = animationEnd - Date.now();
  
	  if (timeLeft <= 0) {
		return clearInterval(interval); // Stop the interval when the time is up
	  }
  
	  // Adjust the particle count based on the time left
	  const particleCount = 50 * (timeLeft / duration);
  
	  // Create two confetti blasts from different sides
	  confetti(
		Object.assign({}, defaults, {
		  particleCount,
		  origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
		})
	  );
	  confetti(
		Object.assign({}, defaults, {
		  particleCount,
		  origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
		})
	  );
	}, 250); // Interval set at 250 milliseconds
  }

/**
 * @param {int[]} array
 *
 * @returns {int}
 */
function calculateStandardDeviation(array) {
	if (!array || array.length === 0) {
		return 0;
	}

	const n = array.length;
	const mean = array.reduce((a, b) => a + b) / n;
	return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}


function minMax(rawData) {
	// Find minimum and maximum values in the array
	let min = Math.min(...rawData);
	let max = Math.max(...rawData);
  
	// Prefix with '+' if the values are non-negative
	min = (min >= 0 ? "+" : "") + min;
	max = (max >= 0 ? "+" : "") + max;
	return [min, max];
}

function maxDiff(rawData) {
	// Calculate the difference between the maximum and minimum values
	const diff = Math.max(...rawData) - Math.min(...rawData);

	// Trigger fireworks if the difference is below or equal to the threshold (0.02)
	if (diff <= 0.02) {
	  fireworks();
	}
	return diff;
}

function avgDev(rawData) {
	// Calculate the average value
	let avg = rawData.reduce((a, b) => a + b, 0) / rawData.length;
  
	// Prefix with '+' if the average is non-negative and format to 3 decimal places
	avg = (avg >= 0 ? "+" : "") + avg.toFixed(3);

	return avg;
}  

/**
 * @param {HTMLOutputElement} outputElement
 * @param {Object}            data
 *
 * @returns {Promise<[number, PlotlyHTMLElement]>}
 */
function drawGraph(graphElement, avgDevElement, stdElement, minValElement, maxValElement, outputTextElement, mdvElement, data) {
	const promises = [];
	var rawData = data.flat().map(Number);
	graphElement.innerHTML="";
	promises.push(new Promise((resolve, reject) => {
		
		try {
			const avgD = avgDev(rawData)
			const std = calculateStandardDeviation(rawData).toFixed(3); // I think I should go for another name... :D
			const minMaxVal = minMax(rawData);
			const maxDiffVal = maxDiff(rawData);
			avgDevElement.innerHTML = `<strong>Average Deviation :</strong>  ${avgD} mm`;
			stdElement.innerHTML = `<strong>Standard Deviation :</strong>  ${std} mm`;
			minValElement.innerHTML = `<strong>Minimum Value :</strong> ${minMaxVal[0]} mm`;
			maxValElement.innerHTML = `<strong>Maximum Value :</strong> ${minMaxVal[1]} mm`;
			mdvElement.innerHTML = `<strong>Maximum Difference :</strong> ${maxDiffVal} mm`;
			resolve(avgD, std, minMaxVal, maxDiffVal);
		} catch (error) {
			reject(error);
		}
	}));

	const graphData = [
		{
			z: data,
			type: 'surface',
			contours: {
				z: {
					show: false,
					usecolormap: false,
					highlightcolor: "#42F462",
					project: {
						z: false,
					},
				},
			},
		},
	];

	const graphLayout = {
		autosize: true,
		margin: {
			l: 0,
			r: 0,
			b: 0,
			t: 0,
		},
		scene: {
			zaxis: {
				autorange: false,
				range: [-1, 1],
			},
			camera: {
				eye: {
					x: 0,
					y: -1.25,
					z: 1.25,
				},
			},
		},
	};

	const graphConfig = {
		responsive: true
	};

	const graphPromise = Plotly.react(graphElement, graphData, graphLayout, graphConfig);
	graphPromise.then(() => applyBusyState(graphElement, false));
	promises.push(graphPromise);

	return Promise.all(promises);
}

/**
 * @param {string} rawData
 *
 * @returns {string}
 */
function filterRawData(rawData) {
	rawData = rawData
		.replace(/\w+:\s*/g, "") // Remove 'Recv: ' or similar prefixes
		.replace(/\|/g, "") // Remove '|'
		.replace(/^[ \t]*\r?\n/gm, "") // Remove blank lines
		.trim()
		.split('\n');

	if (rawData[rawData.length - 1].trim().match(/^0\s+[\s\d]+\d$/)) {
		raw.pop();
	}

	if (rawData[0].trim().match(/^0\s+[\s\d]+\d$/)) {
		rawData.shift();
	}

	rawData = rawData.map((line, index) => {
		let processedLine = line
		  .trim()
		  .replace(/< \d+:\d+:\d+(\s+(AM|PM))?:/g, "") // Remove timestamps
		  .replace(/[\[\]]/g, " ") // Replace brackets with spaces
		  .replace(/\s+/g, "\t") // Normalize whitespace to tabs
		  .split("\t"); // Split by tabs
	
		// Remove row numbers if they match a pattern
		if (
		  +processedLine[0] === rawData.length - index - 1 ||
		  processedLine[0] === String(index)
		) {
		  processedLine.shift();
		}
		return processedLine;
	});

	return rawData;
}

/**
 * Determines whether a Web Storage API is both supported and available.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Feature-detecting_localStorage
 *
 * @param  {Storage} storage
 * @return {boolean}
 */
function isStorageAvailable(storage) {
	try {
		const x = '__storage_test__';
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	} catch (error) {
		return error instanceof DOMException && (
			// everything except Firefox
			error.code === 22 ||
			// Firefox
			error.code === 1014 ||
			// test name field too, because code might not be present
			// everything except Firefox
			error.name === 'QuotaExceededError' ||
			// Firefox
			error.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
			// acknowledge QuotaExceededError only if there's something already stored
			(storage && storage.length !== 0);
	}
}

/**
 * Determines whether the specified error is a storage quota exceeded.
 *
 * @param  {Error} error
 * @return {boolean}
 */
function isStorageQuotaExceeded(error) {
	var quotaExceeded = false;
	if (error) {
		if (error.code) {
			switch (error.code) {
				case 22:
					quotaExceeded = true;
					break;
				case 1014:
					// Firefox
					if (error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
						quotaExceeded = true;
					}
					break;
			}
		} else if (error.number === -2147024882) {
			// Internet Explorer 8
			quotaExceeded = true;
		}
	}

	return quotaExceeded;
}

class MeshPanelElement extends HTMLElement {
	constructor() {
		super();
		this.graphElement.innerHTML = '<p class="output-text">Click on <strong><em>Visualize</em></strong> to generate the bed mesh.</p>';
		this.#bindEventListeners();
		this.#mountButtons();
		this.#mountInput();
	}
	
	#bindEventListeners() {
		// debug && console.group( 'MeshPanelElement.#bindEventListeners');
		const resetterElement = this.resetterElement;
		if (resetterElement) {
			// debug && console.log('Binding Resetter:', resetterElement);
			resetterElement.addEventListener(
				'click',
				(event) => this.reset(),
				{ capture: true }
			);
		}

		const submitterElement = this.submitterElement;
		if (submitterElement) {
			// debug && console.log('Binding Submitter:', submitterElement);
			submitterElement.addEventListener(
				'click',
				(event) => this.submit(),
				{ capture: true }
			);
		}

		// debug && console.groupEnd();
	}

	#filterInput(value) {
		return value.replace(/^[\r\n]+|[\r\n]+$/g, '');
	}

	#mountButtons() {
		// debug && console.group( 'MeshPanelElement.#mountButtons');

		this.controlElements.forEach(
			(controlElement) => applyDisabledState(controlElement, false)
		);

		// debug && console.groupEnd();
	}

	#resetOutput() {
		Plotly.purge(this.graphElement);
		this.outputElements.forEach((outputElement) => outputElement.value = '');
		var graph = this.getElementsByClassName('c-graph');
		this.graphElement.innerHTML = '<p class="output-text">Click on <strong><em>Visualize</em></strong> to generate the bed mesh.</p>';
	}

	async reset() {
		debug && console.group('MeshPanelElement.reset');

		if (!this.#isIdle) {
			debug && (
				console.log('Not Idle'),
				console.groupEnd()
			);
			return;
		}

		this.#isBusy = true;

		const inputElement = this.inputElement;
		inputElement.value = '';

		if (store) {
			try {
				store.removeItem(inputElement.id);
			} catch (error) {
				console.warn('Storage:', `Cannot remove value of [${inputElement.id}]:`, error);
			}
		}

		this.#resetOutput();

		this.#isBusy = false;

		debug && console.groupEnd();
	}

	async submit() {
		debug && console.group('MeshPanelElement.submit');

		if (!this.#isIdle) {
			debug && (
				console.log('Not Idle'),
				console.groupEnd()
			);
			return;
		}

		this.#isBusy = true;

		const inputElement = this.inputElement;
		inputElement.value = this.#filterInput(inputElement.value);

		if (!inputElement.value) {
			this.#isBusy = false;
			debug && (
				console.log('No Value'),
				console.groupEnd()
			);
			return;
		}

		if (store) {
			try {
				store.setItem(inputElement.id, inputElement.value);
			} catch (error) {
				console.warn('Storage:', `Cannot store value of [${inputElement.id}]:`, (
					isStorageQuotaExceeded(error)
						? 'Storage is full'
						: error
				));
			}
		}

		await this.#processInput();

		this.#isBusy = false;

		debug && console.groupEnd();
	}

	async #mountInput() {
		debug && console.group('MeshPanelElement.#mountInput');

		if (!this.#isIdle) {
			debug && (
				console.log('Not Idle'),
				console.groupEnd()
			);
			return;
		}

		this.#isBusy = true;

		const inputElement = this.inputElement;

		if (!inputElement.value && store?.length) {
			try {
				const storeItem = store.getItem(inputElement.id);
				if (storeItem) {
					inputElement.value = this.#filterInput(storeItem);
				}
			} catch (error) {
				console.warn('Storage:', `Cannot retrieve value of [${inputElement.id}]:`, error);
			}
		}

		if (inputElement.value) {
			await this.#processInput();
		}

		this.#isBusy = false;

		debug && console.groupEnd();
	}

	async #processInput() {
		debug && console.log('MeshPanelElement.#processInput');
		return await drawGraph(
			this.graphElement,
			this.avgDevElement,
			this.stdElement,
			this.minValElement,
			this.maxValElement,
			this.outputTextElement,
			this.mdvElement,
			filterRawData(this.inputElement.value)
		);
	}

	get controlElements() {
		return this.querySelectorAll('[data-control]');
	}

	get graphElement() {
		return this.querySelector('.c-graph');
	}

	get inputElement() {
		return this.querySelector('textarea');
	}

	/**
	 * @returns {boolean}
	 */
	get isBusy() {
		if (typeof this.ariaBusy === 'boolean') {
			return this.ariaBusy;
		}

		return this.getAttribute('aria-busy') === 'true';
	}

	/**
	 * @returns {boolean}
	 */
	get isEnabled() {
		return !this.#isDisabled();
	}

	get outputElements() {
		return this.querySelectorAll('output');
	}

	get resetterElement() {
		return this.querySelector('[data-control="reset"]');
	}

	get avgDevElement() {
		return this.querySelector('.c-stats-0');
	}

	get stdElement() {
		return this.querySelector('.c-stats-1');
	}

	get minValElement() {
		return this.querySelector('.c-stats-2');
	}

	get maxValElement() {
		return this.querySelector('.c-stats-3');
	}

	get mdvElement() {
		return this.querySelector('.c-stats-4');
	}

	get submitterElement() {
		return this.querySelector('[data-control="visualize"]');
	}

	/**
	 * @returns {boolean}
	 */
	get #isDisabled() {
		if (typeof this.ariaDisabled === 'boolean') {
			return this.ariaDisabled;
		}

		return this.getAttribute('aria-disabled') === 'true';
	}

	/**
	 * @returns {boolean}
	 */
	get #isIdle() {
		return (!this.isBusy && !this.#isDisabled);
	}

	/**
	 * @param {boolean} state
	 */
	set #isBusy(state) {
		applyBusyState(this, state);
		this.inputElement.readOnly = state;
	}
}

customElements.define('c-panel', MeshPanelElement);

class MeshActionsElement extends HTMLElement {
	constructor() {
		super();

		this.#bindEventListeners();
		this.#mountButtons();
	}

	addPanel() {
		debug && console.group('MeshActionsElement.resetAll');

		const container = document.querySelector('#mesh-panel-container');
		if (!container) {
			console.warn('Cannot add panel:', 'Missing container');

			applyDisabledState(this.adderElement);

			debug && console.groupEnd();
			return;
		}

		const template = document.querySelector('#mesh-panel-template');
		if (!template) {
			console.warn('Cannot add panel:', 'Missing template');

			applyDisabledState(this.adderElement);

			debug && console.groupEnd();
			return;
		}

		const clone = template.content.cloneNode(true);

		clone.childNodes.forEach((child) => {
			child.innerHTML = child.innerHTML
				.replace('{$index}', container.childElementCount)
				.replace('{$iteration}', (container.childElementCount + 1))
				.replace('{$data}', '');
		});
		container.appendChild(clone);

		const counter = document.querySelector('#mesh-panel-count');
		if (counter) {
			counter.name = (Number.parseInt(counter.name) + 1);
		}

		debug && console.groupEnd();
	}

	#bindEventListeners() {
		// debug && console.group( 'MeshActionsElement.#bindEventListeners');

		const resetterElement = this.resetterElement;
		if (resetterElement) {
			// debug && console.log('Binding Resetter:', resetterElement);
			resetterElement.addEventListener(
				'click',
				(event) => this.resetAll(),
				{ capture: true }
			);
		}

		const submitterElement = this.submitterElement;
		if (submitterElement) {
			// debug && console.log('Binding Submitter:', submitterElement);
			submitterElement.addEventListener(
				'click',
				(event) => this.submitAll(),
				{ capture: true }
			);
		}

		const adderElement = this.adderElement;
		if (adderElement) {
			// debug && console.log('Binding Adder:', adderElement);
			adderElement.addEventListener(
				'click',
				(event) => {
					event.preventDefault();
					this.addPanel();
				},
				{ capture: true }
			);
		}

		// debug && console.groupEnd();
	}

	#mountButtons() {
		// debug && console.group( 'MeshActionsElement.#mountButtons');

		this.controlElements.forEach(
			(controlElement) => applyDisabledState(controlElement, false)
		);

		// debug && console.groupEnd();
	}

	async resetAll() {
		debug && console.group('MeshActionsElement.resetAll');

		document.querySelectorAll('c-panel').forEach((el) => el.reset());

		debug && console.groupEnd();
	}

	async submitAll() {
		debug && console.group('MeshActionsElement.submitAll');

		document.querySelectorAll('c-panel').forEach((el) => el.submit());

		debug && console.groupEnd();
	}

	get controlElements() {
		return this.querySelectorAll('[data-control]');
	}

	get adderElement() {
		return this.querySelector('[data-control="add"]');
	}

	get resetterElement() {
		return this.querySelector('[data-control="reset"]');
	}

	get submitterElement() {
		return this.querySelector('[data-control="visualize"]');
	}
}

customElements.define('c-actions', MeshActionsElement);