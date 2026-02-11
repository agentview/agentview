/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/throttleit@2.1.0";
exports.ids = ["vendor-chunks/throttleit@2.1.0"];
exports.modules = {

/***/ "(ssr)/../../../node_modules/.pnpm/throttleit@2.1.0/node_modules/throttleit/index.js":
/*!*************************************************************************************!*\
  !*** ../../../node_modules/.pnpm/throttleit@2.1.0/node_modules/throttleit/index.js ***!
  \*************************************************************************************/
/***/ ((module) => {

eval("function throttle(function_, wait) {\n\tif (typeof function_ !== 'function') {\n\t\tthrow new TypeError(`Expected the first argument to be a \\`function\\`, got \\`${typeof function_}\\`.`);\n\t}\n\n\t// TODO: Add `wait` validation too in the next major version.\n\n\tlet timeoutId;\n\tlet lastCallTime = 0;\n\n\treturn function throttled(...arguments_) { // eslint-disable-line func-names\n\t\tclearTimeout(timeoutId);\n\n\t\tconst now = Date.now();\n\t\tconst timeSinceLastCall = now - lastCallTime;\n\t\tconst delayForNextCall = wait - timeSinceLastCall;\n\n\t\tif (delayForNextCall <= 0) {\n\t\t\tlastCallTime = now;\n\t\t\tfunction_.apply(this, arguments_);\n\t\t} else {\n\t\t\ttimeoutId = setTimeout(() => {\n\t\t\t\tlastCallTime = Date.now();\n\t\t\t\tfunction_.apply(this, arguments_);\n\t\t\t}, delayForNextCall);\n\t\t}\n\t};\n}\n\nmodule.exports = throttle;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3Rocm90dGxlaXRAMi4xLjAvbm9kZV9tb2R1bGVzL3Rocm90dGxlaXQvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBLGlGQUFpRixpQkFBaUI7QUFDbEc7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQSw0Q0FBNEM7QUFDNUM7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBOztBQUVBIiwic291cmNlcyI6WyIvVXNlcnMvYW5kcnplai9Qcm9qZWN0cy9hZ2VudHZpZXcvYWdlbnR2aWV3L25vZGVfbW9kdWxlcy8ucG5wbS90aHJvdHRsZWl0QDIuMS4wL25vZGVfbW9kdWxlcy90aHJvdHRsZWl0L2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIHRocm90dGxlKGZ1bmN0aW9uXywgd2FpdCkge1xuXHRpZiAodHlwZW9mIGZ1bmN0aW9uXyAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIHRoZSBmaXJzdCBhcmd1bWVudCB0byBiZSBhIFxcYGZ1bmN0aW9uXFxgLCBnb3QgXFxgJHt0eXBlb2YgZnVuY3Rpb25ffVxcYC5gKTtcblx0fVxuXG5cdC8vIFRPRE86IEFkZCBgd2FpdGAgdmFsaWRhdGlvbiB0b28gaW4gdGhlIG5leHQgbWFqb3IgdmVyc2lvbi5cblxuXHRsZXQgdGltZW91dElkO1xuXHRsZXQgbGFzdENhbGxUaW1lID0gMDtcblxuXHRyZXR1cm4gZnVuY3Rpb24gdGhyb3R0bGVkKC4uLmFyZ3VtZW50c18pIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBmdW5jLW5hbWVzXG5cdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG5cblx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXHRcdGNvbnN0IHRpbWVTaW5jZUxhc3RDYWxsID0gbm93IC0gbGFzdENhbGxUaW1lO1xuXHRcdGNvbnN0IGRlbGF5Rm9yTmV4dENhbGwgPSB3YWl0IC0gdGltZVNpbmNlTGFzdENhbGw7XG5cblx0XHRpZiAoZGVsYXlGb3JOZXh0Q2FsbCA8PSAwKSB7XG5cdFx0XHRsYXN0Q2FsbFRpbWUgPSBub3c7XG5cdFx0XHRmdW5jdGlvbl8uYXBwbHkodGhpcywgYXJndW1lbnRzXyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRsYXN0Q2FsbFRpbWUgPSBEYXRlLm5vdygpO1xuXHRcdFx0XHRmdW5jdGlvbl8uYXBwbHkodGhpcywgYXJndW1lbnRzXyk7XG5cdFx0XHR9LCBkZWxheUZvck5leHRDYWxsKTtcblx0XHR9XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGhyb3R0bGU7XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/../../../node_modules/.pnpm/throttleit@2.1.0/node_modules/throttleit/index.js\n");

/***/ })

};
;