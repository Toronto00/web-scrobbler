const path = require('path');

const srcDir = 'src';
const buildDir = 'build';

const modeDevelopment = 'development';
const modeProduction = 'production';

const browserChrome = 'chrome';
const browserFirefox = 'firefox';

const supportedBrowsers = [browserChrome, browserFirefox];
const supportedModes = [modeDevelopment, modeProduction];

const extensionIds = {
	[browserChrome]: 'hhinaapppaileiechjoiifaancjggfjm',
	[browserFirefox]: '{799c0914-748b-41df-a25c-22d008f9e83f}',
};

const manifestFile = 'manifest.json';

const knownArguments = {
	string: ['browser', 'mode'],
	default: { browser: browserChrome, mode: modeDevelopment },
};

const argumentsDescription = {
	browser: 'Target browser',
	mode: 'Build mode',
};

/**
 * Throw an error if the extension doesn't support a given browser.
 *
 * @param {String} browser Browser name
 *
 * @throws {TypeError}
 */
function assertBrowserIsSupported(browser) {
	const browsersLabel = `Supported browsers: ${supportedBrowsers.join(', ')}`;

	if (!browser) {
		throw new TypeError(
			`You have not specified browser.\n${browsersLabel}.`
		);
	}

	if (!supportedBrowsers.includes(browser)) {
		throw new TypeError(`Unknown browser: ${browser}.\n${browsersLabel}.`);
	}
}

/**
 * Throw an error if the extension doesn't support a given mode.
 *
 * @param {String} mode Mode
 *
 * @throws {TypeError}
 */
function assertBuildModeIsValid(mode) {
	const modesLabel = `Supported modes: ${supportedModes.join(', ')}`;

	if (!mode) {
		throw new TypeError(`You have not specified mode.\n${modesLabel}.`);
	}

	if (!supportedModes.includes(mode)) {
		throw new TypeError(`Unknown mode: ${mode}.\n${modesLabel}.`);
	}
}

/**
 * Configure TypeScipt compiler to run tests written in TypeScript.
 *
 * This configuration allows to use Mocha as a test framework, and Istanbul as
 * a coverage tool.
 */
function configureTsCompilerForTests() {
	const tsconfigForTests = {
		// Set the module type to "CommonJS" to allow run compiled TS files
		module: 'CommonJS',
		// Enable this option to allow to import JSON files when the module type
		// is "CommonJS"
		esModuleInterop: true,
	};

	process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify(tsconfigForTests);
}

/**
 * Return an extension ID for a given browser.
 *
 * @param {String} browser Browser name
 *
 * @return {String} Extension ID
 */
function getExtensionId(browser) {
	assertBrowserIsSupported(browser);

	return extensionIds[browser];
}

function getArgumentDescription(...args) {
	return args.reduce((acc, arg) => {
		if (arg in argumentsDescription) {
			acc[arg] = argumentsDescription[arg];
			return acc;
		}

		throw new Error(`Unknown argument: ${arg}`);
	}, {});
}

/**
 * Parse CLI arguments and return an object containing CLI arguments and their
 * values.
 *
 * Opionally, validate arguments values. If one of arguments is not valid,
 * or missing, throw an error.
 *
 * By default, arguments value are validated.
 *
 * @param {Boolean} validate Validate arguments values
 *
 * @return {Object} CLI arguments and arguments values
 *
 * @throws {TypeError}
 */
function parseCliArguments({ validate = true } = {}) {
	const parseArgs = require('minimist');
	const parsedArgs = parseArgs(process.argv.slice(2), knownArguments);

	if (validate) {
		const { browser, mode } = parsedArgs;

		assertBrowserIsSupported(browser);
		assertBuildModeIsValid(mode);
	}

	return parsedArgs;
}

function resolve(...p) {
	return path.resolve(__dirname, ...p);
}

module.exports = {
	assertBrowserIsSupported,
	assertBuildModeIsValid,
	configureTsCompilerForTests,
	parseCliArguments,
	getExtensionId,
	getArgumentDescription,
	resolve,

	buildDir,
	srcDir,

	browserChrome,
	browserFirefox,

	modeDevelopment,
	modeProduction,

	manifestFile,
};
