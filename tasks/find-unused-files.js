/**
 * This plugin searches for unused scripts that are stored in the `connectors`
 * directory.
 */

const path = require('path');

const through = require('through2');
const PluginError = require('plugin-error');

const pluginName = 'gulp-find-unused-files';

const serviceFiles = ['dummy.js', '.eslintrc.yml'];
const domInjectSuffix = 'dom-inject.js';

const TYPE_DOM_INJECT_SCRIPT = 0x0;
const TYPE_CONNECTOR_SCRIPT = 0x1;
const TYPE_FILE_OTHER = 0x2;

module.exports = { findUnusedFiles };

function findUnusedFiles({ connectors, manifest }) {
	/**
	 * Check if a file located in the given path is used.
	 *
	 * @param {String} relFilePath Relative path to the script file
	 *
	 * @return {Boolean} Check result
	 */
	function isFileUsed(relFilePath) {
		switch (getFileType(relFilePath)) {
			case TYPE_CONNECTOR_SCRIPT:
				return isConnectorFileUsed(relFilePath);

			case TYPE_DOM_INJECT_SCRIPT:
				return isDomInjectScriptUsed(relFilePath);
		}

		return true;
	}

	/**
	 * Check if a connector script located in the given path is used.
	 *
	 * @param {String} relFilePath Relative path to the script file
	 *
	 * @return {Boolean} Check result
	 */
	function isConnectorFileUsed(relFilePath) {
		return connectors.some((entry) => entry.js === relFilePath);
	}

	/**
	 * Check if a injectable script located in the given path is used.
	 *
	 * @param {String} relFilePath Relative path to the script file
	 *
	 * @return {Boolean} Check result
	 */
	function isDomInjectScriptUsed(relFilePath) {
		return manifest.web_accessible_resources.some(
			(resource) => resource === relFilePath
		);
	}

	return through.obj(function(file, encoding, callback) {
		if (file.isNull()) {
			callback(null, file);
			return;
		}

		if (file.isStream()) {
			callback(new PluginError(pluginName, 'Streaming not supported'));
			return;
		}
		const relFilePath = getRelativeFilePath(file.path);
		if (!isFileUsed(relFilePath)) {
			const resultOutput = `Unused file: ${relFilePath}`;

			this.emit(
				'error',
				new PluginError(pluginName, resultOutput, {
					showStack: false,
				})
			);
		}

		callback(null, file);
	});
}

/**
 * Return a relative path (`connectors/*.js`) to a connector script from
 * the given absolute file path.
 *
 * @param {String} absFilePath Absolute path to the connector script
 *
 * @return {String} Relative path to the connector script
 */
function getRelativeFilePath(absFilePath) {
	const fileName = path.basename(absFilePath);
	return `connectors/${fileName}`;
}

/**
 * Return a file type based on the given path to the file.
 *
 * @param  {String} filePath Path to the file
 *
 * @return {Number} File type as a numeric value
 */
function getFileType(filePath) {
	const fileName = path.basename(filePath);

	if (filePath.endsWith(domInjectSuffix)) {
		return TYPE_DOM_INJECT_SCRIPT;
	} else if (!serviceFiles.includes(fileName)) {
		return TYPE_CONNECTOR_SCRIPT;
	}

	return TYPE_FILE_OTHER;
}
