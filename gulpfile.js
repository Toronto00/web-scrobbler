const { src, dest, parallel, series } = require('gulp');

const { findUnusedFiles } = require('./tasks/find-unused-files');

const {
	srcDir,
	buildDir,

	browserChrome,
	browserFirefox,

	manifestFile,

	configureTsCompilerForTests,
	getArgumentDescription,
	parseCliArguments,
	resolve,
} = require('./shared.config.js');

const cssFilesToLint = [`${srcDir}/ui/**/*.css`];
const docFilesToLint = ['*.md', '.github/**/*.md'];
const htmlFilesToLint = [`${srcDir}/ui/**/*.html`];
const jsFilesToLint = [
	'*.js',
	`${srcDir}/**/*.js`,
	'tasks/**/*.js',
	'tests/**/*.js',
];
const jsonFilesToLint = [`${srcDir}/**/*.json`, '*.json'];
const tsFilesToLint = [
	`${srcDir}/**/*.ts`,
	'tests/**/*.ts',

	// Ignore declaration files
	`!${srcDir}/types/*.d.ts`,
];
const vueFilesToLint = [`${srcDir}/ui/**/*.vue`];

const filesToTest = 'tests/**/*.spec.ts';

const distFileChrome = 'web-scrobbler-chrome.zip';
const distFileFirefox = 'web-scrobbler-firefox.zip';
const zipFileName = {
	[browserChrome]: distFileChrome,
	[browserFirefox]: distFileFirefox,
};

/**
 * Some tasks take browser name as an argument. We support only Chrome and
 * Firefox, which can be specified as 'chrome' and 'firefox' respectively:
 *
 *   Create a zipball for Chrome
 *   > npx gulp dist --browser chrome
 *
 *   Build the extension for Firefox
 *   > npx gulp build --browser firefox
 *
 * If no browser is specified, the extenion will be build or packed for Chrome.
 *
 * When you build or pack the extenion you can also specify the build mode
 * by using a `mode` argument:
 *
 *   Build the extension in the development mode
 *   > npx gulp build --mode development
 *
 *   Pack the extension in the production mode
 *   > npx gulp dist --mode production
 *
 * The development mode is used by default.
 */

/* External tasks */

const build = series(webpack);
build.description = 'Build the extension';
build.flags = getArgumentDescription('browser', 'mode');

const dist = series(build, compress);
dist.description = 'Build the extension and pack source files in a zipball';
dist.flags = getArgumentDescription('browser', 'mode');

const lint = parallel(
	eslint,
	unusedFiles,
	htmlvalidate,
	jsonlint,
	lintspaces,
	remark,
	stylelint
);
lint.description = 'Lint source files';

const test = mocha;
test.description = 'Run tests';

module.exports = { build, dist, lint, test };

/* Internal tasks */

/* Building  */

/**
 * Pack all files from `build` directory into a zipball.
 *
 * @return {Object} Node.js stream
 */
function compress() {
	const { browser } = parseCliArguments();

	const gulpZip = require('gulp-zip');

	return src(`${buildDir}/**/*`)
		.pipe(gulpZip(zipFileName[browser]))
		.pipe(dest('.'));
}

/**
 * Build the extension with webpack. See webpack config for details.
 *
 * @return {Promise} Promise resolved when the build process is finished
 */
function webpack() {
	const webpack = require('webpack');
	const getWebpackConfig = require('./webpack.config.js');

	return new Promise((resolve, reject) => {
		webpack(getWebpackConfig(), (err, stats) => {
			const { errors, warnings } = stats.compilation;

			for (const { message } of warnings) {
				console.error(message);
			}

			const fullErrorMessage = errors.reduce((message, err) => {
				return `${message}\n${err.message}`;
			}, 'Unable to build the extension');

			if (stats.hasErrors()) {
				reject(withError(fullErrorMessage));
			} else {
				resolve();
			}
		});
	});
}

/* Linting */

/**
 * Run ESLint against project files.
 *
 * @return {Object} Node.js stream
 */
function eslint() {
	const gulpEslint = require('gulp-eslint');
	const filesToLint = [...jsFilesToLint, ...tsFilesToLint, ...vueFilesToLint];

	return src(filesToLint)
		.pipe(gulpEslint())
		.pipe(gulpEslint.format())
		.pipe(gulpEslint.failAfterError());
}

/**
 * Run HTMLValidate against project files.
 *
 * @return {Object} Node.js stream
 */
function htmlvalidate() {
	const gulpHtmlValidate = require('gulp-html-validate');
	const filesToLint = [...htmlFilesToLint, ...vueFilesToLint];

	return src(filesToLint, { read: false }).pipe(gulpHtmlValidate());
}

function unusedFiles() {
	return src(`${srcDir}/connectors/*.js`).pipe(
		findUnusedFiles({
			connectors: require(resolve(srcDir, 'connectors.json')),
			manifest: require(resolve(srcDir, manifestFile)),
		})
	);
}

/**
 * Run JSONLint against project files.
 *
 * @return {Object} Node.js stream
 */
function jsonlint() {
	const gulpJsonlint = require('gulp-jsonlint');

	return src(jsonFilesToLint)
		.pipe(gulpJsonlint())
		.pipe(gulpJsonlint.reporter());
}

/**
 * Run linspaces against project files.
 *
 * @return {Object} Node.js stream
 */
function lintspaces() {
	const gulpLintspaces = require('gulp-lintspaces');
	const filesToLint = [
		...cssFilesToLint,
		...htmlFilesToLint,
		...jsFilesToLint,
		...jsonFilesToLint,
		...tsFilesToLint,
		...vueFilesToLint,
	];

	return src(filesToLint)
		.pipe(
			gulpLintspaces({
				editorconfig: '.editorconfig',
				ignores: ['js-comments'],
			})
		)
		.pipe(gulpLintspaces.reporter());
}

/**
 * Run remark against project files.
 *
 * @return {Object} Node.js stream
 */
function remark() {
	const gulpRemark = require('gulp-remark');

	return src(docFilesToLint).pipe(
		gulpRemark({
			quiet: true,
			frail: true,
		})
	);
}

/**
 * Run Stylelint against project files.
 *
 * @return {Object} Node.js stream
 */
function stylelint() {
	const gulpStylelint = require('gulp-stylelint');
	const filesToLint = [...cssFilesToLint, ...vueFilesToLint];

	return src(filesToLint).pipe(
		gulpStylelint({
			reporters: [{ formatter: 'string', console: true }],
		})
	);
}

/* Testing */

/**
 * Run Mocha.
 *
 * @return {Object} Node.js stream
 */
function mocha() {
	const gulpMocha = require('gulp-mocha');

	configureTsCompilerForTests();

	return src(filesToTest, { read: false }).pipe(
		gulpMocha({
			reporter: 'progress',
			require: [
				'ts-node/register',
				'tsconfig-paths/register',
				'source-map-support/register',
				'tests/helpers/set-stubs',
			],
		})
	);
}

/* Utilities */

/**
 * Create a new Error object with no stack.
 *
 * @param {String} msg Error message
 *
 * @return {Error} Error object
 */
function withError(msg) {
	const err = new Error(msg);
	err.showStack = false;

	return err;
}
